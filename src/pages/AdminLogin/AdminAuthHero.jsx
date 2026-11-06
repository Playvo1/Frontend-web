import { useTranslation } from 'react-i18next'
import './AdminAuthHero.css'

// Hero text block of the Admin auth pages (/admin/login and
// /admin/forgot-password), from the Admin design references: two-line white
// title, description, the "platform" pill and the features row at the
// bottom (no onboarding-policy card). Passed to AuthLayout as `hero`; the
// photo, overlay and logo stay AuthLayout's (the same photo as the design).

const FEATURE_KEYS = ['support', 'realtime', 'secure']

function AdminAuthHero() {
  const { t } = useTranslation()

  return (
    <>
      <div className="auth-hero-body admin-login-hero-body">
        <h1 className="admin-login-hero-title">
          <span className="admin-login-hero-title-line">{t('adminLogin.hero.titleLine1')}</span>
          <span className="admin-login-hero-title-line">{t('adminLogin.hero.titleLine2')}</span>
        </h1>
        <p className="admin-login-hero-description">{t('adminLogin.hero.description')}</p>
        <p className="admin-login-hero-badge">
          <span className="admin-login-hero-badge-dot" aria-hidden="true" />
          {t('adminLogin.hero.badge')}
        </p>
      </div>

      <ul className="admin-login-hero-features">
        {FEATURE_KEYS.map((key) => (
          <li key={key} className="admin-login-hero-feature">
            {t(`adminLogin.hero.features.${key}`)}
          </li>
        ))}
      </ul>
    </>
  )
}

export default AdminAuthHero
