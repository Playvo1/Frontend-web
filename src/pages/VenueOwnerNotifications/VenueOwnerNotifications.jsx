import { useEffect, useRef, useState } from 'react'
import { Bell, CalendarDays, CircleAlert, Clock, LayoutGrid, MoreHorizontal, Star, WifiOff, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import { VENUE_OWNER_NAV } from '../../constants/venueOwnerNav.js'
import { useAuth } from '../../context/useAuth.js'
import { getVenueOwnerVenue } from '../../services/dashboardService.js'
import { getNotifications, markNotificationRead } from '../../services/notificationsService.js'
import { isConnectionFailure } from '../../utils/requestErrors.js'
import '../../styles/skeleton.css'
import emptyIllustration from '../../assets/empty-state-illustration.svg'
import NotificationDetailsModal from './NotificationDetailsModal.jsx'
import './VenueOwnerNotifications.css'

// Venue Owner "Notifications" page (route: /venue-owner/notifications),
// opened from the bell in the top bar. Built from the design: title with the
// unread count, the All / Unread / Read tabs and the notification list
// (unread rows tinted, with an orange dot and a filled action button).
//
// Data: notificationsService — the signed-in user's own notifications
// (GET /notifications, every page) in API mode, the demo list in demo mode.
// The top bar's bell dot uses the backend's unread_count from the same
// page-1 request and follows every "mark as read". Clicking a
// notification, its action button or "Mark as read" in its menu marks it as
// read (PUT /notifications/{id}/read); the change shows at once and is
// undone if the request fails. Action buttons only appear when the
// notification has a real page to open (its booking, the reviews, the
// schedule); nothing else is offered because the backend has no other
// notification actions.

const TABS = ['all', 'unread', 'read']

const SKELETON_ROWS = 5

// Icon of each notification kind (design); anything else gets a bell.
// booking_confirmed_for_owner: the backend's only Venue Owner kind today
// (AdminPaymentReceiptController: a booking on the venue was confirmed),
// shown as the design's confirmed booking.
const TYPE_ICONS = {
  booking_created: CalendarDays,
  booking_confirmed: CalendarDays,
  booking_confirmed_for_owner: CalendarDays,
  booking_reminder: Clock,
  booking_cancelled: X,
  new_review: Star,
  upcoming_booking: Clock,
  platform_update: LayoutGrid,
}

// Icon tile and title dot of each kind (design): the booking notifications
// (new booking, reminder) are orange and the cancellation red, read or not;
// the review, schedule and platform ones use the gray tile. Unread
// notifications of any other kind also get the orange tile and dot.
const ACCENT_TYPES = ['booking_created', 'booking_confirmed', 'booking_confirmed_for_owner', 'booking_reminder']
const DANGER_TYPES = ['booking_cancelled']

function getTone(notification) {
  if (DANGER_TYPES.includes(notification.type)) return 'danger'
  if (ACCENT_TYPES.includes(notification.type) || !notification.is_read) return 'accent'
  return 'muted'
}

// Action button of a notification: [label key, path]. A null path opens the
// notification's details dialog (kinds with no page of their own, such as
// a platform update). No button when a booking notification has no booking.
function getAction(notification) {
  const bookingPath = notification.booking_id ? `/venue-owner/bookings/${notification.booking_id}` : null
  switch (notification.type) {
    case 'booking_cancelled':
      return bookingPath && ['venueOwnerNotifications.actions.bookingDetails', bookingPath]
    case 'new_review':
      return ['venueOwnerNotifications.actions.viewReview', '/venue-owner/reviews']
    case 'upcoming_booking':
      return ['venueOwnerNotifications.actions.viewSchedule', '/venue-owner/slots']
    case 'booking_created':
    case 'booking_confirmed':
    case 'booking_confirmed_for_owner':
    case 'booking_reminder':
      return bookingPath && ['venueOwnerNotifications.actions.viewBooking', bookingPath]
    default:
      return bookingPath
        ? ['venueOwnerNotifications.actions.viewBooking', bookingPath]
        : ['venueOwnerNotifications.actions.viewDetails', null]
  }
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

// "5 minutes ago" / "2 hours ago" (today), "Yesterday • 10:45 AM",
// otherwise "17 September 2026 • 10:15 AM" (design). Latin digits.
function useTimeLabel() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith('ar') ? 'ar' : 'en'
  const timeFormat = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', numberingSystem: 'latn' })
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  })

  return (value) => {
    const date = value ? new Date(value) : null
    if (!date || Number.isNaN(date.getTime())) return ''
    const now = new Date()
    const minutes = Math.floor((now - date) / 60000)
    const days = Math.round((startOfDay(now) - startOfDay(date)) / 86400000)
    if (days === 0 && minutes < 1) return t('venueOwnerNotifications.time.justNow')
    if (days === 0 && minutes < 60) return t('venueOwnerNotifications.time.minutes', { count: minutes })
    if (days === 0) return t('venueOwnerNotifications.time.hours', { count: Math.floor(minutes / 60) })
    if (days === 1) return `${t('venueOwnerNotifications.time.yesterday')} • ${timeFormat.format(date)}`
    return `${dateFormat.format(date)} • ${timeFormat.format(date)}`
  }
}

// "..." menu of a row: "Mark as read" (the only action the backend offers).
function RowMenu({ isRead, onMarkRead }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  return (
    <div className="von-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="von-menu-button"
        aria-label={t('venueOwnerNotifications.moreOptions')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation()
          setIsOpen((open) => !open)
        }}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="von-menu-panel" role="menu">
          <button
            type="button"
            role="menuitem"
            className="von-menu-item"
            disabled={isRead}
            onClick={(event) => {
              event.stopPropagation()
              setIsOpen(false)
              onMarkRead()
            }}
          >
            {t('venueOwnerNotifications.markAsRead')}
          </button>
        </div>
      )}
    </div>
  )
}

function VenueOwnerNotifications() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token, logout } = useAuth()
  const timeLabel = useTimeLabel()
  const [venue, setVenue] = useState(null)
  const [notifications, setNotifications] = useState(null)
  // null | 'network' | 'server' — same handling as the other pages.
  const [errorKind, setErrorKind] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [tab, setTab] = useState('all')
  // A "mark as read" request failed (the row was put back to unread).
  const [markError, setMarkError] = useState(false)
  // Notification shown in the details dialog, or null.
  const [details, setDetails] = useState(null)

  // Sidebar venue card / top-bar subtitle: same source as the other pages.
  useEffect(() => {
    let isActive = true
    getVenueOwnerVenue()
      .then((venueData) => isActive && setVenue(venueData))
      .catch(() => {})
    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true
    getNotifications(token)
      .then((list) => isActive && setNotifications(list))
      .catch((error) => {
        if (!isActive) return
        if (error?.status === 401) {
          logout()
          return
        }
        setErrorKind(isConnectionFailure(error) ? 'network' : 'server')
      })
    return () => {
      isActive = false
    }
  }, [attempt, token, logout])

  const retry = () => {
    setErrorKind(null)
    setNotifications(null)
    setAttempt((count) => count + 1)
  }

  const setRead = (id, isRead) =>
    setNotifications((list) => list?.map((item) => (item.id === id ? { ...item, is_read: isRead } : item)) ?? list)

  // Marks one notification as read: shown at once, undone if the request
  // fails. Already-read notifications send nothing.
  const markRead = (notification) => {
    if (notification.is_read) return
    setMarkError(false)
    setRead(notification.id, true)
    markNotificationRead(notification.id, token).catch((error) => {
      if (error?.status === 401) {
        logout()
        return
      }
      setRead(notification.id, false)
      setMarkError(true)
    })
  }

  const openAction = (notification, path) => {
    markRead(notification)
    navigate(path)
  }

  const layoutVenue = venue
    ? { name: venue.name, statusKey: `venueOwnerDashboard.venueStatus.${venue.status}` }
    : null

  const isLoading = notifications === null && !errorKind
  const list = notifications ?? []
  const unreadCount = list.filter((item) => !item.is_read).length
  // The request worked and returned no notifications at all.
  const hasNone = Array.isArray(notifications) && notifications.length === 0
  const tabsBar = (
    <div className="von-tabs" role="tablist" aria-label={t('venueOwnerNotifications.title')}>
      {TABS.map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={tab === key}
          className={`von-tab ${tab === key ? `von-tab-active von-tab-active-${key}` : ''}`}
          onClick={() => setTab(key)}
        >
          {t(`venueOwnerNotifications.tabs.${key}`)}
        </button>
      ))}
    </div>
  )
  const visible = list.filter((item) => (tab === 'all' ? true : tab === 'unread' ? !item.is_read : item.is_read))

  return (
    <DashboardLayout
      navItems={VENUE_OWNER_NAV}
      venue={layoutVenue}
      roleLabelKey="dashboardLayout.roles.venueOwner"
    >
      <header className="von-header">
        <div className="von-title-row">
          <h1 className="von-title">{t('venueOwnerNotifications.title')}</h1>
          {unreadCount > 0 && (
            <span className="von-unread-badge">
              {t('venueOwnerNotifications.unreadCount', { count: unreadCount })}
            </span>
          )}
        </div>
        <p className="von-subtitle">{t('venueOwnerNotifications.subtitle')}</p>
      </header>

      {/* All / Unread / Read. Inside the list card once notifications are
          shown; above the page's state while loading, after an error and
          when there are no notifications at all (state designs). */}
      {isLoading || errorKind || hasNone ? (
        <>
          <div className="von-toolbar-outside">{tabsBar}</div>

          {/* Loading (design): separate placeholder cards in the shape of a
              notification (icon, title, text, time); no numbers yet. */}
          {isLoading && (
            <ul className="von-skeleton-list" aria-busy="true" aria-label={t('venueOwnerNotifications.loading')}>
              {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <li key={index} className="von-skeleton-card" aria-hidden="true">
                  <span className="von-skeleton pv-shimmer von-skeleton-icon" />
                  <div className="von-content">
                    <span className="von-skeleton pv-shimmer von-skeleton-title" />
                    <span className="von-skeleton pv-shimmer von-skeleton-body" />
                    <span className="von-skeleton pv-shimmer von-skeleton-time" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Error (design): centered, no card. No connection → Wi-Fi icon
              and the connection text; any other failure → the server text.
              "Try again" sends the request again (loading state meanwhile). */}
          {errorKind && (
            <div className="von-error-state" role="alert">
              {errorKind === 'network' ? (
                <WifiOff className="von-error-icon" size={72} strokeWidth={2} aria-hidden="true" />
              ) : (
                <CircleAlert className="von-error-icon von-error-icon-server" size={56} strokeWidth={2} aria-hidden="true" />
              )}
              <p className="von-error-title">
                {t(
                  errorKind === 'network'
                    ? 'venueOwnerNotifications.errorState.networkTitle'
                    : 'venueOwnerNotifications.errorState.title',
                )}
              </p>
              <p className="von-error-text">
                {t(
                  errorKind === 'network'
                    ? 'venueOwnerNotifications.errorState.networkMessage'
                    : 'venueOwnerNotifications.errorState.serverMessage',
                )}
              </p>
              <button type="button" className="von-error-retry" onClick={retry}>
                {t('venueOwnerNotifications.errorState.retry')}
              </button>
            </div>
          )}

          {/* Empty (design): the request worked and there are no
              notifications at all, whatever tab is selected. No retry. */}
          {hasNone && (
            <section className="von-empty-card" role="status" aria-labelledby="von-empty-title">
              <img className="von-empty-illustration" src={emptyIllustration} alt="" />
              <h2 id="von-empty-title" className="von-empty-title">
                {t('venueOwnerNotifications.emptyState.title')}
              </h2>
              <p className="von-empty-text">{t('venueOwnerNotifications.emptyState.message')}</p>
            </section>
          )}
        </>
      ) : (
      <section className="von-card" aria-label={t('venueOwnerNotifications.title')}>
        <div className="von-toolbar">{tabsBar}</div>

        {markError && (
          <p className="von-mark-error" role="alert">
            {t('venueOwnerNotifications.markError')}
          </p>
        )}

        {/* Notifications exist, but none in the selected tab. */}
        {visible.length === 0 && (
          <div className="von-state" role="status">
            <Bell className="von-state-icon" size={40} aria-hidden="true" />
            <p className="von-state-title">{t(`venueOwnerNotifications.empty.${tab}`)}</p>
          </div>
        )}

        {visible.length > 0 && (
          <ul className="von-list">
            {visible.map((notification) => {
              const Icon = TYPE_ICONS[notification.type] ?? Bell
              const isUnread = !notification.is_read
              const tone = getTone(notification)
              const action = getAction(notification)
              const title = notification.titleKey ? t(notification.titleKey) : notification.title
              const body = notification.bodyKey ? t(notification.bodyKey) : notification.body
              return (
                <li
                  key={notification.id}
                  className={`von-row ${isUnread ? 'von-row-unread' : ''}`}
                  onClick={() => markRead(notification)}
                >
                  <span
                    className={`von-icon ${tone === 'muted' ? '' : `von-icon-${tone}`}`}
                    aria-hidden="true"
                  >
                    <Icon size={16} />
                  </span>
                  <div className="von-content">
                    <p className="von-row-title">
                      {tone !== 'muted' && <span className="von-dot" aria-hidden="true" />}
                      {title}
                      {isUnread && <span className="von-visually-hidden"> — {t('venueOwnerNotifications.unread')}</span>}
                    </p>
                    {body && <p className="von-row-body">{body}</p>}
                    <p className="von-row-time">
                      <bdi>{timeLabel(notification.created_at)}</bdi>
                    </p>
                  </div>
                  <div className="von-row-end">
                    {action && (
                      <button
                        type="button"
                        className={`von-action ${isUnread ? 'von-action-primary' : 'von-action-secondary'}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          if (action[1]) {
                            openAction(notification, action[1])
                          } else {
                            markRead(notification)
                            setDetails(notification)
                          }
                        }}
                      >
                        {t(action[0])}
                      </button>
                    )}
                    <RowMenu isRead={notification.is_read} onMarkRead={() => markRead(notification)} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      )}

      {details && (
        <NotificationDetailsModal
          notification={details}
          title={details.titleKey ? t(details.titleKey) : details.title}
          body={details.bodyKey ? t(details.bodyKey) : details.body}
          tone={getTone(details)}
          Icon={TYPE_ICONS[details.type] ?? Bell}
          onClose={() => setDetails(null)}
        />
      )}
    </DashboardLayout>
  )
}

export default VenueOwnerNotifications
