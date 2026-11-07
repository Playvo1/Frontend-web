import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout/AuthLayout.jsx'
import AuthStep from '../../components/AuthLayout/AuthStep.jsx'
import Button from '../../components/Button/Button.jsx'
import Input from '../../components/Input/Input.jsx'
import { ROLES, ROLE_LOGIN, toForgotPasswordPath } from '../../constants/roles.js'
import { AUTH_ERRORS, requestPasswordReset, resetPassword } from '../../services/authService.js'
import { clearRecoveryLoginPath, getRecoveryLoginPath } from '../../utils/recoveryFlow.js'
import { PASSWORD_MIN_LENGTH } from '../../utils/validation.js'
import AdminAuthHero from '../AdminLogin/AdminAuthHero.jsx'
import './ResetPassword.css'

// Reset Password — password recovery step 3 (final), route: /reset-password.
// Reached from /verify-code, which passes the email, the verified code and
// the flow's login page in the route state; that state survives a reload.
// Opening this page without it sends the user back to the flow's step 1,
// like /verify-code does. Shared by both roles: an Admin flow shows the Admin
// hero (Admin design), a Venue Owner flow the default one — the form is the
// same.
//
// Matches the Figma reference: new password + confirmation fields (no
// visibility toggle in the design), the "Didn't receive a code? Resend"
// link, and the "Set password" button. The reset is a MOCK
// (authService.resetPassword). On success a confirmation is shown and the
// user is sent to the flow's login page (/login or /admin/login) after a
// short delay.
//
// Frontend checks: both fields required, at least PASSWORD_MIN_LENGTH (8)
// characters — the backend's min:8 rule — and matching. The confirmation is
// sent as password_confirmation when the real API is enabled.

const REDIRECT_DELAY_MS = 2000

function ResetPassword() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const email = location.state?.email
  const code = location.state?.code
  // Login page of this recovery flow (route state, or remembered for the tab).
  const loginPath = getRecoveryLoginPath(location.state?.loginPath)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isDone, setIsDone] = useState(false)

  // After a successful reset, show the confirmation briefly, then go to the
  // login page the flow started from (/login or /admin/login).
  useEffect(() => {
    if (!isDone) return undefined
    clearRecoveryLoginPath()
    const timer = setTimeout(() => navigate(loginPath, { replace: true }), REDIRECT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [isDone, navigate, loginPath])

  if (!email || !code) {
    return <Navigate to={toForgotPasswordPath(loginPath)} replace state={{ loginPath }} />
  }

  const handlePasswordChange = (event) => {
    setPassword(event.target.value)
    setFieldErrors((errors) => ({ ...errors, password: undefined }))
    setFormError(null)
  }

  const handleConfirmChange = (event) => {
    setConfirmPassword(event.target.value)
    setFieldErrors((errors) => ({ ...errors, confirmPassword: undefined }))
    setFormError(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting || isDone) return

    // Translation keys (not text) so messages re-translate on language switch.
    const errors = {}
    if (!password) {
      errors.password = 'resetPassword.errors.passwordRequired'
    } else if (password.length < PASSWORD_MIN_LENGTH) {
      errors.password = 'resetPassword.errors.passwordTooShort'
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'resetPassword.errors.confirmRequired'
    } else if (password && confirmPassword !== password) {
      errors.confirmPassword = 'resetPassword.errors.mismatch'
    }
    setFieldErrors(errors)
    setFormError(null)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      await resetPassword({ email, code, password, passwordConfirmation: confirmPassword })
      setIsDone(true)
    } catch (error) {
      setFormError(
        error?.code === AUTH_ERRORS.INVALID_RESET_CODE
          ? 'resetPassword.errors.invalidOrExpired'
          : 'resetPassword.errors.generic',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // The design keeps the "Resend" link on this step. It repeats the step-1
  // request (mock, or POST /auth/forgot-password with the real API — the
  // backend has no dedicated resend endpoint) and returns to /verify-code,
  // because a new code replaces the one already verified.
  const handleResend = async () => {
    if (isResending || isDone) return
    setIsResending(true)
    setFormError(null)
    try {
      await requestPasswordReset({ email })
      navigate('/verify-code', { state: { email, loginPath } })
    } catch {
      setFormError('resetPassword.errors.generic')
      setIsResending(false)
    }
  }

  const isBusy = isSubmitting || isResending || isDone
  const isAdminFlow = loginPath === ROLE_LOGIN[ROLES.ADMIN]

  return (
    <AuthLayout hero={isAdminFlow ? <AdminAuthHero /> : undefined}>
      <AuthStep title={t('resetPassword.title')} subtitle={t('resetPassword.subtitle')}>
        {/* noValidate: validation messages are our own translated ones. */}
        <form className="auth-step-form reset-password-form" onSubmit={handleSubmit} noValidate>
          {/* Hidden username field so password managers link the new password to the account. */}
          <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />

          <Input
            type="password"
            name="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder={t('resetPassword.passwordPlaceholder')}
            aria-label={t('resetPassword.passwordPlaceholder')}
            autoComplete="new-password"
            disabled={isBusy}
            error={fieldErrors.password && t(fieldErrors.password, { min: PASSWORD_MIN_LENGTH })}
          />
          <Input
            type="password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={handleConfirmChange}
            placeholder={t('resetPassword.confirmPlaceholder')}
            aria-label={t('resetPassword.confirmPlaceholder')}
            autoComplete="new-password"
            disabled={isBusy}
            error={fieldErrors.confirmPassword && t(fieldErrors.confirmPassword)}
          />

          <button type="button" className="auth-step-link" onClick={handleResend} disabled={isBusy}>
            {isResending ? t('resetPassword.resending') : t('resetPassword.resend')}
          </button>

          {formError && (
            <p className="auth-step-message auth-step-message-error" role="alert">
              {t(formError)}
            </p>
          )}

          {isDone && (
            <p className="auth-step-message auth-step-message-success" role="status">
              {t('resetPassword.success')}
            </p>
          )}

          <Button type="submit" fullWidth disabled={isBusy} aria-busy={isSubmitting}>
            {isSubmitting ? t('resetPassword.submitting') : t('resetPassword.submit')}
          </Button>
        </form>
      </AuthStep>
    </AuthLayout>
  )
}

export default ResetPassword
