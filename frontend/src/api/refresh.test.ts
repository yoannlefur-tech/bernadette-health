import { delay, http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from '../test/server'

const refreshUrl = '*/api/auth/refresh'

/** Runs the tasks of a same lock one at a time, like navigator.locks. */
function stubNavigatorLocks() {
  const names: string[] = []
  let queue: Promise<unknown> = Promise.resolve()

  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request(name: string, task: () => Promise<unknown>) {
        names.push(name)
        const result = queue.then(task)
        queue = result.catch(() => undefined)

        return result
      },
    },
  })

  return names
}

/** A fresh copy of the modules has its own token and in-flight refresh, like a tab. */
async function openTab() {
  vi.resetModules()

  const refresh = await import('./refresh')
  const tokenStore = await import('./tokenStore')
  const { client } = await import('./client')

  return { ...refresh, ...tokenStore, client }
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'locks')
})

describe('refresh deduplication', () => {
  it('sends a single refresh for several simultaneous 401', async () => {
    const tab = await openTab()
    tab.startSession('expired-token')

    let refreshCalls = 0
    server.use(
      http.post(refreshUrl, async () => {
        refreshCalls += 1
        await delay(20)

        return HttpResponse.json({ token: 'new-token' })
      }),
      http.get('*/api/dogs', ({ request }) =>
        request.headers.get('Authorization') === 'Bearer new-token'
          ? HttpResponse.json({ member: [] })
          : new HttpResponse(null, { status: 401 }),
      ),
    )

    const responses = await Promise.all([
      tab.client.GET('/api/dogs'),
      tab.client.GET('/api/dogs'),
      tab.client.GET('/api/dogs'),
    ])

    expect(responses.map(({ response }) => response.status)).toEqual([200, 200, 200])
    expect(refreshCalls).toBe(1)
  })

  it('replays without a new refresh when the token was renewed in the meantime', async () => {
    const tab = await openTab()
    tab.startSession('expired-token')

    let refreshCalls = 0
    let releaseSlowRequest = () => {}
    const fastRequestReplayed = new Promise<void>((resolve) => {
      releaseSlowRequest = resolve
    })

    server.use(
      http.post(refreshUrl, () => {
        refreshCalls += 1

        return HttpResponse.json({ token: 'new-token' })
      }),
      http.get('*/api/dogs', ({ request }) => {
        if (request.headers.get('Authorization') !== 'Bearer new-token') {
          return new HttpResponse(null, { status: 401 })
        }

        releaseSlowRequest()

        return HttpResponse.json({ member: [] })
      }),
      // Sent with the expired token, but answered once the refresh is over.
      http.get('*/api/me', async ({ request }) => {
        if (request.headers.get('Authorization') !== 'Bearer new-token') {
          await fastRequestReplayed

          return new HttpResponse(null, { status: 401 })
        }

        return HttpResponse.json({ '@id': '/api/me', '@type': 'User', email: 'someone@example.com' })
      }),
    )

    const [slow, fast] = await Promise.all([tab.client.GET('/api/me'), tab.client.GET('/api/dogs')])

    expect(slow.response.status).toBe(200)
    expect(fast.response.status).toBe(200)
    expect(refreshCalls).toBe(1)
  })
})

describe('refresh serialization between tabs', () => {
  it('never runs two refreshes at the same time, under the auth-refresh lock', async () => {
    const lockNames = stubNavigatorLocks()
    const firstTab = await openTab()
    const secondTab = await openTab()

    let running = 0
    let maxRunning = 0
    server.use(
      http.post(refreshUrl, async () => {
        running += 1
        maxRunning = Math.max(maxRunning, running)
        await delay(20)
        running -= 1

        return HttpResponse.json({ token: 'new-token' })
      }),
    )

    const results = await Promise.all([firstTab.refreshSession(), secondTab.refreshSession()])

    expect(results).toEqual(['refreshed', 'refreshed'])
    expect(maxRunning).toBe(1)
    expect(lockNames).toEqual(['auth-refresh', 'auth-refresh'])
  })

  it('does not refresh when the session ended while waiting for the lock', async () => {
    stubNavigatorLocks()
    const tab = await openTab()
    tab.startSession('expired-token')

    let refreshCalls = 0
    server.use(
      http.post(refreshUrl, () => {
        refreshCalls += 1

        return HttpResponse.json({ token: 'new-token' })
      }),
    )

    const result = tab.refreshSession()
    tab.endSession()

    expect(await result).toBe('rejected')
    expect(refreshCalls).toBe(0)
    expect(tab.getAccessToken()).toBeNull()
  })
})
