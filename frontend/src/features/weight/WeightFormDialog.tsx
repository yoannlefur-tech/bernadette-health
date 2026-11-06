import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useId, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { MAX_WEIGHT_GRAMS, TYPO_WARNING_PERCENT } from './constants'
import { formatDate, todayApiDate } from './dates'
import type { WeighIn } from './types'
import { findPreviousWeighIn, isSuspiciousGap } from './weighIns'
import { useCreateWeighIn, useUpdateWeighIn, WeighInValidationError } from './weighInsApi'
import { formatKg, gramsToKgInput, parseKgInput } from './weightUnits'

type WeightFormValues = {
  measured_at: string
  weight_kg: string
}

type WeightFormDialogProps = {
  dogId: string
  dogIri: string
  birthDate: string | undefined
  /** In chronological order. */
  weighIns: readonly WeighIn[]
  /** The weigh-in to edit, null to create one. */
  editing: WeighIn | null
  onClose: () => void
}

const SAVE_ERROR = "Impossible d'enregistrer la pesée"

/**
 * The messages of the API are in English: each field gets a French one, never
 * the text of the server.
 */
const SERVER_FIELD_ERRORS: Record<string, { field: keyof WeightFormValues; message: string }> = {
  measured_at: { field: 'measured_at', message: 'Cette date a été refusée par le serveur' },
  weight_grams: { field: 'weight_kg', message: 'Ce poids a été refusé par le serveur' },
}

function validateWeight(input: string): string | true {
  const grams = parseKgInput(input)

  if (grams === null) {
    return 'Saisissez un poids supérieur à 0, avec trois décimales au plus (par exemple 4,85)'
  }

  return grams <= MAX_WEIGHT_GRAMS || 'Le poids ne peut pas dépasser 100 kg'
}

export function WeightFormDialog({
  dogId,
  dogIri,
  birthDate,
  weighIns,
  editing,
  onClose,
}: WeightFormDialogProps) {
  const titleId = useId()
  const [formError, setFormError] = useState<string | null>(null)
  const createWeighIn = useCreateWeighIn(dogId, dogIri)
  const updateWeighIn = useUpdateWeighIn(dogId)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WeightFormValues>({
    defaultValues: {
      measured_at: editing?.measured_at ?? todayApiDate(),
      weight_kg: editing ? gramsToKgInput(editing.weight_grams) : '',
    },
  })
  const measuredAt = useWatch({ control, name: 'measured_at' })
  const weightKg = useWatch({ control, name: 'weight_kg' })

  const grams = parseKgInput(weightKg)
  const previous = measuredAt ? findPreviousWeighIn(weighIns, measuredAt, editing?.id) : undefined
  const isSuspicious = grams !== null && previous && isSuspiciousGap(grams, previous.weight_grams)

  const onSubmit = async ({ measured_at, weight_kg }: WeightFormValues) => {
    setFormError(null)
    // Validated by the field: this is the same parsing.
    const values = { measured_at, weight_grams: parseKgInput(weight_kg) ?? 0 }

    try {
      if (editing) {
        await updateWeighIn.mutateAsync({ id: editing.id, values })
      } else {
        await createWeighIn.mutateAsync(values)
      }

      onClose()
    } catch (error) {
      if (!(error instanceof WeighInValidationError)) {
        setFormError(SAVE_ERROR)

        return
      }

      const fieldErrors = error.violations.flatMap(
        ({ propertyPath }) => SERVER_FIELD_ERRORS[propertyPath] ?? [],
      )

      fieldErrors.forEach(({ field, message }) => setError(field, { type: 'server', message }))

      // A violation on nothing the user can change, such as the dog.
      if (fieldErrors.length < error.violations.length || fieldErrors.length === 0) {
        setFormError(SAVE_ERROR)
      }
    }
  }

  return (
    <Dialog open fullWidth maxWidth="xs" onClose={onClose} aria-labelledby={titleId}>
      <Stack component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle id={titleId}>{editing ? 'Modifier la pesée' : 'Ajouter une pesée'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              {...register('measured_at', {
                required: 'Saisissez la date',
                validate: (value) => {
                  // Read at validation time: the dialog can stay open past midnight.
                  if (value > todayApiDate()) {
                    return 'La date ne peut pas être dans le futur'
                  }

                  return (
                    !birthDate ||
                    value >= birthDate ||
                    'La date ne peut pas être antérieure à la naissance'
                  )
                },
              })}
              label="Date"
              type="date"
              required
              error={Boolean(errors.measured_at)}
              helperText={errors.measured_at?.message}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { max: todayApiDate(), min: birthDate },
              }}
            />
            <TextField
              {...register('weight_kg', {
                required: 'Saisissez le poids',
                validate: validateWeight,
              })}
              label="Poids (kg)"
              required
              autoFocus={!editing}
              autoComplete="off"
              error={Boolean(errors.weight_kg)}
              helperText={errors.weight_kg?.message}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            {isSuspicious && (
              <Alert severity="warning">
                Écart de plus de {TYPO_WARNING_PERCENT} % avec la pesée du{' '}
                {formatDate(previous.measured_at)} ({formatKg(previous.weight_grams)} kg). Vérifiez
                la saisie : vous pouvez tout de même enregistrer.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="contained" loading={isSubmitting}>
            Enregistrer
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  )
}
