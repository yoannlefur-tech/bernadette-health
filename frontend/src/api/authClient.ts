import createClient from 'openapi-fetch'
import type { paths } from './schema'

// Login, refresh and logout: no middleware, so no Bearer token and no refresh.
// The base URL is the page's origin (the Vite proxy in dev), made absolute
// because Request rejects relative URLs outside a browser. fetch is resolved on
// each call so that it is never a stale reference to the global.
export const authClient = createClient<paths>({
  baseUrl: window.location.origin,
  fetch: (request) => globalThis.fetch(request),
})
