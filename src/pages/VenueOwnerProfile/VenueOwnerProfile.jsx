import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, CircleAlert, CircleCheck, Info, SquarePen, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import { VENUE_OWNER_NAV } from '../../constants/venueOwnerNav.js'
import { useAuth } from '../../context/useAuth.js'
import { getVenueOwnerVenue } from '../../services/dashboardService.js'
import { FACILITY_MULTIPLE, FACILITY_NONE, getVenueOwnerFacility } from '../../services/facilityService.js'
import {
  OWNER_PHOTO_MAX_BYTES,
  OWNER_PHOTO_TYPES,
  PROFILE_SAVE_NOT_AVAILABLE,
  getOwnerProfile,
  updateOwnerProfile,
  uploadOwnerProfilePhoto,
} from '../../services/ownerProfileService.js'
import { IS_API_ENABLED } from '../../config/api.js'
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
// Personal information and the profile photo (ownerProfileService):
//   API mode: GET /venue_owner/owner/profile (name, email, phone,
//   profile_image) — the page shows a loading state, then the data or an
//   error state with "Try again". "Save changes" sends the edited fields
//   with PUT /venue_owner/owner/profile and a picked photo with
//   POST /venue_owner/owner/profile/photo; the shown values change only
//   after the backend saved them, and a failed request never shows success.
//   Demo mode: the session user, and nothing can be saved (as before).
//
// Venue information: facilityService.getVenueOwnerFacility(), the same
// source and the same field labels / formatting as the My venue page. The
// venue card is read-only: the venue is edited on My venue.
//
// Security: "Change password" opens ChangePasswordModal (not connected: the
// backend has no endpoint to change a signed-in user's password). The
// account's "Active" badge and the email's "Verified" badge follow from the
// sign-in itself (see isActiveAccount). Last sign-in has no data source, so
// it shows "Not available".

// Phone: optional; digits with an optional leading "+", spaces and dashes.
const PHONE_PATTERN = /^\+?[\d\s-]{7,20}$/
// Backend: name / email max:255.
const TEXT_MAX_LENGTH = 255
const PROFILE_FIELDS = ['name', 'email', 'phone']

// Localized value of a bilingual venue field ("name" -> name_ar / name_en),
// as on the My venue page.
function localized(facility, field, language) {
  return facility[`${field}_${language === 'ar' ? 'ar' : 'en'}`]
}

// Venue fields shown in the card: the design's four rows, using the My venue
// page's field keys (labels: venueOwnerFacility.fields.*).
const VENUE_FIELDS = ['name', 'area', 'surface', 'status']

function formFromProfile(profile) {
  return { name: profile?.name ?? '', email: profile?.email ?? '', phone: profile?.phone ?? '' }
}

// Laravel 422 field errors -> the page's error keys (first message only).
function fieldErrorsFrom(apiErrors) {
  const next = {}
  if (!apiErrors || typeof apiErrors !== 'object') return next
  for (const field of PROFILE_FIELDS) {
    const messages = apiErrors[field]
    if (!Array.isArray(messages) || messages.length === 0) continue
    next[field] = field === 'email' && /taken/i.test(String(messages[0])) ? 'emailTaken' : 'serverInvalid'
  }
  return next
}

function VenueOwnerProfile() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const { user, token, logout, updateUser } = useAuth()
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

  // Personal information: 'loading' | 'ready' | 'network' | 'server'.
  const [profileStatus, setProfileStatus] = useState('loading')
  const [profileAttempt, setProfileAttempt] = useState(0)
  // The last saved values (from the backend) and the form being edited.
  const [saved, setSaved] = useState(() => ({ ...formFromProfile(user), profile_image: null }))
  const [form, setForm] = useState(() => formFromProfile(user))
  const [errors, setErrors] = useState({})
  // null | { kind: 'success' | 'error' | 'info', key } — shown after "Save changes".
  const [notice, setNotice] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  // Profile photo: the picked file (uploaded on "Save changes") and its
  // local preview (object URL).
  const photoInputRef = useRef(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  // null | 'invalidType' | 'tooLarge' | 'rejected'
  const [photoError, setPhotoError] = useState(null)
  // The saved photo could not be shown (e.g. the file is gone): initials.
  const [isSavedPhotoBroken, setIsSavedPhotoBroken] = useState(false)
  // "Change password" dialog.
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Requests finishing after the page closed must not update it.
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

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

  // Profile: loading → ready, or → error ('network' | 'server'). 401 signs
  // out (as on the other Venue Owner pages). The session user is read when
  // the request starts only (demo mode), so saving does not load it again.
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  }, [user])
  useEffect(() => {
    let isActive = true
    getOwnerProfile({ token, user: userRef.current })
      .then((profile) => {
        if (!isActive) return
        setSaved(profile)
        setForm(formFromProfile(profile))
        setIsSavedPhotoBroken(false)
        setProfileStatus('ready')
        // The backend is the source of truth: keep the session (top bar name
        // and photo) in step when the account was changed elsewhere. The
        // login response has no photo, so this is also where it first
        // reaches the session.
        const sessionUser = userRef.current
        const fresh = { ...formFromProfile(profile), profile_image: profile.profile_image }
        const isOutdated =
          PROFILE_FIELDS.some((field) => (sessionUser?.[field] ?? '') !== fresh[field]) ||
          (sessionUser?.profile_image ?? null) !== fresh.profile_image
        if (IS_API_ENABLED && isOutdated) updateUser(fresh)
      })
      .catch((error) => {
        if (!isActive) return
        if (error?.status === 401) {
          logout()
          return
        }
        setProfileStatus(isConnectionFailure(error) ? 'network' : 'server')
      })
    return () => {
      isActive = false
    }
  }, [profileAttempt, logout, token, updateUser])

  const retryProfile = () => {
    setProfileStatus('loading')
    setProfileAttempt((count) => count + 1)
  }

  // Venue: loading → loaded, or → unavailable (no data, no venue linked or
  // more than one), or → error. 401 signs out (as on the My venue page).
  useEffect(() => {
    let isActive = true
    getVenueOwnerFacility({ token, user })
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
        if (error?.code === FACILITY_NONE || error?.code === FACILITY_MULTIPLE) {
          setIsFacilityUnavailable(true)
          return
        }
        setFacilityError(isConnectionFailure(error) ? 'network' : 'server')
      })
    return () => {
      isActive = false
    }
  }, [facilityAttempt, logout, token, user])

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

  const isProfileReady = profileStatus === 'ready'
  const areFieldsDirty = PROFILE_FIELDS.some((field) => form[field] !== saved[field])
  const isDirty = areFieldsDirty || Boolean(photoFile)

  const update = (field) => (event) => {
    const { value } = event.target
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: null }))
    setNotice(null)
  }

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = 'required'
    else if (form.name.trim().length > TEXT_MAX_LENGTH) next.name = 'tooLong'
    if (!form.email.trim()) next.email = 'required'
    else if (!isValidEmail(form.email)) next.email = 'invalidEmail'
    else if (form.email.trim().length > TEXT_MAX_LENGTH) next.email = 'tooLong'
    if (form.phone.trim() && !PHONE_PATTERN.test(form.phone.trim())) next.phone = 'invalidPhone'
    return next
  }

  const clearPickedPhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!isProfileReady || isSaving) return
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) {
      setNotice(null)
      return
    }
    // Nothing changed: nothing to save.
    if (!isDirty) return

    setIsSaving(true)
    setNotice(null)
    setPhotoError(null)
    let areFieldsSaved = false
    try {
      if (areFieldsDirty) {
        const savedFields = await updateOwnerProfile(form, { token })
        if (!isMountedRef.current) return
        setSaved((current) => ({ ...current, ...savedFields }))
        setForm(savedFields)
        updateUser(savedFields)
        areFieldsSaved = true
      }
      if (photoFile) {
        const { profile_image } = await uploadOwnerProfilePhoto(photoFile, { token })
        if (!isMountedRef.current) return
        setSaved((current) => ({ ...current, profile_image }))
        // Same photo in the top bar (session user).
        updateUser({ profile_image })
        setIsSavedPhotoBroken(false)
        clearPickedPhoto()
      }
      setNotice({ kind: 'success', key: 'saved' })
    } catch (error) {
      if (!isMountedRef.current) return
      if (error?.status === 401) {
        logout()
        return
      }
      if (error?.code === PROFILE_SAVE_NOT_AVAILABLE) {
        setNotice({ kind: 'info', key: 'saveUnavailable' })
        return
      }
      if (error?.status === 422) {
        setErrors(fieldErrorsFrom(error.errors))
        if (error.errors?.photo) setPhotoError('rejected')
      }
      // The fields were saved but the photo was not: say exactly that.
      const key = areFieldsSaved
        ? 'savedWithoutPhoto'
        : isConnectionFailure(error)
          ? 'network'
          : error?.status === 422
            ? 'invalid'
            : 'server'
      setNotice({ kind: 'error', key })
    } finally {
      if (isMountedRef.current) setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setForm(formFromProfile(saved))
    setErrors({})
    setNotice(null)
    setPhotoError(null)
    clearPickedPhoto()
  }

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!OWNER_PHOTO_TYPES.includes(file.type)) {
      setPhotoError('invalidType')
      event.target.value = ''
      return
    }
    if (file.size > OWNER_PHOTO_MAX_BYTES) {
      setPhotoError('tooLarge')
      event.target.value = ''
      return
    }
    setPhotoError(null)
    setNotice(null)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const fullName = saved.name
  const initial = fullName.trim().charAt(0).toUpperCase()
  const avatarImage = photoPreview ?? (!isSavedPhotoBroken ? saved.profile_image : null)
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
        {isProfileReady ? (
          <input
            id={id}
            name={field}
            type={type}
            dir={ltr ? 'ltr' : undefined}
            className={`vop-input ${ltr ? 'vop-input-ltr' : ''} ${errors[field] ? 'vop-input-invalid' : ''}`}
            value={form[field]}
            onChange={update(field)}
            disabled={isSaving}
            autoComplete={autoComplete}
            inputMode={field === 'phone' ? 'tel' : undefined}
            aria-invalid={errors[field] ? 'true' : undefined}
            aria-describedby={errors[field] ? errorId : undefined}
          />
        ) : (
          <span className="vop-skeleton pv-shimmer" aria-hidden="true" />
        )}
        {errors[field] && (
          <p id={errorId} className="vop-error" role="alert">
            {t(`venueOwnerProfile.errors.${errors[field]}`)}
          </p>
        )}
      </div>
    )
  }

  const NoticeIcon = notice?.kind === 'success' ? CircleCheck : notice?.kind === 'error' ? CircleAlert : Info

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

      <form onSubmit={handleSubmit} noValidate aria-busy={isSaving}>
        {/* Account header: avatar (photo picker with preview), name, account
            status, role and email. */}
        <section className="vop-card vop-account" aria-labelledby="vop-account-name">
          <div className="vop-avatar-wrap">
            <button
              type="button"
              className="vop-avatar-button"
              onClick={() => photoInputRef.current?.click()}
              disabled={!isProfileReady || isSaving}
              aria-label={t('venueOwnerProfile.photo.change')}
            >
              {avatarImage ? (
                <img
                  className="vop-avatar vop-avatar-image"
                  src={avatarImage}
                  alt=""
                  onError={photoPreview ? undefined : () => setIsSavedPhotoBroken(true)}
                />
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
              accept={OWNER_PHOTO_TYPES.join(',')}
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
            {photoPreview && (
              <p className="vop-account-note">
                {t(IS_API_ENABLED ? 'venueOwnerProfile.photo.pendingUpload' : 'venueOwnerProfile.photo.previewOnly')}
              </p>
            )}
            {photoError && (
              <p className="vop-error" role="alert">
                {t(`venueOwnerProfile.photo.${photoError}`)}
              </p>
            )}
          </div>
        </section>

        <div className="vop-grid">
          {/* Start side: personal information, then security. */}
          <div className="vop-column">
            <section
              className="vop-card vop-panel"
              aria-labelledby="vop-personal-title"
              aria-busy={profileStatus === 'loading'}
            >
              <header className="vop-panel-header">
                <h2 id="vop-personal-title" className="vop-panel-title">
                  {t('venueOwnerProfile.personal.title')}
                </h2>
              </header>
              {profileStatus === 'network' || profileStatus === 'server' ? (
                /* Error: same layout as the venue card's error state. */
                <div className="vop-venue-state" role="alert">
                  {profileStatus === 'network' ? (
                    <WifiOff size={28} aria-hidden="true" />
                  ) : (
                    <CircleAlert size={28} aria-hidden="true" />
                  )}
                  <p className="vop-venue-state-title">{t('venueOwnerProfile.loadError.title')}</p>
                  <p className="vop-venue-state-text">
                    {t(
                      profileStatus === 'network'
                        ? 'venueOwnerFacility.errorState.networkMessage'
                        : 'venueOwnerFacility.errorState.serverMessage',
                    )}
                  </p>
                  <button type="button" className="vop-panel-link" onClick={retryProfile}>
                    {t('venueOwnerFacility.errorState.retry')}
                  </button>
                </div>
              ) : (
                <div className="vop-rows">
                  {textField('name', { labelKey: 'fullName', autoComplete: 'name' })}
                  {textField('email', { type: 'email', ltr: true, autoComplete: 'email' })}
                  {textField('phone', { type: 'tel', ltr: true, autoComplete: 'tel' })}
                </div>
              )}
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
          <button type="submit" className="vop-button vop-button-save" disabled={!isProfileReady || isSaving}>
            {t(isSaving ? 'venueOwnerProfile.saving' : 'venueOwnerProfile.save')}
          </button>
          {notice && (
            <p
              className={`vop-notice ${notice.kind === 'success' ? 'vop-notice-success' : ''} ${notice.kind === 'error' ? 'vop-notice-error' : ''}`}
              role={notice.kind === 'error' ? 'alert' : 'status'}
            >
              <NoticeIcon size={14} aria-hidden="true" />
              {t(notice.key === 'saveUnavailable' ? 'venueOwnerProfile.saveUnavailable' : `venueOwnerProfile.notices.${notice.key}`)}
            </p>
          )}
          <button type="button" className="vop-button vop-button-cancel" onClick={handleCancel} disabled={isSaving}>
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
