import { describe, expect, it } from 'vitest'
import { safeRedirectTarget } from './redirect'

describe('safeRedirectTarget', () => {
  it.each(['/', '/dogs/1', '/dogs?page=2#top'])('accepts the internal path %s', (from) => {
    expect(safeRedirectTarget(from)).toBe(from)
  })

  it.each([
    '//evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    'dogs',
    '',
    '/\\evil.example',
    '/\t/evil.example',
    '/\n/evil.example',
    undefined,
    null,
    42,
    { pathname: '/dogs' },
  ])('falls back to the home page for %j', (from) => {
    expect(safeRedirectTarget(from)).toBe('/')
  })
})
