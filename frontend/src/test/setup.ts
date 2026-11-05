import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { endSession } from '../api/tokenStore'
import { server } from './server'

// The first render of a file takes over a second when the files run in parallel.
configure({ asyncUtilTimeout: 3000 })

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  endSession()
})

afterAll(() => {
  server.close()
})
