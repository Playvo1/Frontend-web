import { useEffect, useState } from 'react'
import { CalendarDays, CircleDollarSign, Timer, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Card from '../../components/Card/Card.jsx'
import BarChart from '../../components/charts/BarChart.jsx'
import LineChart from '../../components/charts/LineChart.jsx'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import StatCard from '../../components/StatCard/StatCard.jsx'
import { VENUE_OWNER_NAV } from '../../constants/venueOwnerNav.js'
import { getVenueOwnerDashboard } from '../../services/dashboardService.js'
import PeriodSelect from './PeriodSelect.jsx'
import './VenueOwnerDashboard.css'

// Venue Owner dashboard home (route: /venue-owner/dashboard), built from the
// Figma reference. All numbers come from dashboardService (MOCK data for
// now — no backend endpoint exists yet).

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
  const [hasError, setHasError] = useState(false)
  const [period, setPeriod] = useState('week')

  useEffect(() => {
    let isActive = true
    getVenueOwnerDashboard()
      .then((result) => isActive && setData(result))
      .catch(() => isActive && setHasError(true))
    return () => {
      isActive = false
    }
  }, [])

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
      <div className="vo-page-header">
        <div>
          <h1 className="vo-page-title">{t('venueOwnerDashboard.title')}</h1>
          <p className="vo-page-date">{today}</p>
        </div>
        <PeriodSelect value={period} onChange={setPeriod} />
      </div>

      {hasError && (
        <p className="vo-message" role="alert">
          {t('venueOwnerDashboard.loadError')}
        </p>
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
