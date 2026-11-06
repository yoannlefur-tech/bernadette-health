import { parseApiDate } from './dates'
import type { WeighIn } from './types'

export type WeightChartData = {
  dates: Date[]
  grams: number[]
}

/** The two parallel series of the chart. Dates stay local, weights in grams. */
export function buildChartData(chronological: readonly WeighIn[]): WeightChartData {
  return {
    dates: chronological.map(({ measured_at }) => parseApiDate(measured_at)),
    grams: chronological.map(({ weight_grams }) => weight_grams),
  }
}

const axisDate = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' })
const tooltipDate = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: '2-digit',
})

/** Dates of the time axis: "juil. 22" on the ticks, "12 juil. 22" in the tooltip. */
export function formatChartDate(date: Date, location: string): string {
  return location === 'tooltip' ? tooltipDate.format(date) : axisDate.format(date)
}
