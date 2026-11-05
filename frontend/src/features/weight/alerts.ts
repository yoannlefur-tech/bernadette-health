import {
  GAIN_ALERT_MIN_AGE_MONTHS,
  GAIN_ALERT_PERCENT,
  GAIN_ALERT_WINDOW_DAYS,
  LOSS_ALERT_PERCENT,
} from './constants'
import { ageInMonths, daysBetween, formatShortDate } from './dates'
import { formatPercent, weightDelta } from './weighIns'
import type { WeighIn } from './types'

export type WeightAlert = {
  kind: 'loss' | 'gain'
  percent: number
  since: string
}

/**
 * Rules on the latest weigh-in only. Weight varies with meals within a day, so
 * a weigh-in of the same day is never a reference. Thresholds are compared on
 * integers: exactly 5 % is an alert, whatever the float rounding.
 */
export function computeWeightAlerts(
  chronological: readonly WeighIn[],
  birthDate: string | undefined,
): WeightAlert[] {
  const latest = chronological.at(-1)

  if (!latest) {
    return []
  }

  const earlier = chronological.filter(({ measured_at }) => measured_at < latest.measured_at)
  const alerts: WeightAlert[] = []

  const previous = earlier.at(-1)

  if (
    previous &&
    (previous.weight_grams - latest.weight_grams) * 100 >= LOSS_ALERT_PERCENT * previous.weight_grams
  ) {
    alerts.push({
      kind: 'loss',
      percent: weightDelta(latest.weight_grams, previous.weight_grams).percent,
      since: previous.measured_at,
    })
  }

  // A puppy is expected to gain weight.
  if (birthDate && ageInMonths(birthDate, latest.measured_at) >= GAIN_ALERT_MIN_AGE_MONTHS) {
    const oldest = earlier.find(
      ({ measured_at }) => daysBetween(measured_at, latest.measured_at) <= GAIN_ALERT_WINDOW_DAYS,
    )

    if (
      oldest &&
      (latest.weight_grams - oldest.weight_grams) * 100 >= GAIN_ALERT_PERCENT * oldest.weight_grams
    ) {
      alerts.push({
        kind: 'gain',
        percent: weightDelta(latest.weight_grams, oldest.weight_grams).percent,
        since: oldest.measured_at,
      })
    }
  }

  return alerts
}

/** "-6,2 % depuis le 12/10" */
export function formatWeightAlert({ percent, since }: WeightAlert): string {
  return `${formatPercent(percent)} depuis le ${formatShortDate(since)}`
}
