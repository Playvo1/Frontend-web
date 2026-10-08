import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, ChartPie, DollarSign } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import { VENUE_OWNER_NAV } from '../../constants/venueOwnerNav.js'
import { getVenueOwnerAnalytics } from '../../services/analyticsService.js'
import { getVenueOwnerVenue } from '../../services/dashboardService.js'
import { numberFormat } from '../VenueOwnerBookings/bookingFormat.js'
import AnalyticsTrendChart from './AnalyticsTrendChart.jsx'
import './VenueOwnerAnalytics.css'

// Venue Owner "Analytics" page (route: /venue-owner/analytics), built from
// the design: page title, three summary cards (occupancy, revenue,
// bookings), the "Bookings & revenue" line chart and the "Peak hours" bars.
//
// With no analytics data yet (no bookings, no chart points), the cards and
// charts are replaced by the empty-state design: a centered message and a
// "Go to home" button (Venue Owner dashboard).
//
// While the data loads, the cards and charts are shown as static placeholder
// blocks (loading design, no text) under the page title.
//
// Data comes from analyticsService (MOCK for now — see that file).

// Chart axes, as in the design.
const BOOKINGS_AXIS = { max: 28, step: 7 }
const REVENUE_AXIS = { max: 1600, step: 400 }

// Peak-hours bars: the busiest hour is highlighted; hours with at least this
// share of the busiest one use the darker shade (design).
const HIGH_DEMAND_RATIO = 0.75

// No analytics yet: no bookings and nothing to draw in either chart.
function hasNoAnalytics(analytics) {
  return (
    !analytics.summary?.bookings_count &&
    !(analytics.trend?.length > 0) &&
    !(analytics.peak_hours?.length > 0)
  )
}

function VenueOwnerAnalytics() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const [venue, setVenue] = useState(null)
  const [data, setData] = useState(null)
  const [hasError, setHasError] = useState(false)

  // Sidebar venue card / top-bar subtitle: same source as the other
  // Venue Owner pages.
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
    getVenueOwnerAnalytics()
      .then((analyticsData) => isActive && setData(analyticsData))
      .catch(() => isActive && setHasError(true))
    return () => {
      isActive = false
    }
  }, [])

  const layoutVenue = venue
    ? { name: venue.name, statusKey: `venueOwnerDashboard.venueStatus.${venue.status}` }
    : null

  const money = (value) => `₪${numberFormat.format(value)}`
  const dateLabel = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', timeZone: 'UTC' })

  const stats = data
    ? [
        {
          key: 'occupancy',
          icon: ChartPie,
          value: `${data.summary.occupancy_percent}%`,
        },
        { key: 'revenue', icon: DollarSign, value: money(data.summary.revenue) },
        { key: 'bookings', icon: CalendarDays, value: numberFormat.format(data.summary.bookings_count) },
      ]
    : []

  const trend = data
    ? data.trend.map((point) => ({
        ...point,
        label: dateLabel.format(new Date(`${point.date}T00:00:00Z`)),
      }))
    : []

  const peakMax = data ? Math.max(...data.peak_hours.map((hour) => hour.bookings), 1) : 1
  const isLoading = data === null && !hasError
  const isEmpty = Boolean(data) && hasNoAnalytics(data)
  const ForwardIcon = isRtl ? ArrowLeft : ArrowRight

  return (
    <DashboardLayout
      navItems={VENUE_OWNER_NAV}
      venue={layoutVenue}
      roleLabelKey="dashboardLayout.roles.venueOwner"
    >
      <header className="voa-header">
        <h1 className="voa-title">{t('venueOwnerAnalytics.title')}</h1>
        <p className="voa-subtitle">{t('venueOwnerAnalytics.subtitle')}</p>
      </header>

      {hasError && (
        <p className="voa-message" role="alert">
          {t('venueOwnerAnalytics.unavailable')}
        </p>
      )}

      {/* Empty state (design): under the page title, centered. */}
      {/* Loading state (design): placeholders in the page's layout. */}
      {isLoading && (
        <div aria-busy="true">
          <div className="voa-stats" aria-hidden="true">
            {[0, 1, 2].map((card) => (
              <div key={card} className="voa-card voa-stat">
                <div className="voa-stat-top">
                  <span className="voa-skeleton voa-skeleton-label" />
                  <span className="voa-skeleton voa-skeleton-icon" />
                </div>
                <span className="voa-skeleton voa-skeleton-value" />
              </div>
            ))}
          </div>
          {['trend', 'peak'].map((panel) => (
            <div key={panel} className="voa-card voa-panel" aria-hidden="true">
              <span className={`voa-skeleton voa-skeleton-heading voa-skeleton-heading-${panel}`} />
              <span className={`voa-skeleton-block voa-skeleton-block-${panel}`} />
            </div>
          ))}
        </div>
      )}

      {isEmpty && (
        <section className="voa-empty-state" aria-labelledby="voa-empty-title">
          <h2 id="voa-empty-title" className="voa-empty-title">
            {t('venueOwnerAnalytics.emptyState.title')}
          </h2>
          <p className="voa-empty-text">{t('venueOwnerAnalytics.emptyState.message')}</p>
          <Link to="/venue-owner/dashboard" className="voa-empty-button">
            {t('venueOwnerAnalytics.emptyState.action')}
            <ForwardIcon size={16} aria-hidden="true" />
          </Link>
        </section>
      )}

      {data && !isEmpty && (
        <>
          <section className="voa-stats" aria-label={t('venueOwnerAnalytics.statsLabel')}>
            {stats.map(({ key, icon: Icon, value }) => (
              <article key={key} className="voa-card voa-stat">
                <div className="voa-stat-top">
                  <h2 className="voa-stat-label">{t(`venueOwnerAnalytics.stats.${key}.label`)}</h2>
                  <span className="voa-stat-icon" aria-hidden="true">
                    <Icon size={16} />
                  </span>
                </div>
                <p className="voa-stat-value">
                  <bdi>{value}</bdi>
                </p>
                <p className="voa-stat-note">{t(`venueOwnerAnalytics.stats.${key}.note`)}</p>
              </article>
            ))}
          </section>

          <section className="voa-card voa-panel voa-panel-trend" aria-labelledby="voa-trend-title">
            <header className="voa-panel-header">
              <div>
                <h2 id="voa-trend-title" className="voa-panel-title">
                  {t('venueOwnerAnalytics.trend.title')}
                </h2>
                <p className="voa-panel-subtitle">{t('venueOwnerAnalytics.thisMonth')}</p>
              </div>
              <ul className="voa-legend">
                <li className="voa-legend-item">
                  <span className="voa-legend-dot voa-legend-dot-bookings" aria-hidden="true" />
                  {t('venueOwnerAnalytics.trend.bookings')}
                </li>
                <li className="voa-legend-item">
                  <span className="voa-legend-dot voa-legend-dot-revenue" aria-hidden="true" />
                  {t('venueOwnerAnalytics.trend.revenue')}
                </li>
              </ul>
            </header>
            <AnalyticsTrendChart
              data={trend}
              bookingsAxis={BOOKINGS_AXIS}
              revenueAxis={REVENUE_AXIS}
              formatRevenue={(value) => `₪${value}`}
              isRtl={isRtl}
              ariaLabel={t('venueOwnerAnalytics.trend.title')}
            />
          </section>

          <section className="voa-card voa-panel voa-panel-peak" aria-labelledby="voa-peak-title">
            <header className="voa-panel-header">
              <div>
                <h2 id="voa-peak-title" className="voa-panel-title">
                  {t('venueOwnerAnalytics.peak.title')}
                </h2>
                <p className="voa-panel-subtitle">{t('venueOwnerAnalytics.peak.subtitle')}</p>
              </div>
            </header>
            <ul className="voa-bars">
              {data.peak_hours.map(({ hour, bookings }) => {
                const ratio = bookings / peakMax
                const level = ratio === 1 ? 'top' : ratio >= HIGH_DEMAND_RATIO ? 'high' : 'low'
                return (
                  <li key={hour} className={`voa-bar-item voa-bar-${level}`}>
                    <span className="voa-bar-track" aria-hidden="true">
                      <span className="voa-bar" style={{ height: `${ratio * 100}%` }} />
                    </span>
                    <span className="voa-bar-hour">
                      <bdi>{hour}</bdi>
                    </span>
                    <span className="voa-bar-count">
                      <span className="voa-visually-hidden">{t('venueOwnerAnalytics.peak.bookingsLabel')}: </span>
                      {numberFormat.format(bookings)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}
    </DashboardLayout>
  )
}

export default VenueOwnerAnalytics
