import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'

export const DOG_ID = '0190a000-0000-7000-8000-000000000001'
export const DOG_IRI = `/api/dogs/${DOG_ID}`

export const bernadette = {
  '@id': DOG_IRI,
  '@type': 'Dog',
  id: DOG_ID,
  name: 'Bernadette',
  birth_date: '2022-03-14',
  breed: 'Teckel nain',
  coat: 'Poil long',
}

/** A logged in session and the dog above. */
export function mockLoggedInApi() {
  server.use(
    http.post('*/api/auth/refresh', () => HttpResponse.json({ token: 'test-token' })),
    http.get('*/api/me', () =>
      HttpResponse.json({ '@id': '/api/me', '@type': 'User', email: 'dev@example.com' }),
    ),
    http.get(`*${DOG_IRI}`, () => HttpResponse.json(bernadette)),
  )
}

export function apiWeighIn(id: string, measured_at: string, weight_grams: number) {
  return {
    '@id': `/api/weight_entries/${id}`,
    '@type': 'WeightEntry',
    id,
    dog: DOG_IRI,
    measured_at,
    weight_grams,
  }
}

/** A JSON-LD collection page of the weigh-ins. */
export function weighInsPage(member: ReturnType<typeof apiWeighIn>[], next?: string) {
  return { member, totalItems: member.length, ...(next ? { view: { next } } : {}) }
}
