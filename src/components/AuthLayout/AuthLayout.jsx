import { ShieldLock, SquareArrowOutUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import logoMark from "../../assets/log1.png";
import heroImage from '../../assets/login-image.png'
import './AuthLayout.css'

// Shared page shell for the signed-out screens (Login, Forgot Password,
// Verify Code, Reset Password):
// the form panel (page-specific content goes in `children`) plus the
// rounded hero panel from the Figma reference — photo + overlay, logo,
// marketing copy and the onboarding-policy card.
//
// - "Request new facility registration" has no documented workflow/route
//   yet, so it stays visual-only.
// - "Contact technical support" uses the temporary mailto address
//   (info@playvo.com) until the real one is provided.

const SUPPORT_EMAIL_HREF = 'mailto:info@playvo.com'

function AuthLayout({ children }) {
  const { t } = useTranslation()

  return (
    <div className="auth-page">
      {/*
        DOM order intentionally: form panel first, hero second. In RTL the
        browser mirrors flex order (first child → right side), which puts the
        form on the right / hero on the left, matching the (Arabic) Figma
        reference. In English (LTR) the same order mirrors to form-left /
        hero-right.
      */}
      <section className="auth-form-panel">{children}</section>

      <section className="auth-hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="auth-hero-content">
          {/*
            Logo lockup: the provided logo file (used as-is) followed by the
            "LAYVO" wordmark, so together they read "PLAYVO". direction:ltr in
            CSS keeps the lockup from mirroring in RTL.
          */}
          <div className="auth-hero-logo">
            <img className="auth-hero-logo-mark" src={logoMark} alt="Playvo" />
            <span className="auth-hero-logo-text" aria-hidden="true">
              <span className="auth-hero-logo-text-white">LAY</span>
              <span className="auth-hero-logo-text-orange">VO</span>
            </span>
          </div>

          <div className="auth-hero-body">
            <h1 className="auth-hero-title">
              <span className="auth-hero-title-line">{t('auth.hero.titleLine1')}</span>
              <span className="auth-hero-title-accent">{t('auth.hero.titleLine2')}</span>
            </h1>
            <p className="auth-hero-description">{t('auth.hero.description')}</p>

            <aside className="auth-policy-card">
              <div className="auth-policy-header">
                <ShieldLock className="auth-policy-icon" size={18} aria-hidden="true" />
                <h3 className="auth-policy-title">{t('auth.policy.title')}</h3>
              </div>
              <p className="auth-policy-text">{t('auth.policy.body')}</p>
              <div className="auth-policy-actions">
                <button type="button" className="auth-policy-request">
                  <SquareArrowOutUpRight size={14} aria-hidden="true" />
                  {t('auth.policy.requestRegistration')}
                </button>
                <span className="auth-policy-separator" aria-hidden="true" />
                <a className="auth-policy-support" href={SUPPORT_EMAIL_HREF}>
                  {t('auth.policy.contactSupport')}
                </a>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AuthLayout
