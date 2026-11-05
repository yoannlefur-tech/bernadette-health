import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Same origin as the page: no CORS, and the refresh cookie passes as is.
    // Not prefixed with VITE_, so it stays out of the browser bundle.
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://backend:8000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
