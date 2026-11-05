import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp'
import { server } from '../../test/server'
import { DOG_IRI, mockLoggedInApi } from './testApi'

describe('DogWeightPage', () => {
  it('shows the name, the breed and the birth date of the dog', async () => {
    mockLoggedInApi()
    renderApp(DOG_IRI.replace('/api', ''))

    expect(await screen.findByRole('heading', { name: 'Bernadette' })).toBeInTheDocument()
    expect(screen.getByText(/Teckel nain/)).toHaveTextContent('14/03/2022')
  })

  it('shows "Chien introuvable" for the dog of another user (404)', async () => {
    mockLoggedInApi()
    server.use(http.get(`*${DOG_IRI}`, () => new HttpResponse(null, { status: 404 })))
    renderApp(DOG_IRI.replace('/api', ''))

    expect(await screen.findByRole('heading', { name: 'Chien introuvable' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Retour à l'accueil" })).toHaveAttribute('href', '/')
  })

  it('does not call a server error a missing dog', async () => {
    mockLoggedInApi()
    server.use(http.get(`*${DOG_IRI}`, () => new HttpResponse(null, { status: 500 })))
    renderApp(DOG_IRI.replace('/api', ''))

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger ce chien')
    expect(screen.queryByText('Chien introuvable')).not.toBeInTheDocument()
  })

  it('does not ask for the weigh-ins of a dog which does not exist', async () => {
    let weighInsCalls = 0
    mockLoggedInApi()
    server.use(
      http.get(`*${DOG_IRI}`, () => new HttpResponse(null, { status: 404 })),
      http.get('*/api/weight_entries', () => {
        weighInsCalls += 1

        return HttpResponse.json({ member: [] })
      }),
    )
    renderApp(DOG_IRI.replace('/api', ''))

    await screen.findByRole('heading', { name: 'Chien introuvable' })

    expect(weighInsCalls).toBe(0)
  })

  it('requires a session', async () => {
    server.use(http.post('*/api/auth/refresh', () => new HttpResponse(null, { status: 401 })))
    renderApp(DOG_IRI.replace('/api', ''))

    expect(await screen.findByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
  })
})
