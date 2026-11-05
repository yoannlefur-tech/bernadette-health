import { authClient } from './authClient'
import { endSession, getSessionGeneration, renewAccessToken } from './tokenStore'

export type RefreshResult = 'refreshed' | 'rejected' | 'failed'

type SessionExpiredListener = () => void

const sessionExpiredListeners = new Set<SessionExpiredListener>()

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener)

  return () => {
    sessionExpiredListeners.delete(listener)
  }
}

/**
 * Only a 401 ends the session: a network error or a 5xx says nothing about the
 * refresh token, so the current request fails but the session stays.
 */
export async function refreshSession(): Promise<RefreshResult> {
  const generation = getSessionGeneration()

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
