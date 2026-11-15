import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, CircleAlert, ImageOff, Info, MapPin, Trash2, User, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import { showToast } from '../../components/Toast/toast.js'
import { ADMIN_NAV } from '../../constants/adminNav.js'
import { useAuth } from '../../context/useAuth.js'
import { getAdminVenueDetails, removeAdminVenue } from '../../services/adminVenuesService.js'
import { isConnectionFailure } from '../../utils/requestErrors.js'
import RemoveVenueDialog from './RemoveVenueDialog.jsx'
import { useVenueDateLabel } from './useVenueDateLabel.js'
import '../../styles/skeleton.css'
import './AdminVenueDetails.css'

// Admin venue details page (route: /admin/venues/:venueId), opened from
// "View details" in the venues table. Built from the design: title with the
// status badge, "Remove venue" and "Back to venues"; the cover card (photo,
// name, city and address; sport, dimensions and date added; the
// description); the venue owner card; and the photos card.
//
// Data: adminVenuesService.getAdminVenueDetails — demo mode: the mock venue;
// API mode: GET /admin/venues/{id}, which returns the venue whatever its
// status, with its owner (name, email, phone and account status). 404 (no
// such venue) and 403 (not an admin) get their own messages. A venue whose
// owner account no longer exists shows the owner as not available.
//
// "Remove venue" uses the same confirmation and request as the venues list
// (status → inactive); the badge then shows the saved status.

// Photo (or a placeholder when it cannot be loaded).
function Photo({ src, className, alt = '' }) {
  const [failedSrc, setFailedSrc] = useState(null)
  if (!src || failedSrc === src) {
    return (
      <span className={`${className} avd-photo-missing`} role="img" aria-label={alt || undefined}>
        <ImageOff size={20} aria-hidden="true" />
      </span>
    )
  }
  return <img className={className} src={src} alt={alt} onError={() => setFailedSrc(src)} />
}

function AdminVenueDetails() {
  const { t, i18n } = useTranslation()
  const { venueId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { token, logout } = useAuth()
  const language = i18n.language === 'ar' ? 'ar' : 'en'
  const isRtl = i18n.dir() === 'rtl'
  const dateLabel = useVenueDateLabel(language)
  const [venue, setVenue] = useState(null)
  // null | 'notFound' | 'forbidden' | 'network' | 'server'
  const [errorKind, setErrorKind] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    let isActive = true
    getAdminVenueDetails(venueId, token)
      .then((data) => isActive && setVenue(data))
      .catch((error) => {
        if (!isActive) return
        if (error?.status === 401) {
          logout()
          return
        }
        if (error?.status === 404) setErrorKind('notFound')
        else if (error?.status === 403) setErrorKind('forbidden')
        else setErrorKind(isConnectionFailure(error) ? 'network' : 'server')
      })
    return () => {
      isActive = false
    }
  }, [venueId, attempt, token, logout])

  const retry = () => {
    setErrorKind(null)
    setVenue(null)
    setAttempt((count) => count + 1)
  }

  // Back to the list: the previous entry when we came from it.
  const goBack = () => {
    if (location.state?.from === 'venues') navigate(-1)
    else navigate('/admin/venues')
  }

  const confirmRemove = async () => {
    try {
      const saved = await removeAdminVenue(venue.id, token)
      setVenue((current) => ({ ...current, status: saved.status }))
      setIsRemoving(false)
      showToast(t('adminVenues.removed'))
    } catch (error) {
      if (error?.status === 401) logout()
      throw error
    }
  }

  const localized = (field) => (venue ? venue[`${field}_${language}`] || venue[`${field}_${language === 'ar' ? 'en' : 'ar'}`] || null : null)
  const name = localized('name')
  const location_ = [localized('city'), localized('address')].filter(Boolean).join(language === 'ar' ? '، ' : ', ')
  const dimensions =
    venue?.length_m != null && venue?.width_m != null
      ? t('adminVenueDetails.dimensionsValue', { length: venue.length_m, width: venue.width_m })
      : null
  const notAvailable = t('adminVenueDetails.notAvailable')
  const owner = venue?.owner ?? null
  const BackIcon = isRtl ? ChevronRight : ChevronLeft

  const layoutProps = {
    navItems: ADMIN_NAV,
    venue: null,
    roleLabelKey: 'dashboardLayout.roles.admin',
    subtitle: t('dashboardLayout.roles.admin'),
    brandMark: true,
  }

  const backButton = (
    <button type="button" className="avd-back" onClick={goBack}>
      {t('adminVenueDetails.back')}
      <BackIcon size={16} aria-hidden="true" />
    </button>
  )

  if (errorKind) {
    return (
      <DashboardLayout {...layoutProps}>
        <div className="avd-header">
          <h1 className="avd-title">{t('adminVenueDetails.title')}</h1>
          <div className="avd-header-actions">{backButton}</div>
        </div>
        <section className="avd-card avd-state" role={errorKind === 'notFound' ? 'status' : 'alert'}>
          {errorKind === 'network' ? (
            <WifiOff className="avd-state-icon" size={48} aria-hidden="true" />
          ) : (
            <CircleAlert className="avd-state-icon" size={44} aria-hidden="true" />
          )}
          <p className="avd-state-title">{t(`adminVenueDetails.errors.${errorKind}.title`)}</p>
          <p className="avd-state-text">{t(`adminVenueDetails.errors.${errorKind}.text`)}</p>
          {errorKind !== 'notFound' && errorKind !== 'forbidden' && (
            <button type="button" className="avd-retry" onClick={retry}>
              {t('adminVenueDetails.retry')}
            </button>
          )}
        </section>
      </DashboardLayout>
    )
  }

  if (!venue) {
    return (
      <DashboardLayout {...layoutProps}>
        <div className="avd-header" aria-hidden="true">
          <span className="avd-skeleton pv-shimmer avd-skeleton-title" />
        </div>
        <div className="avd-grid" aria-busy="true">
          <div className="avd-card avd-main">
            <span className="avd-skeleton-block pv-shimmer avd-cover" />
            <div className="avd-main-body">
              <div className="avd-facts">
                {[0, 1, 2].map((key) => (
                  <span key={key} className="avd-skeleton-block pv-shimmer avd-fact-skeleton" />
                ))}
              </div>
            </div>
          </div>
          <div className="avd-card avd-owner">
            <span className="avd-skeleton pv-shimmer avd-skeleton-line" />
            <span className="avd-skeleton pv-shimmer avd-skeleton-line" />
            <span className="avd-skeleton pv-shimmer avd-skeleton-line" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout {...layoutProps}>
      <header className="avd-header">
        <div className="avd-heading">
          <div className="avd-title-row">
            <h1 className="avd-title">
              <bdi>{name || notAvailable}</bdi>
            </h1>
            {venue.status && (
              <span className={`avd-status avd-status-${venue.status}`}>{t(`adminVenues.status.${venue.status}`)}</span>
            )}
          </div>
          <p className="avd-subtitle">{t('adminVenueDetails.subtitle')}</p>
        </div>
        <div className="avd-header-actions">
          <button type="button" className="avd-remove" onClick={() => setIsRemoving(true)}>
            <Trash2 size={15} aria-hidden="true" />
            {t('adminVenueDetails.remove')}
          </button>
          {backButton}
        </div>
      </header>

      <div className="avd-grid">
        {/* Venue: cover, facts, description. */}
        <section className="avd-card avd-main" aria-label={t('adminVenueDetails.venueLabel')}>
          <div className="avd-cover-wrap">
            <Photo className="avd-cover" src={venue.cover_image_url} />
            <div className="avd-cover-text">
              <p className="avd-cover-name">
                <bdi>{name}</bdi>
              </p>
              {location_ && (
                <p className="avd-cover-location">
                  <MapPin size={14} aria-hidden="true" />
                  <bdi>{location_}</bdi>
                </p>
              )}
            </div>
          </div>

          <div className="avd-main-body">
            <dl className="avd-facts">
              <div className="avd-fact">
                <dt>{t('adminVenueDetails.sport')}</dt>
                <dd>{localized('sport') || notAvailable}</dd>
              </div>
              <div className="avd-fact">
                <dt>{t('adminVenueDetails.dimensions')}</dt>
                <dd>
                  <bdi>{dimensions || notAvailable}</bdi>
                </dd>
              </div>
              <div className="avd-fact">
                <dt>{t('adminVenueDetails.createdAt')}</dt>
                <dd>
                  <bdi>{venue.created_at ? dateLabel(venue.created_at) : notAvailable}</bdi>
                </dd>
              </div>
            </dl>

            <div className="avd-about">
              <h2 className="avd-section-title">{t('adminVenueDetails.about')}</h2>
              <p className={localized('description') ? 'avd-about-text' : 'avd-about-text avd-muted'} dir="auto">
                {localized('description') || t('adminVenueDetails.noDescription')}
              </p>
            </div>
          </div>
        </section>

        {/* Venue owner: name, email, phone and account status. */}
        <section className="avd-card avd-owner" aria-label={t('adminVenueDetails.owner')}>
          <div className="avd-owner-head">
            <span className="avd-avatar" aria-hidden="true">
              {owner?.name ? owner.name.trim().charAt(0) : <User size={18} />}
            </span>
            <div>
              <p className="avd-label">{t('adminVenueDetails.owner')}</p>
              <p className="avd-owner-name">
                <bdi>{owner?.name || notAvailable}</bdi>
              </p>
            </div>
          </div>

          <div className="avd-owner-row">
            <p className="avd-label">{t('adminVenueDetails.ownerEmail')}</p>
            <p className="avd-owner-value" dir={owner?.email ? 'ltr' : undefined}>
              {owner?.email || notAvailable}
            </p>
          </div>

          <div className="avd-owner-row">
            <p className="avd-label">{t('adminVenueDetails.ownerPhone')}</p>
            <p className="avd-owner-value" dir={owner?.phone ? 'ltr' : undefined}>
              {owner?.phone || notAvailable}
            </p>
          </div>

          <div className="avd-owner-row">
            <p className="avd-label">{t('adminVenueDetails.accountStatus')}</p>
            {owner?.status ? (
              <span className={`avd-account avd-account-${owner.status}`}>
                <span className="avd-account-dot" aria-hidden="true" />
                {t(`adminVenueDetails.accountStatuses.${owner.status}`, { defaultValue: owner.status })}
              </span>
            ) : (
              <p className="avd-owner-value">{notAvailable}</p>
            )}
          </div>

          <p className="avd-owner-note">
            {owner ? (
              t('adminVenueDetails.ownerNote')
            ) : (
              <>
                <Info size={13} aria-hidden="true" /> {t('adminVenueDetails.ownerUnavailable')}
              </>
            )}
          </p>
        </section>
      </div>

      {/* Photos */}
      <section className="avd-card avd-photos" aria-labelledby="avd-photos-title">
        <h2 id="avd-photos-title" className="avd-section-title">
          {t('adminVenueDetails.photos')}
        </h2>
        <p className="avd-photos-count">{t('adminVenueDetails.photosCount', { count: venue.images.length })}</p>
        {venue.images.length > 0 ? (
          <ul className="avd-gallery">
            {venue.images.map((image, index) => (
              <li key={image.id ?? index} className={index === 0 ? 'avd-gallery-item avd-gallery-main' : 'avd-gallery-item'}>
                <Photo
                  className="avd-gallery-photo"
                  src={image.image_url}
                  alt={t('adminVenueDetails.photoAlt', { number: index + 1 })}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="avd-muted avd-no-photos">{t('adminVenueDetails.noPhotos')}</p>
        )}
      </section>

      {isRemoving && (
        <RemoveVenueDialog venueName={name} onClose={() => setIsRemoving(false)} onConfirm={confirmRemove} />
      )}
    </DashboardLayout>
  )
}

export default AdminVenueDetails
