import { useEffect, useState } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, DollarSign, ExternalLink, House } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import { IS_API_ENABLED } from '../../config/api.js'
import { VENUE_OWNER_NAV } from '../../constants/venueOwnerNav.js'
import { getVenueOwnerBookingDetails } from '../../services/bookingsService.js'
import { useAuth } from '../../context/useAuth.js'
import { getVenueOwnerVenue } from '../../services/dashboardService.js'
import { isConnectionFailure } from '../../utils/requestErrors.js'
import {
  formatDate,
  formatDateTime,
  formatTimeRange,
  initials,
  numberFormat,
} from '../VenueOwnerBookings/bookingFormat.js'
import '../../styles/skeleton.css'
import '../VenueOwnerBookings/VenueOwnerBookings.css'
import './VenueOwnerBookingDetails.css'

// Venue Owner booking details (route: /venue-owner/bookings/:bookingId),
// opened from "View" in the bookings list. Built from the Figma references
// for a confirmed, a pending and a cancelled booking. Data comes from
// bookingsService: the mock booking in demo mode; in API mode
// GET /venue_owner/owner/bookings/{id} (booking, player, venue, sport,
// payment receipts), with the timeline steps the backend records.
//
// While loading, a placeholder card shows; a failed load shows the error
// with "Try again" (no connection / server error), or that the account may
// not see it (403). A booking that does not exist for this venue (404, or an
// id that is not a number) shows a "not found" card with the way back.
// Every documented status has a designed details page; an undocumented
// status goes back to the bookings list.
//
// API mode adds what the backend has for the booking: payment status (the
// newest receipt's status, or "no receipt"), the player's phone / role, the
// sport, and the payment receipt (image, upload / verification time,
// rejection reason). Values the backend does not have are not shown.

const LIST_PATH = '/venue-owner/bookings'

// Status-specific parts of the page (Figma): the status card note. Colors
// come from the shared status classes (vob-status-<status>).
const STATUS_NOTES = {
  confirmed: 'venueOwnerBookingDetails.confirmedNote',
  pending_payment: 'venueOwnerBookingDetails.pendingNote',
  cancelled: 'venueOwnerBookingDetails.cancelledNote',
}

function VenueOwnerBookingDetails() {
  const { bookingId } = useParams()
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const { token, logout } = useAuth()
  const [booking, setBooking] = useState(undefined) // undefined = loading, null = not found
  // Loading failed: null | 'network' | 'server' | 'forbidden'; "Try again" reloads.
  const [errorKind, setErrorKind] = useState(null)
  // The receipt image could not be loaded (show the link only).
  const [isReceiptImageBroken, setIsReceiptImageBroken] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [venue, setVenue] = useState(null)

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
    getVenueOwnerBookingDetails(bookingId, token)
      .then((details) => {
        if (!isActive) return
        setIsReceiptImageBroken(false)
        setBooking(details)
      })
      .catch((error) => {
        if (!isActive) return
        if (error?.status === 401) {
          logout()
          return
        }
        setErrorKind(isConnectionFailure(error) ? 'network' : error?.status === 403 ? 'forbidden' : 'server')
      })
    return () => {
      isActive = false
    }
  }, [bookingId, attempt, token, logout])

  const retry = () => {
    setErrorKind(null)
    setBooking(undefined)
    setAttempt((count) => count + 1)
  }

  // Demo mode keeps its behaviour (an unknown id goes back to the list); an
  // undocumented status goes back in both modes.
  if ((booking === null && !IS_API_ENABLED) || (booking && !STATUS_NOTES[booking.status])) {
    return <Navigate to={LIST_PATH} replace />
  }
  const isNotFound = booking === null

  const layoutVenue = venue
    ? { name: venue.name, statusKey: `venueOwnerDashboard.venueStatus.${venue.status}` }
    : null
  const isArabic = i18n.language?.startsWith('ar')
  // Venue name: the layout's venue (demo) or the booking's own venue (API).
  const venueName =
    venue?.name ??
    (isArabic
      ? booking?.venue_name_ar || booking?.venue_name_en
      : booking?.venue_name_en || booking?.venue_name_ar) ??
    ''
  // API mode: the booking's sport (shown under the venue name).
  const sportName = isArabic
    ? booking?.sport_name_ar || booking?.sport_name_en
    : booking?.sport_name_en || booking?.sport_name_ar
  const receipt = booking?.receipt
  const notAvailable = t('venueOwnerBookingDetails.notAvailable')
  const isLoading = booking === undefined && !errorKind

  const BackIcon = isRtl ? ChevronLeft : ChevronRight

  const code = booking ? `#PV-${booking.id}` : ''
  const date = booking ? formatDate(booking.slot_date) : ''
  const time = booking ? formatTimeRange(booking.start_time, booking.end_time) : ''
  const amount = booking ? `₪${numberFormat.format(booking.total_price)}` : ''
  const status = booking?.status
  const statusLabel = status ? t(`venueOwnerBookings.status.${status}`) : ''

  const infoRows = booking
    ? [
        { key: 'id', label: t('venueOwnerBookings.columns.id'), value: code },
        { key: 'player', label: t('venueOwnerBookings.columns.player'), value: booking.captain_name },
        { key: 'date', label: t('venueOwnerBookings.columns.date'), value: date },
        { key: 'time', label: t('venueOwnerBookingDetails.timeSlot'), value: time },
        { key: 'amount', label: t('venueOwnerBookings.columns.amount'), value: amount },
        // API mode: payment status from the newest receipt.
        ...(booking.payment_status
          ? [
              {
                key: 'payment',
                label: t('venueOwnerBookingDetails.paymentStatus'),
                value: t(`venueOwnerBookingDetails.paymentStatuses.${booking.payment_status}`),
                isText: true,
              },
            ]
          : []),
      ]
    : []

  // Only the steps that have happened (have a time) are shown.
  const timeline = booking?.timeline
    ? [
        {
          key: 'created',
          title: t('venueOwnerBookingDetails.timeline.created'),
          text: t('venueOwnerBookingDetails.timeline.createdText'),
          at: booking.timeline.created_at,
        },
        {
          key: 'paymentVerified',
          title: t('venueOwnerBookingDetails.timeline.paymentVerified'),
          text: t('venueOwnerBookingDetails.timeline.paymentVerifiedText', { amount }),
          at: booking.timeline.payment_verified_at,
        },
        {
          key: 'confirmed',
          title: t('venueOwnerBookingDetails.timeline.confirmed'),
          text: t('venueOwnerBookingDetails.timeline.confirmedText'),
          at: booking.timeline.confirmed_at,
        },
      ].filter((step) => step.at)
    : []

  const summary = [
    { key: 'date', icon: CalendarDays, label: t('venueOwnerBookings.columns.date'), value: date },
    { key: 'time', icon: Clock, label: t('venueOwnerBookings.columns.time'), value: time },
    { key: 'amount', icon: DollarSign, label: t('venueOwnerBookings.columns.amount'), value: amount },
  ]

  return (
    <DashboardLayout
      navItems={VENUE_OWNER_NAV}
      venue={layoutVenue}
      roleLabelKey="dashboardLayout.roles.venueOwner"
    >
      <div className="vobd-header">
        <header>
          <h1 className="vob-title">{t('venueOwnerBookings.title')}</h1>
          <p className="vob-subtitle">{t('venueOwnerBookings.subtitle')}</p>
          {booking && (
            <h2 className="vobd-booking-title">
              {t('venueOwnerBookingDetails.bookingLabel')} <bdi dir="ltr">{code}</bdi>
            </h2>
          )}
        </header>
        <Link className="vobd-back" to={LIST_PATH}>
          {t('venueOwnerBookingDetails.back')}
          <BackIcon size={16} aria-hidden="true" />
        </Link>
      </div>

      {isLoading && (
        <section className="vobd-card vobd-loading" aria-busy="true" aria-label={t('venueOwnerBookingDetails.loading')}>
          <span className="vobd-skeleton pv-shimmer vobd-skeleton-title" />
          <span className="vobd-skeleton pv-shimmer vobd-skeleton-line" />
          <span className="vobd-skeleton pv-shimmer vobd-skeleton-line vobd-skeleton-short" />
        </section>
      )}

      {errorKind && (
        <section className="vobd-card vobd-error" role="alert">
          <h3 className="vobd-card-title">{t('venueOwnerBookingDetails.errorTitle')}</h3>
          <p className="vobd-muted">
            {t(
              errorKind === 'network'
                ? 'venueOwnerBookings.networkErrorDescription'
                : errorKind === 'forbidden'
                  ? 'venueOwnerBookingDetails.forbidden'
                  : 'venueOwnerBookings.errorDescription',
            )}
          </p>
          {errorKind !== 'forbidden' && (
            <button type="button" className="vobd-retry" onClick={retry}>
              {t('venueOwnerBookings.retry')}
            </button>
          )}
        </section>
      )}

      {/* API mode: no such booking for this venue (empty state). */}
      {isNotFound && (
        <section className="vobd-card vobd-error" role="status">
          <h3 className="vobd-card-title">{t('venueOwnerBookingDetails.notFoundTitle')}</h3>
          <p className="vobd-muted">{t('venueOwnerBookingDetails.notFoundText')}</p>
          <Link className="vobd-retry" to={LIST_PATH}>
            {t('venueOwnerBookingDetails.back')}
          </Link>
        </section>
      )}

      {booking && (
        <div className="vobd-grid">
          {/* Start column: current status, summary, venue. */}
          <aside className="vobd-side">
            <section className={`vobd-card vobd-status-card vobd-status-card-${status}`}>
              <h3 className="vobd-card-title">{t('venueOwnerBookingDetails.currentStatus')}</h3>
              <p className={`vobd-status vobd-status-${status}`}>
                <span className="vobd-status-dot" aria-hidden="true" />
                {statusLabel}
              </p>
              <p className="vobd-muted">{t(STATUS_NOTES[status])}</p>
            </section>

            <section className="vobd-card">
              <h3 className="vobd-card-title">{t('venueOwnerBookingDetails.summaryTitle')}</h3>
              <ul className="vobd-summary">
                {summary.map(({ key, icon: Icon, label, value }) => (
                  <li key={key} className="vobd-summary-item">
                    <Icon className="vobd-summary-icon" size={16} aria-hidden="true" />
                    <span>
                      <span className="vobd-summary-label">{label}</span>
                      <bdi className="vobd-summary-value" dir="ltr">
                        {value}
                      </bdi>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="vobd-card">
              <h3 className="vobd-card-title">{t('venueOwnerBookingDetails.venueTitle')}</h3>
              <div className="vobd-venue">
                <House className="vobd-venue-icon" size={16} aria-hidden="true" />
                <span>
                  <span className="vobd-venue-name">{venueName}</span>
                  {/* Team format / surface: design text for the demo venue; the
                      backend's venue has no such fields, so in API mode the
                      booking's sport is shown instead (when known). */}
                  {!IS_API_ENABLED && (
                    <span className="vobd-muted">{t('venueOwnerBookingDetails.venueSubtitle')}</span>
                  )}
                  {IS_API_ENABLED && sportName && <span className="vobd-muted">{sportName}</span>}
                </span>
              </div>
            </section>
          </aside>

          {/* End column: booking information, player, timeline. */}
          <div className="vobd-main">
            <section className="vobd-card">
              <h3 className="vobd-card-title">{t('venueOwnerBookingDetails.infoTitle')}</h3>
              <dl className="vobd-info">
                {infoRows.map(({ key, label, value, isText }) => (
                  <div key={key} className="vobd-info-row">
                    <dt>{label}</dt>
                    <dd>{isText ? value : <bdi dir="ltr">{value}</bdi>}</dd>
                  </div>
                ))}
                <div className="vobd-info-row">
                  <dt>{t('venueOwnerBookings.columns.status')}</dt>
                  <dd>
                    <span className={`vob-status vob-status-${status}`}>
                      <span className="vob-status-dot" aria-hidden="true" />
                      {statusLabel}
                    </span>
                  </dd>
                </div>
              </dl>
            </section>

            <section className="vobd-card">
              <h3 className="vobd-card-title">{t('venueOwnerBookingDetails.playerTitle')}</h3>
              <div className="vobd-player">
                <span className="vobd-player-initials" aria-hidden="true">
                  {initials(booking.captain_name)}
                </span>
                <span>
                  <bdi className="vobd-player-name">{booking.captain_name}</bdi>
                  <span className="vobd-muted">
                    {t('venueOwnerBookingDetails.playerSubtitle', { venue: venueName })}
                  </span>
                  {/* API mode: the contact details the booking has. */}
                  {booking.captain_role && <span className="vobd-muted">{booking.captain_role}</span>}
                  {booking.captain_phone && (
                    <span className="vobd-muted">
                      {t('venueOwnerBookingDetails.playerPhone')}: <bdi dir="ltr">{booking.captain_phone}</bdi>
                    </span>
                  )}
                </span>
              </div>
            </section>

            {/* API mode: the payment receipt (newest one) or why there is none. */}
            {booking.receipt !== undefined && (
              <section className="vobd-card">
                <h3 className="vobd-card-title">{t('venueOwnerBookingDetails.receiptTitle')}</h3>
                {receipt ? (
                  <>
                    <dl className="vobd-info">
                      <div className="vobd-info-row">
                        <dt>{t('venueOwnerBookingDetails.paymentStatus')}</dt>
                        <dd>{t(`venueOwnerBookingDetails.paymentStatuses.${receipt.status}`)}</dd>
                      </div>
                      <div className="vobd-info-row">
                        <dt>{t('venueOwnerBookingDetails.receiptUploadedAt')}</dt>
                        <dd>
                          <bdi dir="ltr">{receipt.uploaded_at ? formatDateTime(receipt.uploaded_at) : notAvailable}</bdi>
                        </dd>
                      </div>
                      {receipt.verified_at && (
                        <div className="vobd-info-row">
                          <dt>{t('venueOwnerBookingDetails.receiptVerifiedAt')}</dt>
                          <dd>
                            <bdi dir="ltr">{formatDateTime(receipt.verified_at)}</bdi>
                          </dd>
                        </div>
                      )}
                      {receipt.status === 'rejected' && (
                        <div className="vobd-info-row">
                          <dt>{t('venueOwnerBookingDetails.receiptRejectionReason')}</dt>
                          <dd>
                            <bdi>{receipt.rejection_reason ?? notAvailable}</bdi>
                          </dd>
                        </div>
                      )}
                    </dl>
                    {receipt.image_url && !isReceiptImageBroken && (
                      <a className="vobd-receipt-link" href={receipt.image_url} target="_blank" rel="noopener noreferrer">
                        <img
                          className="vobd-receipt-image"
                          src={receipt.image_url}
                          alt={t('venueOwnerBookingDetails.receiptImageAlt', { code })}
                          loading="lazy"
                          onError={() => setIsReceiptImageBroken(true)}
                        />
                      </a>
                    )}
                    {receipt.image_url && isReceiptImageBroken && (
                      <p className="vobd-muted">{t('venueOwnerBookingDetails.receiptImageError')}</p>
                    )}
                    {receipt.image_url && (
                      <a className="vobd-receipt-open" href={receipt.image_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={14} aria-hidden="true" />
                        {t('venueOwnerBookingDetails.receiptOpen')}
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <p className="vobd-muted">{t('venueOwnerBookingDetails.receiptNone')}</p>
                    {status === 'pending_payment' && booking.hold_expires_at && (
                      <p className="vobd-muted">
                        {t('venueOwnerBookingDetails.holdExpiresAt')}:{' '}
                        <bdi dir="ltr">{formatDateTime(booking.hold_expires_at)}</bdi>
                      </p>
                    )}
                  </>
                )}
              </section>
            )}

            {timeline.length > 0 && (
              <section className="vobd-card">
                <h3 className="vobd-card-title">{t('venueOwnerBookingDetails.timelineTitle')}</h3>
                <ol className="vobd-timeline">
                  {timeline.map((step) => (
                    <li key={step.key} className="vobd-step">
                      <span className="vobd-step-icon" aria-hidden="true">
                        <Check size={10} strokeWidth={3} />
                      </span>
                      <span className="vobd-step-body">
                        <span className="vobd-step-title">{step.title}</span>
                        <span className="vobd-muted">{step.text}</span>
                        <bdi className="vobd-step-time" dir="ltr">
                          {formatDateTime(step.at)}
                        </bdi>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default VenueOwnerBookingDetails
