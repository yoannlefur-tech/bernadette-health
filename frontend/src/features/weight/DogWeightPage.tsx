import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link, useParams } from 'react-router'
import { AppHeader } from '../../AppHeader'
import { formatDate } from './dates'
import { useDog } from './useDog'
import { WeightSection } from './WeightSection'

function DogNotFound() {
  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Typography variant="h5" component="h1">
        Chien introuvable
      </Typography>
      <Button component={Link} to="/" variant="contained">
        Retour à l'accueil
      </Button>
    </Stack>
  )
}

function DogContent({ dogId }: { dogId: string }) {
  const { data: dog, isPending, isError } = useDog(dogId)

  if (isPending) {
    return <CircularProgress aria-label="Chargement" />
  }

  if (isError) {
    return <Alert severity="error">Impossible de charger ce chien</Alert>
  }

  if (!dog) {
    return <DogNotFound />
  }

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5" component="h1">
          {dog.name}
        </Typography>
        <Typography color="text.secondary">
          {dog.breed}
          {dog.birth_date && ` · Date de naissance : ${formatDate(dog.birth_date)}`}
        </Typography>
      </div>
      <WeightSection dogId={dogId} dog={dog} />
    </Stack>
  )
}

export function DogWeightPage() {
  const { dogId = '' } = useParams()

  return (
    <>
      <AppHeader />
      <Container maxWidth="md" component="main" sx={{ py: 4, px: 2 }}>
        <DogContent key={dogId} dogId={dogId} />
      </Container>
    </>
  )
}
