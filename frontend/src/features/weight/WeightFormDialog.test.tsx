import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp'
import { server } from '../../test/server'
import { todayApiDate } from './dates'
import { apiWeighIn, DOG_IRI, mockLoggedInApi, weighInsPage } from './testApi'

const PAGE_URL = DOG_IRI.replace('/api', '')
const EXISTING = apiWeighIn('w1', '2026-01-10', 4850)

function daysFromToday(days: number): string {
  const now = new Date()

  return todayApiDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days))
}

/** Records the writes and answers them like the API. */
function writableApi(weighIns = [EXISTING]) {
  const writes = {
    post: [] as { body: unknown; contentType: string | null }[],
    patch: [] as { id: string; body: unknown; contentType: string | null }[],
  }

  mockLoggedInApi()
  server.use(
    http.get('*/api/weight_entries', () => HttpResponse.json(weighInsPage(weighIns))),
    http.post('*/api/weight_entries', async ({ request }) => {
      writes.post.push({
        body: await request.json(),
        contentType: request.headers.get('Content-Type'),
      })

      return HttpResponse.json(apiWeighIn('new', '2026-01-11', 4000), { status: 201 })
    }),
    http.patch('*/api/weight_entries/:id', async ({ request, params }) => {
      writes.patch.push({
        id: String(params.id),
        body: await request.json(),
        contentType: request.headers.get('Content-Type'),
      })

      return HttpResponse.json(EXISTING)
    }),
  )

  return writes
}

async function openCreateForm() {
  renderApp(PAGE_URL)
  await userEvent.click(await screen.findByRole('button', { name: 'Ajouter une pesée' }))

  return screen.findByRole('dialog', { name: 'Ajouter une pesée' })
}

function fill(dialog: HTMLElement, { date, weight }: { date?: string; weight?: string }) {
  if (date !== undefined) {
    fireEvent.change(within(dialog).getByLabelText(/Date/), { target: { value: date } })
  }

  if (weight !== undefined) {
    fireEvent.change(within(dialog).getByLabelText(/Poids/), { target: { value: weight } })
  }
}

const save = (dialog: HTMLElement) =>
  userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }))

const dialogClosed = () =>
  waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

describe('WeightFormDialog', () => {
  it('posts the IRI of the dog, the grams and the date', async () => {
    const writes = writableApi()
    const dialog = await openCreateForm()

    fill(dialog, { date: '2026-01-11', weight: '4,85' })
    await save(dialog)
    await dialogClosed()

    expect(writes.post).toEqual([
      {
        body: { dog: DOG_IRI, measured_at: '2026-01-11', weight_grams: 4850 },
        contentType: 'application/ld+json',
      },
    ])
  })

  it('accepts today, and suggests it by default', async () => {
    const writes = writableApi()
    const dialog = await openCreateForm()

    expect(within(dialog).getByLabelText(/Date/)).toHaveValue(todayApiDate())

    fill(dialog, { weight: '4.855' })
    await save(dialog)
    await dialogClosed()

    expect(writes.post[0].body).toMatchObject({ measured_at: todayApiDate(), weight_grams: 4855 })
  })

  it('bounds the date picker between the birth and today', async () => {
    writableApi()
    const dialog = await openCreateForm()
    const date = within(dialog).getByLabelText(/Date/)

    expect(date).toHaveAttribute('type', 'date')
    expect(date).toHaveAttribute('max', todayApiDate())
    expect(date).toHaveAttribute('min', '2022-03-14')
  })

  it('patches an edited weigh-in without the dog, from its current values', async () => {
    const writes = writableApi()
    renderApp(PAGE_URL)

    await userEvent.click(
      await screen.findByRole('button', { name: 'Modifier la pesée du 10/01/2026' }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Modifier la pesée' })

    expect(within(dialog).getByLabelText(/Date/)).toHaveValue('2026-01-10')
    expect(within(dialog).getByLabelText(/Poids/)).toHaveValue('4,85')

    fill(dialog, { weight: '4,9' })
    await save(dialog)
    await dialogClosed()

    expect(writes.post).toEqual([])
    expect(writes.patch).toEqual([
      {
        id: 'w1',
        body: { measured_at: '2026-01-10', weight_grams: 4900 },
        contentType: 'application/merge-patch+json',
      },
    ])
  })

  it('refreshes the list after saving', async () => {
    const list = [EXISTING]
    writableApi(list)
    server.use(
      http.post('*/api/weight_entries', () => {
        list.push(apiWeighIn('w2', '2026-01-11', 4900))

        return HttpResponse.json(list[1], { status: 201 })
      }),
    )
    const dialog = await openCreateForm()

    fill(dialog, { date: '2026-01-11', weight: '4,9' })
    await save(dialog)

    expect(await screen.findByText('11/01/2026')).toBeInTheDocument()
  })

  describe('validation', () => {
    it.each([
      ['a future date', daysFromToday(1), 'La date ne peut pas être dans le futur'],
      ['a date before the birth', '2022-03-13', 'La date ne peut pas être antérieure à la naissance'],
      ['no date', '', 'Saisissez la date'],
    ])('rejects %s', async (_, date, message) => {
      const writes = writableApi()
      const dialog = await openCreateForm()

      fill(dialog, { date, weight: '4,85' })
      await save(dialog)

      expect(await within(dialog).findByText(message)).toBeInTheDocument()
      expect(writes.post).toEqual([])
    })

    it('accepts the birth date itself', async () => {
      const writes = writableApi()
      const dialog = await openCreateForm()

      fill(dialog, { date: '2022-03-14', weight: '0,2' })
      await save(dialog)
      await dialogClosed()

      expect(writes.post).toHaveLength(1)
    })

    it.each([
      ['0', /supérieur à 0/],
      ['-4', /supérieur à 0/],
      ['abc', /supérieur à 0/],
      ['4,8555', /trois décimales/],
      ['', /Saisissez le poids/],
      ['100,001', /dépasser 100 kg/],
    ])('rejects the weight "%s"', async (weight, message) => {
      const writes = writableApi()
      const dialog = await openCreateForm()

      fill(dialog, { weight })
      await save(dialog)

      expect(await within(dialog).findByText(message)).toBeInTheDocument()
      expect(writes.post).toEqual([])
    })

    it('accepts exactly 100 kg', async () => {
      const writes = writableApi()
      const dialog = await openCreateForm()

      fill(dialog, { date: '2026-01-11', weight: '100' })
      await save(dialog)
      await dialogClosed()

      expect(writes.post[0].body).toMatchObject({ weight_grams: 100000 })
    })
  })

  describe('errors of the API', () => {
    function rejectWith(violations: { propertyPath: string; message: string }[]) {
      server.use(
        http.post('*/api/weight_entries', () =>
          HttpResponse.json(
            { status: 422, violations },
            { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
          ),
        ),
      )
    }

    it('attaches a 422 to its field, in French', async () => {
      writableApi()
      rejectWith([{ propertyPath: 'measured_at', message: 'This value should be less.' }])
      const dialog = await openCreateForm()

      fill(dialog, { date: '2026-01-11', weight: '4,85' })
      await save(dialog)

      const date = within(dialog).getByLabelText(/Date/)
      await waitFor(() => expect(date).toHaveAccessibleDescription('Cette date a été refusée par le serveur'))
      expect(within(dialog).getByLabelText(/Poids/)).toHaveAccessibleDescription('')
      expect(screen.queryByText(/This value/)).not.toBeInTheDocument()
    })

    it('attaches a violation on weight_grams to the weight field', async () => {
      writableApi()
      rejectWith([{ propertyPath: 'weight_grams', message: 'This value should be positive.' }])
      const dialog = await openCreateForm()

      fill(dialog, { date: '2026-01-11', weight: '4,85' })
      await save(dialog)

      expect(await within(dialog).findByText('Ce poids a été refusé par le serveur')).toBeInTheDocument()
    })

    it('shows a general message for a violation on another property', async () => {
      writableApi()
      rejectWith([{ propertyPath: 'dog', message: 'This value should not be null.' }])
      const dialog = await openCreateForm()

      fill(dialog, { date: '2026-01-11', weight: '4,85' })
      await save(dialog)

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        "Impossible d'enregistrer la pesée",
      )
      expect(screen.queryByText(/This value/)).not.toBeInTheDocument()
    })

    it('keeps the form open on a server error', async () => {
      writableApi()
      server.use(http.post('*/api/weight_entries', () => new HttpResponse(null, { status: 500 })))
      const dialog = await openCreateForm()

      fill(dialog, { date: '2026-01-11', weight: '4,85' })
      await save(dialog)

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        "Impossible d'enregistrer la pesée",
      )
      expect(within(dialog).getByLabelText(/Poids/)).toHaveValue('4,85')
    })
  })

  describe('warning on a probable typing mistake', () => {
    it('warns above 50 %, without blocking', async () => {
      const writes = writableApi()
      const dialog = await openCreateForm()

      fill(dialog, { date: '2026-01-11', weight: '48,5' })

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(/Écart de plus de 50/)

      await save(dialog)
      await dialogClosed()

      expect(writes.post[0].body).toMatchObject({ weight_grams: 48500 })
    })

    it('stays quiet for a normal gap, and without a previous weigh-in', async () => {
      writableApi()
      const dialog = await openCreateForm()

      fill(dialog, { date: '2026-01-11', weight: '4,9' })
      expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()

      fill(dialog, { date: '2026-01-09', weight: '48,5' })
      expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    })

    it('does not compare an edited weigh-in to itself', async () => {
      writableApi([EXISTING])
      renderApp(PAGE_URL)

      await userEvent.click(
        await screen.findByRole('button', { name: 'Modifier la pesée du 10/01/2026' }),
      )
      const dialog = await screen.findByRole('dialog')
      fill(dialog, { weight: '48,5' })

      expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
