import { Navigate } from 'react-router-dom'
import { getHomePath } from '../constants/roles.js'
import { useAuth } from '../context/useAuth.js'

// "/" and unknown URLs: signed-in users go to their dashboard, everyone
// else to /login.
function HomeRedirect() {
  const { isAuthenticated, user } = useAuth()
  return <Navigate to={isAuthenticated ? getHomePath(user) : '/login'} replace />
}

export default HomeRedirect
