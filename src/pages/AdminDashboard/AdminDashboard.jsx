import { useEffect, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, CircleAlert, Clock, UserPlus, Warehouse, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import { ADMIN_NAV } from '../../constants/adminNav.js'
import { useAuth } from '../../context/useAuth.js'
import { getAdminDashboard } from '../../services/adminDashboardService.js'
import { isConnectionFailure } from '../../utils/requestErrors.js'
import emptyIllustration from '../../assets/empty-state-illustration.svg'
import '../../styles/skeleton.css'
import './AdminDashboard.css'

// Admin dashboard home (route: /admin/dashboard), from the Admin design:
// page title, the navy "Platform performance" card (total users, bookings
// today, bookings this month), the "Most booked venues" list and the "Most
// active cities" ranking.
//
// Data: adminDashboardService — GET /api/v1/admin/dashboard with the admin's
// token (mock data only in demo mode). "Last updated" is the time this page
// received the data (the response has no timestamp).
//
// States: loading (design: the navy card's title with placeholder tiles,
// one placeholder block per list card), error (connection or
// server, with "Try again"; 401 signs out → /admin/login), empty data and the
// loaded dashboard.
//
// Empty data (design): each section is checked on its own. A list with no
// items shows the empty illustration and message inside its card; a 0
// statistic is shown as 0. Only when the response has nothing at all (every
// shown statistic is 0 and both lists are empty) the page shows the design's
// single empty card under the navy card's header, instead of zero tiles and
// two empty lists.

const SKELETON_STATS = 3

// Western digits in both languages, as in the design.
const numberFormat = new Intl.NumberFormat('en-US')

function formatTime(date, language) {
  return new Intl.DateTimeFormat(`${language}-u-nu-latn`, { hour: 'numeric', minute: '2-digit' }).format(date)
}

// Name in the current language, falling back to the other one.
function localized(item, language, field = 'name') {
  const ar = item[`${field}Ar`]
  const en = item[`${field}En`]
  return language === 'ar' ? ar ?? en : en ?? ar
}

// Venue photo from the API; the venue icon when there is none or it fails to
// load (broken or unreachable URL).
function VenueImage({ src }) {
  const [failedSrc, setFailedSrc] = useState(null)
  if (!src || failedSrc === src) {
    return (
      <span className="ad-venue-image ad-venue-image-empty" aria-hidden="true">
        <Warehouse size={20} />
      </span>
    )
  }
  return <img className="ad-venue-image" src={src} alt="" loading="lazy" onError={() => setFailedSrc(src)} />
}

function AdminDashboard() {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const { token, logout } = useAuth()
  const [data, setData] = useState(null)
  const [fetchedAt, setFetchedAt] = useState(null)
  // null | 'network' (no connection) | 'server' (any other failure).
  const [errorKind, setErrorKind] = useState(null)
  const hasError = errorKind !== null
  // Incremented by "Try again" to run the request once more.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isActive = true
    getAdminDashboard(token)
      .then((result) => {
        if (!isActive) return
        setData(result)
        setFetchedAt(new Date())
      })
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

  // Only from the error state: once clicked, the loading state replaces the
  // error block, so a request already in progress cannot be sent twice.
  const retry = () => {
    if (!hasError) return
    setErrorKind(null)
    setData(null)
    setAttempt((count) => count + 1)
  }

  const isLoading = data === null && !hasError
  const language = i18n.language
  const ForwardIcon = isRtl ? ChevronLeft : ChevronRight

  const stats = data
    ? [
        { key: 'totalUsers', icon: UserPlus, value: data.totalUsers },
        { key: 'bookingsToday', icon: Clock, value: data.bookingsToday, highlight: true },
        { key: 'bookingsThisMonth', icon: CalendarDays, value: data.bookingsThisMonth },
      ]
    : []
  const cityMax = data ? Math.max(1, ...data.topCities.map((city) => city.bookings)) : 1
  const hasNoData =
    Boolean(data) &&
    stats.every((stat) => stat.value === 0) &&
    data.topVenues.length === 0 &&
    data.topCities.length === 0

  // Navy card header (title, subtitle; "Last updated" once data arrived),
  // shared by the loading, error and loaded states.
  const heroHeader = (
    <div className="ad-hero-header">
      <div>
        <h2 id="ad-hero-title" className="ad-hero-title">
          {t('adminDashboard.performance.title')}
        </h2>
        <p className="ad-hero-subtitle">{t('adminDashboard.performance.subtitle')}</p>
      </div>
      {data && fetchedAt && (
        <p className="ad-hero-updated">
          {t('adminDashboard.performance.updatedAt', { time: formatTime(fetchedAt, language) })}
        </p>
      )}
    </div>
  )

  // Empty illustration + message (design). `compact`: inside one list card.
  const emptyState = (compact) => (
    <div className={`ad-empty ${compact ? 'ad-empty-compact' : ''}`.trim()}>
      <img className="ad-empty-illustration" src={emptyIllustration} alt="" />
      <p className="ad-empty-title">{t('adminDashboard.emptyState.title')}</p>
      {!compact && <p className="ad-empty-text">{t('adminDashboard.emptyState.message')}</p>}
    </div>
  )

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      venue={null}
      roleLabelKey="dashboardLayout.roles.admin"
      subtitle={t('dashboardLayout.roles.admin')}
      brandMark
    >
      <header className="ad-page-header">
        <h1 className="ad-page-title">{t('adminDashboard.title')}</h1>
        <p className="ad-page-subtitle">{t('adminDashboard.subtitle')}</p>
      </header>

      {/* Error state (design): the request failed (network, server error,
          unsuccessful or unexpected response). The navy card keeps its
          header and one card shows the icon, message and "Retry". Retry
          goes back to the loading state (this block and its button are
          removed at once) and sends one new request. */}
      {hasError && (
        <>
          <section className="ad-hero" aria-labelledby="ad-hero-title">
            {heroHeader}
          </section>

          <section className="ad-card ad-card-state" role="alert" aria-labelledby="ad-error-title">
            <div className="ad-error">
              {errorKind === 'network' ? (
                <WifiOff className="ad-error-icon" size={96} strokeWidth={2.25} aria-hidden="true" />
              ) : (
                <CircleAlert className="ad-error-icon" size={88} strokeWidth={2} aria-hidden="true" />
              )}
              <h2 id="ad-error-title" className="ad-error-title">
                {t('adminDashboard.errorState.title')}
              </h2>
              <p className="ad-error-text">
                {t(
                  errorKind === 'network'
                    ? 'adminDashboard.errorState.networkMessage'
                    : 'adminDashboard.errorState.serverMessage',
                )}
              </p>
              <button type="button" className="ad-error-button" onClick={retry} disabled={isLoading}>
                {t('adminDashboard.errorState.retry')}
              </button>
            </div>
          </section>
        </>
      )}

      {/* Loading state (design): the navy card keeps its title and
          subtitle with placeholder tiles (icon, label, value); each list
          card is one placeholder block. Shown only while the request runs. */}
      {isLoading && (
        <div aria-busy="true">
          <section className="ad-hero" aria-labelledby="ad-hero-title">
            {heroHeader}
            <ul className="ad-hero-stats" aria-hidden="true">
              {Array.from({ length: SKELETON_STATS }, (_, tile) => (
                <li key={tile} className="ad-stat ad-stat-skeleton">
                  <span className="ad-skeleton ad-skeleton-dark pv-shimmer ad-skeleton-icon" />
                  <span className="ad-skeleton ad-skeleton-dark pv-shimmer ad-skeleton-label" />
                  <span className="ad-skeleton ad-skeleton-dark pv-shimmer ad-skeleton-value" />
                </li>
              ))}
            </ul>
          </section>

          <div className="ad-grid" aria-hidden="true">
            {['venues', 'cities'].map((panel) => (
              <div key={panel} className={`ad-card ad-card-${panel}`}>
                <span className="ad-skeleton-panel pv-shimmer" />
              </div>
            ))}
          </div>
        </div>
      )}

      {data && (
        <>
          <section className="ad-hero" aria-labelledby="ad-hero-title">
            {heroHeader}

            {!hasNoData && (
              <ul className="ad-hero-stats">
                {stats.map(({ key, icon: Icon, value, highlight }) => (
                  <li key={key} className={`ad-stat ${highlight ? 'ad-stat-highlight' : ''}`.trim()}>
                    <span className="ad-stat-icon" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <div className="ad-stat-text">
                      <p className="ad-stat-label">{t(`adminDashboard.stats.${key}`)}</p>
                      <p className="ad-stat-value">
                        <bdi>{numberFormat.format(value)}</bdi>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {hasNoData ? (
            <section className="ad-card ad-card-empty" aria-label={t('adminDashboard.emptyState.title')}>
              {emptyState(false)}
            </section>
          ) : (
            <div className="ad-grid">
              <section className="ad-card ad-card-venues" aria-labelledby="ad-venues-title">
                <header className="ad-card-header ad-card-header-divided">
                  <div>
                    <h2 id="ad-venues-title" className="ad-card-title">
                      {t('adminDashboard.topVenues.title')}
                    </h2>
                    <p className="ad-card-subtitle">{t('adminDashboard.topVenues.subtitle')}</p>
                  </div>
                  {/* The venues page is not built yet: shown as in the design,
                      not a link (same convention as the sidebar). */}
                  <span className="ad-card-link" aria-disabled="true">
                    {t('adminDashboard.topVenues.viewAll')}
                    <ForwardIcon size={14} aria-hidden="true" />
                  </span>
                </header>

                {data.topVenues.length === 0 ? (
                  emptyState(true)
                ) : (
                  <ol className="ad-list">
                    {data.topVenues.map((venue, index) => {
                      const city = localized(venue, language, 'city')
                      return (
                        <li key={venue.id ?? index} className="ad-venue">
                          <span className={`ad-rank ${index === 0 ? 'ad-rank-first' : ''}`.trim()}>{index + 1}</span>
                          <VenueImage src={venue.imageUrl} />
                          <div className="ad-venue-text">
                            <p className="ad-venue-name">{localized(venue, language)}</p>
                            {city && <p className="ad-venue-city">{city}</p>}
                          </div>
                          <p className="ad-venue-count">
                            <bdi className="ad-venue-count-value">{numberFormat.format(venue.bookings)}</bdi>
                            <span className="ad-venue-count-unit">{t('adminDashboard.bookingsUnit')}</span>
                          </p>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </section>

              <section className="ad-card ad-card-cities" aria-labelledby="ad-cities-title">
                <header className="ad-card-header">
                  <div>
                    <h2 id="ad-cities-title" className="ad-card-title">
                      {t('adminDashboard.topCities.title')}
                    </h2>
                    <p className="ad-card-subtitle">{t('adminDashboard.topCities.subtitle')}</p>
                  </div>
                </header>

                {data.topCities.length === 0 ? (
                  emptyState(true)
                ) : (
                  <ol className="ad-list">
                    {data.topCities.map((city, index) => (
                      <li key={city.id ?? index} className="ad-city">
                        <div className="ad-city-row">
                          <span className="ad-rank">{index + 1}</span>
                          <p className="ad-city-name">{localized(city, language)}</p>
                          <p className="ad-city-count">
                            {t('adminDashboard.bookingsCount', { count: numberFormat.format(city.bookings) })}
                          </p>
                        </div>
                        <span className="ad-city-track" aria-hidden="true">
                          <span className="ad-city-bar" style={{ width: `${(city.bookings / cityMax) * 100}%` }} />
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}

export default AdminDashboard
