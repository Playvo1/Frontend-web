import { Navigate, useLocation } from 'react-router-dom'
import { ROLES, ROLE_LOGIN, getHomePath } from '../constants/roles.js'
import { useAuth } from '../context/useAuth.js'

// "/" and unknown URLs: signed-in users go to their dashboard, everyone
// else to a login page — /admin/login for /admin and /admin/... URLs,
// /login otherwise.
function isAdminPath(pathname) {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

function HomeRedirect() {
  const { isAuthenticated, user } = useAuth()
  const { pathname } = useLocation()
  const loginPath = isAdminPath(pathname) ? ROLE_LOGIN[ROLES.ADMIN] : ROLE_LOGIN[ROLES.VENUE_OWNER]
  return <Navigate to={isAuthenticated ? getHomePath(user) : loginPath} replace />
}

export default HomeRedirect
