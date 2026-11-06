import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, CircleAlert, CircleDollarSign, Timer, TrendingUp, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Card from '../../components/Card/Card.jsx'
import BarChart from '../../components/charts/BarChart.jsx'
import LineChart from '../../components/charts/LineChart.jsx'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import StatCard from '../../components/StatCard/StatCard.jsx'
import { IS_API_ENABLED } from '../../config/api.js'
import { VENUE_OWNER_NAV } from '../../constants/venueOwnerNav.js'
import { useAuth } from '../../context/useAuth.js'
import {
  API_PERIODS,
  getVenueOwnerDashboard,
  getVenueOwnerDashboardStats,
} from '../../services/dashboardService.js'
import { FACILITY_MULTIPLE, FACILITY_NONE } from '../../services/facilityService.js'
import { isConnectionFailure, isNotConnected } from '../../utils/requestErrors.js'
import PeriodSelect from './PeriodSelect.jsx'
import '../../styles/skeleton.css'
import './VenueOwnerDashboard.css'

// Venue Owner dashboard home (route: /venue-owner/dashboard), built from the
// Figma reference. All numbers come from dashboardService: mock data in demo
// mode; in API mode the real values that the existing endpoints return (see
// dashboardService.js for the source of each card). What the backend does
// not provide is never filled in: the weekly revenue chart says the server
// has no daily revenue (the weekly bookings chart shows the backend's
// bookings_overview), an occupancy with no bookable slot shows "—", and a
// missing change vs the previous period is said in words instead of a
// percentage.
//
// Period picker (API mode): every period loads the backend's analytics for
// it (today = day, last month = last_month; week = Saturday..Friday, as the
// backend defines it); "Total bookings", "Revenue" and "Occupancy" follow
// it, "This week" always shows the backend's week.
//
// While the data loads, the cards, today's schedule and both charts are shown
// as placeholder blocks (no text) under the page header, as on the Reviews
// and Analytics pages. A failed load shows the error state (connection or
// server) with "Try again"; 401 signs out (as on the Bookings page).

// Placeholders in the loading state: statistics cards and schedule rows.
const SKELETON_STATS = 4
const SKELETON_SCHEDULE_ROWS = 6

const numberFormat = new Intl.NumberFormat('en-US')
// Backend percentages have up to two decimals (e.g. 28.57).
const percentFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

// "+12%", "-4.5%", "0%".
function signedPercent(value) {
  return `${value > 0 ? '+' : ''}${percentFormat.format(value)}%`
}

// Periods the picker offers but the backend does not accept (API mode).
const UNSUPPORTED_PERIODS = IS_API_ENABLED
  ? ['today', 'week', 'month', 'lastMonth'].filter((period) => !API_PERIODS.includes(period))
  : []

// Backend date "2026-10-19" -> "19 October" (the date as the backend gives
// it: read and shown in UTC so no time zone moves it a day).
function formatDay(isoDate, language) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return isoDate
  return new Intl.DateTimeFormat(`${language}-u-nu-latn`, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date)
}

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
  const { token, logout } = useAuth()
  // null (no error) | 'network' (no connection) | 'server' (any other
  // failure) — same handling as the Bookings page — | 'unavailable' (no
  // backend source wired; shown without "Try again") | 'noVenue' /
  // 'multipleVenues' (API mode: no venue, or more than one, linked to the
  // account — as on the Bookings page).
  const [errorKind, setErrorKind] = useState(null)
  const hasError = errorKind !== null
  // Incremented by "Try again" to run the dashboard request once more.
  const [attempt, setAttempt] = useState(0)
  const [period, setPeriod] = useState('week')
  // Statistics of { key: `${attempt}:${period}`, value }: a value loaded for
  // another period (or an earlier attempt) is not shown, so changing the
  // period brings back the cards' loading placeholders until its own data
  // arrives.
  const [statsState, setStatsState] = useState({ key: null, value: null })
  const statsKey = `${attempt}:${period}`
  const stats = statsState.key === statsKey ? statsState.value : null

  // Shared error handling of both requests. 401 signs out.
  const handleError = useCallback(
    (error) => {
      if (error?.status === 401) {
        logout()
        return
      }
      if (error?.code === FACILITY_NONE) {
        setErrorKind('noVenue')
        return
      }
      if (error?.code === FACILITY_MULTIPLE) {
        setErrorKind('multipleVenues')
        return
      }
      // No backend source wired: "not available", not an error.
      if (isNotConnected(error)) {
        setErrorKind('unavailable')
        return
      }
      setErrorKind(isConnectionFailure(error) ? 'network' : 'server')
    },
    [logout],
  )

  // Dashboard data (venue, today's schedule, charts): loading → loaded, or →
  // error.
  useEffect(() => {
    let isActive = true
    getVenueOwnerDashboard(token)
      .then((result) => isActive && setData(result))
      .catch((error) => isActive && handleError(error))
    return () => {
      isActive = false
    }
  }, [attempt, handleError, token])

  // Statistics cards for the selected period: loaded again when it changes.
  useEffect(() => {
    let isActive = true
    const key = `${attempt}:${period}`
    getVenueOwnerDashboardStats(period, token)
      .then((value) => isActive && setStatsState({ key, value }))
      .catch((error) => isActive && handleError(error))
    return () => {
      isActive = false
    }
  }, [attempt, handleError, period, token])

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
  // Venue name: demo data has one name; the API venue is bilingual.
  const venueName = data
    ? IS_API_ENABLED
      ? data.venue[i18n.language?.startsWith('ar') ? 'name_ar' : 'name_en'] || data.venue.name_ar || data.venue.name_en
      : data.venue.name
    : ''
  // Sidebar venue card: demo mode only, as on the other Venue Owner pages (in
  // API mode the layout reads the owner's venue name itself).
  const venue =
    data && !IS_API_ENABLED
      ? { name: venueName, statusKey: `venueOwnerDashboard.venueStatus.${data.venue.status}` }
      : null
  const isNotice = errorKind === 'unavailable' || errorKind === 'noVenue' || errorKind === 'multipleVenues'
  // Notes of the period-linked cards (API mode: today | week | month | lastMonth).
  const periodNote = (name) => t(`venueOwnerDashboard.stats.api.${period}.${name}`)

  const bookingsSeries = data?.weeklyBookings?.map((item) => ({
    label: t(`venueOwnerDashboard.days.${item.day}`),
    value: item.value,
  }))
  const revenueSeries = data?.weeklyRevenue?.map((item) => ({
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
          <PeriodSelect value={period} onChange={setPeriod} unsupported={UNSUPPORTED_PERIODS} />
        </div>
      )}

      {/* Error state: centered, as on the Reviews and Analytics pages.
          Connection failures show the Wi-Fi icon; server errors the alert
          icon. */}
      {hasError && (
        <section
          className="vo-error-state"
          role={isNotice ? 'status' : 'alert'}
          aria-labelledby="vo-error-title"
        >
          {errorKind === 'network' && (
            <WifiOff className="vo-error-icon" size={100} strokeWidth={2.25} aria-hidden="true" />
          )}
          <h1 id="vo-error-title" className="vo-error-title">
            {errorKind === 'server' && <CircleAlert className="vo-error-alert" size={20} aria-hidden="true" />}
            {t(isNotice ? 'venueOwnerDashboard.unavailable' : 'venueOwnerDashboard.errorState.title')}
          </h1>
          <p className="vo-error-text">
            {t(
              {
                unavailable: 'common.notConnected',
                noVenue: 'venueOwnerFacility.noVenue',
                multipleVenues: 'venueOwnerFacility.multipleVenues',
                network: 'venueOwnerDashboard.errorState.networkMessage',
              }[errorKind] ?? 'venueOwnerDashboard.errorState.serverMessage',
            )}
          </p>
          {!isNotice && (
            <button type="button" className="vo-error-button" onClick={retry}>
              {t('venueOwnerDashboard.errorState.retry')}
            </button>
          )}
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
          {/* Statistics cards. After a period change they show their
              loading placeholders until that period's data arrives. */}
          {stats ? (
            <section className="vo-stats" aria-label={t('venueOwnerDashboard.statsLabel')}>
              <StatCard
                icon={CalendarDays}
                label={t('venueOwnerDashboard.stats.totalBookings')}
                value={numberFormat.format(stats.totalBookings)}
                noteEmphasis={
                  stats.totalBookingsChangePercent !== null && (
                    <bdi dir="ltr">{signedPercent(stats.totalBookingsChangePercent)}</bdi>
                  )
                }
                note={
                  IS_API_ENABLED
                    ? periodNote(stats.totalBookingsChangePercent === null ? 'noCompare' : 'compare')
                    : t('venueOwnerDashboard.stats.totalBookingsNote')
                }
              />
              <StatCard
                icon={TrendingUp}
                label={t('venueOwnerDashboard.stats.thisWeek')}
                value={numberFormat.format(stats.weekBookings)}
                note={
                  IS_API_ENABLED
                    ? t('venueOwnerDashboard.stats.api.weekRange', {
                        from: formatDay(stats.weekRange.from, i18n.language),
                        to: formatDay(stats.weekRange.to, i18n.language),
                      })
                    : t('venueOwnerDashboard.stats.thisWeekNote')
                }
              />
              <StatCard
                icon={CircleDollarSign}
                label={t('venueOwnerDashboard.stats.revenue')}
                value={<bdi dir="ltr">₪{numberFormat.format(stats.revenue)}</bdi>}
                note={IS_API_ENABLED ? periodNote('revenue') : t('venueOwnerDashboard.stats.revenueNote')}
              />
              <StatCard
                icon={Timer}
                label={t('venueOwnerDashboard.stats.occupancy')}
                value={
                  stats.occupancyPercent === null ? (
                    '—'
                  ) : (
                    <bdi dir="ltr">{`${percentFormat.format(stats.occupancyPercent)}%`}</bdi>
                  )
                }
                note={
                  IS_API_ENABLED
                    ? periodNote(stats.occupancyPercent === null ? 'noSlots' : 'occupancy')
                    : t('venueOwnerDashboard.stats.occupancyNote')
                }
              />
            </section>
          ) : (
            <div className="vo-stats" aria-busy="true" aria-label={t('venueOwnerDashboard.statsLabel')}>
              {Array.from({ length: SKELETON_STATS }, (_, card) => (
                <div key={card} className="stat-card" aria-hidden="true">
                  <span className="vo-skeleton pv-shimmer vo-skeleton-stat-label" />
                  <span className="vo-skeleton pv-shimmer vo-skeleton-stat-value" />
                  <span className="vo-skeleton pv-shimmer vo-skeleton-stat-note" />
                </div>
              ))}
            </div>
          )}

          <div className="vo-middle">
            <Card
              className="vo-schedule"
              title={t('venueOwnerDashboard.schedule.title')}
              subtitle={venueName}
              actions={<span className="vo-chip">{today}</span>}
            >
              {data.todaySchedule.length === 0 ? (
                <p className="vo-panel-unavailable">{t('venueOwnerDashboard.schedule.empty')}</p>
              ) : (
                <ul className="vo-schedule-list">
                  {data.todaySchedule.map((slot, index) => {
                    // available | booked | blocked (API mode: held by a booking
                    // that awaits payment — its player is shown when known).
                    const kind = slot.status === 'booked' ? 'booked' : slot.status === 'blocked' ? 'blocked' : 'available'
                    const who = {
                      booked: slot.playerName || t('venueOwnerDashboard.schedule.unknownPlayer'),
                      available: t('venueOwnerDashboard.schedule.available'),
                      blocked: slot.playerName || t('venueOwnerDashboard.schedule.blockedLabel'),
                    }[kind]
                    const badge = { booked: 'booked', available: 'open', blocked: 'blocked' }[kind]
                    return (
                      <li key={`${slot.time}-${index}`} className="vo-schedule-row">
                        <span className="vo-schedule-time" dir="ltr">
                          {slot.time}
                        </span>
                        <span className={`vo-schedule-who ${kind === 'booked' ? '' : 'vo-schedule-who-available'}`}>
                          {who}
                          <span className={`vo-dot vo-dot-${kind}`} aria-hidden="true" />
                        </span>
                        <span className={`vo-badge vo-badge-${badge}`}>{t(`venueOwnerDashboard.schedule.${badge}`)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>

            <Card
              className="vo-chart-card"
              title={t('venueOwnerDashboard.bookingsChart.title')}
              subtitle={t('venueOwnerDashboard.bookingsChart.subtitle')}
              actions={
                bookingsSeries && (
                  <span className="vo-legend">
                    <span className="vo-legend-line" aria-hidden="true" />
                    {t('venueOwnerDashboard.bookingsChart.legend')}
                  </span>
                )
              }
            >
              {bookingsSeries ? (
                <LineChart
                  data={bookingsSeries}
                  max={25}
                  step={5}
                  height={400}
                  referenceValue={25}
                  isRtl={isRtl}
                  ariaLabel={t('venueOwnerDashboard.bookingsChart.subtitle')}
                />
              ) : (
                <p className="vo-panel-unavailable">{t('venueOwnerDashboard.chartsUnavailable')}</p>
              )}
            </Card>
          </div>

          <Card
            className="vo-revenue"
            title={t('venueOwnerDashboard.revenueChart.title')}
            subtitle={t('venueOwnerDashboard.revenueChart.subtitle')}
            actions={
              revenueSeries && (
                <span className="vo-legend">
                  <span className="vo-legend-square" aria-hidden="true" />
                  {t('venueOwnerDashboard.revenueChart.legend')}
                </span>
              )
            }
          >
            {revenueSeries ? (
              <BarChart
                data={revenueSeries}
                max={1200}
                step={300}
                height={420}
                isRtl={isRtl}
                ariaLabel={t('venueOwnerDashboard.revenueChart.subtitle')}
                formatTick={(value) => (value === 0 ? '0' : `₪${value}`)}
              />
            ) : (
              <p className="vo-panel-unavailable">{t('venueOwnerDashboard.chartsUnavailable')}</p>
            )}
          </Card>
        </>
      )}
    </DashboardLayout>
  )
}

export default VenueOwnerDashboard
