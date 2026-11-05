import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router'
import { LoginError, useAuth } from './authContext'
import { LoadingScreen } from './LoadingScreen'
import { safeRedirectTarget } from './redirect'

type LoginFormValues = {
  email: string
  password: string
}

function loginErrorMessage(error: unknown): string {
  const status = error instanceof LoginError ? error.status : null

  switch (status) {
    case 401:
      return 'Identifiants invalides'
    case 429:
      return 'Trop de tentatives, réessayez plus tard'
    default:
      return 'Erreur serveur'
  }
}

export function LoginPage() {
  const { status, login } = useAuth()
  const location = useLocation()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ defaultValues: { email: '', password: '' } })

  if (status === 'loading') {
    return <LoadingScreen />
  }

  if (status === 'authenticated') {
    return <Navigate to={safeRedirectTarget(location.state?.from)} replace />
  }

  const onSubmit = async ({ email, password }: LoginFormValues) => {
    setErrorMessage(null)

    try {
      await login(email, password)
    } catch (error) {
      setErrorMessage(loginErrorMessage(error))
    }
  }

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Stack component="form" spacing={2} noValidate onSubmit={handleSubmit(onSubmit)}>
          <Typography variant="h5" component="h1">
            Connexion
          </Typography>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          <TextField
            {...register('email', { required: 'Saisissez votre email' })}
            label="Email"
            type="email"
            autoComplete="username"
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
          />
          <TextField
            {...register('password', { required: 'Saisissez votre mot de passe' })}
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
          />
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Se connecter
          </Button>
        </Stack>
      </Paper>
    </Container>
  )
}
