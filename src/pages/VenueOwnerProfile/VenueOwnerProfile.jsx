import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, CircleAlert, CircleCheck, Info, SquarePen, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import { VENUE_OWNER_NAV } from '../../constants/venueOwnerNav.js'
import { useAuth } from '../../context/useAuth.js'
import { getVenueOwnerVenue } from '../../services/dashboardService.js'
import { getVenueOwnerFacility } from '../../services/facilityService.js'
import { isConnectionFailure } from '../../utils/requestErrors.js'
import { isValidEmail } from '../../utils/validation.js'
import ChangePasswordModal from './ChangePasswordModal.jsx'
import '../../styles/skeleton.css'
import './VenueOwnerProfile.css'

// Venue Owner "Profile" page (route: /venue-owner/profile), opened from the
// avatar in the top bar. Built from the design reference: page title, the
// account header card, "Personal information", "Venue information",
// "Security" and the save / cancel bar.
//
// Data: the signed-in user from the auth session (name, email, role,
// status — phone only if the session has one) and the venue from
// facilityService.getVenueOwnerFacility(), the same source and the same
// field labels / formatting as the My venue page (MOCK for now — see that
// file). The venue card is read-only: the venue is edited on My venue.
// Nothing is invented: a value the app does not have is shown as empty /
// "Not available".
//
// Personal information is a real form (controlled inputs): "Cancel" restores
// the last saved values and "Save changes" validates them. There is no
// endpoint to update a profile, upload a profile photo or change the
// password of a signed-in user (backend main @ ed902f7), so saving never
// claims success: it tells the user the changes were not saved. The photo
// can be picked and previewed only; it is not stored.
//
// Security: "Change password" opens ChangePasswordModal (current password,
// new password, confirmation — not connected yet: no endpoint, so it never
// reports a change). The account's "Active" badge and the email's
// "Verified" badge follow from the sign-in itself (see isActiveAccount).
// Last sign-in has no data source, so it shows "Not available".

// Image types the photo picker accepts (preview only).
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Phone: optional; digits with an optional leading "+", spaces and dashes.
const PHONE_PATTERN = /^\+?[\d\s-]{7,20}$/

// Localized value of a bilingual venue field ("name" -> name_ar / name_en),
// as on the My venue page.
function localized(facility, field, language) {
  return facility[`${field}_${language === 'ar' ? 'ar' : 'en'}`]
}

// Venue fields shown in the card: the design's four rows, using the My venue
// page's field keys (labels: venueOwnerFacility.fields.*).
const VENUE_FIELDS = ['name', 'area', 'surface', 'status']

function profileFromUser(user) {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  }
}

function VenueOwnerProfile() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const { user, logout } = useAuth()
  const [venue, setVenue] = useState(null)
  // Venue information card, loaded like the My venue page: facility (loaded)
  // | null (loading / failed / unavailable).
  const [facility, setFacility] = useState(null)
  // null (no error) | 'network' | 'server' — same handling as My venue.
  const [facilityError, setFacilityError] = useState(null)
  // The load finished without venue data (null / not an object).
  const [isFacilityUnavailable, setIsFacilityUnavailable] = useState(false)
  // Incremented by "Try again" to load the venue once more.
  const [facilityAttempt, setFacilityAttempt] = useState(0)

  // Personal information: the last saved values (from the session) and the
  // form being edited.
  const [saved] = useState(() => profileFromUser(user))
  const [form, setForm] = useState(saved)
  const [errors, setErrors] = useState({})
  // null | 'saveUnavailable' — shown after "Save changes".
  const [notice, setNotice] = useState(null)

  // Profile photo: picked file previewed locally (object URL), never stored.
  const photoInputRef = useRef(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoError, setPhotoError] = useState(false)
  // "Change password" dialog.
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Release the previewed file when it is replaced or the page closes.
  useEffect(() => {
    if (!photoPreview) return undefined
    return () => URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

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

  // Venue: loading → loaded, or → unavailable (no data), or → error. 401
  // signs out (as on the My venue page).
  useEffect(() => {
    let isActive = true
    getVenueOwnerFacility()
      .then((data) => {
        if (!isActive) return
        if (data && typeof data === 'object') setFacility(data)
        else setIsFacilityUnavailable(true)
      })
      .catch((error) => {
        if (!isActive) return
        if (error?.status === 401) {
          logout()
          return
        }
        setFacilityError(isConnectionFailure(error) ? 'network' : 'server')
      })
    return () => {
      isActive = false
    }
  }, [facilityAttempt, logout])

  const retryFacility = () => {
    setFacilityError(null)
    setIsFacilityUnavailable(false)
    setFacility(null)
    setFacilityAttempt((count) => count + 1)
  }
  const isFacilityLoading = facility === null && !facilityError && !isFacilityUnavailable

  const layoutVenue = venue
    ? { name: venue.name, statusKey: `venueOwnerDashboard.venueStatus.${venue.status}` }
    : null

  const isDirty =
    form.name !== saved.name || form.email !== saved.email || form.phone !== saved.phone || Boolean(photoPreview)

  const update = (field) => (event) => {
    const { value } = event.target
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: null }))
    setNotice(null)
  }

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = 'required'
    if (!form.email.trim()) next.email = 'required'
    else if (!isValidEmail(form.email)) next.email = 'invalidEmail'
    if (form.phone.trim() && !PHONE_PATTERN.test(form.phone.trim())) next.phone = 'invalidPhone'
    return next
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) {
      setNotice(null)
      return
    }
    // Nothing changed: nothing to save.
    if (!isDirty) return
    // No profile update endpoint: nothing is sent and the saved values stay
    // as they are. The form keeps the edits so they are not lost.
    setNotice('saveUnavailable')
  }

  const handleCancel = () => {
    setForm(saved)
    setErrors({})
    setNotice(null)
    setPhotoPreview(null)
    setPhotoError(false)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError(true)
      event.target.value = ''
      return
    }
    setPhotoError(false)
    setNotice(null)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const fullName = saved.name
  const initial = fullName.trim().charAt(0).toUpperCase()
  // The backend issues a session only to an account whose status is
  // "active" and whose email is verified (AuthController@login refuses
  // anything else), so a signed-in user is both. Its login response has no
  // status field; a status in the session (the mock users) still decides.
  const isActiveAccount = Boolean(user) && (user.status ?? 'active') === 'active'
  const isEmailVerified = Boolean(user)
  const notAvailable = t('venueOwnerProfile.notAvailable')

  // Same values as the My venue page's information rows.
  const venueValue = (key) =>
    key === 'status' ? t(`venueOwnerFacility.status.${facility.status}`) : localized(facility, key, language)

  const textField = (field, { labelKey = field, type = 'text', ltr = false, autoComplete } = {}) => {
    const id = `vop-${field}`
    const errorId = `${id}-error`
    return (
      <div className="vop-row vop-field">
        <label className="vop-row-label" htmlFor={id}>
          {t(`venueOwnerProfile.personal.${labelKey}`)}
        </label>
        <input
          id={id}
          name={field}
          type={type}
          dir={ltr ? 'ltr' : undefined}
          className={`vop-input ${ltr ? 'vop-input-ltr' : ''} ${errors[field] ? 'vop-input-invalid' : ''}`}
          value={form[field]}
          onChange={update(field)}
          autoComplete={autoComplete}
          inputMode={field === 'phone' ? 'tel' : undefined}
          aria-invalid={errors[field] ? 'true' : undefined}
          aria-describedby={errors[field] ? errorId : undefined}
        />
        {errors[field] && (
          <p id={errorId} className="vop-error" role="alert">
            {t(`venueOwnerProfile.errors.${errors[field]}`)}
          </p>
        )}
      </div>
    )
  }

  return (
    <DashboardLayout
      navItems={VENUE_OWNER_NAV}
      venue={layoutVenue}
      roleLabelKey="dashboardLayout.roles.venueOwner"
    >
      <header className="vop-header">
        <h1 className="vop-title">{t('venueOwnerProfile.title')}</h1>
        <p className="vop-subtitle">{t('venueOwnerProfile.subtitle')}</p>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        {/* Account header: avatar (photo picker with preview), name, account
            status, role and email. */}
        <section className="vop-card vop-account" aria-labelledby="vop-account-name">
          <div className="vop-avatar-wrap">
            <button
              type="button"
              className="vop-avatar-button"
              onClick={() => photoInputRef.current?.click()}
              aria-label={t('venueOwnerProfile.photo.change')}
            >
              {photoPreview ? (
                <img className="vop-avatar vop-avatar-image" src={photoPreview} alt="" />
              ) : (
                <span className="vop-avatar" aria-hidden="true">
                  {initial}
                </span>
              )}
              <span className="vop-avatar-edit" aria-hidden="true">
                <SquarePen size={10} />
              </span>
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept={PHOTO_TYPES.join(',')}
              className="vop-file-input"
              onChange={handlePhotoChange}
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
          <div className="vop-account-text">
            <p className="vop-account-top">
              <span id="vop-account-name" className="vop-account-name">
                {fullName}
              </span>
              {isActiveAccount && (
                <span className="vop-badge vop-badge-success">
                  <span className="vop-badge-dot" aria-hidden="true" />
                  {t('venueOwnerProfile.accountActive')}
                </span>
              )}
            </p>
            <p className="vop-account-meta">
              {t('dashboardLayout.roles.venueOwner')}
              {saved.email && (
                <>
                  {' • '}
                  <bdi dir="ltr">{saved.email}</bdi>
                </>
              )}
            </p>
            {photoPreview && <p className="vop-account-note">{t('venueOwnerProfile.photo.previewOnly')}</p>}
            {photoError && (
              <p className="vop-error" role="alert">
                {t('venueOwnerProfile.photo.invalidType')}
              </p>
            )}
          </div>
        </section>

        <div className="vop-grid">
          {/* Start side: personal information, then security. */}
          <div className="vop-column">
            <section className="vop-card vop-panel" aria-labelledby="vop-personal-title">
              <header className="vop-panel-header">
                <h2 id="vop-personal-title" className="vop-panel-title">
                  {t('venueOwnerProfile.personal.title')}
                </h2>
              </header>
              <div className="vop-rows">
                {textField('name', { labelKey: 'fullName', autoComplete: 'name' })}
                {textField('email', { type: 'email', ltr: true, autoComplete: 'email' })}
                {textField('phone', { type: 'tel', ltr: true, autoComplete: 'tel' })}
              </div>
            </section>

            <section className="vop-card vop-panel" aria-labelledby="vop-security-title">
              <header className="vop-panel-header">
                <h2 id="vop-security-title" className="vop-panel-title">
                  {t('venueOwnerProfile.security.title')}
                </h2>
              </header>
              {/* Design: "Change password" is the first row under the title.
                  Opens the change-password dialog. */}
              <div className="vop-row vop-row-action">
                <button
                  type="button"
                  className="vop-panel-link"
                  onClick={() => setIsChangingPassword(true)}
                  aria-haspopup="dialog"
                >
                  {t('venueOwnerProfile.security.changePassword')}
                </button>
              </div>
              <dl className="vop-rows">
                <div className="vop-row">
                  <dt className="vop-row-label">{t('venueOwnerProfile.security.lastLogin')}</dt>
                  <dd className="vop-row-value">{notAvailable}</dd>
                </div>
                <div className="vop-row">
                  <dt className="vop-row-label">{t('venueOwnerProfile.security.emailStatus')}</dt>
                  {isEmailVerified ? (
                    <dd className="vop-row-value vop-row-value-split">
                      {t('venueOwnerProfile.security.emailActive')}
                      <span className="vop-badge vop-badge-success">
                        <CircleCheck size={12} aria-hidden="true" />
                        {t('venueOwnerProfile.security.emailVerified')}
                      </span>
                    </dd>
                  ) : (
                    <dd className="vop-row-value">{notAvailable}</dd>
                  )}
                </div>
              </dl>
            </section>
          </div>

          {/* End side: venue information (edited on the My venue page). */}
          <section
            className="vop-card vop-panel vop-venue"
            aria-labelledby="vop-venue-title"
            aria-busy={isFacilityLoading}
          >
            <header className="vop-panel-header">
              <h2 id="vop-venue-title" className="vop-panel-title">
                {t('venueOwnerProfile.venue.title')}
              </h2>
              <Link to="/venue-owner/facility" className="vop-panel-link">
                <ArrowUpRight size={12} aria-hidden="true" />
                {t('venueOwnerProfile.venue.view')}
              </Link>
            </header>
            {facilityError || isFacilityUnavailable ? (
              /* Error / no data: the My venue page's messages, with "Try again". */
              <div className="vop-venue-state" role={facilityError ? 'alert' : undefined}>
                {facilityError === 'network' && <WifiOff size={28} aria-hidden="true" />}
                {facilityError === 'server' && <CircleAlert size={28} aria-hidden="true" />}
                <p className="vop-venue-state-title">
                  {t(facilityError ? 'venueOwnerFacility.errorState.title' : 'venueOwnerFacility.unavailable')}
                </p>
                {facilityError && (
                  <p className="vop-venue-state-text">
                    {t(
                      facilityError === 'network'
                        ? 'venueOwnerFacility.errorState.networkMessage'
                        : 'venueOwnerFacility.errorState.serverMessage',
                    )}
                  </p>
                )}
                <button type="button" className="vop-panel-link" onClick={retryFacility}>
                  {t('venueOwnerFacility.errorState.retry')}
                </button>
              </div>
            ) : (
              <dl className="vop-rows">
                {VENUE_FIELDS.map((key) => (
                  <div key={key} className="vop-row">
                    <dt className="vop-row-label">{t(`venueOwnerFacility.fields.${key}`)}</dt>
                    <dd className="vop-row-value">
                      {isFacilityLoading ? (
                        <span className="vop-skeleton pv-shimmer" aria-hidden="true" />
                      ) : (
                        <bdi>{venueValue(key) || notAvailable}</bdi>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </div>

        {/* Save / cancel bar (always shown as in the design; with no changes
            "Save changes" does nothing and "Cancel" has nothing to undo). */}
        <div className="vop-card vop-actions">
          <button type="submit" className="vop-button vop-button-save">
            {t('venueOwnerProfile.save')}
          </button>
          {notice && (
            <p className="vop-notice" role="status">
              <Info size={14} aria-hidden="true" />
              {t(`venueOwnerProfile.${notice}`)}
            </p>
          )}
          <button type="button" className="vop-button vop-button-cancel" onClick={handleCancel}>
            {t('venueOwnerProfile.cancel')}
          </button>
        </div>
      </form>

      {isChangingPassword && (
        <ChangePasswordModal onClose={() => setIsChangingPassword(false)} />
      )}
    </DashboardLayout>
  )
}

export default VenueOwnerProfile
