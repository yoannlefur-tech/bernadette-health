import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { getAccessToken } from '../api/tokenStore'
import { renderApp } from '../test/renderApp'
import { server } from '../test/server'

const me = { '@id': '/api/me', '@type': 'User', email: 'dev@example.com' }

function anonymousApi() {
  const calls = { refresh: 0 }

  server.use(
    http.post('*/api/auth/refresh', () => {
      calls.refresh += 1

      return new HttpResponse(null, { status: 401 })
    }),
    http.get('*/api/me', () => HttpResponse.json(me)),
    http.get('*/api/dogs', () => HttpResponse.json({ member: [] })),
  )

  return calls
}

async function fillAndSubmit() {
  await userEvent.type(await screen.findByLabelText(/Email/), 'dev@example.com')
  await userEvent.type(screen.getByLabelText(/Mot de passe/), 'not-a-real-password')
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
}

describe('LoginPage', () => {
  it('declares the autocomplete attributes', async () => {
    anonymousApi()
    renderApp('/login')

    expect(await screen.findByLabelText(/Email/)).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText(/Mot de passe/)).toHaveAttribute('autocomplete', 'current-password')
  })

  it('logs in and leaves the page', async () => {
    anonymousApi()
    let body: unknown
    server.use(
      http.post('*/api/auth/login', async ({ request }) => {
        body = await request.json()

        return HttpResponse.json({ token: 'access-token' })
      }),
    )
    renderApp('/login')

    await fillAndSubmit()

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Se connecter' })).not.toBeInTheDocument())
    expect(body).toEqual({ email: 'dev@example.com', password: 'not-a-real-password' })
    expect(getAccessToken()).toBe('access-token')
  })

  it('disables the button while sending', async () => {
    anonymousApi()
    server.use(
      http.post('*/api/auth/login', async () => {
        await delay(50)

        return new HttpResponse(null, { status: 401 })
      }),
    )
    renderApp('/login')

    await fillAndSubmit()

    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeDisabled()
    await screen.findByText('Identifiants invalides')
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeEnabled()
  })

  it.each([
    [401, 'Identifiants invalides'],
    [429, 'Trop de tentatives, réessayez plus tard'],
    [500, 'Erreur serveur'],
  ])('shows the message of a %i', async (status, message) => {
    const calls = anonymousApi()
    server.use(http.post('*/api/auth/login', () => new HttpResponse(null, { status })))
    renderApp('/login')

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(getAccessToken()).toBeNull()
    // The one from startup: a failed login never triggers a refresh.
    expect(calls.refresh).toBe(1)
  })

  it('shows a server error on a network failure', async () => {
    anonymousApi()
    server.use(http.post('*/api/auth/login', () => HttpResponse.error()))
    renderApp('/login')

    await fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Erreur serveur')
  })

  it('requires both fields', async () => {
    anonymousApi()
    renderApp('/login')

    await userEvent.click(await screen.findByRole('button', { name: 'Se connecter' }))

    expect(await screen.findByText('Saisissez votre email')).toBeInTheDocument()
    expect(screen.getByText('Saisissez votre mot de passe')).toBeInTheDocument()
  })

  it('redirects a user already logged in', async () => {
    server.use(
      http.post('*/api/auth/refresh', () => HttpResponse.json({ token: 'access-token' })),
      http.get('*/api/me', () => HttpResponse.json(me)),
      http.get('*/api/dogs', () => HttpResponse.json({ member: [] })),
    )
    renderApp('/login')

    await screen.findByRole('heading', { name: 'Mes chiens' })
    expect(screen.queryByRole('button', { name: 'Se connecter' })).not.toBeInTheDocument()
  })
})
