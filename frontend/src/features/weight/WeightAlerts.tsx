import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import { useMemo } from 'react'
import { computeWeightAlerts, formatWeightAlert } from './alerts'
import type { WeighIn } from './types'

type WeightAlertsProps = {
  /** In chronological order. */
  weighIns: readonly WeighIn[]
  birthDate: string | undefined
}

export function WeightAlerts({ weighIns, birthDate }: WeightAlertsProps) {
  const alerts = useMemo(() => computeWeightAlerts(weighIns, birthDate), [weighIns, birthDate])

  if (alerts.length === 0) {
    return null
  }

  return (
    <Alert severity="warning">
      {alerts.map((alert) => (
        <Typography key={alert.kind} variant="body2">
          {formatWeightAlert(alert)}
        </Typography>
      ))}
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        Aide indicative, qui ne remplace pas l'avis du vétérinaire.
      </Typography>
    </Alert>
  )
}
