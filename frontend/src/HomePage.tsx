import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { client } from './api/client'
import { AppHeader } from './AppHeader'

async function fetchDogs() {
  const { data } = await client.GET('/api/dogs')

  if (!data) {
    throw new Error('Could not load the dogs')
  }

  return data.member
}

function DogList() {
  const { data: dogs, isPending, isError } = useQuery({ queryKey: ['dogs'], queryFn: fetchDogs })

  if (isPending) {
    return <CircularProgress aria-label="Chargement" />
  }

  if (isError) {
    return <Alert severity="error">Impossible de charger les chiens</Alert>
  }

  if (dogs.length === 0) {
    return <Typography>Aucun chien pour le moment</Typography>
  }

  return (
    <List>
      {dogs.map((dog) => (
        <ListItem key={dog['@id']} disablePadding>
          <ListItemButton component={Link} to={`/dogs/${dog.id}`}>
            <ListItemText primary={dog.name} secondary={`${dog.breed}, ${dog.coat}`} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  )
}

export function HomePage() {
  return (
    <>
      <AppHeader />
      <Container maxWidth="sm" component="main" sx={{ py: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Mes chiens
        </Typography>
        <Box>
          <DogList />
        </Box>
      </Container>
    </>
  )
}
