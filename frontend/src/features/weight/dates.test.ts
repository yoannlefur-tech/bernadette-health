import { describe, expect, it } from 'vitest'
import { ageInMonths, daysBetween, formatDate, parseApiDate, todayApiDate } from './dates'

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

describe('todayApiDate', () => {
  it('runs in the time zone of the script, where UTC is another day', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Europe/Paris')
  })

  it('gives the local day just after midnight, winter time', () => {
    // 00:30 in Paris on November 6th, still November 5th in UTC.
    expect(todayApiDate(new Date('2026-11-05T23:30:00Z'))).toBe('2026-11-06')
  })

  it('gives the local day just after midnight, summer time', () => {
    // 01:30 in Paris on July 1st, still June 30th in UTC.
    expect(todayApiDate(new Date('2026-06-30T23:30:00Z'))).toBe('2026-07-01')
  })

  it('gives the local day just before midnight', () => {
    expect(todayApiDate(new Date('2026-11-05T22:59:00Z'))).toBe('2026-11-05')
  })
})

describe('parseApiDate around midnight', () => {
  it('stays on the calendar day when UTC is on the previous one', () => {
    expect(parseApiDate('2026-11-06').toISOString()).toBe('2026-11-05T23:00:00.000Z')
    expect(todayApiDate(parseApiDate('2026-11-06'))).toBe('2026-11-06')
  })
})

describe('daysBetween', () => {
  it('counts calendar days across a daylight saving change', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
  })
})

describe('ageInMonths', () => {
  it('counts completed months', () => {
    expect(ageInMonths('2025-03-14', '2026-03-13')).toBe(11)
    expect(ageInMonths('2025-03-14', '2026-03-14')).toBe(12)
  })

  it('handles a birth on February 29th', () => {
    expect(ageInMonths('2024-02-29', '2025-02-28')).toBe(11)
    expect(ageInMonths('2024-02-29', '2025-03-01')).toBe(12)
  })
})
