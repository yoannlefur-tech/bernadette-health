import { Route, Routes } from 'react-router'
import { LoginPage } from './auth/LoginPage'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { DogWeightPage } from './features/weight/DogWeightPage'
import { HomePage } from './HomePage'
import { NotFoundPage } from './NotFoundPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route index element={<HomePage />} />
        <Route path="/dogs/:dogId" element={<DogWeightPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
