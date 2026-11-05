import createClient, { type Middleware } from 'openapi-fetch'
import { refreshSession } from './refresh'
import type { paths } from './schema'
import { getAccessToken, getSessionGeneration } from './tokenStore'

type SentRequest = {
  // Sending a request consumes its body: replaying needs an untouched copy.
  replayable: Request
  token: string | null
  generation: number
}

const sentRequests = new Map<string, SentRequest>()

function isAuthRoute(request: Request): boolean {
  return new URL(request.url).pathname.startsWith('/api/auth/')
}

const authMiddleware: Middleware = {
  onRequest({ request, id }) {
    if (isAuthRoute(request)) {
      return undefined
    }

    const token = getAccessToken()

    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }

    sentRequests.set(id, {
      replayable: request.clone(),
      token,
      generation: getSessionGeneration(),
    })

    return request
  },

  async onResponse({ response, id }) {
    const sent = sentRequests.get(id)
    sentRequests.delete(id)

    if (!sent || response.status !== 401) {
      return undefined
    }

    const currentToken = getAccessToken()
    const alreadyRenewed = currentToken !== null && currentToken !== sent.token

    if (!alreadyRenewed) {
      // Logged out while the request was in flight: do not revive the session.
      if (sent.generation !== getSessionGeneration()) {
        return undefined
      }

      if ((await refreshSession()) !== 'refreshed') {
        return undefined
      }
    }

    sent.replayable.headers.set('Authorization', `Bearer ${getAccessToken()}`)

    // A plain fetch, outside the middleware: a request is replayed only once.
    return globalThis.fetch(sent.replayable)
  },

  onError({ id }) {
    sentRequests.delete(id)
  },
}

export const client = createClient<paths>({
  baseUrl: window.location.origin,
  fetch: (request) => globalThis.fetch(request),
  headers: { Accept: 'application/ld+json' },
})

client.use(authMiddleware)
