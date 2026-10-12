import { useEffect, useState } from 'react'
import {
  Check,
  CircleAlert,
  CircleDollarSign,
  Globe,
  House,
  Images,
  LayoutGrid,
  MapPin,
  Rows3,
  SquarePen,
  User,
  Users,
  WifiOff,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import { VENUE_OWNER_NAV } from '../../constants/venueOwnerNav.js'
import { useAuth } from '../../context/useAuth.js'
import { getVenueOwnerVenue } from '../../services/dashboardService.js'
import { getVenueOwnerFacility } from '../../services/facilityService.js'
import { isConnectionFailure } from '../../utils/requestErrors.js'
import { numberFormat } from '../VenueOwnerBookings/bookingFormat.js'
import VenueOwnerFacilityEdit from './VenueOwnerFacilityEdit.jsx'
import VenueOwnerFacilityPhotos from './VenueOwnerFacilityPhotos.jsx'
import '../../styles/skeleton.css'
import './VenueOwnerFacility.css'

// Venue Owner "My venue" page (route: /venue-owner/facility), built from the
// design: page title, a cover banner with the venue's sport, area, name and
// actions, the venue information list and the photos card.
//
// Data comes from facilityService (MOCK for now — see that file). "Edit" in
// the information card and "Edit venue" in the cover banner open the same
// edit form, and "View all photos" and "Manage photos" in the cover banner
// open the same photos view; the other buttons have no action yet (no confirmed backend endpoints for them).
//
// While the venue loads, the banner and both cards are shown as placeholder
// blocks (no text) under the page title, as on the Reviews and Analytics
// pages, so nothing jumps when the data arrives.
//
// A failed load shows the error state (connection or server) with "Try
// again", as on the Dashboard, Reviews and Analytics pages; 401 signs out
// (as on the Bookings page). A load that resolves without venue data shows
// "Venue details are not available right now" with "Try again" instead of
// waiting forever (the service's contract is unchanged).

// Placeholder rows in the loading state: one per information row.
const SKELETON_ROWS = 10

// Localized value of a bilingual field ("name" -> name_ar / name_en).
function localized(facility, field, language) {
  return facility[`${field}_${language === 'ar' ? 'ar' : 'en'}`]
}

function VenueOwnerFacility() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const [venue, setVenue] = useState(null)
  const [facility, setFacility] = useState(null)
  const { logout } = useAuth()
  // null (no error) | 'network' (no connection) | 'server' (any other
  // failure) — same handling as the Bookings page.
  const [errorKind, setErrorKind] = useState(null)
  const hasError = errorKind !== null
  // The load finished without venue data (null / not an object).
  const [isUnavailable, setIsUnavailable] = useState(false)
  // Incremented by "Try again" to run the facility request once more.
  const [attempt, setAttempt] = useState(0)
  // "Edit" in the information card and "Edit venue" in the cover banner swap
  // the page for the edit form
  // (VenueOwnerFacilityEdit). Saving keeps the changes in this page's state
  // only (mock data — no backend request).
  const [isEditing, setIsEditing] = useState(false)

  const openEdit = () => {
    setIsEditing(true)
    window.scrollTo(0, 0)
  }

  const closeEdit = () => {
    setIsEditing(false)
    window.scrollTo(0, 0)
  }

  const saveEdit = (updated) => {
    setFacility(updated)
    closeEdit()
  }

  // "View all photos" and "Manage photos" (cover banner) swap the page for
  // the photos view
  // (VenueOwnerFacilityPhotos); "Back" returns to the page.
  const [isViewingPhotos, setIsViewingPhotos] = useState(false)

  const openPhotos = () => {
    setIsViewingPhotos(true)
    window.scrollTo(0, 0)
  }

  const closePhotos = () => {
    setIsViewingPhotos(false)
    window.scrollTo(0, 0)
  }

  // Deleting a photo in the photos view: local (mock) state only.
  const removePhoto = (photoId) => {
    setFacility((current) => ({
      ...current,
      images: current.images.filter((photo) => photo.id !== photoId),
    }))
  }

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

  // Facility: loading → loaded, or → unavailable (no data), or → error.
  // 401 signs out.
  useEffect(() => {
    let isActive = true
    getVenueOwnerFacility()
      .then((data) => {
        if (!isActive) return
        if (data && typeof data === 'object') {
          setFacility(data)
        } else {
          setIsUnavailable(true)
        }
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
  }, [attempt, logout])

  // "Try again": back to the loading state and one new request. The error
  // block (and its button) is replaced by the loading state right away, so
  // the request cannot be sent twice.
  const retry = () => {
    setErrorKind(null)
    setIsUnavailable(false)
    setFacility(null)
    setAttempt((count) => count + 1)
  }

  const layoutVenue = venue
    ? { name: venue.name, statusKey: `venueOwnerDashboard.venueStatus.${venue.status}` }
    : null

  // Photo count with Arabic-Indic digits in Arabic, as in the design ("٣ صور").
  const countFormat = new Intl.NumberFormat(language === 'ar' ? 'ar-u-nu-arab' : language)
  const price = (value) => `₪${numberFormat.format(value)}`

  const dimensionsText = facility
    ? t('venueOwnerFacility.dimensionsValue', {
        length: facility.length_m,
        width: facility.width_m,
        format: localized(facility, 'team_format', language),
      })
    : ''

  // Information rows, in the design's order.
  const rows = facility
    ? [
        { key: 'name', icon: House, value: localized(facility, 'name', language) },
        { key: 'owner', icon: User, value: facility.owner_name },
        { key: 'area', icon: MapPin, value: localized(facility, 'area', language) },
        { key: 'address', icon: Globe, value: localized(facility, 'address', language) },
        { key: 'status', icon: Check, value: t(`venueOwnerFacility.status.${facility.status}`) },
        { key: 'surface', icon: Rows3, value: localized(facility, 'surface', language) },
        {
          key: 'dimensions',
          icon: LayoutGrid,
          value: dimensionsText,
        },
        { key: 'capacity', icon: Users, value: localized(facility, 'capacity', language) },
        { key: 'morningPrice', icon: CircleDollarSign, value: price(facility.morning_hourly_price) },
        { key: 'eveningPrice', icon: CircleDollarSign, value: price(facility.evening_hourly_price) },
      ]
    : []

  const [mainPhoto, ...otherPhotos] = facility?.images ?? []
  const isLoading = facility === null && !hasError && !isUnavailable

  if (facility && isViewingPhotos) {
    return (
      <DashboardLayout
        navItems={VENUE_OWNER_NAV}
        venue={layoutVenue}
        roleLabelKey="dashboardLayout.roles.venueOwner"
      >
        <VenueOwnerFacilityPhotos facility={facility} onBack={closePhotos} onRemovePhoto={removePhoto} />
      </DashboardLayout>
    )
  }

  if (facility && isEditing) {
    return (
      <DashboardLayout
        navItems={VENUE_OWNER_NAV}
        venue={layoutVenue}
        roleLabelKey="dashboardLayout.roles.venueOwner"
      >
        <VenueOwnerFacilityEdit
          key={language}
          facility={facility}
          dimensionsText={dimensionsText}
          onCancel={closeEdit}
          onSave={saveEdit}
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      navItems={VENUE_OWNER_NAV}
      venue={layoutVenue}
      roleLabelKey="dashboardLayout.roles.venueOwner"
    >
      {/* The error and unavailable states have no page header (as on the
          Dashboard, Reviews and Analytics pages). */}
      {!hasError && !isUnavailable && (
        <header className="vof-header">
          <h1 className="vof-title">{t('venueOwnerFacility.title')}</h1>
          <p className="vof-subtitle">{t('venueOwnerFacility.subtitle')}</p>
        </header>
      )}

      {/* Error state: centered. Connection failures show the Wi-Fi icon;
          server errors the alert icon. */}
      {hasError && (
        <section className="vof-state" role="alert" aria-labelledby="vof-error-title">
          {errorKind === 'network' && (
            <WifiOff className="vof-state-icon" size={100} strokeWidth={2.25} aria-hidden="true" />
          )}
          <h1 id="vof-error-title" className="vof-state-title">
            {errorKind === 'server' && <CircleAlert className="vof-state-alert" size={20} aria-hidden="true" />}
            {t('venueOwnerFacility.errorState.title')}
          </h1>
          <p className="vof-state-text">
            {t(
              errorKind === 'network'
                ? 'venueOwnerFacility.errorState.networkMessage'
                : 'venueOwnerFacility.errorState.serverMessage',
            )}
          </p>
          <button type="button" className="vof-state-button" onClick={retry}>
            {t('venueOwnerFacility.errorState.retry')}
          </button>
        </section>
      )}

      {/* No venue data: the existing "not available" message, centered,
          with "Try again". */}
      {isUnavailable && (
        <section className="vof-state" aria-labelledby="vof-unavailable-title">
          <h1 id="vof-unavailable-title" className="vof-state-title">
            {t('venueOwnerFacility.unavailable')}
          </h1>
          <button type="button" className="vof-state-button" onClick={retry}>
            {t('venueOwnerFacility.errorState.retry')}
          </button>
        </section>
      )}

      {/* Loading state: placeholders in the page's layout. */}
      {isLoading && (
        <div aria-busy="true">
          <div className="vof-skeleton-block pv-shimmer vof-skeleton-hero" aria-hidden="true" />
          <div className="vof-grid" aria-hidden="true">
            <div className="vof-card">
              <div className="vof-card-header">
                <span className="vof-skeleton pv-shimmer vof-skeleton-title" />
              </div>
              <div className="vof-rows">
                {Array.from({ length: SKELETON_ROWS }, (_, row) => (
                  <div key={row} className="vof-row">
                    <span className="vof-row-label">
                      <span className="vof-skeleton pv-shimmer vof-skeleton-icon" />
                      <span className="vof-skeleton pv-shimmer vof-skeleton-label" />
                    </span>
                    <span className="vof-skeleton pv-shimmer vof-skeleton-value" />
                  </div>
                ))}
              </div>
            </div>

            <div className="vof-card">
              <div className="vof-card-header">
                <span className="vof-skeleton pv-shimmer vof-skeleton-title" />
              </div>
              <div className="vof-gallery">
                <span className="vof-skeleton-block pv-shimmer vof-skeleton-photo vof-skeleton-photo-main" />
                <span className="vof-skeleton-block pv-shimmer vof-skeleton-photo" />
                <span className="vof-skeleton-block pv-shimmer vof-skeleton-photo" />
              </div>
              <div className="vof-photos-footer">
                <span className="vof-skeleton pv-shimmer vof-skeleton-button" />
              </div>
            </div>
          </div>
        </div>
      )}

      {facility && (
        <>
          {/* Cover banner: the venue photo with its sport, area, name and actions. */}
          <section
            className="vof-hero"
            style={{ backgroundImage: `url(${facility.cover_image_url})` }}
            aria-labelledby="vof-hero-title"
          >
            <div className="vof-hero-text">
              <p className="vof-hero-meta">
                <span className="vof-hero-sport">{localized(facility, 'sport', language)}</span>
                <span className="vof-hero-area">
                  <MapPin size={12} aria-hidden="true" />
                  {localized(facility, 'area', language)}
                </span>
              </p>
              <h2 id="vof-hero-title" className="vof-hero-title">
                {localized(facility, 'name', language)}
              </h2>
            </div>
            {/* "Edit venue" opens the same edit form as "Edit" in the
                information card; "Manage photos" opens the same photos view as
                "View all photos" in the photos card. */}
            <div className="vof-hero-actions">
              <button type="button" className="vof-button vof-button-ghost" onClick={openPhotos}>
                <Images size={14} aria-hidden="true" />
                {t('venueOwnerFacility.managePhotos')}
              </button>
              <button type="button" className="vof-button vof-button-navy" onClick={openEdit}>
                <SquarePen size={14} aria-hidden="true" />
                {t('venueOwnerFacility.editVenue')}
              </button>
            </div>
          </section>

          <div className="vof-grid">
            {/* Start side: venue information. */}
            <section className="vof-card vof-info" aria-labelledby="vof-info-title">
              <header className="vof-card-header">
                <h2 id="vof-info-title" className="vof-card-title">
                  {t('venueOwnerFacility.infoTitle')}
                </h2>
                <button type="button" className="vof-edit" onClick={openEdit}>
                  <SquarePen size={13} aria-hidden="true" />
                  {t('venueOwnerFacility.edit')}
                </button>
              </header>
              <dl className="vof-rows">
                {rows.map(({ key, icon: Icon, value }) => (
                  <div key={key} className="vof-row">
                    <dt className="vof-row-label">
                      <span className="vof-row-icon" aria-hidden="true">
                        <Icon size={15} />
                      </span>
                      {t(`venueOwnerFacility.fields.${key}`)}
                    </dt>
                    <dd className="vof-row-value">
                      <bdi>{value}</bdi>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* End side: photos. */}
            <section className="vof-card vof-photos" aria-labelledby="vof-photos-title">
              <header className="vof-card-header">
                <h2 id="vof-photos-title" className="vof-card-title">
                  {t('venueOwnerFacility.photosTitle')}
                </h2>
                <span className="vof-photos-count">
                  {t('venueOwnerFacility.photosCount', {
                    count: facility.images.length,
                    value: countFormat.format(facility.images.length),
                  })}
                </span>
              </header>
              {mainPhoto ? (
                <div className="vof-gallery">
                  {/* Hover/focus shows a dark overlay with "View" (design). No action yet (UI only). */}
                  {[mainPhoto, ...otherPhotos.slice(0, 2)].map((photo, index) => (
                    <button
                      key={photo.id}
                      type="button"
                      className={index === 0 ? 'vof-photo-item vof-photo-item-main' : 'vof-photo-item'}
                    >
                      <img className="vof-photo" src={photo.image_url} alt="" />
                      <span className="vof-photo-overlay">{t('venueOwnerFacility.viewPhoto')}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="vof-photos-empty">{t('venueOwnerFacility.noPhotos')}</p>
              )}
              <div className="vof-photos-footer">
                <button type="button" className="vof-button vof-button-muted vof-button-full" onClick={openPhotos}>
                  {t('venueOwnerFacility.viewAllPhotos')}
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}

export default VenueOwnerFacility
