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
