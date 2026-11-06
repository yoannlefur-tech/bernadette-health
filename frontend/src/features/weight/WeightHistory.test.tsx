import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp'
import { server } from '../../test/server'
import { apiWeighIn, DOG_IRI, mockLoggedInApi, weighInsPage } from './testApi'

const PAGE_URL = DOG_IRI.replace('/api', '')

/** The cells of the body rows, top to bottom. */
function tableRows() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .slice(0, 3)
        .map((cell) => cell.textContent?.replace(/\s/g, ' ')),
    )
}

const elevenWeighIns = () =>
  Array.from({ length: 11 }, (_, index) =>
    apiWeighIn(`w${String(index).padStart(2, '0')}`, `2026-01-${String(index + 1).padStart(2, '0')}`, 4000 + index),
  ).reverse()

describe('WeightHistory', () => {
  it('sorts from the latest, same day by descending id, with the gap of each line', async () => {
    mockLoggedInApi([
      apiWeighIn('c', '2026-02-01', 4400),
      apiWeighIn('b', '2026-02-01', 4300),
      apiWeighIn('a', '2026-01-01', 4000),
    ])
    renderApp(PAGE_URL)
    await screen.findByRole('table')

    expect(tableRows()).toEqual([
      ['01/02/2026', '4,40 kg', '+100 g (+2,3 %)'],
      ['01/02/2026', '4,30 kg', '+300 g (+7,5 %)'],
      ['01/01/2026', '4,00 kg', '—'],
    ])
  })

  it('offers to add a weigh-in when there is none', async () => {
    mockLoggedInApi()
    renderApp(PAGE_URL)

    expect(await screen.findByText('Aucune pesée pour le moment')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajouter une pesée' })).toBeInTheDocument()
  })

  it('names the action buttons', async () => {
    mockLoggedInApi([apiWeighIn('a', '2026-01-01', 4000)])
    renderApp(PAGE_URL)

    expect(
      await screen.findByRole('button', { name: 'Modifier la pesée du 01/01/2026' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Supprimer la pesée du 01/01/2026' })).toBeInTheDocument()
  })

  it('shows ten lines per page', async () => {
    mockLoggedInApi(elevenWeighIns())
    renderApp(PAGE_URL)
    await screen.findByRole('table')

    expect(tableRows()).toHaveLength(10)
    expect(screen.getByText('1–10 sur 11')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Page suivante' }))

    expect(tableRows()).toHaveLength(1)
    expect(tableRows()[0][0]).toBe('01/01/2026')
  })

  it('shows an error when the weigh-ins cannot be loaded', async () => {
    mockLoggedInApi()
    server.use(http.get('*/api/weight_entries', () => new HttpResponse(null, { status: 500 })))
    renderApp(PAGE_URL)

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger les pesées')
  })

  describe('deletion', () => {
    function deletableApi(initial: ReturnType<typeof apiWeighIn>[]) {
      let weighIns = initial
      const deleted: string[] = []

      mockLoggedInApi()
      server.use(
        http.get('*/api/weight_entries', () => HttpResponse.json(weighInsPage(weighIns))),
        http.delete('*/api/weight_entries/:id', ({ params }) => {
          deleted.push(String(params.id))
          weighIns = weighIns.filter(({ id }) => id !== params.id)

          return new HttpResponse(null, { status: 204 })
        }),
      )

      return deleted
    }

    it('asks for a confirmation, and cancelling deletes nothing', async () => {
      const deleted = deletableApi([apiWeighIn('a', '2026-01-01', 4000)])
      renderApp(PAGE_URL)

      await userEvent.click(
        await screen.findByRole('button', { name: 'Supprimer la pesée du 01/01/2026' }),
      )
      const dialog = await screen.findByRole('dialog', { name: 'Supprimer cette pesée ?' })

      expect(deleted).toEqual([])

      await userEvent.click(within(dialog).getByRole('button', { name: 'Annuler' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(deleted).toEqual([])
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('deletes after the confirmation and refreshes the list', async () => {
      const deleted = deletableApi([
        apiWeighIn('b', '2026-01-02', 4100),
        apiWeighIn('a', '2026-01-01', 4000),
      ])
      renderApp(PAGE_URL)

      await userEvent.click(
        await screen.findByRole('button', { name: 'Supprimer la pesée du 02/01/2026' }),
      )
      const dialog = await screen.findByRole('dialog')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }))

      await waitFor(() => expect(tableRows()).toHaveLength(1))
      expect(deleted).toEqual(['b'])
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('keeps the dialog open with a message when the deletion fails', async () => {
      deletableApi([apiWeighIn('a', '2026-01-01', 4000)])
      server.use(http.delete('*/api/weight_entries/:id', () => new HttpResponse(null, { status: 500 })))
      renderApp(PAGE_URL)

      await userEvent.click(
        await screen.findByRole('button', { name: 'Supprimer la pesée du 01/01/2026' }),
      )
      const dialog = await screen.findByRole('dialog')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }))

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Impossible de supprimer la pesée',
      )
    })

    it('goes back a page when the only line of the last page is deleted', async () => {
      deletableApi(elevenWeighIns())
      renderApp(PAGE_URL)
      await screen.findByRole('table')
      await userEvent.click(screen.getByRole('button', { name: 'Page suivante' }))

      await userEvent.click(screen.getByRole('button', { name: 'Supprimer la pesée du 01/01/2026' }))
      const dialog = await screen.findByRole('dialog')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }))

      expect(await screen.findByText('1–10 sur 10')).toBeInTheDocument()
      expect(tableRows()).toHaveLength(10)
    })
  })
})
