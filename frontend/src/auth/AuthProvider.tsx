import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { authClient } from '../api/authClient'
import { client } from '../api/client'
import { onSessionExpired, refreshSession, withRefreshLock } from '../api/refresh'
import { endSession, startSession } from '../api/tokenStore'
import { AuthContext, LoginError, type Auth, type AuthStatus, type User } from './authContext'
import { broadcastLogout, onLogoutBroadcast } from './sessionChannel'

type Session = { status: AuthStatus; user: User | null }

const ANONYMOUS: Session = { status: 'anonymous', user: null }

async function fetchCurrentUser(): Promise<User | null> {
  const { data } = await client.GET('/api/me')

  return data ?? null
}

/** On startup, any error gives an anonymous session. */
async function restoreSession(): Promise<User | null> {
  try {
    if ((await refreshSession()) === 'refreshed') {
      const user = await fetchCurrentUser()

      if (user) {
        return user
      }
    }
  } catch {
    // Handled below, like any other failure.
  }

  endSession()

  return null
}

async function requestToken(email: string, password: string): Promise<string> {
  let result

  try {
    // Under the lock, so that it cannot overlap a logout still in progress,
    // whose answer would remove the cookie of this new session.
    result = await withRefreshLock(() =>
      authClient.POST('/api/auth/login', { body: { email, password } }),
    )
  } catch {
    throw new LoginError(null)
  }

  if (!result.data) {
    throw new LoginError(result.response.status)
  }

  return result.data.token
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session>({ status: 'loading', user: null })
  // A ref survives the double execution of the effects under StrictMode.
  const restoration = useRef<Promise<User | null> | null>(null)

  const clearLocalSession = useCallback(() => {
    endSession()
    queryClient.clear()
    setSession(ANONYMOUS)
  }, [queryClient])

  useEffect(() => {
    let active = true

    restoration.current ??= restoreSession()
    void restoration.current.then((user) => {
      if (active) {
        setSession(user ? { status: 'authenticated', user } : ANONYMOUS)
      }
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const stopExpired = onSessionExpired(clearLocalSession)
    const stopBroadcast = onLogoutBroadcast(clearLocalSession)

    return () => {
      stopExpired()
      stopBroadcast()
    }
  }, [clearLocalSession])

  const login = useCallback(async (email: string, password: string) => {
    startSession(await requestToken(email, password))

    let user: User | null = null

    try {
      user = await fetchCurrentUser()
    } catch {
      // Handled below: without a user, the login has failed.
    }

    if (!user) {
      endSession()

      throw new LoginError(null)
    }

    setSession({ status: 'authenticated', user })
  }, [])

  const logout = useCallback(async () => {
    clearLocalSession()
    broadcastLogout()

    try {
      // Under the lock, so that the cookie it invalidates is the latest one.
      // keepalive: reloading the page right away must not cancel it.
      await withRefreshLock(() => authClient.POST('/api/auth/logout', { keepalive: true }))
    } catch {
      // The local logout is done, a network error must not get in its way.
    }
  }, [clearLocalSession])

  const auth = useMemo<Auth>(() => ({ ...session, login, logout }), [session, login, logout])

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
