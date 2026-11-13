import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, CircleAlert, ReceiptText, UserPlus, Warehouse, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import { ADMIN_NAV } from '../../constants/adminNav.js'
import { useAuth } from '../../context/useAuth.js'
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from '../../services/adminNotificationsService.js'
import { isConnectionFailure } from '../../utils/requestErrors.js'
import '../../styles/skeleton.css'
import emptyIllustration from '../../assets/empty-state-illustration.svg'
import './AdminNotifications.css'

// Admin "Notifications" pages, opened from the bell in the Admin top bar.
// One page per tab of the design, each with its own route:
//   /admin/notifications         All     (view="all")
//   /admin/notifications/unread  Unread  (view="unread")
//   /admin/notifications/read    Read    (view="read")
// The All / Unread / Read tabs are links between these routes (the list is
// kept while switching, as the same page stays mounted). Built from the
// design: title with the unread count, "Mark all as read", the tabs and the
// notification cards (unread cards with a navy border, an orange dot and a
// filled action button).
//
// Data: adminNotificationsService — the signed-in admin's own notifications
// (GET /notifications, each with its is_read state) in API mode, the demo
// list in demo mode. Clicking an unread card marks it as read
// (PUT /notifications/{id}/read); "Mark all as read" sends that request for
// each unread notification (no bulk endpoint). A notification only becomes
// read (and moves from Unread to Read) once its request succeeded; while it
// runs the card shows as pending, and a failed request leaves it unread with
// an error message.
//
// Action buttons (design: review receipt, view receipts, view venues, view
// accounts) open Admin pages that are not built yet: until a page exists
// (ACTION_ROUTES `to`), the button only marks the notification as read, as
// clicking the card does (no message, no page).

const TABS = ['all', 'unread', 'read']

// Route of each tab (App.jsx).
const TAB_PATHS = {
  all: '/admin/notifications',
  unread: '/admin/notifications/unread',
  read: '/admin/notifications/read',
}

// Loading (design): five placeholder cards.
const SKELETON_ROWS = 5

// Icon of each notification kind (same icons as the Admin sidebar);
// anything else gets a bell.
const TYPE_ICONS = {
  payment_receipt_uploaded: ReceiptText,
  payment_receipts_pending: ReceiptText,
  venue_created: Warehouse,
  admin_created: UserPlus,
}

// Action of each kind: label key + the page it opens. `to: null` = that
// Admin page is not linked yet (venues, admin accounts /admins): the button
// only marks the notification as read. Set `to` when the page is linked.
const ACTION_ROUTES = {
  payment_receipt_uploaded: { labelKey: 'adminNotifications.actions.reviewReceipt', to: '/admin/payments' },
  payment_receipts_pending: { labelKey: 'adminNotifications.actions.viewReceipts', to: '/admin/payments' },
  venue_created: { labelKey: 'adminNotifications.actions.viewVenues', to: null },
  admin_created: { labelKey: 'adminNotifications.actions.viewAccounts', to: null },
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

// "10 minutes ago" / "2 hours ago" (today), "Yesterday • 9:30 AM",
// otherwise "20 October 2026 • 2:15 PM". Latin digits.
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
    if (days === 0 && minutes < 1) return t('adminNotifications.time.justNow')
    if (days === 0 && minutes < 60) return t('adminNotifications.time.minutes', { count: minutes })
    if (days === 0) return t('adminNotifications.time.hours', { count: Math.floor(minutes / 60) })
    if (days === 1) return `${t('adminNotifications.time.yesterday')} • ${timeFormat.format(date)}`
    return `${dateFormat.format(date)} • ${timeFormat.format(date)}`
  }
}

function AdminNotifications({ view = 'all' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { token, logout } = useAuth()
  const timeLabel = useTimeLabel()
  const [notifications, setNotifications] = useState(null)
  // null | 'network' | 'server'
  const [errorKind, setErrorKind] = useState(null)
  const [attempt, setAttempt] = useState(0)
  // "Try again" button of the error state: focused again when a retry fails
  // (the button is replaced by the loading state while the request runs).
  const retryRef = useRef(null)
  const tab = TABS.includes(view) ? view : 'all'
  // A "mark as read" request failed (the notification stays unread).
  const [markError, setMarkError] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  // Ids whose "mark as read" request is running.
  const [pendingIds, setPendingIds] = useState([])

  useEffect(() => {
    let isActive = true
    getAdminNotifications(token)
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

  useEffect(() => {
    if (errorKind && attempt > 0) retryRef.current?.focus()
  }, [errorKind, attempt])

  const retry = () => {
    setErrorKind(null)
    setNotifications(null)
    setAttempt((count) => count + 1)
  }

  const setRead = (ids, isRead) =>
    setNotifications(
      (list) => list?.map((item) => (ids.includes(item.id) ? { ...item, is_read: isRead } : item)) ?? list,
    )

  const setPending = (ids, isPending) =>
    setPendingIds((current) =>
      isPending ? [...current, ...ids.filter((id) => !current.includes(id))] : current.filter((id) => !ids.includes(id)),
    )

  // Marks one notification as read once the request succeeded; a failed
  // request leaves it unread and shows the error message.
  const markRead = (notification) => {
    if (notification.is_read || pendingIds.includes(notification.id) || isMarkingAll) return
    setMarkError(false)
    setPending([notification.id], true)
    markAdminNotificationRead(notification.id, token)
      .then(() => setRead([notification.id], true))
      .catch((error) => {
        if (error?.status === 401) {
          logout()
          return
        }
        setMarkError(true)
      })
      .finally(() => setPending([notification.id], false))
  }

  const list = notifications ?? []
  const unreadIds = list.filter((item) => !item.is_read).map((item) => item.id)
  const unreadCount = unreadIds.length

  const markAllRead = () => {
    if (unreadCount === 0 || isMarkingAll) return
    const ids = unreadIds.filter((id) => !pendingIds.includes(id))
    if (ids.length === 0) return
    setMarkError(false)
    setIsMarkingAll(true)
    setPending(ids, true)
    markAllAdminNotificationsRead(ids, token)
      .then(({ failedIds }) => {
        // Only the notifications whose request succeeded become read.
        setRead(
          ids.filter((id) => !failedIds.includes(id)),
          true,
        )
        if (failedIds.length > 0) setMarkError(true)
      })
      .catch((error) => {
        if (error?.status === 401) {
          logout()
          return
        }
        setMarkError(true)
      })
      .finally(() => {
        setPending(ids, false)
        setIsMarkingAll(false)
      })
  }

  const isLoading = notifications === null && !errorKind
  const hasNone = Array.isArray(notifications) && notifications.length === 0
  const visible = list.filter((item) => (tab === 'all' ? true : tab === 'unread' ? !item.is_read : item.is_read))
  // null | 'all' | 'unread' | 'read' — which empty text, after a successful request.
  const emptyKind = hasNone ? 'all' : notifications && visible.length === 0 ? tab : null

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      venue={null}
      roleLabelKey="dashboardLayout.roles.admin"
      subtitle={t('dashboardLayout.roles.admin')}
      brandMark
    >
      <header className="adn-header">
        <div className="adn-heading">
          <div className="adn-title-row">
            <h1 className="adn-title">{t('adminNotifications.title')}</h1>
            {unreadCount > 0 && (
              <span className="adn-unread-badge">{t('adminNotifications.unreadCount', { count: unreadCount })}</span>
            )}
          </div>
          <p className="adn-subtitle">{t('adminNotifications.subtitle')}</p>
        </div>
        {/* Only when there is something to mark (a button that would do
            nothing is not shown). */}
        {unreadCount > 0 && (
          <button type="button" className="adn-mark-all" onClick={markAllRead} disabled={isMarkingAll}>
            <CheckCheck size={16} aria-hidden="true" />
            {t('adminNotifications.markAllAsRead')}
          </button>
        )}
      </header>

      {/* All / Unread / Read: links to the three notification pages. */}
      <nav className="adn-tabs" aria-label={t('adminNotifications.tabsLabel')}>
        {TABS.map((key) => (
          <Link
            key={key}
            to={TAB_PATHS[key]}
            aria-current={tab === key ? 'page' : undefined}
            className={`adn-tab ${tab === key ? `adn-tab-active adn-tab-active-${key}` : ''}`}
          >
            {t(`adminNotifications.tabs.${key}`)}
            {key === 'unread' && unreadCount > 0 && (
              <bdi className="adn-tab-count">({unreadCount})</bdi>
            )}
          </Link>
        ))}
      </nav>

      {markError && (
        <p className="adn-mark-error" role="alert">
          {t('adminNotifications.markError')}
        </p>
      )}

      {/* The page shows exactly one of: loading (request running), error
          (request failed), empty (request succeeded, nothing to show in this
          tab) or the list. */}

      {/* Loading (design): placeholder cards in the shape of a notification
          (icon, title, text, time), only visual and not interactive; the
          screen reader hears "Loading notifications". */}
      {isLoading && (
        <div className="adn-loading" role="status" aria-busy="true">
          <span className="adn-visually-hidden">{t('adminNotifications.loading')}</span>
          <ul className="adn-list" aria-hidden="true">
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <li key={index} className="adn-card adn-card-skeleton">
                <span className="adn-skeleton pv-shimmer adn-skeleton-icon" />
                <div className="adn-content">
                  <span className="adn-skeleton pv-shimmer adn-skeleton-title" />
                  <span className="adn-skeleton pv-shimmer adn-skeleton-body" />
                  <span className="adn-skeleton pv-shimmer adn-skeleton-time" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error (design): the request failed — never shown as "no
          notifications" and no demo data instead. No connection → Wi-Fi
          icon; a server or unexpected response → alert icon. "Try again"
          sends the request again (loading state meanwhile). */}
      {errorKind && (
        <div className="adn-error-state" role="alert">
          {errorKind === 'network' ? (
            <WifiOff className="adn-error-icon" size={64} strokeWidth={2} aria-hidden="true" />
          ) : (
            <CircleAlert className="adn-error-icon adn-error-icon-server" size={56} strokeWidth={2} aria-hidden="true" />
          )}
          <p className="adn-error-title">{t('adminNotifications.errorState.title')}</p>
          <p className="adn-error-text">
            {t(
              errorKind === 'network'
                ? 'adminNotifications.errorState.networkMessage'
                : 'adminNotifications.errorState.serverMessage',
            )}
          </p>
          <button ref={retryRef} type="button" className="adn-error-retry" onClick={retry}>
            {t('adminNotifications.errorState.retry')}
          </button>
        </div>
      )}

      {/* Empty (design): only after a successful request. No notifications
          at all → the general text (whatever the tab); notifications exist
          but none in this tab → the tab's own text. */}
      {emptyKind && (
        <section className="adn-empty-card" role="status" aria-labelledby="adn-empty-title">
          <img className="adn-empty-illustration" src={emptyIllustration} alt="" />
          <h2 id="adn-empty-title" className="adn-empty-title">
            {t(`adminNotifications.emptyState.${emptyKind}.title`)}
          </h2>
          <p className="adn-empty-text">{t(`adminNotifications.emptyState.${emptyKind}.message`)}</p>
        </section>
      )}

      {visible.length > 0 && (
        <ul className="adn-list" aria-label={t('adminNotifications.title')}>
          {visible.map((notification) => {
            const Icon = TYPE_ICONS[notification.type] ?? Bell
            const isUnread = !notification.is_read
            const isPending = pendingIds.includes(notification.id)
            const action = ACTION_ROUTES[notification.type]
            const title = notification.titleKey ? t(notification.titleKey) : notification.title
            const body = notification.bodyKey ? t(notification.bodyKey) : notification.body
            return (
              <li
                key={notification.id}
                className={`adn-card ${isUnread ? 'adn-card-unread' : ''} ${isPending ? 'adn-card-pending' : ''}`}
                aria-busy={isPending || undefined}
                onClick={() => markRead(notification)}
                // Unread cards can also be marked as read from the keyboard.
                tabIndex={isUnread ? 0 : undefined}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    markRead(notification)
                  }
                }}
              >
                <span className={`adn-icon ${isUnread ? 'adn-icon-unread' : ''}`} aria-hidden="true">
                  <Icon size={18} />
                </span>
                <div className="adn-content">
                  <p className="adn-card-title">
                    {isUnread && <span className="adn-dot" aria-hidden="true" />}
                    {title}
                    {isUnread && <span className="adn-visually-hidden"> — {t('adminNotifications.unread')}</span>}
                  </p>
                  {body && <p className="adn-card-body">{body}</p>}
                  <p className="adn-card-time">
                    <bdi>{timeLabel(notification.created_at)}</bdi>
                  </p>
                </div>
                {action && (
                  <button
                    type="button"
                    className={`adn-action ${isUnread ? 'adn-action-primary' : 'adn-action-secondary'}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      markRead(notification)
                      if (action.to) navigate(action.to)
                    }}
                  >
                    {t(action.labelKey)}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </DashboardLayout>
  )
}

export default AdminNotifications
