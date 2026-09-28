import { useTranslation } from 'react-i18next'
import Button from '../../components/Button/Button.jsx'
import LanguageSwitcher from '../../components/LanguageSwitcher/LanguageSwitcher.jsx'
import { useAuth } from '../../context/useAuth.js'
import './DashboardPlaceholder.css'

// TEMPORARY landing page for /admin/dashboard (the Venue Owner dashboard
// has its own page). It exists only so an admin login has a real,
// role-protected destination to redirect to (and a way to log out). It is
// intentionally unstyled beyond the basics and will be replaced by the real
// Admin dashboard when that step is built.
function DashboardPlaceholder({ titleKey }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()

  return (
    <main className="dashboard-placeholder">
      <LanguageSwitcher />
      <h1 className="dashboard-placeholder-title">{t(titleKey)}</h1>
      <p className="dashboard-placeholder-text">
        {t('dashboard.signedInAs', { name: user?.name, email: user?.email })}
      </p>
      <p className="dashboard-placeholder-text">{t('dashboard.comingSoon')}</p>
      <Button onClick={logout}>{t('common.logout')}</Button>
    </main>
  )
}

export default DashboardPlaceholder
