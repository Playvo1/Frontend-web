import { useState } from 'react'
import { Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/AuthLayout/AuthLayout.jsx'
import AuthStep from '../../components/AuthLayout/AuthStep.jsx'
import Button from '../../components/Button/Button.jsx'
import Input from '../../components/Input/Input.jsx'
import { requestPasswordReset } from '../../services/authService.js'
import { isValidEmail } from '../../utils/validation.js'

// Forgot Password — step 1 (enter email), route: /forgot-password.
// Opened from the "Forgot password?" link on /login; uses the same
// AuthLayout (form panel + hero) as the Login page and the shared AuthStep
// column (back link, language switcher, title/subtitle).
//
// The request goes through authService.requestPasswordReset, a MOCK of
// POST /api/v1/auth/forgot-password. On success the user continues to
// /verify-code (step 2); the email travels in the route state.
function ForgotPassword() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEmailChange = (event) => {
    setEmail(event.target.value)
    setEmailError(null)
    setFormError(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    // Translation keys (not text) so messages re-translate on language switch.
    let error = null
    if (!email.trim()) {
      error = 'forgotPassword.errors.emailRequired'
    } else if (!isValidEmail(email)) {
      error = 'forgotPassword.errors.emailInvalid'
    }
    setEmailError(error)
    setFormError(null)
    if (error) return

    setIsSubmitting(true)
    try {
      const { email: requestedEmail } = await requestPasswordReset({ email })
      navigate('/verify-code', { state: { email: requestedEmail } })
    } catch {
      setFormError('forgotPassword.errors.generic')
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <AuthStep title={t('forgotPassword.title')} subtitle={t('forgotPassword.subtitle')}>
        {/* noValidate: validation messages are our own translated ones. */}
        <form className="auth-step-form" onSubmit={handleSubmit} noValidate>
          <Input
            icon={Mail}
            type="email"
            name="email"
            value={email}
            onChange={handleEmailChange}
            placeholder={t('forgotPassword.emailPlaceholder')}
            autoComplete="email"
            disabled={isSubmitting}
            error={emailError && t(emailError)}
          />

          {formError && (
            <p className="auth-step-message auth-step-message-error" role="alert">
              {t(formError)}
            </p>
          )}

          <Button type="submit" fullWidth disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
          </Button>
        </form>
      </AuthStep>
    </AuthLayout>
  )
}

export default ForgotPassword
