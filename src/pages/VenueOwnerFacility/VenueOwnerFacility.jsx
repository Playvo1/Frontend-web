import { useEffect, useRef, useState } from 'react'
import {
  Check,
  CircleAlert,
  CircleDollarSign,
  Globe,
  House,
  ImageUp,
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
import {
  COVER_IMAGE_MAX_BYTES,
  COVER_IMAGE_TYPES,
  COVER_SAVE_NOT_AVAILABLE,
  FACILITY_EDITABLE_FIELDS,
  FACILITY_MULTIPLE,
  FACILITY_NONE,
  changedFacilityFields,
  deleteVenueImage,
  getVenueOwnerFacilityDetails,
  saveVenueCoverImage,
  setVenueCoverImage,
  updateVenueOwnerFacility,
  uploadVenueImage,
} from '../../services/facilityService.js'
import { IS_API_ENABLED } from '../../config/api.js'
import { isConnectionFailure } from '../../utils/requestErrors.js'
import { numberFormat } from '../VenueOwnerBookings/bookingFormat.js'
import VenueOwnerFacilityEdit from './VenueOwnerFacilityEdit.jsx'
import VenueOwnerFacilityPhotos from './VenueOwnerFacilityPhotos.jsx'
import VenuePhoto from './VenuePhoto.jsx'
import '../../styles/skeleton.css'
import './VenueOwnerFacility.css'

// Venue Owner "My venue" page (route: /venue-owner/facility), built from the
// design: page title, a cover banner with the venue's sport, area, name and
// actions, the venue information list and the photos card.
//
// Data comes from facilityService.getVenueOwnerFacilityDetails: with the API
// configured, the signed-in owner's venue from GET /venue_owner/owner/myvenues
// (the backend finds it from the token; one venue per account), with its
// sports, city / country and photos (the cover: the image marked is_cover);
// otherwise the local mock. Values the backend does not provide are shown as
// "Not available"; no venue or more than one venue shows a message instead
// of the page.
//
// The information list is the design's in both modes (API mode: the
// backend's name, area, address, status, surface, dimensions, capacity and
// default morning / evening prices; the owner name from the Profile
// endpoint). API mode differences: the banner's location is the city,
// photos that cannot be loaded show a placeholder (VenuePhoto), and the
// banner photo is the backend's cover_image_url (none: no photo).
//
// "Edit" in the information card opens the edit form: demo mode keeps the
// changes in this page's state; API mode sends only the changed fields the
// backend accepts (name, description, area, address, surface, dimensions,
// capacity, morning / evening prices — not the owner name, status or sport)
// with PUT /venue_owner/owner/venues/{id} and shows the saved values. "View all photos" opens the photos view (API
// mode: upload, delete and "Set as cover" on the backend). "Edit venue
// photo" in the cover banner picks a new cover image. Picking and saving are
// separate steps: the picked image is only previewed in the banner (this
// page's state), then "Save photo" sends it through
// facilityService.saveVenueCoverImage (API mode: uploaded, then set as the
// cover; demo mode: says saving is not available, nothing is reported as
// saved); "Cancel" drops the preview.
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
  const { logout, token, user } = useAuth()
  // null (no error) | 'network' (no connection) | 'server' (any other
  // failure) — same handling as the Bookings page.
  const [errorKind, setErrorKind] = useState(null)
  const hasError = errorKind !== null
  // The load finished without usable venue data: null (no) | 'unavailable'
  // (no data) | 'none' (no venue linked to the account) | 'multiple' (more
  // than one venue linked — the page does not pick one).
  const [unavailableKind, setUnavailableKind] = useState(null)
  const isUnavailable = unavailableKind !== null
  // API mode: set after the edit form was saved on the backend, so the
  // information card says the changes were saved.
  const [editSaved, setEditSaved] = useState(false)
  // Incremented by "Try again" to run the facility request once more.
  const [attempt, setAttempt] = useState(0)
  // "Edit" in the information card swaps the page for the edit form
  // (VenueOwnerFacilityEdit). Demo mode: saving keeps the changes in this
  // page's state only. API mode: saved on the backend (saveEdit).
  const [isEditing, setIsEditing] = useState(false)

  const openEdit = () => {
    setIsEditing(true)
    window.scrollTo(0, 0)
  }

  const closeEdit = () => {
    setIsEditing(false)
    window.scrollTo(0, 0)
  }

  // Returns a promise for the form: it rejects (the form stays open with a
  // message) when the backend did not save. 401 signs out.
  const saveEdit = (updated) => {
    if (!IS_API_ENABLED) {
      setFacility(updated)
      closeEdit()
      return Promise.resolve()
    }
    // Only the changed fields are sent; nothing changed: no request.
    const changes = changedFacilityFields(facility, updated)
    if (Object.keys(changes).length === 0) {
      closeEdit()
      return Promise.resolve()
    }
    return updateVenueOwnerFacility(facility, changes, { token, user })
      .then((saved) => {
        setFacility(saved)
        setEditSaved(true)
        closeEdit()
      })
      .catch((error) => {
        if (error?.status === 401) logout()
        throw error
      })
  }

  // API mode: upload one photo (photos view) and add it to the list. With
  // no cover yet it becomes the cover, as on the backend (no is_cover: the
  // first image).
  const uploadPhoto = (file) =>
    uploadVenueImage(facility.id, file, { token })
      .then((image) => {
        setFacility((current) =>
          current.cover_image_url
            ? { ...current, images: [...current.images, image] }
            : { ...current, cover_image_id: image.id, cover_image_url: image.image_url },
        )
        return image
      })
      .catch((error) => {
        if (error?.status === 401) logout()
        throw error
      })

  // API mode (photos view): "Set as cover" and delete, saved on the backend;
  // the page shows the saved photos. They reject (the view says so) when the
  // backend did not save; 401 signs out.
  const signOutOn401 = (error) => {
    if (error?.status === 401) logout()
    throw error
  }

  const setCoverPhoto = (photoId) =>
    setVenueCoverImage(facility.id, photoId, { token })
      .then((photos) => setFacility((current) => ({ ...current, ...photos })))
      .catch(signOutOn401)

  const deletePhoto = (photoId) =>
    deleteVenueImage(facility.id, photoId, { token })
      .then(() => removePhoto(photoId))
      .catch(signOutOn401)

  // "View all photos" swaps the page for the photos view
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

  // "Edit venue photo" (cover banner), step 1 — pick & preview: the picked
  // file is kept with an object URL that replaces the banner photo on this
  // page only. Nothing is uploaded or stored (no localStorage / IndexedDB).
  const coverInputRef = useRef(null)
  const [pendingCover, setPendingCover] = useState(null) // { file, url } | null
  // Message under the button: null | 'invalidType' | 'tooLarge' |
  // 'notAvailable' | 'network' | 'server'.
  const [coverMessage, setCoverMessage] = useState(null)
  const [isSavingCover, setIsSavingCover] = useState(false)
  const coverPreview = pendingCover?.url ?? null

  // Release the previewed file when it is replaced, dropped or the page closes.
  useEffect(() => {
    if (!coverPreview) return undefined
    return () => URL.revokeObjectURL(coverPreview)
  }, [coverPreview])

  const changeCover = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!COVER_IMAGE_TYPES.includes(file.type)) {
      setCoverMessage('invalidType')
      return
    }
    if (file.size > COVER_IMAGE_MAX_BYTES) {
      setCoverMessage('tooLarge')
      return
    }
    setCoverMessage(null)
    setPendingCover({ file, url: URL.createObjectURL(file) })
  }

  const cancelCover = () => {
    setPendingCover(null)
    setCoverMessage(null)
  }

  // Step 2 — save through the service. Only a resolved request updates the
  // cover (API mode: the saved photos); demo mode rejects with
  // COVER_SAVE_NOT_AVAILABLE and the preview stays unsaved. When only the
  // upload worked, the photo is added to the photos (not as the cover).
  const saveCover = () => {
    if (!pendingCover || isSavingCover) return
    setIsSavingCover(true)
    setCoverMessage(null)
    saveVenueCoverImage(facility.id, pendingCover.file, { token })
      .then((photos) => {
        setFacility((current) => ({ ...current, ...photos }))
        setPendingCover(null)
      })
      .catch((error) => {
        if (error?.status === 401) {
          logout()
          return
        }
        if (error?.code === COVER_SAVE_NOT_AVAILABLE) {
          setCoverMessage('notAvailable')
          return
        }
        if (error?.uploadedImage) {
          const uploaded = error.uploadedImage
          setFacility((current) => ({ ...current, images: [...current.images, uploaded] }))
          setPendingCover(null)
          setCoverMessage('uploadedNotCover')
          return
        }
        setCoverMessage(isConnectionFailure(error) ? 'network' : 'server')
      })
      .finally(() => setIsSavingCover(false))
  }

  // Removes a photo from the page's state (demo mode: the delete itself;
  // API mode: after the backend deleted it, see deletePhoto).
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
    getVenueOwnerFacilityDetails({ token, user })
      .then((data) => {
        if (!isActive) return
        if (data && typeof data === 'object') {
          setFacility(data)
        } else {
          setUnavailableKind('unavailable')
        }
      })
      .catch((error) => {
        if (!isActive) return
        if (error?.status === 401) {
          logout()
          return
        }
        if (error?.code === FACILITY_NONE) {
          setUnavailableKind('none')
          return
        }
        if (error?.code === FACILITY_MULTIPLE) {
          setUnavailableKind('multiple')
          return
        }
        setErrorKind(isConnectionFailure(error) ? 'network' : 'server')
      })
    return () => {
      isActive = false
    }
  }, [attempt, logout, token, user])

  // "Try again": back to the loading state and one new request. The error
  // block (and its button) is replaced by the loading state right away, so
  // the request cannot be sent twice.
  const retry = () => {
    setErrorKind(null)
    setUnavailableKind(null)
    setFacility(null)
    setEditSaved(false)
    setAttempt((count) => count + 1)
  }

  const layoutVenue = venue
    ? { name: venue.name, statusKey: `venueOwnerDashboard.venueStatus.${venue.status}` }
    : null

  // Photo count with Arabic-Indic digits in Arabic, as in the design ("٣ صور").
  const countFormat = new Intl.NumberFormat(language === 'ar' ? 'ar-u-nu-arab' : language)
  const notAvailable = t('venueOwnerFacility.notAvailable')
  const price = (value) => (value == null ? notAvailable : `₪${numberFormat.format(value)}`)
  // City / country (API mode, from the venue details).
  const city = facility ? localized(facility, 'city', language) : null
  const orNotAvailable = (value) => (value == null || value === '' ? notAvailable : value)

  // "40 × 20 m · 5-a-side"; without a team format: "40 × 20 m".
  const teamFormat = facility ? localized(facility, 'team_format', language) : null
  const hasDimensions = facility?.length_m != null && facility?.width_m != null
  const dimensionsText = !facility
    ? ''
    : !hasDimensions
      ? notAvailable
      : t(teamFormat ? 'venueOwnerFacility.dimensionsValue' : 'venueOwnerFacility.dimensionsOnly', {
          length: facility.length_m,
          width: facility.width_m,
          format: teamFormat,
        })

  // Information rows, in the design's order.
  const rows = facility
    ? [
        { key: 'name', icon: House, value: orNotAvailable(localized(facility, 'name', language)) },
        { key: 'owner', icon: User, value: orNotAvailable(facility.owner_name) },
        { key: 'area', icon: MapPin, value: orNotAvailable(localized(facility, 'area', language)) },
        { key: 'address', icon: Globe, value: orNotAvailable(localized(facility, 'address', language)) },
        {
          key: 'status',
          icon: Check,
          value: facility.status ? t(`venueOwnerFacility.status.${facility.status}`) : notAvailable,
        },
        { key: 'surface', icon: Rows3, value: orNotAvailable(localized(facility, 'surface', language)) },
        {
          key: 'dimensions',
          icon: LayoutGrid,
          value: dimensionsText,
        },
        { key: 'capacity', icon: Users, value: orNotAvailable(localized(facility, 'capacity', language)) },
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
        <VenueOwnerFacilityPhotos
          facility={facility}
          onBack={closePhotos}
          onRemovePhoto={IS_API_ENABLED ? deletePhoto : removePhoto}
          onSetCover={IS_API_ENABLED ? setCoverPhoto : null}
          onUploadImage={IS_API_ENABLED ? uploadPhoto : null}
        />
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
          editableFields={IS_API_ENABLED ? FACILITY_EDITABLE_FIELDS : null}
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

      {/* No venue data, no venue linked to the account, or more than one:
          a centered message with "Try again" (same layout as "not available"). */}
      {isUnavailable && (
        <section className="vof-state" aria-labelledby="vof-unavailable-title">
          <h1 id="vof-unavailable-title" className="vof-state-title">
            {t(
              unavailableKind === 'none'
                ? 'venueOwnerFacility.noVenue'
                : unavailableKind === 'multiple'
                  ? 'venueOwnerFacility.multipleVenues'
                  : 'venueOwnerFacility.unavailable',
            )}
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
            style={
              coverPreview || facility.cover_image_url
                ? { backgroundImage: `url(${coverPreview ?? facility.cover_image_url})` }
                : undefined
            }
            aria-labelledby="vof-hero-title"
          >
            <div className="vof-hero-text">
              <p className="vof-hero-meta">
                {localized(facility, 'sport', language) && (
                  <span className="vof-hero-sport">{localized(facility, 'sport', language)}</span>
                )}
                {/* Location: the city in API mode, the area in demo mode. */}
                {(IS_API_ENABLED ? city : localized(facility, 'area', language)) && (
                  <span className="vof-hero-area">
                    <MapPin size={12} aria-hidden="true" />
                    {IS_API_ENABLED ? city : localized(facility, 'area', language)}
                  </span>
                )}
              </p>
              <h2 id="vof-hero-title" className="vof-hero-title">
                {localized(facility, 'name', language)}
              </h2>
            </div>
            {/* "Edit venue photo" (design): picks a new cover image for the
                banner; "Save photo" / "Cancel" appear while it is previewed
                (see changeCover / saveCover). */}
            <div className="vof-hero-actions">
              <button
                type="button"
                className="vof-button vof-button-navy"
                onClick={() => coverInputRef.current?.click()}
              >
                <ImageUp size={14} aria-hidden="true" />
                {t('venueOwnerFacility.editCover')}
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept={COVER_IMAGE_TYPES.join(',')}
                className="vof-file-input"
                onChange={changeCover}
                tabIndex={-1}
                aria-hidden="true"
              />
              {pendingCover && (
                <div className="vof-hero-cover-actions">
                  <button
                    type="button"
                    className="vof-button vof-button-navy"
                    onClick={saveCover}
                    disabled={isSavingCover}
                  >
                    {t(isSavingCover ? 'venueOwnerFacility.coverSaving' : 'venueOwnerFacility.coverSave')}
                  </button>
                  <button
                    type="button"
                    className="vof-button vof-button-ghost"
                    onClick={cancelCover}
                    disabled={isSavingCover}
                  >
                    {t('venueOwnerFacility.coverCancel')}
                  </button>
                </div>
              )}
              {pendingCover && <p className="vof-hero-note">{t('venueOwnerFacility.coverNotSaved')}</p>}
              {coverMessage && (
                <p className="vof-hero-note vof-hero-note-error" role="alert">
                  {t(`venueOwnerFacility.coverMessages.${coverMessage}`)}
                </p>
              )}
            </div>
          </section>

          <div className="vof-grid">
            {/* Start side: venue information. */}
            <section className="vof-card vof-info" aria-labelledby="vof-info-title">
              <header className="vof-card-header">
                <h2 id="vof-info-title" className="vof-card-title">
                  {t('venueOwnerFacility.infoTitle')}
                </h2>
                <button
                  type="button"
                  className="vof-edit"
                  onClick={() => {
                    setEditSaved(false)
                    openEdit()
                  }}
                >
                  <SquarePen size={13} aria-hidden="true" />
                  {t('venueOwnerFacility.edit')}
                </button>
              </header>
              {editSaved && (
                <p className="vof-info-note vof-info-note-success" role="status">
                  {t('venueOwnerFacility.editSaved')}
                </p>
              )}
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
                  {/* Hover/focus shows a dark overlay with "View" (design); it opens the
                      photos view, like "View all photos". */}
                  {[mainPhoto, ...otherPhotos.slice(0, 2)].map((photo, index) => (
                    <button
                      key={photo.id}
                      type="button"
                      className={index === 0 ? 'vof-photo-item vof-photo-item-main' : 'vof-photo-item'}
                      onClick={openPhotos}
                    >
                      <VenuePhoto className="vof-photo" src={photo.image_url} />
                      <span className="vof-photo-overlay">{t('venueOwnerFacility.viewPhoto')}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="vof-photos-empty">
                  {t(
                    facility.imagesStatus === 'inactive'
                      ? 'venueOwnerFacility.photosInactive'
                      : 'venueOwnerFacility.noPhotos',
                  )}
                </p>
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
