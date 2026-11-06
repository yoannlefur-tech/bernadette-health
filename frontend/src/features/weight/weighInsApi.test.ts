import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import { apiWeighIn, DOG_IRI, weighInsPage } from './testApi'
import { fetchAllWeighIns, weighInsQueryKey } from './weighInsApi'

const NEXT = (page: number) =>
  `/api/weight_entries?dog=${encodeURIComponent(DOG_IRI)}&page=${page}`

describe('fetchAllWeighIns', () => {
  it('follows view.next to the end and gives the chronological order', async () => {
    const requested: (string | null)[][] = []
    const pages: Record<string, ReturnType<typeof weighInsPage>> = {
      '1': weighInsPage(
        [apiWeighIn('e', '2026-03-01', 5000), apiWeighIn('d', '2026-02-01', 4900)],
        NEXT(2),
      ),
      '2': weighInsPage(
        [apiWeighIn('c', '2026-01-15', 4800), apiWeighIn('b', '2026-01-15', 4700)],
        NEXT(3),
      ),
      '3': weighInsPage([apiWeighIn('a', '2026-01-01', 4600)]),
    }

    server.use(
      http.get('*/api/weight_entries', ({ request }) => {
        const { searchParams } = new URL(request.url)
        requested.push([searchParams.get('dog'), searchParams.get('page')])

        return HttpResponse.json(pages[searchParams.get('page') ?? ''])
      }),
    )

    const weighIns = await fetchAllWeighIns(DOG_IRI)

    expect(weighIns.map(({ id }) => id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(requested).toEqual([
      [DOG_IRI, '1'],
      [DOG_IRI, '2'],
      [DOG_IRI, '3'],
    ])
  })

  it('keeps a weigh-in once when a line moves to the next page', async () => {
    server.use(
      http.get('*/api/weight_entries', ({ request }) =>
        new URL(request.url).searchParams.get('page') === '1'
          ? HttpResponse.json(weighInsPage([apiWeighIn('b', '2026-02-01', 4900)], NEXT(2)))
          : HttpResponse.json(
              weighInsPage([apiWeighIn('b', '2026-02-01', 4900), apiWeighIn('a', '2026-01-01', 4800)]),
            ),
      ),
    )

    expect((await fetchAllWeighIns(DOG_IRI)).map(({ id }) => id)).toEqual(['a', 'b'])
  })

  it('fails when a following page fails, rather than giving a partial list', async () => {
    server.use(
      http.get('*/api/weight_entries', ({ request }) =>
        new URL(request.url).searchParams.get('page') === '1'
          ? HttpResponse.json(weighInsPage([apiWeighIn('b', '2026-02-01', 4900)], NEXT(2)))
          : new HttpResponse(null, { status: 500 }),
      ),
    )

    await expect(fetchAllWeighIns(DOG_IRI)).rejects.toThrow()
  })

  it('does not loop on a next page which does not move forward', async () => {
    server.use(
      http.get('*/api/weight_entries', () =>
        HttpResponse.json(weighInsPage([apiWeighIn('a', '2026-01-01', 4800)], NEXT(1))),
      ),
    )

    await expect(fetchAllWeighIns(DOG_IRI)).rejects.toThrow('Invalid next page')
  })

  it('stays on the API when view.next is on another host', async () => {
    const hosts: string[] = []

    server.use(
      http.get('*/api/weight_entries', ({ request }) => {
        const url = new URL(request.url)
        hosts.push(url.host)

        return HttpResponse.json(
          url.searchParams.get('page') === '1'
            ? weighInsPage(
                [apiWeighIn('b', '2026-02-01', 4900)],
                'https://evil.example/api/weight_entries?page=2',
              )
            : weighInsPage([apiWeighIn('a', '2026-01-01', 4800)]),
        )
      }),
    )

    await fetchAllWeighIns(DOG_IRI)

    expect(hosts).toEqual([window.location.host, window.location.host])
  })
})

describe('weighInsQueryKey', () => {
  it('includes the dog', () => {
    expect(weighInsQueryKey('dog-1')).toContain('dog-1')
    expect(weighInsQueryKey('dog-1')).not.toEqual(weighInsQueryKey('dog-2'))
  })
})
