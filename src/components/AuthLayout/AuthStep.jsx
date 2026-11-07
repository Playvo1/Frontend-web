import { ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { getRecoveryLoginPath } from '../../utils/recoveryFlow.js'
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher.jsx'
import './AuthStep.css'

// Shared content column for the password-recovery steps (Forgot Password,
// Verify Code), rendered inside AuthLayout. Matches the Figma references:
// a top bar with the "Back to login" link (start edge — right in RTL, left
// in LTR) and the language switcher (end edge), then a vertically centered
// block with the step's title, subtitle and form (`children`).
//
// "Back to login" returns to the login page the flow started from (/login or
// /admin/login): the `loginPath` prop when the page is role-specific, else
// the recovery flow's one (route state, or remembered for the tab).
function AuthStep({ title, subtitle, loginPath: fixedLoginPath, children }) {
  const { t } = useTranslation()
  const stateLoginPath = useLocation().state?.loginPath
  const loginPath = fixedLoginPath ?? getRecoveryLoginPath(stateLoginPath)

  return (
    <div className="auth-step-content">
      <div className="auth-step-topbar">
        <Link to={loginPath} className="auth-step-back">
          <ChevronLeft className="auth-step-back-icon" size={16} aria-hidden="true" />
          {t('auth.backToLogin')}
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="auth-step-main">
        <h2 className="auth-step-title">{title}</h2>
        <p className="auth-step-subtitle">{subtitle}</p>
        {children}
      </div>
    </div>
  )
}

export default AuthStep
