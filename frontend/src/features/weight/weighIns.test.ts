import { describe, expect, it } from 'vitest'
import {
  compareWeighIns,
  findPreviousWeighIn,
  formatDelta,
  isSuspiciousGap,
  weightDelta,
  withDeltas,
} from './weighIns'

const weighIn = (id: string, measured_at: string, weight_grams = 4000) => ({
  id,
  measured_at,
  weight_grams,
})

const clean = (text: string) => text.replace(/\s/g, ' ')

describe('compareWeighIns', () => {
  it('sorts by date, then by id', () => {
    const sorted = [
      weighIn('b', '2026-01-02'),
      weighIn('c', '2026-01-01'),
      weighIn('a', '2026-01-02'),
    ].sort(compareWeighIns)

    expect(sorted.map(({ id }) => id)).toEqual(['c', 'a', 'b'])
  })
})

describe('weightDelta', () => {
  it('gives grams and percentage', () => {
    expect(weightDelta(4100, 4000)).toEqual({ grams: 100, percent: 2.5 })
    expect(weightDelta(3800, 4000)).toEqual({ grams: -200, percent: -5 })
  })
})

describe('formatDelta', () => {
  it('shows the sign, in French', () => {
    expect(clean(formatDelta(weightDelta(4100, 4000)))).toBe('+100 g (+2,5 %)')
    expect(clean(formatDelta(weightDelta(3800, 4000)))).toBe('-200 g (-5,0 %)')
    expect(clean(formatDelta(weightDelta(4000, 4000)))).toBe('0 g (0,0 %)')
  })
})

describe('withDeltas', () => {
  it('compares each line with the previous one, same day included', () => {
    const lines = withDeltas([
      weighIn('a', '2026-01-01', 4000),
      weighIn('b', '2026-01-02', 4100),
      weighIn('c', '2026-01-02', 4200),
    ])

    expect(lines.map(({ delta }) => delta?.grams ?? null)).toEqual([null, 100, 100])
  })
})

describe('findPreviousWeighIn', () => {
  const list = [
    weighIn('a', '2026-01-01'),
    weighIn('b', '2026-01-05'),
    weighIn('c', '2026-01-05'),
    weighIn('d', '2026-01-09'),
  ]

  it('finds the latest weigh-in before the date of a new one', () => {
    expect(findPreviousWeighIn(list, '2026-01-07')?.id).toBe('c')
    expect(findPreviousWeighIn(list, '2025-12-31')).toBeUndefined()
  })

  it('puts a new weigh-in after the others of its day', () => {
    expect(findPreviousWeighIn(list, '2026-01-05')?.id).toBe('c')
  })

  it('does not compare an edited weigh-in to itself and keeps its rank', () => {
    expect(findPreviousWeighIn(list, '2026-01-09', 'd')?.id).toBe('c')
    expect(findPreviousWeighIn(list, '2026-01-05', 'c')?.id).toBe('b')
    expect(findPreviousWeighIn(list, '2026-01-05', 'b')?.id).toBe('a')
    expect(findPreviousWeighIn(list, '2026-01-01', 'a')).toBeUndefined()
  })
})

describe('isSuspiciousGap', () => {
  it('flags a gap above 50 %, both ways', () => {
    expect(isSuspiciousGap(48500, 4850)).toBe(true)
    expect(isSuspiciousGap(1000, 4850)).toBe(true)
  })

  it('does not flag exactly 50 %', () => {
    expect(isSuspiciousGap(6000, 4000)).toBe(false)
    expect(isSuspiciousGap(2000, 4000)).toBe(false)
  })
})
