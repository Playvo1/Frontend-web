import { ROLES } from '../../constants/roles.js'
import Login from '../Login/Login.jsx'
import AdminAuthHero from './AdminAuthHero.jsx'
import './AdminLogin.css'

// Admin login (route: /admin/login), from the Admin design reference.
//
// Same form, validation, auth flow and token handling as /login (Login.jsx,
// POST /auth/login — there is no separate admin login endpoint); only the
// texts and the hero differ:
// - subtitle "Sign in to the Playvo admin dashboard" and the note under
//   the button;
// - hero: AdminAuthHero (shared with /admin/forgot-password).
// Only admin accounts are accepted here (requiredRole), as /login accepts
// only Venue Owners: another role is refused with a message and is not
// signed in. After a successful login, GuestRoute sends the admin to
// /admin/dashboard.
//
// Empty-field errors use the Admin design's texts ("Please enter ...") and
// look (AdminLogin.css); the validation rules are the shared ones. A failed
// login (the API's answer) is shown above the fields in the design's red
// box, with the design's text for wrong credentials.

const FIELD_ERROR_KEYS = {
  'login.errors.emailRequired': 'adminLogin.errors.emailRequired',
  'login.errors.passwordRequired': 'adminLogin.errors.passwordRequired',
}

const FORM_ERROR_KEYS = {
  'login.errors.invalidCredentials': 'adminLogin.errors.invalidCredentials',
}

function AdminLogin() {
  return (
    <Login
      requiredRole={ROLES.ADMIN}
      subtitleKey="adminLogin.subtitle"
      noteKey="adminLogin.note"
      hero={<AdminAuthHero />}
      className="admin-login"
      fieldErrorKeys={FIELD_ERROR_KEYS}
      formErrorKeys={FORM_ERROR_KEYS}
      formErrorAtTop
    />
  )
}

export default AdminLogin
