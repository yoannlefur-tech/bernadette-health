import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { DeleteWeighInDialog } from './DeleteWeighInDialog'
import type { Dog, WeighIn } from './types'
import { useWeighIns } from './weighInsApi'
import { WeightFormDialog } from './WeightFormDialog'
import { WeightHistory } from './WeightHistory'

type WeightSectionProps = {
  dogId: string
  dog: Dog
}

export function WeightSection({ dogId, dog }: WeightSectionProps) {
  const { data: weighIns, isPending, isError } = useWeighIns(dogId, dog['@id'])
  const [deleted, setDeleted] = useState<WeighIn | null>(null)
  const [form, setForm] = useState<{ editing: WeighIn | null } | null>(null)

  if (isPending) {
    return <CircularProgress aria-label="Chargement des pesées" />
  }

  if (isError) {
    return <Alert severity="error">Impossible de charger les pesées</Alert>
  }

  const openCreateForm = () => setForm({ editing: null })

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="h2">
          Historique
        </Typography>
        {weighIns.length > 0 && (
          <Button variant="contained" size="small" onClick={openCreateForm}>
            Ajouter une pesée
          </Button>
        )}
      </Stack>
      <WeightHistory
        weighIns={weighIns}
        onAdd={openCreateForm}
        onEdit={(editing) => setForm({ editing })}
        onDelete={setDeleted}
      />
      {form && (
        <WeightFormDialog
          dogId={dogId}
          dogIri={dog['@id']}
          birthDate={dog.birth_date}
          weighIns={weighIns}
          editing={form.editing}
          onClose={() => setForm(null)}
        />
      )}
      {deleted && (
        <DeleteWeighInDialog dogId={dogId} weighIn={deleted} onClose={() => setDeleted(null)} />
      )}
    </Stack>
  )
}
