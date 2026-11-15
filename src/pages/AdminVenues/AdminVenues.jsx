import { useEffect, useRef, useState } from 'react'
import { CircleAlert, Eye, ImageOff, Plus, Search, Trash2, Warehouse, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import Input from '../../components/Input/Input.jsx'
import { showToast } from '../../components/Toast/toast.js'
import { ADMIN_NAV } from '../../constants/adminNav.js'
import { useAuth } from '../../context/useAuth.js'
import {
  VENUE_STATUSES,
  getAdminVenues,
  getVenueFilterCities,
  removeAdminVenue,
} from '../../services/adminVenuesService.js'
import { isConnectionFailure } from '../../utils/requestErrors.js'
import RemoveVenueDialog from './RemoveVenueDialog.jsx'
import { useVenueDateLabel } from './useVenueDateLabel.js'
import '../../styles/skeleton.css'
import './AdminVenues.css'

// Admin "Venues management" page (route: /admin/venues), built from the
// design: title + subtitle with "Add venue", then one card with the search,
// city and status filters, the "Showing x of y venues" line and the venues
// table (venue photo, name and status, city, address, owner, date added,
// "View details" and "Remove").
//
// Data: adminVenuesService.getAdminVenues — API mode: GET /admin/venues
// (newest first); demo mode: the local mock venues, filtered and paged the
// same way. The search (sent 400 ms after the last keystroke), the city
// (city_id, options from GET /cities) and the status filters are applied by
// the backend: any change loads page 1 again. "Showing x of y" uses the
// backend's total; when there are more pages, "Show more venues" (the
// reviews page's pattern) appends the next one. Every result is tagged with
// the filters it was asked for, so a slower, older answer is never shown.
// After a removal the list is loaded again from page 1 (with the same
// filters), so the total is right and "Show more" can never skip or repeat a
// venue; the rows already shown stay on screen until the new page arrives.
//
// "Remove" opens a confirmation; confirming sets the venue's status to
// inactive (PUT /admin/venues/{id}/status — the backend's removal), and
// the row then shows the saved status. "Add venue" opens the add page
// (/admin/venues/new, AdminAddVenue); after a successful save it comes back
// here and a message confirms it. "View details" opens the venue's details
// page (/admin/venues/:venueId, AdminVenueDetails).
//
// Status badges show the documented VENUE.status values (active / inactive).

const SKELETON_ROWS = 6

// Venue photo; a photo that cannot be loaded (or none) shows a placeholder.
function VenueThumb({ src }) {
  const [failedSrc, setFailedSrc] = useState(null)
  if (!src || failedSrc === src) {
    return (
      <span className="avm-thumb avm-thumb-missing" aria-hidden="true">
        <ImageOff size={16} />
      </span>
    )
  }
  return <img className="avm-thumb" src={src} alt="" onError={() => setFailedSrc(src)} />
}

function AdminVenues() {
  const { t, i18n } = useTranslation()
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const language = i18n.language === 'ar' ? 'ar' : 'en'
  const dateLabel = useVenueDateLabel(language)
  const [search, setSearch] = useState('')
  // The search actually sent: the typed text, 400 ms after the last change.
  const [sentSearch, setSentSearch] = useState('')
  const [cityId, setCityId] = useState('')
  const [status, setStatus] = useState('')
  const [attempt, setAttempt] = useState(0)
  // Bumped after a removal: loads page 1 again with the same filters.
  const [reloads, setReloads] = useState(0)
  // City filter options: [{ id, name_ar, name_en }] (empty until loaded).
  const [cities, setCities] = useState([])
  // The loaded results and the request they answer:
  // { key, filterKey, venues, total, page, lastPage } | null.
  const [result, setResult] = useState(null)
  // { key, kind: 'forbidden' | 'network' | 'server' } | null
  const [failure, setFailure] = useState(null)
  // Key of the request whose next page is loading / failed to load.
  const [loadingMoreKey, setLoadingMoreKey] = useState(null)
  const [moreFailedKey, setMoreFailedKey] = useState(null)
  // Venue whose removal is being confirmed, or null.
  const [removing, setRemoving] = useState(null)
  const latestKey = useRef(null)

  // The request the page currently shows (filters + retry and reload counts),
  // and the filters alone.
  const requestKey = JSON.stringify([sentSearch, cityId, status, attempt, reloads])
  const filterKey = JSON.stringify([sentSearch, cityId, status])
  const filters = { search: sentSearch, cityId, status }
  const hasFilters = sentSearch !== '' || cityId !== '' || status !== ''

  useEffect(() => {
    const timer = setTimeout(() => setSentSearch(search.trim()), 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let isActive = true
    getVenueFilterCities(token)
      .then((list) => isActive && setCities(list))
      .catch((error) => {
        if (isActive && error?.status === 401) logout()
      })
    return () => {
      isActive = false
    }
  }, [token, logout])

  useEffect(() => {
    latestKey.current = requestKey
    const key = requestKey
    const [searchTerm, city, statusFilter] = JSON.parse(key)
    const keyFilters = JSON.stringify([searchTerm, city, statusFilter])
    getAdminVenues({ search: searchTerm, cityId: city, status: statusFilter, page: 1 }, token)
      .then((data) => {
        if (latestKey.current === key) setResult({ key, filterKey: keyFilters, ...data })
      })
      .catch((error) => {
        if (latestKey.current !== key) return
        if (error?.status === 401) {
          logout()
          return
        }
        setFailure({
          key,
          kind: error?.status === 403 ? 'forbidden' : isConnectionFailure(error) ? 'network' : 'server',
        })
      })
  }, [requestKey, token, logout])

  // Back from the add page after a successful save: confirm it once, then
  // clear the history state so a reload does not repeat the message.
  const createdName = location.state?.created
  useEffect(() => {
    if (!createdName) return
    showToast(t('adminVenues.created', { name: createdName }))
    navigate(location.pathname, { replace: true, state: null })
  }, [createdName, location.pathname, navigate, t])

  const current = result?.key === requestKey ? result : null
  const errorKind = failure?.key === requestKey ? failure.kind : null
  // Reloading the same filters (after a removal or "Try again"): the previous
  // rows stay visible meanwhile; "Show more" waits for the new page 1.
  const isRefreshing = !current && !errorKind && result?.filterKey === filterKey
  const shown = current ?? (isRefreshing ? result : null)
  const venues = shown?.venues ?? null
  const isLoading = !shown && !errorKind
  const hasMore = current !== null && current.page < current.lastPage
  const isLoadingMore = loadingMoreKey === requestKey
  const moreFailed = moreFailedKey === requestKey

  const retry = () => setAttempt((count) => count + 1)

  const loadMore = () => {
    if (!current || isLoadingMore) return
    const key = requestKey
    setLoadingMoreKey(key)
    setMoreFailedKey(null)
    getAdminVenues({ ...filters, page: current.page + 1 }, token)
      .then((data) => {
        setResult((loaded) => {
          if (loaded?.key !== key) return loaded
          const known = new Set(loaded.venues.map((venue) => venue.id))
          return {
            ...loaded,
            venues: [...loaded.venues, ...data.venues.filter((venue) => !known.has(venue.id))],
            total: data.total,
            page: data.page,
            lastPage: data.lastPage,
          }
        })
      })
      .catch((error) => {
        if (error?.status === 401) {
          logout()
          return
        }
        if (latestKey.current === key) setMoreFailedKey(key)
      })
      .finally(() => setLoadingMoreKey((loading) => (loading === key ? null : loading)))
  }

  const localized = (venue, field) => venue[`${field}_${language}`] || venue[`${field}_${language === 'ar' ? 'en' : 'ar'}`] || ''

  // Confirmed in the dialog: the dialog shows "Removing…" until this
  // resolves, and keeps its message if it rejects (401 signs out).
  const confirmRemove = async () => {
    try {
      const saved = await removeAdminVenue(removing.id, token)
      setResult((loaded) =>
        loaded
          ? {
              ...loaded,
              venues: loaded.venues.map((venue) => (venue.id === saved.id ? { ...venue, status: saved.status } : venue)),
            }
          : loaded,
      )
      setRemoving(null)
      showToast(t('adminVenues.removed'))
      // Page 1 again: the total changes and later pages shift (e.g. with the
      // "active" filter), so the appended pages would no longer line up.
      setReloads((count) => count + 1)
    } catch (error) {
      if (error?.status === 401) logout()
      throw error
    }
  }

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      venue={null}
      roleLabelKey="dashboardLayout.roles.admin"
      subtitle={t('dashboardLayout.roles.admin')}
      brandMark
    >
      <header className="avm-header">
        <div>
          <h1 className="avm-title">{t('adminVenues.title')}</h1>
          <p className="avm-subtitle">{t('adminVenues.subtitle')}</p>
        </div>
        <button
          type="button"
          className="avm-add"
          onClick={() => navigate('/admin/venues/new', { state: { from: 'venues' } })}
        >
          <Plus size={16} aria-hidden="true" />
          {t('adminVenues.add')}
        </button>
      </header>

      <section className="avm-card" aria-labelledby="avm-table-title">
        <h2 id="avm-table-title" className="avm-visually-hidden">
          {t('adminVenues.tableLabel')}
        </h2>

        <div className="avm-filters">
          <div className="avm-search">
            <Input
              icon={Search}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('adminVenues.searchPlaceholder')}
              aria-label={t('adminVenues.searchPlaceholder')}
            />
          </div>
          <select
            className="avm-select"
            value={cityId}
            onChange={(event) => setCityId(event.target.value)}
            aria-label={t('adminVenues.cityLabel')}
          >
            <option value="">{t('adminVenues.allCities')}</option>
            {cities.map((city) => (
              <option key={city.id} value={String(city.id)}>
                {localized(city, 'name')}
              </option>
            ))}
          </select>
          <select
            className="avm-select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label={t('adminVenues.statusLabel')}
          >
            <option value="">{t('adminVenues.allStatuses')}</option>
            {VENUE_STATUSES.map((key) => (
              <option key={key} value={key}>
                {t(`adminVenues.status.${key}`)}
              </option>
            ))}
          </select>
        </div>

        {shown && (shown.total > 0 || hasFilters) && (
          <p className="avm-count">
            {t('adminVenues.showing', { shown: shown.venues.length, total: shown.total })}
          </p>
        )}

        {(isLoading || (shown && (shown.venues.length > 0 || hasFilters))) && (
          <div className="avm-table-scroll">
            <table className="avm-table" aria-busy={isLoading || isRefreshing}>
              <thead>
                <tr>
                  <th scope="col">{t('adminVenues.columns.venue')}</th>
                  <th scope="col">{t('adminVenues.columns.city')}</th>
                  <th scope="col">{t('adminVenues.columns.address')}</th>
                  <th scope="col">{t('adminVenues.columns.owner')}</th>
                  <th scope="col">{t('adminVenues.columns.createdAt')}</th>
                  <th scope="col" className="avm-actions-head">
                    {t('adminVenues.columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: SKELETON_ROWS }, (_, row) => (
                    <tr key={`skeleton-${row}`} aria-hidden="true">
                      <td>
                        <span className="avm-venue">
                          <span className="avm-thumb pv-shimmer avm-skeleton-block" />
                          <span className="avm-venue-text">
                            <span className="avm-skeleton pv-shimmer avm-skeleton-name" />
                            <span className="avm-skeleton pv-shimmer avm-skeleton-badge" />
                          </span>
                        </span>
                      </td>
                      {['city', 'address', 'owner', 'date', 'actions'].map((column) => (
                        <td key={column}>
                          <span className={`avm-skeleton pv-shimmer avm-skeleton-${column}`} />
                        </td>
                      ))}
                    </tr>
                  ))}

                {(venues ?? []).map((venue) => (
                  <tr key={venue.id}>
                    <td>
                      <span className="avm-venue">
                        <VenueThumb src={venue.image_url} />
                        <span className="avm-venue-text">
                          <bdi className="avm-venue-name">{localized(venue, 'name')}</bdi>
                          {venue.status && (
                            <span className={`avm-status avm-status-${venue.status}`}>
                              {t(`adminVenues.status.${venue.status}`)}
                            </span>
                          )}
                        </span>
                      </span>
                    </td>
                    <td className="avm-muted">
                      <bdi>{localized(venue, 'city') || '—'}</bdi>
                    </td>
                    <td className="avm-muted avm-address">
                      <bdi>{localized(venue, 'address') || '—'}</bdi>
                    </td>
                    <td className="avm-muted">
                      <bdi>{venue.owner_name || '—'}</bdi>
                    </td>
                    <td className="avm-date">
                      <bdi>{venue.created_at ? dateLabel(venue.created_at) : '—'}</bdi>
                    </td>
                    <td>
                      <span className="avm-actions">
                        <button
                          type="button"
                          className="avm-view"
                          onClick={() => navigate(`/admin/venues/${venue.id}`, { state: { from: 'venues' } })}
                        >
                          <Eye size={14} aria-hidden="true" />
                          {t('adminVenues.viewDetails')}
                        </button>
                        <button type="button" className="avm-remove" onClick={() => setRemoving(venue)}>
                          <Trash2 size={14} aria-hidden="true" />
                          {t('adminVenues.remove')}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}

                {shown && shown.venues.length === 0 && hasFilters && (
                  <tr>
                    <td colSpan={6} className="avm-no-results">
                      {t('adminVenues.noResults')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* More pages on the backend: the next one is appended. */}
        {hasMore && (
          <div className="avm-more">
            <button
              type="button"
              className="avm-retry"
              onClick={loadMore}
              disabled={isLoadingMore}
              aria-busy={isLoadingMore || undefined}
            >
              {t(
                isLoadingMore
                  ? 'adminVenues.loadingMore'
                  : moreFailed
                    ? 'adminVenues.errorState.retry'
                    : 'adminVenues.loadMore',
              )}
            </button>
            {moreFailed && (
              <p className="avm-state-text" role="alert">
                {t('adminVenues.loadMoreError')}
              </p>
            )}
          </div>
        )}

        {/* No venue at all (the list loaded, no filter, and is empty). */}
        {shown && shown.total === 0 && !hasFilters && (
          <div className="avm-state" role="status">
            <Warehouse className="avm-state-icon" size={40} aria-hidden="true" />
            <p className="avm-state-title">{t('adminVenues.empty')}</p>
          </div>
        )}

        {errorKind && (
          <div className="avm-state" role="alert">
            {errorKind === 'network' ? (
              <WifiOff className="avm-state-icon" size={48} aria-hidden="true" />
            ) : (
              <CircleAlert className="avm-state-icon avm-state-icon-error" size={44} aria-hidden="true" />
            )}
            <p className="avm-state-title">{t('adminVenues.errorState.title')}</p>
            <p className="avm-state-text">{t(`adminVenues.errorState.${errorKind}`)}</p>
            {errorKind !== 'forbidden' && (
              <button type="button" className="avm-retry" onClick={retry}>
                {t('adminVenues.errorState.retry')}
              </button>
            )}
          </div>
        )}
      </section>

      {removing && (
        <RemoveVenueDialog
          venueName={localized(removing, 'name')}
          onClose={() => setRemoving(null)}
          onConfirm={confirmRemove}
        />
      )}
    </DashboardLayout>
  )
}

export default AdminVenues
