import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../test/server'
import { client } from './client'
import { onSessionExpired } from './refresh'
import { getAccessToken, startSession } from './tokenStore'

const dogsUrl = '*/api/dogs'
const refreshUrl = '*/api/auth/refresh'

const emptyCollection = { member: [], totalItems: 0 }

/** Answers 200 to the expected token, and 401 to anything else. */
function dogsAcceptingOnly(token: string) {
  const seenTokens: (string | null)[] = []

  server.use(
    http.get(dogsUrl, ({ request }) => {
      const header = request.headers.get('Authorization')
      seenTokens.push(header)

      return header === `Bearer ${token}`
        ? HttpResponse.json(emptyCollection)
        : new HttpResponse(null, { status: 401 })
    }),
  )

  return seenTokens
}

function refreshAnswering(resolver: () => Response) {
  const calls = { count: 0 }

  server.use(
    http.post(refreshUrl, () => {
      calls.count += 1

      return resolver()
    }),
  )

  return calls
}

describe('API client', () => {
  const sessionExpired = vi.fn()
  let unsubscribe: () => void

  beforeEach(() => {
    sessionExpired.mockClear()
    unsubscribe = onSessionExpired(sessionExpired)
    startSession('expired-token')
  })

  afterEach(() => {
    unsubscribe()
  })

  it('sends the access token and reads a JSON-LD collection', async () => {
    startSession('valid-token')
    server.use(
      http.get(dogsUrl, ({ request }) => {
        expect(request.headers.get('Authorization')).toBe('Bearer valid-token')

        return HttpResponse.json(
          { member: [{ '@id': '/api/dogs/1', '@type': 'Dog', name: 'Bernadette', breed: 'Teckel', coat: 'Ras' }] },
          { headers: { 'Content-Type': 'application/ld+json' } },
        )
      }),
    )

    const { data } = await client.GET('/api/dogs')

    expect(data?.member[0].name).toBe('Bernadette')
  })

  it('refreshes after a 401 and replays the request once', async () => {
    const seenTokens = dogsAcceptingOnly('new-token')
    const refresh = refreshAnswering(() => HttpResponse.json({ token: 'new-token' }))

    const { data, response } = await client.GET('/api/dogs')

    expect(response.status).toBe(200)
    expect(data?.member).toEqual([])
    expect(refresh.count).toBe(1)
    expect(seenTokens).toEqual(['Bearer expired-token', 'Bearer new-token'])
    expect(getAccessToken()).toBe('new-token')
  })

  it('keeps the body when replaying a POST', async () => {
    const bodies: unknown[] = []

    server.use(
      http.post(dogsUrl, async ({ request }) => {
        bodies.push(await request.json())

        return request.headers.get('Authorization') === 'Bearer new-token'
          ? HttpResponse.json({ '@id': '/api/dogs/1', '@type': 'Dog', name: 'Bernadette', breed: 'Teckel', coat: 'Ras' }, { status: 201 })
          : new HttpResponse(null, { status: 401 })
      }),
    )
    refreshAnswering(() => HttpResponse.json({ token: 'new-token' }))

    const dog = { name: 'Bernadette', breed: 'Teckel', coat: 'Ras' }
    const { response } = await client.POST('/api/dogs', {
      body: dog,
      headers: { 'Content-Type': 'application/ld+json' },
    })

    expect(response.status).toBe(201)
    expect(bodies).toEqual([dog, dog])
  })

  it('does not replay more than once when the replay gets a 401', async () => {
    const seenTokens = dogsAcceptingOnly('never-issued')
    const refresh = refreshAnswering(() => HttpResponse.json({ token: 'new-token' }))

    const { response } = await client.GET('/api/dogs')

    expect(response.status).toBe(401)
    expect(refresh.count).toBe(1)
    expect(seenTokens).toHaveLength(2)
  })

  it('ends the session without looping when the refresh gets a 401', async () => {
    const seenTokens = dogsAcceptingOnly('never-issued')
    const refresh = refreshAnswering(() => new HttpResponse(null, { status: 401 }))

    const { response } = await client.GET('/api/dogs')

    expect(response.status).toBe(401)
    expect(refresh.count).toBe(1)
    expect(seenTokens).toHaveLength(1)
    expect(getAccessToken()).toBeNull()
    expect(sessionExpired).toHaveBeenCalledOnce()
  })

  it.each([
    ['a 500', () => new HttpResponse(null, { status: 500 })],
    ['a network error', () => HttpResponse.error()],
  ])('keeps the session when the refresh gets %s', async (_label, resolver) => {
    const seenTokens = dogsAcceptingOnly('never-issued')
    refreshAnswering(resolver)

    const { response } = await client.GET('/api/dogs')

    expect(response.status).toBe(401)
    expect(seenTokens).toHaveLength(1)
    expect(getAccessToken()).toBe('expired-token')
    expect(sessionExpired).not.toHaveBeenCalled()
  })

  it('never refreshes on an auth route', async () => {
    const refresh = refreshAnswering(() => HttpResponse.json({ token: 'new-token' }))

    server.use(
      http.post('*/api/auth/login', ({ request }) => {
        expect(request.headers.has('Authorization')).toBe(false)

        return new HttpResponse(null, { status: 401 })
      }),
    )

    const { response } = await client.POST('/api/auth/login', {
      body: { email: 'someone@example.com', password: 'not-a-real-password' },
    })

    expect(response.status).toBe(401)
    expect(refresh.count).toBe(0)
  })
})
