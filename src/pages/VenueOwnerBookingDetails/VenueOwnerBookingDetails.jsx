import { useEffect, useState } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, DollarSign, House } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import { VENUE_OWNER_NAV } from '../../constants/venueOwnerNav.js'
import { getVenueOwnerBookingDetails } from '../../services/bookingsService.js'
import { getVenueOwnerVenue } from '../../services/dashboardService.js'
import {
  formatDate,
  formatDateTime,
  formatTimeRange,
  initials,
  numberFormat,
} from '../VenueOwnerBookings/bookingFormat.js'
import '../VenueOwnerBookings/VenueOwnerBookings.css'
import './VenueOwnerBookingDetails.css'

// Venue Owner booking details (route: /venue-owner/bookings/:bookingId),
// opened from "View" in the bookings list. Built from the Figma references
// for a confirmed, a pending and a cancelled booking. Data comes from
// bookingsService (MOCK for now — no backend endpoint exists yet).
//
// Every documented status has a designed details page; an unknown id, an
// undocumented status or a failed load goes back to the bookings list.

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
  const [booking, setBooking] = useState(undefined) // undefined = loading, null = not found
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
    getVenueOwnerBookingDetails(bookingId)
      .then((details) => isActive && setBooking(details))
      .catch(() => isActive && setBooking(null))
    return () => {
      isActive = false
    }
  }, [bookingId])

  if (booking === null || (booking && !STATUS_NOTES[booking.status])) {
    return <Navigate to={LIST_PATH} replace />
  }

  const layoutVenue = venue
    ? { name: venue.name, statusKey: `venueOwnerDashboard.venueStatus.${venue.status}` }
    : null

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
                  <span className="vobd-venue-name">{venue?.name}</span>
                  <span className="vobd-muted">{t('venueOwnerBookingDetails.venueSubtitle')}</span>
                </span>
              </div>
            </section>
          </aside>

          {/* End column: booking information, player, timeline. */}
          <div className="vobd-main">
            <section className="vobd-card">
              <h3 className="vobd-card-title">{t('venueOwnerBookingDetails.infoTitle')}</h3>
              <dl className="vobd-info">
                {infoRows.map(({ key, label, value }) => (
                  <div key={key} className="vobd-info-row">
                    <dt>{label}</dt>
                    <dd>
                      <bdi dir="ltr">{value}</bdi>
                    </dd>
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
                    {t('venueOwnerBookingDetails.playerSubtitle', { venue: venue?.name ?? '' })}
                  </span>
                </span>
              </div>
            </section>

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
