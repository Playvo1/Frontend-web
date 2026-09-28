import { useState } from 'react'
import { Key, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout/AuthLayout.jsx'
import Button from '../../components/Button/Button.jsx'
import Input from '../../components/Input/Input.jsx'
import LanguageSwitcher from '../../components/LanguageSwitcher/LanguageSwitcher.jsx'
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
// - "Forgot password?" opens /forgot-password.
// - Authentication goes through AuthProvider -> authService, which is a
//   MOCK for now (no Laravel backend yet). After a successful login,
//   GuestRoute redirects to the user's role dashboard.

// Maps AuthError codes from authService to translation keys.
const AUTH_ERROR_KEYS = {
  [AUTH_ERRORS.INVALID_CREDENTIALS]: 'login.errors.invalidCredentials',
  [AUTH_ERRORS.ACCOUNT_LOCKED]: 'login.errors.accountLocked',
  [AUTH_ERRORS.ACCOUNT_INACTIVE]: 'login.errors.accountInactive',
  [AUTH_ERRORS.ROLE_NOT_ALLOWED]: 'login.errors.roleNotAllowed',
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

function Login() {
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
      await login({ email: email.trim(), password })
      // No navigate() here: GuestRoute sees the new session and redirects.
    } catch (error) {
      setFormError(AUTH_ERROR_KEYS[error?.code] ?? 'login.errors.generic')
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="login-form-content">
        <LanguageSwitcher />

        <h2 className="login-welcome-title">{t('login.welcomeTitle')}</h2>
        {/* PLAYVO wordmark (text logo): Baloo, navy "PLAY" + orange "VO". */}
        <p className="login-wordmark" dir="ltr">
          <span className="login-wordmark-navy">PLAY</span>
          <span className="login-wordmark-orange">VO</span>
        </p>
        <p className="login-welcome-subtitle">{t('login.welcomeSubtitle')}</p>

        {/* noValidate: validation messages are our own translated ones. */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <Input
            icon={Mail}
            type="email"
            name="email"
            value={email}
            onChange={handleEmailChange}
            placeholder={t('login.emailPlaceholder')}
            autoComplete="email"
            disabled={isSubmitting}
            error={fieldErrors.email && t(fieldErrors.email)}
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
            error={fieldErrors.password && t(fieldErrors.password)}
          />

          <Link to="/forgot-password" className="login-forgot-password">
            {t('login.forgotPassword')}
          </Link>

          {formError && (
            <p className="login-form-error" role="alert">
              {t(formError)}
            </p>
          )}

          <Button type="submit" fullWidth disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>
      </div>
    </AuthLayout>
  )
}

export default Login
