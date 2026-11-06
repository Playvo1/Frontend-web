import { useState } from 'react'
import { Key, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout/AuthLayout.jsx'
import Button from '../../components/Button/Button.jsx'
import Input from '../../components/Input/Input.jsx'
import LanguageSwitcher from '../../components/LanguageSwitcher/LanguageSwitcher.jsx'
import { ROLES, ROLE_FORGOT_PASSWORD, ROLE_LOGIN } from '../../constants/roles.js'
import { useAuth } from '../../context/useAuth.js'
import { AUTH_ERRORS } from '../../services/authService.js'
import { isValidEmail } from '../../utils/validation.js'
import './Login.css'

// Shared login screen for both Admin and Venue Owner (route: /login).
// There is no self-registration — accounts are created by an administrator
// (SRS FR-18, Project Instructions §7).
//
// Layout follows the current Figma reference: the shared AuthLayout (form
// panel + hero panel) with the login form as its content.
//
// Notes on scope:
// - "Forgot password?" opens /forgot-password (/admin/forgot-password
//   from the Admin login).
// - Authentication goes through AuthProvider -> authService, which is a
//   MOCK for now (no Laravel backend yet). After a successful login,
//   GuestRoute redirects to the user's role dashboard.
//
// Each role has its own login page with this same form: /login (Venue
// Owner, the default) and /admin/login (AdminLogin.jsx), set through props:
// - requiredRole: the only role accepted here; another role is refused with
//   a message and no session is kept (AuthProvider).
// - subtitleKey / noteKey: the subtitle, and a note under the button.
// - hero: the hero text block (see AuthLayout).
// - className: extra class on the content column (page-specific styles).
// - fieldErrorKeys: page-specific texts for the field errors
//   ({ 'login.errors.emailRequired': '...' }); others keep their key.
// - formErrorKeys: the same for the form-level error (failed login).
// - formErrorAtTop: show that error above the fields (Admin design) instead
//   of above the button.

// Maps AuthError codes from authService to translation keys.
const AUTH_ERROR_KEYS = {
  [AUTH_ERRORS.INVALID_CREDENTIALS]: 'login.errors.invalidCredentials',
  [AUTH_ERRORS.ACCOUNT_LOCKED]: 'login.errors.accountLocked',
  [AUTH_ERRORS.ACCOUNT_INACTIVE]: 'login.errors.accountInactive',
  [AUTH_ERRORS.ROLE_NOT_ALLOWED]: 'login.errors.roleNotAllowed',
}

// ROLE_MISMATCH: the account belongs to the other login page.
const ROLE_MISMATCH_KEYS = {
  [ROLES.ADMIN]: 'adminLogin.errors.notAdmin',
  [ROLES.VENUE_OWNER]: 'login.errors.notVenueOwner',
}

// Returns translation keys (not text) so messages re-translate instantly if
// the language is switched while an error is showing.
function validate({ email, password }) {
  const errors = {}
  if (!email.trim()) {
    errors.email = 'login.errors.emailRequired'
  } else if (!isValidEmail(email)) {
    errors.email = 'login.errors.emailInvalid'
  }
  if (!password) {
    errors.password = 'login.errors.passwordRequired'
  }
  return errors
}

function Login({
  requiredRole = ROLES.VENUE_OWNER,
  subtitleKey = 'login.welcomeSubtitle',
  noteKey,
  hero,
  className = '',
  fieldErrorKeys = {},
  formErrorKeys = {},
  formErrorAtTop = false,
}) {
  const { t } = useTranslation()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEmailChange = (event) => {
    setEmail(event.target.value)
    setFieldErrors((errors) => ({ ...errors, email: undefined }))
    setFormError(null)
  }

  const handlePasswordChange = (event) => {
    setPassword(event.target.value)
    setFieldErrors((errors) => ({ ...errors, password: undefined }))
    setFormError(null)
  }

  // preventDefault stops the browser's native form submit (which would
  // reload the page); validation and the (mock) login happen here instead.
  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    const errors = validate({ email, password })
    setFieldErrors(errors)
    setFormError(null)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      await login({ email: email.trim(), password }, { requiredRole })
      // No navigate() here: GuestRoute sees the new session and redirects.
    } catch (error) {
      const errorKey =
        error?.code === AUTH_ERRORS.ROLE_MISMATCH ? ROLE_MISMATCH_KEYS[requiredRole] : AUTH_ERROR_KEYS[error?.code]
      setFormError(errorKey ?? 'login.errors.generic')
      setIsSubmitting(false)
    }
  }

  // Failed login (wrong credentials, other role, server/network error).
  const formErrorMessage = formError && (
    <p className="login-form-error" role="alert">
      {t(formErrorKeys[formError] ?? formError)}
    </p>
  )

  return (
    <AuthLayout hero={hero}>
      <div className={`login-form-content ${className}`.trim()}>
        <LanguageSwitcher />

        <h2 className="login-welcome-title">{t('login.welcomeTitle')}</h2>
        {/* PLAYVO wordmark (text logo): Baloo, navy "PLAY" + orange "VO". */}
        <p className="login-wordmark" dir="ltr">
          <span className="login-wordmark-navy">PLAY</span>
          <span className="login-wordmark-orange">VO</span>
        </p>
        <p className="login-welcome-subtitle">{t(subtitleKey)}</p>

        {/* noValidate: validation messages are our own translated ones. */}
        {/* login-form-invalid: some field shows an error (page styles may
            tighten the spacing then). */}
        <form
          className={`login-form ${fieldErrors.email || fieldErrors.password ? 'login-form-invalid' : ''}`.trim()}
          onSubmit={handleSubmit}
          noValidate
        >
          {formErrorAtTop && formErrorMessage}

          <Input
            icon={Mail}
            type="email"
            name="email"
            value={email}
            onChange={handleEmailChange}
            placeholder={t('login.emailPlaceholder')}
            autoComplete="email"
            disabled={isSubmitting}
            error={fieldErrors.email && t(fieldErrorKeys[fieldErrors.email] ?? fieldErrors.email)}
          />
          <Input
            icon={Key}
            type="password"
            name="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder={t('login.passwordPlaceholder')}
            autoComplete="current-password"
            disabled={isSubmitting}
            error={fieldErrors.password && t(fieldErrorKeys[fieldErrors.password] ?? fieldErrors.password)}
          />

          {/* This role's recovery page; the later steps return to this login
              page (route state). */}
          <Link
            to={ROLE_FORGOT_PASSWORD[requiredRole]}
            state={{ loginPath: ROLE_LOGIN[requiredRole] }}
            className="login-forgot-password"
          >
            {t('login.forgotPassword')}
          </Link>

          {!formErrorAtTop && formErrorMessage}

          <Button type="submit" fullWidth disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? t('login.submitting') : t('login.submit')}
          </Button>

          {noteKey && <p className="login-note">{t(noteKey)}</p>}
        </form>
      </div>
    </AuthLayout>
  )
}

export default Login
