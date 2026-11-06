import { TYPO_WARNING_PERCENT } from './constants'
import type { WeighIn } from './types'

export type WeightDelta = { grams: number; percent: number }

/** Chronological order. Y-m-d strings and UUID v7 both sort as plain strings. */
export function compareWeighIns(a: WeighIn, b: WeighIn): number {
  if (a.measured_at !== b.measured_at) {
    return a.measured_at < b.measured_at ? -1 : 1
  }

  if (a.id === b.id) {
    return 0
  }

  return a.id < b.id ? -1 : 1
}

export function weightDelta(grams: number, previousGrams: number): WeightDelta {
  const difference = grams - previousGrams

  return { grams: difference, percent: (difference * 100) / previousGrams }
}

export type WeighInWithDelta<T extends WeighIn> = T & { delta: WeightDelta | null }

/** The gap of each weigh-in from the previous line, same day included. */
export function withDeltas<T extends WeighIn>(chronological: readonly T[]): WeighInWithDelta<T>[] {
  return chronological.map((weighIn, index) => {
    const previous = chronological[index - 1]

    return {
      ...weighIn,
      delta: previous ? weightDelta(weighIn.weight_grams, previous.weight_grams) : null,
    }
  })
}

/**
 * The weigh-in just before a given date in a chronological list. A new
 * weigh-in comes after the others of its day; one being edited keeps its rank
 * and is not compared to itself.
 */
export function findPreviousWeighIn<T extends WeighIn>(
  chronological: readonly T[],
  measuredAt: string,
  editedId?: string,
): T | undefined {
  return chronological
    .filter(
      ({ id, measured_at }) =>
        id !== editedId &&
        (measured_at < measuredAt ||
          (measured_at === measuredAt && (editedId === undefined || id < editedId))),
    )
    .at(-1)
}

/** Probably a typing mistake, such as 48,5 for 4,85. */
export function isSuspiciousGap(grams: number, previousGrams: number): boolean {
  return Math.abs(grams - previousGrams) * 100 > TYPO_WARNING_PERCENT * previousGrams
}

const signedGrams = new Intl.NumberFormat('fr-FR', { signDisplay: 'exceptZero' })
const signedPercent = new Intl.NumberFormat('fr-FR', {
  style: 'percent',
  signDisplay: 'exceptZero',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatPercent(percent: number): string {
  return signedPercent.format(percent / 100)
}

export function formatDelta({ grams, percent }: WeightDelta): string {
  // The non-breaking space keeps the number and its unit together on a phone.
  return `${signedGrams.format(grams)}\u00A0g (${formatPercent(percent)})`
}
