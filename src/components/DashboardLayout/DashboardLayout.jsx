import { useEffect, useState } from 'react'
import { Bell, ChevronDown, LogOut, Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/useAuth.js'
import './DashboardLayout.css'

// Shared shell for the signed-in dashboards (Figma: Venue Owner dashboard):
// navy sidebar (PLAYVO wordmark, main menu, venue card, logout) + white top
// bar (greeting, notifications, user) + the page content.
//
// navItems: [{ key, labelKey, icon, to?, matchNested? }]. Items without `to`
// have no page yet: they are shown (as in the design) but are not links.
// matchNested: also highlight the item on its sub-pages (e.g. a details page).
// venue: { name, statusKey } | null — the sidebar venue card.
// roleLabelKey: translation key of the role shown under the user's name.
// On screens ≤ 1024px the sidebar becomes an off-canvas drawer opened from
// the top bar.
function DashboardLayout({ navItems, venue, roleLabelKey, children }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Close the drawer with Escape.
  useEffect(() => {
    if (!isMenuOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isMenuOpen])

  const fullName = user?.name ?? ''
  const firstName = fullName.split(' ')[0]
  const initial = fullName.trim().charAt(0).toUpperCase()

  return (
    <div className="dashboard-layout">
      <aside
        id="dashboard-sidebar"
        className={`dashboard-sidebar ${isMenuOpen ? 'dashboard-sidebar-open' : ''}`}
        aria-label={t('dashboardLayout.sidebarLabel')}
      >
        <div className="dashboard-sidebar-brand">
          {/* PLAYVO wordmark (text logo): Baloo, white "PLAY" + orange "VO". */}
          <span className="dashboard-wordmark" dir="ltr" aria-label="PLAYVO">
            <span className="dashboard-wordmark-light">PLAY</span>
            <span className="dashboard-wordmark-accent">VO</span>
          </span>
          <button
            type="button"
            className="dashboard-sidebar-close"
            onClick={() => setIsMenuOpen(false)}
            aria-label={t('dashboardLayout.closeMenu')}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="dashboard-nav" aria-label={t('dashboardLayout.mainMenu')}>
          <p className="dashboard-nav-title">{t('dashboardLayout.mainMenu')}</p>
          <ul className="dashboard-nav-list">
            {navItems.map(({ key, labelKey, icon: Icon, to, matchNested = false }) => (
              <li key={key}>
                {to ? (
                  <NavLink
                    to={to}
                    end={!matchNested}
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) =>
                      `dashboard-nav-item ${isActive ? 'dashboard-nav-item-active' : ''}`
                    }
                  >
                    <Icon className="dashboard-nav-icon" size={18} aria-hidden="true" />
                    {t(labelKey)}
                  </NavLink>
                ) : (
                  <span className="dashboard-nav-item" aria-disabled="true">
                    <Icon className="dashboard-nav-icon" size={18} aria-hidden="true" />
                    {t(labelKey)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="dashboard-sidebar-footer">
          {venue && (
            <div className="dashboard-venue-card">
              <p className="dashboard-venue-label">{t('dashboardLayout.venue')}</p>
              <p className="dashboard-venue-name">{venue.name}</p>
              <p className="dashboard-venue-status">
                <span className="dashboard-venue-dot" aria-hidden="true" />
                {t(venue.statusKey)}
              </p>
            </div>
          )}

          <button type="button" className="dashboard-logout" onClick={logout}>
            <LogOut className="dashboard-nav-icon" size={18} aria-hidden="true" />
            {t('common.logout')}
          </button>
        </div>
      </aside>

      {isMenuOpen && (
        <div className="dashboard-backdrop" onClick={() => setIsMenuOpen(false)} aria-hidden="true" />
      )}

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-start">
            <button
              type="button"
              className="dashboard-menu-button"
              onClick={() => setIsMenuOpen(true)}
              aria-label={t('dashboardLayout.openMenu')}
              aria-controls="dashboard-sidebar"
              aria-expanded={isMenuOpen}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <div className="dashboard-greeting">
              <p className="dashboard-greeting-title">
                {t('dashboardLayout.greeting', { name: firstName })} <span aria-hidden="true">👋</span>
              </p>
              {venue && <p className="dashboard-greeting-subtitle">{venue.name}</p>}
            </div>
          </div>

          <div className="dashboard-topbar-end">
            {/* Profile button: placeholder for the future profile menu (not
                built yet), so it has no action and opens nothing for now. */}
            <button type="button" className="dashboard-user">
              <span className="dashboard-avatar" aria-hidden="true">
                {initial}
              </span>
              <span className="dashboard-user-text">
                <span className="dashboard-user-name">{fullName}</span>
                <span className="dashboard-user-role">{roleLabelKey && t(roleLabelKey)}</span>
              </span>
              <ChevronDown className="dashboard-user-chevron" size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="dashboard-bell"
              aria-label={t('dashboardLayout.notifications')}
            >
              <Bell size={18} aria-hidden="true" />
              <span className="dashboard-bell-dot" aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  )
}

export default DashboardLayout
