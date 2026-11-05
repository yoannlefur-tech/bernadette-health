import { authClient } from './authClient'
import { endSession, getSessionGeneration, renewAccessToken } from './tokenStore'

export type RefreshResult = 'refreshed' | 'rejected' | 'failed'

type SessionExpiredListener = () => void

const REFRESH_LOCK = 'auth-refresh'

const sessionExpiredListeners = new Set<SessionExpiredListener>()

let refreshInFlight: Promise<RefreshResult> | null = null

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener)

  return () => {
    sessionExpiredListeners.delete(listener)
  }
}

/**
 * Serializes between tabs what uses or replaces the refresh cookie. The token
 * rotates on each use: a request must start once the previous one has finished,
 * so that the browser sends the up-to-date cookie.
 *
 * navigator.locks needs a secure context (localhost or HTTPS). Without it, only
 * the deduplication within the tab applies.
 */
export function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  return 'locks' in navigator ? navigator.locks.request(REFRESH_LOCK, task) : task()
}

/** Every caller shares the refresh in flight, if any. */
export function refreshSession(): Promise<RefreshResult> {
  if (!refreshInFlight) {
    const generation = getSessionGeneration()

    refreshInFlight = withRefreshLock(() => performRefresh(generation)).finally(() => {
      refreshInFlight = null
    })
  }

  return refreshInFlight
}

/**
 * Only a 401 ends the session: a network error or a 5xx says nothing about the
 * refresh token, so the current request fails but the session stays.
 */
async function performRefresh(generation: number): Promise<RefreshResult> {
  // The session ended while waiting for the lock: do not revive it.
  if (generation !== getSessionGeneration()) {
    return 'rejected'
  }

  try {
    const { data, response } = await authClient.POST('/api/auth/refresh')

    if (generation !== getSessionGeneration()) {
      return 'rejected'
    }

    if (response.status === 401) {
      endSession()
      sessionExpiredListeners.forEach((listener) => listener())

      return 'rejected'
    }

    if (!data) {
      return 'failed'
    }

    renewAccessToken(data.token)

    return 'refreshed'
  } catch {
    return 'failed'
  }
}
