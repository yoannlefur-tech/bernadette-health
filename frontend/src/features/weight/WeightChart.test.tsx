import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildChartData, formatChartDate } from './chartData'
import { WeightChart } from './WeightChart'

const weighIn = (id: string, measured_at: string, weight_grams: number) => ({
  id,
  measured_at,
  weight_grams,
})

describe('buildChartData', () => {
  it('gives one point per weigh-in, same day included, on local dates', () => {
    const { dates, grams } = buildChartData([
      weighIn('a', '2026-11-05', 4000),
      weighIn('b', '2026-11-06', 4100),
      weighIn('c', '2026-11-06', 4200),
    ])

    expect(grams).toEqual([4000, 4100, 4200])
    expect(dates).toEqual([
      new Date(2026, 10, 5),
      new Date(2026, 10, 6),
      new Date(2026, 10, 6),
    ])
  })

  it('keeps the order it receives', () => {
    const { grams } = buildChartData([
      weighIn('a', '2026-01-01', 4000),
      weighIn('b', '2026-02-01', 4100),
    ])

    expect(grams).toEqual([4000, 4100])
  })

  it('gives empty series without a weigh-in', () => {
    expect(buildChartData([])).toEqual({ dates: [], grams: [] })
  })
})

describe('formatChartDate', () => {
  it('runs in the time zone of the script', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Europe/Paris')
  })

  it('shows the month and the year on the axis', () => {
    expect(formatChartDate(new Date(2022, 6, 12), 'tick')).toBe('juil. 22')
    expect(formatChartDate(new Date(2026, 0, 1), 'tick')).toBe('janv. 26')
  })

  it('adds the day in the tooltip', () => {
    expect(formatChartDate(new Date(2022, 6, 12), 'tooltip')).toBe('12 juil. 22')
  })

  it('uses the local month, not the UTC one, around midnight', () => {
    // July 1st at 00:30 in Paris, still June 30th in UTC.
    const date = new Date('2022-06-30T22:30:00Z')

    expect(formatChartDate(date, 'tick')).toBe('juil. 22')
    expect(formatChartDate(date, 'tooltip')).toBe('1 juil. 22')
  })

  it('formats a date of the API on its own day', () => {
    const [date] = buildChartData([weighIn('a', '2022-07-01', 4000)]).dates

    expect(formatChartDate(date, 'tooltip')).toBe('1 juil. 22')
  })
})

describe('WeightChart', () => {
  it.each([[0], [1]])('shows a message instead of the chart with %i weigh-in', (count) => {
    const weighIns = [weighIn('a', '2026-01-01', 4000)].slice(0, count)
    render(<WeightChart dogName="Bernadette" weighIns={weighIns} />)

    expect(screen.getByText("La courbe s'affiche à partir de deux pesées.")).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('labels the chart from two weigh-ins', () => {
    render(
      <WeightChart
        dogName="Bernadette"
        weighIns={[weighIn('a', '2026-01-01', 4000), weighIn('b', '2026-02-01', 4100)]}
      />,
    )

    expect(screen.getByRole('img')).toHaveAccessibleName(/Courbe du poids de Bernadette/)
    expect(screen.queryByText(/à partir de deux pesées/)).not.toBeInTheDocument()
  })
})
