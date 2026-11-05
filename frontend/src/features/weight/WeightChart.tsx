import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { LineChart } from '@mui/x-charts/LineChart'
import { useMemo } from 'react'
import { buildChartData } from './chartData'
import type { WeighIn } from './types'
import { formatKg } from './weightUnits'

const tickDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' })
const tooltipDate = new Intl.DateTimeFormat('fr-FR')

type WeightChartProps = {
  dogName: string
  /** In chronological order. */
  weighIns: readonly WeighIn[]
}

export function WeightChart({ dogName, weighIns }: WeightChartProps) {
  const { dates, grams } = useMemo(() => buildChartData(weighIns), [weighIns])

  if (weighIns.length < 2) {
    return (
      <Typography color="text.secondary">
        La courbe s'affiche à partir de deux pesées.
      </Typography>
    )
  }

  return (
    <Box role="img" aria-label={`Courbe du poids de ${dogName} : ${weighIns.length} pesées, détaillées dans l'historique`}>
      {/* Without a width, the chart follows the one of its parent. */}
      <LineChart
        height={280}
        hideLegend
        xAxis={[
          {
            scaleType: 'time',
            data: dates,
            valueFormatter: (date: Date, { location }) =>
              location === 'tooltip' ? tooltipDate.format(date) : tickDate.format(date),
          },
        ]}
        yAxis={[{ label: 'kg', width: 56, valueFormatter: (value: number) => formatKg(value) }]}
        series={[
          {
            data: grams,
            label: 'Poids',
            curve: 'linear',
            showMark: true,
            valueFormatter: (value) => (value === null ? null : `${formatKg(value)} kg`),
          },
        ]}
      />
    </Box>
  )
}
