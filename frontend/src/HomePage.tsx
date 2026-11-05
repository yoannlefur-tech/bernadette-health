import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import { client } from './api/client'
import { useAuth } from './auth/authContext'

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
        <ListItem key={dog['@id']} disableGutters>
          <ListItemText primary={dog.name} secondary={`${dog.breed}, ${dog.coat}`} />
        </ListItem>
      ))}
    </List>
  )
}

export function HomePage() {
  const { user, logout } = useAuth()

  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Bernadette Health
          </Typography>
          <Typography noWrap>{user?.email}</Typography>
          <Button color="inherit" onClick={() => void logout()}>
            Déconnexion
          </Button>
        </Toolbar>
      </AppBar>
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
