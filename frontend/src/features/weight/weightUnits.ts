const KG_INPUT = /^(\d+)(?:[.,](\d{1,3}))?$/

/**
 * Grams from a weight typed in kg (comma or point, three decimals at most).
 * Works on the digits: `4.85 * 1000` would be a float. Null when invalid.
 */
export function parseKgInput(input: string): number | null {
  const match = KG_INPUT.exec(input.trim())

  if (!match) {
    return null
  }

  const grams = Number(match[1]) * 1000 + Number((match[2] ?? '').padEnd(3, '0'))

  return grams > 0 && Number.isSafeInteger(grams) ? grams : null
}

const kgFormat = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
  useGrouping: false,
})

/** For display: "4,85". */
export function formatKg(grams: number): string {
  return kgFormat.format(grams / 1000)
}

/** To fill the form with an existing weight: "4,85", "4". */
export function gramsToKgInput(grams: number): string {
  const decimals = String(grams % 1000).padStart(3, '0').replace(/0+$/, '')
  const kilos = Math.floor(grams / 1000)

  return decimals ? `${kilos},${decimals}` : String(kilos)
}
