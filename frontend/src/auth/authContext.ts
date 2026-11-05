import { createContext, useContext } from 'react'
import type { components } from '../api/schema'

export type User = components['schemas']['User.jsonld-user.read']

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export type Auth = {
  user: User | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

/** Thrown by login(). The status is null when no usable answer was received. */
export class LoginError extends Error {
  readonly status: number | null

  constructor(status: number | null) {
    super('Login failed')
    this.status = status
  }
}

export const AuthContext = createContext<Auth | null>(null)

export function useAuth(): Auth {
  const auth = useContext(AuthContext)

  if (!auth) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return auth
}
