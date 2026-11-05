import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { useId } from 'react'
import { formatDate } from './dates'
import type { WeighIn } from './types'
import { useDeleteWeighIn } from './weighInsApi'
import { formatKg } from './weightUnits'

type DeleteWeighInDialogProps = {
  dogId: string
  weighIn: WeighIn
  onClose: () => void
}

export function DeleteWeighInDialog({ dogId, weighIn, onClose }: DeleteWeighInDialogProps) {
  const titleId = useId()
  const { mutate, isPending, isError } = useDeleteWeighIn(dogId)

  return (
    <Dialog open fullWidth maxWidth="xs" onClose={onClose} aria-labelledby={titleId}>
      <DialogTitle id={titleId}>Supprimer cette pesée ?</DialogTitle>
      <DialogContent>
        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Impossible de supprimer la pesée
          </Alert>
        )}
        <DialogContentText>
          Pesée du {formatDate(weighIn.measured_at)} : {formatKg(weighIn.weight_grams)} kg. Cette
          action est définitive.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          color="error"
          variant="contained"
          loading={isPending}
          onClick={() => mutate(weighIn.id, { onSuccess: onClose })}
        >
          Supprimer
        </Button>
      </DialogActions>
    </Dialog>
  )
}
