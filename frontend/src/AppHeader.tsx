import AppBar from '@mui/material/AppBar'
import Button from '@mui/material/Button'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { useAuth } from './auth/authContext'

export function AppHeader() {
  const { user, logout } = useAuth()

  return (
    <AppBar position="static">
      <Toolbar sx={{ gap: 2 }}>
        <Typography variant="h6" component="div" noWrap sx={{ flexGrow: 1 }}>
          Bernadette Health
        </Typography>
        <Typography noWrap sx={{ display: { xs: 'none', sm: 'block' } }}>
          {user?.email}
        </Typography>
        <Button color="inherit" onClick={() => void logout()}>
          Déconnexion
        </Button>
      </Toolbar>
    </AppBar>
  )
}
