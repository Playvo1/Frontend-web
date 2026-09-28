import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout/AuthLayout.jsx'
import AuthStep from '../../components/AuthLayout/AuthStep.jsx'
import Button from '../../components/Button/Button.jsx'
import Input from '../../components/Input/Input.jsx'
import { AUTH_ERRORS, requestPasswordReset, verifyResetCode } from '../../services/authService.js'
import { RESET_CODE_LENGTH, isValidResetCode, normalizeResetCode } from '../../utils/validation.js'

// Verify Code — password recovery step 2, route: /verify-code.
// Reached from /forgot-password, which passes the email in the route state;
// opening this page directly (or after a reload, which clears that state)
// sends the user back to step 1.
//
// Matches the Figma reference: one code field (not split digit boxes), a
// "Didn't receive a code? Resend" link under it, and the Next button.
// Verification is a MOCK (authService.verifyResetCode — accepts 123456).
// On success the user continues to /reset-password (step 3) with the email
// and the verified code in the route state.
function VerifyCode() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const email = location.state?.email

  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState(null)
  // Form-level feedback shown above the button: { type: 'error' | 'success', key }.
  const [notice, setNotice] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)

  if (!email) {
    return <Navigate to="/forgot-password" replace />
  }

  const handleCodeChange = (event) => {
    setCode(normalizeResetCode(event.target.value))
    setCodeError(null)
    setNotice(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    // Translation keys (not text) so messages re-translate on language switch.
    let error = null
    if (!code) {
      error = 'verifyCode.errors.codeRequired'
    } else if (!isValidResetCode(code)) {
      error = 'verifyCode.errors.codeFormat'
    }
    setCodeError(error)
    setNotice(null)
    if (error) return

    setIsSubmitting(true)
    try {
      await verifyResetCode({ email, code })
      navigate('/reset-password', { state: { email, code } })
    } catch (err) {
      setNotice({
        type: 'error',
        key:
          err?.code === AUTH_ERRORS.INVALID_RESET_CODE
            ? 'verifyCode.errors.invalidOrExpired'
            : 'verifyCode.errors.generic',
      })
      setIsSubmitting(false)
    }
  }

  // Resending simply repeats the step-1 request (POST /auth/forgot-password).
  const handleResend = async () => {
    if (isResending) return
    setIsResending(true)
    setNotice(null)
    try {
      await requestPasswordReset({ email })
      setCode('')
      setCodeError(null)
      setNotice({ type: 'success', key: 'verifyCode.resent' })
    } catch {
      setNotice({ type: 'error', key: 'verifyCode.errors.generic' })
    } finally {
      setIsResending(false)
    }
  }

  const isBusy = isSubmitting || isResending

  return (
    <AuthLayout>
      <AuthStep title={t('verifyCode.title')} subtitle={t('verifyCode.subtitle')}>
        {/* noValidate: validation messages are our own translated ones. */}
        <form className="auth-step-form" onSubmit={handleSubmit} noValidate>
          <Input
            type="text"
            name="code"
            value={code}
            onChange={handleCodeChange}
            placeholder={t('verifyCode.codePlaceholder')}
            aria-label={t('verifyCode.codePlaceholder')}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={RESET_CODE_LENGTH}
            disabled={isBusy}
            error={codeError && t(codeError, { length: RESET_CODE_LENGTH })}
          />

          <button
            type="button"
            className="auth-step-link"
            onClick={handleResend}
            disabled={isBusy}
          >
            {isResending ? t('verifyCode.resending') : t('verifyCode.resend')}
          </button>

          {notice && (
            <p
              className={`auth-step-message auth-step-message-${notice.type}`}
              role={notice.type === 'error' ? 'alert' : 'status'}
            >
              {t(notice.key)}
            </p>
          )}

          <Button type="submit" fullWidth disabled={isBusy} aria-busy={isSubmitting}>
            {isSubmitting ? t('verifyCode.submitting') : t('verifyCode.submit')}
          </Button>
        </form>
      </AuthStep>
    </AuthLayout>
  )
}

export default VerifyCode
