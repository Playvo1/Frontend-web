import { useEffect, useState } from 'react'
import { Bell, LogOut, Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'
import logoMark from '../../assets/log1.png'
import { IS_API_ENABLED } from '../../config/api.js'
import { ROLES, getPrimaryRole } from '../../constants/roles.js'
import { useAuth } from '../../context/useAuth.js'
import { getVenueOwnerFacility, peekVenueOwnerFacility } from '../../services/facilityService.js'
import { UNREAD_EVENT, getUnreadNotificationsCount } from '../../services/notificationsService.js'
import ToastHost from '../Toast/ToastHost.jsx'
import './DashboardLayout.css'

// Shared shell for the signed-in dashboards (Figma: Venue Owner dashboard):
// navy sidebar (PLAYVO wordmark, main menu, venue card, logout) + white top
// bar (greeting, notifications, user) + the page content.
//
// navItems: [{ key, labelKey, icon, to?, matchNested? }]. Items without `to`
// have no page yet: they are shown (as in the design) but are not links.
// matchNested: also highlight the item on its sub-pages (e.g. a details page).
// venue: { name, statusKey } | null — the sidebar venue card.
// roleLabelKey: translation key of the user's role (accessible name of the avatar button).
// subtitle (optional): text under the greeting when there is no venue (the
//   Admin dashboard shows the role there).
// Venue Owner, API mode: when the page passes no venue, the venue name under
// the greeting is read from the owner's own venue
// (GET /venue_owner/owner/myvenues, via facilityService) in the current
// language. Nothing is shown while it loads or if it cannot be read (no
// venue, more than one, request error): no fixed or demo name is used. The
// sidebar venue card is not affected. The venue read on a previous page (or
// by this page) is shown at once and shared with the page's own request
// (facilityService keeps it briefly; see there).
// brandMark (optional): show the provided logo mark before the wordmark
//   (Admin design).
// On screens ≤ 1024px the sidebar becomes an off-canvas drawer opened from
// the top bar.
// Bell: opens the notifications page of the signed-in role (Venue Owner:
// /venue-owner/notifications, Admin: /admin/notifications).
// Bell dot (API mode): shown only when the user has unread notifications
// (notificationsService.getUnreadNotificationsCount), never as a fixed
// decoration; demo mode keeps the design's dot over the demo list.
function DashboardLayout({ navItems, venue, roleLabelKey, subtitle, brandMark = false, children }) {
  const { t, i18n } = useTranslation()
  const { user, token, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isVenueOwner = getPrimaryRole(user) === ROLES.VENUE_OWNER
  const isAdmin = getPrimaryRole(user) === ROLES.ADMIN
  const notificationsPath = isVenueOwner ? '/venue-owner/notifications' : isAdmin ? '/admin/notifications' : null
  // { name_ar, name_en } of the owner's venue (API mode only), or null.
  const [ownerVenue, setOwnerVenue] = useState(() =>
    IS_API_ENABLED && isVenueOwner && !venue ? peekVenueOwnerFacility({ token }) : null,
  )

  useEffect(() => {
    if (!IS_API_ENABLED || !isVenueOwner || venue || !token) return undefined
    let isActive = true
    getVenueOwnerFacility({ token })
      .then((facility) => isActive && setOwnerVenue(facility))
      .catch(() => isActive && setOwnerVenue(null))
    return () => {
      isActive = false
    }
  }, [isVenueOwner, venue, token])

  // Unread notifications (Venue Owner / Admin, API mode): null until known.
  const [unreadCount, setUnreadCount] = useState(null)

  useEffect(() => {
    if (!IS_API_ENABLED || !notificationsPath || !token) return undefined
    let isActive = true
    getUnreadNotificationsCount(token)
      .then((count) => isActive && setUnreadCount(count))
      .catch(() => isActive && setUnreadCount(null))
    const onUnread = (event) => setUnreadCount(event.detail)
    window.addEventListener(UNREAD_EVENT, onUnread)
    return () => {
      isActive = false
      window.removeEventListener(UNREAD_EVENT, onUnread)
    }
  }, [notificationsPath, token])
  const showBellDot = !IS_API_ENABLED || unreadCount > 0

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
  // The user's photo (session user's profile_image, set by the Profile page
  // from the backend); the initial when there is none or it cannot load.
  const [brokenPhoto, setBrokenPhoto] = useState(null)
  const photo = user?.profile_image && user.profile_image !== brokenPhoto ? user.profile_image : null
  const avatar = photo ? (
    <img
      className="dashboard-avatar dashboard-avatar-image"
      src={photo}
      alt=""
      aria-hidden="true"
      onError={() => setBrokenPhoto(photo)}
    />
  ) : (
    <span className="dashboard-avatar" aria-hidden="true">
      {initial}
    </span>
  )
  // The avatar opens the role's profile page.
  const profilePath = isVenueOwner ? '/venue-owner/profile' : isAdmin ? '/admin/profile' : null
  const isArabic = i18n.language?.startsWith('ar')
  const ownerVenueName = ownerVenue
    ? (isArabic ? ownerVenue.name_ar || ownerVenue.name_en : ownerVenue.name_en || ownerVenue.name_ar) || null
    : null
  const greetingSubtitle = venue ? venue.name : ownerVenueName || subtitle
  const avatarLabel = [fullName, roleLabelKey && t(roleLabelKey)].filter(Boolean).join(' — ')

  return (
    <div className="dashboard-layout">
      <aside
        id="dashboard-sidebar"
        className={`dashboard-sidebar ${isMenuOpen ? 'dashboard-sidebar-open' : ''}`}
        aria-label={t('dashboardLayout.sidebarLabel')}
      >
        <div className="dashboard-sidebar-brand">
          {/* PLAYVO wordmark (text logo): Baloo, white "PLAY" + orange "VO". */}
          <span className="dashboard-brand" dir="ltr">
            {brandMark && <img className="dashboard-brand-mark" src={logoMark} alt="" />}
            <span className="dashboard-wordmark" aria-label="PLAYVO">
              <span className="dashboard-wordmark-light">PLAY</span>
              <span className="dashboard-wordmark-accent">VO</span>
            </span>
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
                  // Page not built yet (Admin: venues, payment receipts,
                  // admin accounts): shown without an action.
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
            {/* Avatar (next to the greeting, as in the design): opens the
                user's profile page when the role has one; otherwise it keeps
                no action. */}
            {profilePath ? (
              <Link to={profilePath} className="dashboard-user" aria-label={avatarLabel}>
                {avatar}
              </Link>
            ) : (
              <button type="button" className="dashboard-user" aria-label={avatarLabel}>
                {avatar}
              </button>
            )}
            <div className="dashboard-greeting">
              <p className="dashboard-greeting-title">
                {t('dashboardLayout.greeting', { name: firstName })} <span aria-hidden="true">👋</span>
              </p>
              {greetingSubtitle && <p className="dashboard-greeting-subtitle">{greetingSubtitle}</p>}
            </div>
          </div>

          <div className="dashboard-topbar-end">
            {/* The bell opens the role's notifications page. */}
            {notificationsPath ? (
              <Link
                to={notificationsPath}
                className="dashboard-bell"
                aria-label={t('dashboardLayout.notifications')}
              >
                <Bell size={18} aria-hidden="true" />
                {showBellDot && <span className="dashboard-bell-dot" aria-hidden="true" />}
              </Link>
            ) : (
              <button
                type="button"
                className="dashboard-bell"
                aria-label={t('dashboardLayout.notifications')}
              >
                <Bell size={18} aria-hidden="true" />
                <span className="dashboard-bell-dot" aria-hidden="true" />
              </button>
            )}
          </div>
        </header>

        <main className="dashboard-content">{children}</main>
        <ToastHost />
      </div>
    </div>
  )
}

export default DashboardLayout
