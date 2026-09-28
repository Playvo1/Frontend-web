import { Navigate, useLocation } from 'react-router-dom'
import { getHomePath } from '../constants/roles.js'
import { useAuth } from '../context/useAuth.js'

// For pages that only make sense when signed out (/login). Once the user is
// signed in (including right after a successful login) they are sent to the
// page they originally tried to open, or else to their own dashboard. If
// that original page belongs to another role, ProtectedRoute bounces them
// to their own dashboard.
function GuestRoute({ children }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (isAuthenticated) {
    const from = location.state?.from?.pathname
    return <Navigate to={from || getHomePath(user)} replace />
  }

  return children
}

export default GuestRoute
