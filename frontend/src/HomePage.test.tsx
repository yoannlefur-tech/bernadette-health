import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renewAccessToken } from './api/tokenStore'
import { renderApp } from './test/renderApp'
import { server } from './test/server'

const me = { '@id': '/api/me', '@type': 'User', email: 'dev@example.com' }

const bernadette = {
  '@id': '/api/dogs/1',
  '@type': 'Dog',
  name: 'Bernadette',
  breed: 'Teckel nain',
  coat: 'Poil long',
}

function loggedInApi() {
  const dogsTokens: (string | null)[] = []
  const calls = { refresh: 0 }

  server.use(
    http.post('*/api/auth/refresh', () => {
      calls.refresh += 1

      return HttpResponse.json({ token: `token-${calls.refresh}` })
    }),
    http.get('*/api/me', () => HttpResponse.json(me)),
    http.get('*/api/dogs', ({ request }) => {
      dogsTokens.push(request.headers.get('Authorization'))

      return HttpResponse.json({ member: [bernadette], totalItems: 1 })
    }),
    http.post('*/api/auth/logout', () => new HttpResponse(null, { status: 200 })),
  )

  return { calls, dogsTokens }
}

describe('HomePage', () => {
  it('shows the user and their dogs through an authenticated call', async () => {
    const { dogsTokens } = loggedInApi()
    renderApp('/')

    expect(await screen.findByText('Bernadette')).toBeInTheDocument()
    expect(screen.getByText('dev@example.com')).toBeInTheDocument()
    expect(dogsTokens).toEqual(['Bearer token-1'])
  })

  it('renews an expired access token transparently', async () => {
    const { calls } = loggedInApi()
    server.use(
      http.get('*/api/dogs', ({ request }) =>
        request.headers.get('Authorization') === 'Bearer token-2'
          ? HttpResponse.json({ member: [bernadette] })
          : new HttpResponse(null, { status: 401 }),
      ),
    )
    renderApp('/')

    expect(await screen.findByText('Bernadette')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(calls.refresh).toBe(2)
  })

  it('shows a message when there is no dog', async () => {
    loggedInApi()
    server.use(http.get('*/api/dogs', () => HttpResponse.json({ member: [] })))
    renderApp('/')

    expect(await screen.findByText('Aucun chien pour le moment')).toBeInTheDocument()
  })

  it('shows an error, and stays logged in, when the dogs cannot be loaded', async () => {
    loggedInApi()
    server.use(http.get('*/api/dogs', () => new HttpResponse(null, { status: 500 })))
    renderApp('/')

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger les chiens')
    expect(screen.getByRole('button', { name: 'Déconnexion' })).toBeInTheDocument()
  })

  it('goes back to the login page, with an empty cache, after a logout', async () => {
    loggedInApi()
    const queryClient = renderApp('/')
    await screen.findByText('Bernadette')

    await userEvent.click(screen.getByRole('button', { name: 'Déconnexion' }))

    expect(await screen.findByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
    expect(screen.queryByText('Bernadette')).not.toBeInTheDocument()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('goes back to the login page, with an empty cache, when the session expires', async () => {
    const { calls } = loggedInApi()
    const queryClient = renderApp('/')
    await screen.findByText('Bernadette')

    server.use(
      http.post('*/api/auth/refresh', () => {
        calls.refresh += 1

        return new HttpResponse(null, { status: 401 })
      }),
      http.get('*/api/dogs', () => new HttpResponse(null, { status: 401 })),
    )
    renewAccessToken('expired-token')
    void queryClient.invalidateQueries({ queryKey: ['dogs'] })

    expect(await screen.findByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
    await waitFor(() => expect(queryClient.getQueryCache().getAll()).toHaveLength(0))
  })
})
