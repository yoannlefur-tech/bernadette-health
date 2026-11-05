import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter, type InitialEntry } from 'react-router'
import App from '../App'
import { AuthProvider } from '../auth/AuthProvider'

/** The whole application, under the same providers as main.tsx. */
export function renderApp(initialEntry: InitialEntry = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <App />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )

  return queryClient
}
