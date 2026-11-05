import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { StrictMode } from 'react'
import { describe, expect, it } from 'vitest'
import { getAccessToken } from '../api/tokenStore'
import { server } from '../test/server'
import { useAuth } from './authContext'
import { AuthProvider } from './AuthProvider'

const me = { '@id': '/api/me', '@type': 'User', email: 'dev@example.com' }

function Session() {
  const { status, user, logout } = useAuth()

  return (
    <>
      <p>statut : {status}</p>
      <p>email : {user?.email ?? 'aucun'}</p>
      <button onClick={() => void logout()}>Déconnexion</button>
    </>
  )
}

function renderSession() {
  const queryClient = new QueryClient()
  queryClient.setQueryData(['dogs'], { member: [] })

  render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Session />
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  )

  return queryClient
}

function apiWithSession() {
  const calls = { refresh: 0, me: 0, logout: 0 }

  server.use(
    http.post('*/api/auth/refresh', () => {
      calls.refresh += 1

      return HttpResponse.json({ token: 'access-token' })
    }),
    http.get('*/api/me', () => {
      calls.me += 1

      return HttpResponse.json(me)
    }),
    http.post('*/api/auth/logout', () => {
      calls.logout += 1

      return new HttpResponse(null, { status: 200 })
    }),
  )

  return calls
}

describe('AuthProvider', () => {
  it('restores the session with a single refresh under StrictMode', async () => {
    const calls = apiWithSession()

    renderSession()

    expect(screen.getByText('statut : loading')).toBeInTheDocument()
    expect(await screen.findByText('statut : authenticated')).toBeInTheDocument()
    expect(screen.getByText('email : dev@example.com')).toBeInTheDocument()
    expect(calls).toMatchObject({ refresh: 1, me: 1 })
  })

  it.each([
    ['a 401', () => new HttpResponse(null, { status: 401 })],
    ['a 500', () => new HttpResponse(null, { status: 500 })],
    ['a network error', () => HttpResponse.error()],
  ])('starts anonymous when the refresh gets %s', async (_label, resolver) => {
    server.use(http.post('*/api/auth/refresh', resolver))

    renderSession()

    expect(await screen.findByText('statut : anonymous')).toBeInTheDocument()
  })

  it('starts anonymous when /api/me fails after the refresh', async () => {
    apiWithSession()
    server.use(http.get('*/api/me', () => new HttpResponse(null, { status: 500 })))

    renderSession()

    expect(await screen.findByText('statut : anonymous')).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
  })

  it('logs out: token removed, cache cleared, API called', async () => {
    const calls = apiWithSession()
    const queryClient = renderSession()

    await screen.findByText('statut : authenticated')
    expect(getAccessToken()).toBe('access-token')

    await userEvent.click(screen.getByRole('button', { name: 'Déconnexion' }))

    expect(await screen.findByText('statut : anonymous')).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    await waitFor(() => expect(calls.logout).toBe(1))
  })

  it('logs out locally when the API call fails', async () => {
    apiWithSession()
    server.use(http.post('*/api/auth/logout', () => HttpResponse.error()))
    const queryClient = renderSession()

    await screen.findByText('statut : authenticated')
    await userEvent.click(screen.getByRole('button', { name: 'Déconnexion' }))

    expect(await screen.findByText('statut : anonymous')).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('tells the other tabs about a logout', async () => {
    apiWithSession()
    renderSession()
    await screen.findByText('statut : authenticated')

    const otherTab = new BroadcastChannel('auth-session')
    const received = new Promise((resolve) => {
      otherTab.addEventListener('message', (event) => resolve(event.data), { once: true })
    })

    await userEvent.click(screen.getByRole('button', { name: 'Déconnexion' }))

    expect(await received).toBe('logout')
    otherTab.close()
  })

  it('logs out when another tab does, without calling the API', async () => {
    const calls = apiWithSession()
    const queryClient = renderSession()
    await screen.findByText('statut : authenticated')

    const otherTab = new BroadcastChannel('auth-session')
    otherTab.postMessage('logout')

    expect(await screen.findByText('statut : anonymous')).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(calls.logout).toBe(0)
    otherTab.close()
  })
})
