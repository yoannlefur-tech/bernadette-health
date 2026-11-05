import Typography from '@mui/material/Typography'
import { Route, Routes } from 'react-router'
import { LoginPage } from './auth/LoginPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Typography variant="h1">Bernadette Health</Typography>} />
    </Routes>
  )
}

export default App
