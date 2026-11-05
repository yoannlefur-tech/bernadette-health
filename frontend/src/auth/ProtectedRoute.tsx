import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './authContext'
import { LoadingScreen } from './LoadingScreen'

export function ProtectedRoute() {
  const { status } = useAuth()
  const { pathname, search, hash } = useLocation()

  if (status === 'loading') {
    return <LoadingScreen />
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: `${pathname}${search}${hash}` }} />
  }

  return <Outlet />
}
