import { useEffect, useState } from 'react'
import { CalendarDays, CircleAlert, CircleDollarSign, Timer, TrendingUp, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Card from '../../components/Card/Card.jsx'
import BarChart from '../../components/charts/BarChart.jsx'
import LineChart from '../../components/charts/LineChart.jsx'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import StatCard from '../../components/StatCard/StatCard.jsx'
import { VENUE_OWNER_NAV } from '../../constants/venueOwnerNav.js'
import { useAuth } from '../../context/useAuth.js'
import { getVenueOwnerDashboard } from '../../services/dashboardService.js'
import { isConnectionFailure } from '../../utils/requestErrors.js'
import PeriodSelect from './PeriodSelect.jsx'
import '../../styles/skeleton.css'
import './VenueOwnerDashboard.css'

// Venue Owner dashboard home (route: /venue-owner/dashboard), built from the
// Figma reference. All numbers come from dashboardService (MOCK data for
// now — no backend endpoint exists yet).
//
// While the data loads, the cards, today's schedule and both charts are shown
// as placeholder blocks (no text) under the page header, as on the Reviews
// and Analytics pages. A failed load shows the error state (connection or
// server) with "Try again"; 401 signs out (as on the Bookings page).

// Placeholders in the loading state: statistics cards and schedule rows.
const SKELETON_STATS = 4
const SKELETON_SCHEDULE_ROWS = 6

const numberFormat = new Intl.NumberFormat('en-US')

// Western digits in both languages, as in the design.
function formatToday(language) {
  return new Intl.DateTimeFormat(`${language}-u-nu-latn`, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

function VenueOwnerDashboard() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const [data, setData] = useState(null)
  const { logout } = useAuth()
  // null (no error) | 'network' (no connection) | 'server' (any other
  // failure) — same handling as the Bookings page.
  const [errorKind, setErrorKind] = useState(null)
  const hasError = errorKind !== null
  // Incremented by "Try again" to run the dashboard request once more.
  const [attempt, setAttempt] = useState(0)
  const [period, setPeriod] = useState('week')

  // Dashboard data: loading → loaded, or → error. 401 signs out.
  useEffect(() => {
    let isActive = true
    getVenueOwnerDashboard()
      .then((result) => isActive && setData(result))
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
  }, [attempt, logout])

  // "Try again": back to the loading state and one new request. The error
  // block (and its button) is replaced by the loading state right away, so
  // the request cannot be sent twice.
  const retry = () => {
    setErrorKind(null)
    setData(null)
    setAttempt((count) => count + 1)
  }

  const isLoading = data === null && !hasError

  const today = formatToday(i18n.language)
  const venue = data
    ? { name: data.venue.name, statusKey: `venueOwnerDashboard.venueStatus.${data.venue.status}` }
    : null

  const bookingsSeries = data?.weeklyBookings.map((item) => ({
    label: t(`venueOwnerDashboard.days.${item.day}`),
    value: item.value,
  }))
  const revenueSeries = data?.weeklyRevenue.map((item) => ({
    label: t(`venueOwnerDashboard.days.${item.day}`),
    value: item.value,
  }))

  return (
    <DashboardLayout
      navItems={VENUE_OWNER_NAV}
      venue={venue}
      roleLabelKey="dashboardLayout.roles.venueOwner"
    >
      {/* The error state has no page header (as on the Reviews and
          Analytics pages). */}
      {!hasError && (
        <div className="vo-page-header">
          <div>
            <h1 className="vo-page-title">{t('venueOwnerDashboard.title')}</h1>
            <p className="vo-page-date">{today}</p>
          </div>
          <PeriodSelect value={period} onChange={setPeriod} />
        </div>
      )}

      {/* Error state: centered, as on the Reviews and Analytics pages.
          Connection failures show the Wi-Fi icon; server errors the alert
          icon. */}
      {hasError && (
        <section className="vo-error-state" role="alert" aria-labelledby="vo-error-title">
          {errorKind === 'network' && (
            <WifiOff className="vo-error-icon" size={100} strokeWidth={2.25} aria-hidden="true" />
          )}
          <h1 id="vo-error-title" className="vo-error-title">
            {errorKind === 'server' && <CircleAlert className="vo-error-alert" size={20} aria-hidden="true" />}
            {t('venueOwnerDashboard.errorState.title')}
          </h1>
          <p className="vo-error-text">
            {t(
              errorKind === 'network'
                ? 'venueOwnerDashboard.errorState.networkMessage'
                : 'venueOwnerDashboard.errorState.serverMessage',
            )}
          </p>
          <button type="button" className="vo-error-button" onClick={retry}>
            {t('venueOwnerDashboard.errorState.retry')}
          </button>
        </section>
      )}

      {/* Loading state: placeholders in the page's layout (same cards and
          heights as the loaded dashboard). */}
      {isLoading && (
        <div aria-busy="true">
          <div className="vo-stats" aria-hidden="true">
            {Array.from({ length: SKELETON_STATS }, (_, card) => (
              <div key={card} className="stat-card">
                <span className="vo-skeleton pv-shimmer vo-skeleton-stat-label" />
                <span className="vo-skeleton pv-shimmer vo-skeleton-stat-value" />
                <span className="vo-skeleton pv-shimmer vo-skeleton-stat-note" />
              </div>
            ))}
          </div>

          <div className="vo-middle" aria-hidden="true">
            <div className="card">
              <div className="card-header">
                <span className="vo-skeleton-heading">
                  <span className="vo-skeleton pv-shimmer vo-skeleton-title" />
                  <span className="vo-skeleton pv-shimmer vo-skeleton-subtitle" />
                </span>
              </div>
              <ul className="vo-schedule-list">
                {Array.from({ length: SKELETON_SCHEDULE_ROWS }, (_, row) => (
                  <li key={row} className="vo-schedule-row">
                    <span className="vo-skeleton pv-shimmer vo-skeleton-time" />
                    <span className="vo-skeleton pv-shimmer vo-skeleton-who" />
                    <span className="vo-skeleton pv-shimmer vo-skeleton-badge" />
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="vo-skeleton-heading">
                  <span className="vo-skeleton pv-shimmer vo-skeleton-title" />
                  <span className="vo-skeleton pv-shimmer vo-skeleton-subtitle" />
                </span>
              </div>
              <span className="vo-skeleton-block pv-shimmer vo-skeleton-chart-bookings" />
            </div>
          </div>

          <div className="card" aria-hidden="true">
            <div className="card-header">
              <span className="vo-skeleton-heading">
                <span className="vo-skeleton pv-shimmer vo-skeleton-title" />
                <span className="vo-skeleton pv-shimmer vo-skeleton-subtitle" />
              </span>
            </div>
            <span className="vo-skeleton-block pv-shimmer vo-skeleton-chart-revenue" />
          </div>
        </div>
      )}

      {data && (
        <>
          <section className="vo-stats" aria-label={t('venueOwnerDashboard.statsLabel')}>
            <StatCard
              icon={CalendarDays}
              label={t('venueOwnerDashboard.stats.totalBookings')}
              value={numberFormat.format(data.stats.totalBookings)}
              noteEmphasis={
                <bdi dir="ltr">{`+${data.stats.totalBookingsChangePercent}%`}</bdi>
              }
              note={t('venueOwnerDashboard.stats.totalBookingsNote')}
            />
            <StatCard
              icon={TrendingUp}
              label={t('venueOwnerDashboard.stats.thisWeek')}
              value={numberFormat.format(data.stats.weekBookings)}
              note={t('venueOwnerDashboard.stats.thisWeekNote')}
            />
            <StatCard
              icon={CircleDollarSign}
              label={t('venueOwnerDashboard.stats.revenue')}
              value={<bdi dir="ltr">₪{numberFormat.format(data.stats.weekRevenue)}</bdi>}
              note={t('venueOwnerDashboard.stats.revenueNote')}
            />
            <StatCard
              icon={Timer}
              label={t('venueOwnerDashboard.stats.occupancy')}
              value={<bdi dir="ltr">{`${data.stats.occupancyPercent}%`}</bdi>}
              note={t('venueOwnerDashboard.stats.occupancyNote')}
            />
          </section>

          <div className="vo-middle">
            <Card
              className="vo-schedule"
              title={t('venueOwnerDashboard.schedule.title')}
              subtitle={data.venue.name}
              actions={<span className="vo-chip">{today}</span>}
            >
              <ul className="vo-schedule-list">
                {data.todaySchedule.map((slot) => {
                  const isBooked = slot.status === 'booked'
                  return (
                    <li key={slot.time} className="vo-schedule-row">
                      <span className="vo-schedule-time" dir="ltr">
                        {slot.time}
                      </span>
                      <span
                        className={`vo-schedule-who ${isBooked ? '' : 'vo-schedule-who-available'}`}
                      >
                        {isBooked ? slot.playerName : t('venueOwnerDashboard.schedule.available')}
                        <span
                          className={`vo-dot ${isBooked ? 'vo-dot-booked' : 'vo-dot-available'}`}
                          aria-hidden="true"
                        />
                      </span>
                      <span className={`vo-badge ${isBooked ? 'vo-badge-booked' : 'vo-badge-open'}`}>
                        {isBooked
                          ? t('venueOwnerDashboard.schedule.booked')
                          : t('venueOwnerDashboard.schedule.open')}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </Card>

            <Card
              className="vo-chart-card"
              title={t('venueOwnerDashboard.bookingsChart.title')}
              subtitle={t('venueOwnerDashboard.bookingsChart.subtitle')}
              actions={
                <span className="vo-legend">
                  <span className="vo-legend-line" aria-hidden="true" />
                  {t('venueOwnerDashboard.bookingsChart.legend')}
                </span>
              }
            >
              <LineChart
                data={bookingsSeries}
                max={25}
                step={5}
                height={400}
                referenceValue={25}
                isRtl={isRtl}
                ariaLabel={t('venueOwnerDashboard.bookingsChart.subtitle')}
              />
            </Card>
          </div>

          <Card
            className="vo-revenue"
            title={t('venueOwnerDashboard.revenueChart.title')}
            subtitle={t('venueOwnerDashboard.revenueChart.subtitle')}
            actions={
              <span className="vo-legend">
                <span className="vo-legend-square" aria-hidden="true" />
                {t('venueOwnerDashboard.revenueChart.legend')}
              </span>
            }
          >
            <BarChart
              data={revenueSeries}
              max={1200}
              step={300}
              height={420}
              isRtl={isRtl}
              ariaLabel={t('venueOwnerDashboard.revenueChart.subtitle')}
              formatTick={(value) => (value === 0 ? '0' : `₪${value}`)}
            />
          </Card>
        </>
      )}
    </DashboardLayout>
  )
}

export default VenueOwnerDashboard
