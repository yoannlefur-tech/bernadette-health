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
