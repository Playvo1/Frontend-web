import { ROLES, ROLE_LOGIN } from '../../constants/roles.js'
import AdminAuthHero from '../AdminLogin/AdminAuthHero.jsx'
import ForgotPassword from '../ForgotPassword/ForgotPassword.jsx'

// Admin "Forgot password?" — recovery step 1, route: /admin/forgot-password.
// Opened from /admin/login. From the Admin design reference: the same form
// column as /forgot-password (back link, language switcher, title, email
// field, "Next") with the Admin hero (AdminAuthHero) instead of the Venue
// Owner one.
//
// Same logic and backend call as the Venue Owner page (ForgotPassword.jsx,
// POST /auth/forgot-password). The next steps (/verify-code,
// /reset-password) are shared; they and the back link return to
// /admin/login.
function AdminForgotPassword() {
  return <ForgotPassword hero={<AdminAuthHero />} loginPath={ROLE_LOGIN[ROLES.ADMIN]} />
}

export default AdminForgotPassword
