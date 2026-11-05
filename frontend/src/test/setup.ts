import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { endSession } from '../api/tokenStore'
import { server } from './server'

// The SVG of the chart is not tested, and needs layout jsdom does not have.
vi.mock('@mui/x-charts/LineChart', () => ({ LineChart: () => null }))

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
