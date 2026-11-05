import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Typography variant="h4" component="h1">
          Page introuvable
        </Typography>
        <Typography>Cette page n'existe pas ou a été déplacée.</Typography>
        <Button component={Link} to="/" variant="contained">
          Retour à l'accueil
        </Button>
      </Stack>
    </Container>
  )
}
