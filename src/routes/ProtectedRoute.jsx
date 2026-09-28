import { Navigate, useLocation } from 'react-router-dom'
import { getHomePath, getPrimaryRole } from '../constants/roles.js'
import { useAuth } from '../context/useAuth.js'

// Guards a page behind authentication and (optionally) specific roles.
// - Not signed in      -> /login (remembering where the user was going)
// - Signed in, wrong role -> that user's own dashboard
// UI-level guard only; the backend still enforces roles on every request
// (Guidelines §2.4: never trust a role value from the client).
function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const role = getPrimaryRole(user)
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getHomePath(user)} replace />
  }

  return children
}

export default ProtectedRoute
