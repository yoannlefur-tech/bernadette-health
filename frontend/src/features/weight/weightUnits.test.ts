import { describe, expect, it } from 'vitest'
import { formatKg, gramsToKgInput, parseKgInput } from './weightUnits'

describe('parseKgInput', () => {
  it.each([
    ['4,85', 4850],
    ['4.855', 4855],
    ['4', 4000],
    [' 4,5 ', 4500],
    ['0,001', 1],
    // As floats, 1.005 * 1000 is 1004.9999999999999.
    ['1,005', 1005],
  ])('reads %s as %i g', (input, grams) => {
    expect(parseKgInput(input)).toBe(grams)
  })

  it.each(['4,8555', '0', '0,000', '-4,85', 'abc', '', '4,', ',5', '4,85kg', '1e3', '4,8,5'])(
    'rejects "%s"',
    (input) => {
      expect(parseKgInput(input)).toBeNull()
    },
  )
})

describe('formatKg', () => {
  it('uses a comma and keeps the grams', () => {
    expect(formatKg(4850)).toBe('4,85')
    expect(formatKg(4855)).toBe('4,855')
    expect(formatKg(4000)).toBe('4,00')
  })
})

describe('gramsToKgInput', () => {
  it.each([
    [4850, '4,85'],
    [4855, '4,855'],
    [4000, '4'],
    [4005, '4,005'],
    [1, '0,001'],
  ])('writes %i g as %s, which reads back the same', (grams, input) => {
    expect(gramsToKgInput(grams)).toBe(input)
    expect(parseKgInput(input)).toBe(grams)
  })
})
