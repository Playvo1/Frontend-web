import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CircleAlert, Eye, Search, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Button from '../../components/Button/Button.jsx'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import Input from '../../components/Input/Input.jsx'
import { VENUE_OWNER_NAV } from '../../constants/venueOwnerNav.js'
import { useAuth } from '../../context/useAuth.js'
import { getVenueOwnerBookings } from '../../services/bookingsService.js'
import { getVenueOwnerVenue } from '../../services/dashboardService.js'
import { isConnectionFailure } from '../../utils/requestErrors.js'
import { formatDate, formatTimeRange, initials, numberFormat } from './bookingFormat.js'
import DateFilter from './DateFilter.jsx'
import StatusFilter from './StatusFilter.jsx'
import './VenueOwnerBookings.css'

// Venue Owner bookings list (route: /venue-owner/bookings), built from the
// Figma reference. Bookings come from bookingsService (the backend's
// GET /owner/bookings when the API is configured, mock otherwise); search,
// filters and pagination run on the loaded list in the browser.

const PAGE_SIZE = 8

// Documented BOOKING.status values (Guidelines §3.1).
const STATUSES = ['confirmed', 'pending_payment', 'cancelled']

// Columns of the loading placeholder rows, in table order.
const SKELETON_COLUMNS = ['id', 'player', 'date', 'time', 'amount', 'status', 'action']

function VenueOwnerBookings() {
  const { t, i18n } = useTranslation()
  const { token, logout } = useAuth()
  const isRtl = i18n.dir() === 'rtl'
  const [bookings, setBookings] = useState(null)
  const [venue, setVenue] = useState(null)
  // null (no error) | 'network' (no connection) | 'server' (any other failure).
  const [errorKind, setErrorKind] = useState(null)
  const hasError = errorKind !== null
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  // Incremented by "Try again" to run the bookings request once more.
  const [attempt, setAttempt] = useState(0)
  const isLoading = bookings === null && !hasError

  // Venue (sidebar card, top-bar subtitle) is loaded on its own so a
  // bookings failure does not hide it.
  useEffect(() => {
    let isActive = true
    getVenueOwnerVenue()
      .then((venueData) => isActive && setVenue(venueData))
      .catch(() => {})
    return () => {
      isActive = false
    }
  }, [])

  // Bookings: loading → loaded, or → error (shown in the table).
  // 401 means the session is no longer valid: sign out (the protected route
  // then sends the user to /login). A connection failure shows the
  // "no connection" error state; any other failure (403, 422, 5xx) shows the
  // generic error state, without technical details.
  useEffect(() => {
    let isActive = true
    getVenueOwnerBookings(token)
      .then((bookingList) => isActive && setBookings(bookingList))
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

  // "Try again": back to the loading state and one new request. The error
  // block (and its button) is replaced by the loading rows right away, so
  // the request cannot be sent twice.
  const retry = () => {
    setErrorKind(null)
    setBookings(null)
    setAttempt((count) => count + 1)
  }

  const filtered = useMemo(() => {
    if (!bookings) return []
    const query = search.trim().toLowerCase()
    return bookings.filter(
      (booking) =>
        (!dateFilter || booking.slot_date === dateFilter) &&
        (!statusFilter || booking.status === statusFilter) &&
        (!query ||
          booking.captain_name.toLowerCase().includes(query) ||
          `#pv-${booking.id}`.includes(query)),
    )
  }, [bookings, search, dateFilter, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const firstIndex = (currentPage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(firstIndex, firstIndex + PAGE_SIZE)

  // Any search/filter change starts again from the first page.
  const updateFilter = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  const layoutVenue = venue
    ? { name: venue.name, statusKey: `venueOwnerDashboard.venueStatus.${venue.status}` }
    : null

  const PreviousIcon = isRtl ? ChevronRight : ChevronLeft
  const NextIcon = isRtl ? ChevronLeft : ChevronRight

  return (
    <DashboardLayout
      navItems={VENUE_OWNER_NAV}
      venue={layoutVenue}
      roleLabelKey="dashboardLayout.roles.venueOwner"
    >
      <header className="vob-header">
        <h1 className="vob-title">{t('venueOwnerBookings.title')}</h1>
        <p className="vob-subtitle">{t('venueOwnerBookings.subtitle')}</p>
      </header>

      <section className="vob-filters" aria-label={t('venueOwnerBookings.filtersLabel')}>
        <div className="vob-search">
          <Input
            icon={Search}
            type="search"
            value={search}
            onChange={(event) => updateFilter(setSearch)(event.target.value)}
            placeholder={t('venueOwnerBookings.searchPlaceholder')}
            aria-label={t('venueOwnerBookings.searchLabel')}
          />
        </div>

        <DateFilter value={dateFilter} onChange={updateFilter(setDateFilter)} formatDate={formatDate} />

        <StatusFilter statuses={STATUSES} value={statusFilter} onChange={updateFilter(setStatusFilter)} />
      </section>

      <div className="vob-table-card">
        <div className="vob-table-scroll">
          <table
            className="vob-table"
            aria-label={t('venueOwnerBookings.tableLabel')}
            aria-busy={isLoading}
          >
            <thead>
              <tr>
                <th scope="col">{t('venueOwnerBookings.columns.id')}</th>
                <th scope="col">{t('venueOwnerBookings.columns.player')}</th>
                <th scope="col" className="vob-center">
                  {t('venueOwnerBookings.columns.date')}
                </th>
                <th scope="col" className="vob-center">
                  {t('venueOwnerBookings.columns.time')}
                </th>
                <th scope="col" className="vob-center">
                  {t('venueOwnerBookings.columns.amount')}
                </th>
                <th scope="col" className="vob-center">
                  {t('venueOwnerBookings.columns.status')}
                </th>
                <th scope="col" className="vob-center">
                  {t('venueOwnerBookings.columns.action')}
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((booking) => (
                <tr key={booking.id}>
                  <td className="vob-id">
                    <bdi dir="ltr">#PV-{booking.id}</bdi>
                  </td>
                  <td>
                    <span className="vob-player">
                      <span className="vob-avatar" aria-hidden="true">
                        {initials(booking.captain_name)}
                      </span>
                      <bdi className="vob-player-name">{booking.captain_name}</bdi>
                    </span>
                  </td>
                  <td className="vob-center vob-muted">
                    <bdi dir="ltr">{formatDate(booking.slot_date)}</bdi>
                  </td>
                  <td className="vob-center vob-muted">
                    <bdi dir="ltr">{formatTimeRange(booking.start_time, booking.end_time)}</bdi>
                  </td>
                  <td className="vob-center vob-amount">
                    <bdi dir="ltr">₪{numberFormat.format(booking.total_price)}</bdi>
                  </td>
                  <td className="vob-center">
                    <span className={`vob-status vob-status-${booking.status}`}>
                      <span className="vob-status-dot" aria-hidden="true" />
                      {t(`venueOwnerBookings.status.${booking.status}`)}
                    </span>
                  </td>
                  <td className="vob-center">
                    {/* Every status has a designed details page. */}
                    <Link className="vob-view" to={`/venue-owner/bookings/${booking.id}`}>
                      <Eye size={14} aria-hidden="true" />
                      {t('venueOwnerBookings.view')}
                    </Link>
                  </td>
                </tr>
              ))}
              {/* Loading state (Figma): placeholder bars in every column. */}
              {isLoading &&
                Array.from({ length: PAGE_SIZE }, (_, row) => (
                  <tr key={`skeleton-${row}`} aria-hidden="true">
                    {SKELETON_COLUMNS.map((column) => (
                      <td key={column} className={column === 'id' || column === 'player' ? undefined : 'vob-center'}>
                        <span className={`vob-skeleton vob-skeleton-${column}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading && !hasError && pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="vob-empty">
                    {t('venueOwnerBookings.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Error state (Figma): replaces the rows when loading fails. */}
        {/* Connection failures show the no-connection design (Wi-Fi icon). */}
        {hasError && (
          <div className="vob-error" role="alert">
            {errorKind === 'network' && (
              <WifiOff className="vob-error-illustration" size={56} strokeWidth={2.25} aria-hidden="true" />
            )}
            <p className="vob-error-title">
              {errorKind === 'server' && (
                <CircleAlert className="vob-error-icon" size={18} aria-hidden="true" />
              )}
              {t('venueOwnerBookings.loadError')}
            </p>
            <p className="vob-error-text">
              {t(
                errorKind === 'network'
                  ? 'venueOwnerBookings.networkErrorDescription'
                  : 'venueOwnerBookings.errorDescription',
              )}
            </p>
            <div className="vob-error-action">
              <Button fullWidth onClick={retry}>
                {t('venueOwnerBookings.retry')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {!isLoading && !hasError && (
        <footer className="vob-footer">
          <p className="vob-count">
            {t('venueOwnerBookings.showing', {
              from: filtered.length === 0 ? 0 : firstIndex + 1,
              to: firstIndex + pageRows.length,
              total: filtered.length,
            })}
          </p>
          <nav className="vob-pagination" aria-label={t('venueOwnerBookings.paginationLabel')}>
            <button
              type="button"
              className="vob-page-arrow"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label={t('venueOwnerBookings.previousPage')}
            >
              <PreviousIcon size={16} aria-hidden="true" />
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
              <button
                key={number}
                type="button"
                className={`vob-page ${number === currentPage ? 'vob-page-active' : ''}`}
                onClick={() => setPage(number)}
                aria-current={number === currentPage ? 'page' : undefined}
                aria-label={t('venueOwnerBookings.page', { page: number })}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              className="vob-page-arrow"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === pageCount}
              aria-label={t('venueOwnerBookings.nextPage')}
            >
              <NextIcon size={16} aria-hidden="true" />
            </button>
          </nav>
        </footer>
      )}
    </DashboardLayout>
  )
}

export default VenueOwnerBookings
