import { describe, expect, it } from 'vitest'
import { formatDate, parseApiDate } from './dates'

describe('parseApiDate', () => {
  it('gives midnight local time, on the same calendar day', () => {
    const date = parseApiDate('2026-03-01')

    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(2)
    expect(date.getDate()).toBe(1)
    expect(date.getHours()).toBe(0)
  })

  it('rejects anything else than Y-m-d', () => {
    expect(() => parseApiDate('01/03/2026')).toThrow(RangeError)
  })
})

describe('formatDate', () => {
  it('formats in French without moving to another day', () => {
    expect(formatDate('2026-03-01')).toBe('01/03/2026')
  })
})
