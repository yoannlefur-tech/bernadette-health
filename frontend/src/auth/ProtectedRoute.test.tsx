import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation, type InitialEntry } from 'react-router'
import { renderApp } from '../test/renderApp'
import { server } from '../test/server'
import { AuthProvider } from './AuthProvider'
import { LoginPage } from './LoginPage'
import { ProtectedRoute } from './ProtectedRoute'

const me = { '@id': '/api/me', '@type': 'User', email: 'dev@example.com' }

function CurrentLocation() {
  const { pathname, search, hash } = useLocation()

  return <p>page : {`${pathname}${search}${hash}`}</p>
}

function renderRoutes(initialEntry: InitialEntry) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="*" element={<CurrentLocation />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

function anonymousApi() {
  server.use(
    http.post('*/api/auth/refresh', () => new HttpResponse(null, { status: 401 })),
    http.post('*/api/auth/login', () => HttpResponse.json({ token: 'access-token' })),
    http.get('*/api/me', () => HttpResponse.json(me)),
  )
}

async function logIn() {
  await userEvent.type(await screen.findByLabelText(/Email/), 'dev@example.com')
  await userEvent.type(screen.getByLabelText(/Mot de passe/), 'not-a-real-password')
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
}

describe('ProtectedRoute', () => {
  it('shows an indicator and does not redirect while loading', async () => {
    server.use(
      http.post('*/api/auth/refresh', async () => {
        await delay(50)

        return HttpResponse.json({ token: 'access-token' })
      }),
      http.get('*/api/me', () => HttpResponse.json(me)),
    )
    renderRoutes('/dogs/1')

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Se connecter' })).not.toBeInTheDocument()
    expect(await screen.findByText('page : /dogs/1')).toBeInTheDocument()
  })

  it('redirects to the login page without a session', async () => {
    anonymousApi()
    renderRoutes('/dogs/1')

    expect(await screen.findByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
    expect(screen.queryByText(/^page :/)).not.toBeInTheDocument()
  })

  it('goes back to the destination after the login', async () => {
    anonymousApi()
    renderRoutes('/dogs/1?tab=weight#last')

    await logIn()

    expect(await screen.findByText('page : /dogs/1?tab=weight#last')).toBeInTheDocument()
  })

  it.each(['//evil.example', 'https://evil.example', '/\\evil.example'])(
    'rejects the external destination %s',
    async (from) => {
      anonymousApi()
      renderRoutes({ pathname: '/login', state: { from } })

      await logIn()

      expect(await screen.findByText('page : /')).toBeInTheDocument()
    },
  )
})

describe('routing', () => {
  it('shows a 404 page on an unknown route, even without a session', async () => {
    anonymousApi()
    renderApp('/does-not-exist')

    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Retour à l'accueil" })).toHaveAttribute('href', '/')
  })
})
