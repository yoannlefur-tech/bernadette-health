import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp'
import { server } from '../../test/server'
import { apiWeighIn, bernadette, DOG_IRI, mockLoggedInApi } from './testApi'

const PAGE_URL = DOG_IRI.replace('/api', '')

const clean = (text: string | null | undefined) => text?.replace(/\s/g, ' ')

describe('WeightAlerts', () => {
  it('shows a loss above the chart, with the figures and the disclaimer', async () => {
    mockLoggedInApi([apiWeighIn('b', '2026-10-20', 3750), apiWeighIn('a', '2026-10-12', 4000)])
    renderApp(PAGE_URL)

    const alert = await screen.findByRole('alert')

    expect(clean(alert.textContent)).toContain('-6,3 % depuis le 12/10')
    expect(alert).toHaveTextContent("ne remplace pas l'avis du vétérinaire")
    expect(
      alert.compareDocumentPosition(screen.getByRole('img')) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('shows a gain for an adult', async () => {
    mockLoggedInApi([apiWeighIn('b', '2026-10-20', 4500), apiWeighIn('a', '2026-10-12', 4000)])
    renderApp(PAGE_URL)

    expect(clean((await screen.findByRole('alert')).textContent)).toContain('+12,5 % depuis le 12/10')
  })

  it('shows nothing for a puppy gaining weight', async () => {
    mockLoggedInApi([apiWeighIn('b', '2026-10-20', 3000), apiWeighIn('a', '2026-10-12', 2000)])
    server.use(
      http.get(`*${DOG_IRI}`, () => HttpResponse.json({ ...bernadette, birth_date: '2026-06-01' })),
    )
    renderApp(PAGE_URL)
    await screen.findByRole('table')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows nothing with a single weigh-in', async () => {
    mockLoggedInApi([apiWeighIn('a', '2026-10-12', 4000)])
    renderApp(PAGE_URL)
    await screen.findByRole('table')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('puts a loss and a gain in a single banner', async () => {
    mockLoggedInApi([
      apiWeighIn('c', '2026-10-20', 4700),
      apiWeighIn('b', '2026-10-10', 5000),
      apiWeighIn('a', '2026-10-01', 4000),
    ])
    renderApp(PAGE_URL)

    const alert = await screen.findByRole('alert')

    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(clean(alert.textContent)).toContain('-6,0 % depuis le 10/10')
    expect(clean(alert.textContent)).toContain('+17,5 % depuis le 01/10')
  })
})
