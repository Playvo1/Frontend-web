import { useEffect, useRef, useState } from 'react'
import { Camera, CircleAlert, Eye, EyeOff, Pencil, ShieldCheck, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import { ADMIN_NAV } from '../../constants/adminNav.js'
import { useAuth } from '../../context/useAuth.js'
import {
  PROFILE_PHOTO_MAX_BYTES,
  PROFILE_PHOTO_NOT_AVAILABLE,
  PROFILE_PHOTO_TYPES,
  PROFILE_UPDATE_NOT_AVAILABLE,
  IS_PROFILE_REQUESTED,
  fetchAdminProfile,
  getAdminProfile,
  updateAdminProfile,
  uploadAdminProfilePhoto,
} from '../../services/adminProfileService.js'
import { CHANGE_PASSWORD_NOT_AVAILABLE, changePassword } from '../../services/authService.js'
import { isConnectionFailure } from '../../utils/requestErrors.js'
import { PASSWORD_MIN_LENGTH, isValidEmail } from '../../utils/validation.js'
import '../../styles/skeleton.css'
import './AdminProfile.css'

// Admin "Profile" page (route: /admin/profile), opened from the avatar in
// the Admin top bar. Built from the design: page title, the account header
// card (avatar with the photo button, name, role, email, status), "Personal
// information" next to "Security & password", and "Account information".
//
// Data (adminProfileService): the signed-in admin from the session — name,
// email and role; phone and photo are not provided by the backend, so the
// phone starts empty and the avatar shows the initials. Nothing is invented.
//
// Loading / connection error (designs): shown only while / when a real
// profile request runs / fails (adminProfileService.IS_PROFILE_REQUESTED).
// The backend has no profile endpoint yet, so today the session data is
// shown at once and these states cannot appear — no artificial delay.
// No connection → Wi-Fi state; a server or unexpected response → server
// state; 401 signs out. "Try again" sends the request again, and so does
// the browser coming back online.
//
// Actions: each form validates its fields first (messages under the
// fields, nothing sent while invalid). The backend has no endpoint to update
// the profile, change the password of a signed-in user or upload a profile
// photo, so the services reject and the page says plainly that nothing was
// saved — never a success message. The typed values stay in the form.

const PHONE_PATTERN = /^\+?[\d\s-]{7,20}$/

const PASSWORD_FIELDS = [
  { key: 'currentPassword', autoComplete: 'current-password' },
  { key: 'password', autoComplete: 'new-password' },
  { key: 'confirmPassword', autoComplete: 'new-password' },
]

// Avatar text (design: the first two letters of the first name).
function initialsOf(name) {
  const first = name.trim().split(/\s+/)[0] ?? ''
  return Array.from(first).slice(0, 2).join('').toUpperCase()
}

function validateProfile(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'required'
  if (!values.email.trim()) errors.email = 'required'
  else if (!isValidEmail(values.email)) errors.email = 'invalidEmail'
  if (values.phone.trim() && !PHONE_PATTERN.test(values.phone.trim())) errors.phone = 'invalidPhone'
  return errors
}

function validatePassword(values) {
  const errors = {}
  if (!values.currentPassword) errors.currentPassword = 'currentRequired'
  if (!values.password) errors.password = 'passwordRequired'
  else if (values.password.length < PASSWORD_MIN_LENGTH) errors.password = 'passwordTooShort'
  else if (values.currentPassword && values.password === values.currentPassword) errors.password = 'sameAsCurrent'
  if (!values.confirmPassword) errors.confirmPassword = 'confirmRequired'
  else if (values.password && values.confirmPassword !== values.password) errors.confirmPassword = 'mismatch'
  return errors
}

// Request failure -> notice key ('notAvailable' for a missing endpoint).
function failureNotice(error, notAvailableCode) {
  if (error?.code === notAvailableCode) return 'notAvailable'
  return isConnectionFailure(error) ? 'network' : 'generic'
}

// Account card, the two forms and "Account information" for a loaded
// profile.
function AdminProfileContent({ profile }) {
  const { t } = useTranslation()
  const { token, logout } = useAuth()

  // ---- Personal information ----
  const [form, setForm] = useState(() => ({ name: profile.name, email: profile.email, phone: profile.phone }))
  const [formErrors, setFormErrors] = useState({})
  // null | 'noChanges' | 'notAvailable' | 'network' | 'generic'
  const [formNotice, setFormNotice] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  // ---- Password ----
  const [passwords, setPasswords] = useState({ currentPassword: '', password: '', confirmPassword: '' })
  const [passwordErrors, setPasswordErrors] = useState({})
  const [visible, setVisible] = useState({})
  // null | 'notAvailable' | 'network' | 'generic' | 'success'
  const [passwordNotice, setPasswordNotice] = useState(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // ---- Photo ----
  const photoInputRef = useRef(null)
  // null | 'invalidType' | 'tooLarge' | 'notAvailable' | 'network' | 'generic'
  const [photoNotice, setPhotoNotice] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  const onRequestError = (error) => {
    if (error?.status === 401) {
      logout()
      return true
    }
    return false
  }

  const updateForm = (field) => (event) => {
    const { value } = event.target
    setForm((current) => ({ ...current, [field]: value }))
    setFormErrors((current) => ({ ...current, [field]: undefined }))
    setFormNotice(null)
  }

  const submitProfile = async (event) => {
    event.preventDefault()
    const errors = validateProfile(form)
    setFormErrors(errors)
    setFormNotice(null)
    if (Object.keys(errors).length > 0) return
    const isDirty = form.name !== profile.name || form.email !== profile.email || form.phone !== profile.phone
    if (!isDirty) {
      setFormNotice('noChanges')
      return
    }
    setIsSaving(true)
    try {
      await updateAdminProfile(
        { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
        { token },
      )
    } catch (error) {
      // The form keeps the typed values; the shown profile is unchanged.
      if (!onRequestError(error)) setFormNotice(failureNotice(error, PROFILE_UPDATE_NOT_AVAILABLE))
    } finally {
      setIsSaving(false)
    }
  }

  const updatePassword = (field) => (event) => {
    const { value } = event.target
    setPasswords((current) => ({ ...current, [field]: value }))
    setPasswordErrors((current) => ({ ...current, [field]: undefined }))
    setPasswordNotice(null)
  }

  const submitPassword = async (event) => {
    event.preventDefault()
    const errors = validatePassword(passwords)
    setPasswordErrors(errors)
    setPasswordNotice(null)
    if (Object.keys(errors).length > 0) return
    setIsChangingPassword(true)
    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        password: passwords.password,
        passwordConfirmation: passwords.confirmPassword,
      })
      setPasswords({ currentPassword: '', password: '', confirmPassword: '' })
      setPasswordNotice('success')
    } catch (error) {
      if (!onRequestError(error)) setPasswordNotice(failureNotice(error, CHANGE_PASSWORD_NOT_AVAILABLE))
    } finally {
      setIsChangingPassword(false)
    }
  }

  const choosePhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!PROFILE_PHOTO_TYPES.includes(file.type)) {
      setPhotoNotice('invalidType')
      return
    }
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      setPhotoNotice('tooLarge')
      return
    }
    setPhotoNotice(null)
    setIsUploading(true)
    try {
      await uploadAdminProfilePhoto(file, { token })
    } catch (error) {
      if (!onRequestError(error)) setPhotoNotice(failureNotice(error, PROFILE_PHOTO_NOT_AVAILABLE))
    } finally {
      setIsUploading(false)
    }
  }

  const roleLabel = t('dashboardLayout.roles.admin')
  const statusLabel = t('adminProfile.status.active')
  const initials = initialsOf(profile.name)

  const field = (key, { type = 'text', ltr = false, autoComplete, inputMode } = {}) => {
    const id = `adp-${key}`
    const error = formErrors[key]
    return (
      <div className="adp-field">
        <label className="adp-label" htmlFor={id}>
          {t(`adminProfile.personal.${key}`)}
        </label>
        <input
          id={id}
          name={key}
          type={type}
          dir={ltr ? 'ltr' : undefined}
          className={`adp-input ${ltr ? 'adp-input-ltr' : ''} ${error ? 'adp-input-invalid' : ''}`}
          value={form[key]}
          onChange={updateForm(key)}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && (
          <p id={`${id}-error`} className="adp-error">
            {t(`adminProfile.errors.${error}`)}
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Account header */}
      <section className="adp-card adp-account" aria-label={t('adminProfile.accountLabel')}>
        <div className="adp-avatar-wrap">
          <span className="adp-avatar" aria-hidden="true">
            {initials}
          </span>
          <button
            type="button"
            className="adp-photo-button"
            onClick={() => photoInputRef.current?.click()}
            disabled={isUploading}
            aria-label={t('adminProfile.photo.change')}
            aria-describedby={photoNotice ? 'adp-photo-notice' : undefined}
          >
            <Camera size={14} aria-hidden="true" />
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept={PROFILE_PHOTO_TYPES.join(',')}
            className="adp-file-input"
            onChange={choosePhoto}
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
        <div className="adp-account-text">
          <p className="adp-account-top">
            <span className="adp-account-name">{profile.name || t('adminProfile.notAvailable')}</span>
            <span className="adp-badge adp-badge-role">{roleLabel}</span>
          </p>
          <p className="adp-account-email">
            <bdi>{profile.email || t('adminProfile.notAvailable')}</bdi>
          </p>
          <span className="adp-badge adp-badge-success">
            <span className="adp-badge-dot" aria-hidden="true" />
            {statusLabel}
          </span>
          {photoNotice && (
            <p id="adp-photo-notice" className="adp-notice adp-notice-error" role="alert">
              {t(`adminProfile.photo.notices.${photoNotice}`)}
            </p>
          )}
        </div>
      </section>

      <div className="adp-grid">
        {/* Personal information */}
        <section className="adp-card adp-panel" aria-labelledby="adp-personal-title">
          <header className="adp-panel-header">
            <div>
              <h2 id="adp-personal-title" className="adp-panel-title">
                {t('adminProfile.personal.title')}
              </h2>
              <p className="adp-panel-subtitle">{t('adminProfile.personal.subtitle')}</p>
            </div>
          </header>
          <form className="adp-form" onSubmit={submitProfile} noValidate>
            {field('name', { autoComplete: 'name' })}
            {field('email', { type: 'email', ltr: true, autoComplete: 'email' })}
            {field('phone', { type: 'tel', ltr: true, autoComplete: 'tel', inputMode: 'tel' })}
            {formNotice && (
              <p
                className={`adp-notice ${formNotice === 'noChanges' ? 'adp-notice-info' : 'adp-notice-error'}`}
                role={formNotice === 'noChanges' ? 'status' : 'alert'}
              >
                {t(`adminProfile.personal.notices.${formNotice}`)}
              </p>
            )}
            <button type="submit" className="adp-submit" disabled={isSaving} aria-busy={isSaving}>
              {isSaving ? t('adminProfile.saving') : t('adminProfile.personal.submit')}
            </button>
          </form>
        </section>

        {/* Security & password */}
        <section className="adp-card adp-panel" aria-labelledby="adp-security-title">
          <header className="adp-panel-header">
            <span className="adp-panel-icon" aria-hidden="true">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h2 id="adp-security-title" className="adp-panel-title">
                {t('adminProfile.security.title')}
              </h2>
              <p className="adp-panel-subtitle">{t('adminProfile.security.subtitle')}</p>
            </div>
          </header>
          <form className="adp-form" onSubmit={submitPassword} noValidate>
            {PASSWORD_FIELDS.map(({ key, autoComplete }) => {
              const id = `adp-${key}`
              const error = passwordErrors[key]
              const isShown = Boolean(visible[key])
              return (
                <div key={key} className="adp-field">
                  <label className="adp-label" htmlFor={id}>
                    {t(`adminProfile.security.${key}`)}
                  </label>
                  <div className={`adp-password ${error ? 'adp-input-invalid' : ''}`}>
                    <input
                      id={id}
                      name={key}
                      type={isShown ? 'text' : 'password'}
                      dir="ltr"
                      className="adp-password-input"
                      value={passwords[key]}
                      onChange={updatePassword(key)}
                      autoComplete={autoComplete}
                      aria-invalid={error ? 'true' : undefined}
                      aria-describedby={error ? `${id}-error` : undefined}
                    />
                    <button
                      type="button"
                      className="adp-eye"
                      onClick={() => setVisible((current) => ({ ...current, [key]: !current[key] }))}
                      aria-label={t(isShown ? 'adminProfile.security.hidePassword' : 'adminProfile.security.showPassword')}
                      aria-pressed={isShown}
                      aria-controls={id}
                    >
                      {isShown ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    </button>
                  </div>
                  {error && (
                    <p id={`${id}-error`} className="adp-error">
                      {t(`adminProfile.errors.${error}`, { count: PASSWORD_MIN_LENGTH })}
                    </p>
                  )}
                </div>
              )
            })}
            {passwordNotice && (
              <p
                className={`adp-notice ${passwordNotice === 'success' ? 'adp-notice-success' : 'adp-notice-error'}`}
                role={passwordNotice === 'success' ? 'status' : 'alert'}
              >
                {t(`adminProfile.security.notices.${passwordNotice}`)}
              </p>
            )}
            <button
              type="submit"
              className="adp-submit"
              disabled={isChangingPassword}
              aria-busy={isChangingPassword}
            >
              {isChangingPassword ? t('adminProfile.saving') : t('adminProfile.security.submit')}
            </button>
          </form>
        </section>
      </div>

      {/* Account information */}
      <section className="adp-card adp-panel adp-info" aria-labelledby="adp-info-title">
        <h2 id="adp-info-title" className="adp-panel-title">
          {t('adminProfile.info.title')}
        </h2>
        <dl className="adp-info-grid">
          <div className="adp-info-item">
            <dt>{t('adminProfile.info.permissions')}</dt>
            <dd>{t('adminProfile.info.permissionsValue')}</dd>
          </div>
          <div className="adp-info-item">
            <dt>{t('adminProfile.info.status')}</dt>
            <dd className="adp-info-status">
              <span className="adp-badge-dot" aria-hidden="true" />
              {statusLabel}
            </dd>
          </div>
          <div className="adp-info-item">
            <dt>{t('adminProfile.info.type')}</dt>
            <dd>{roleLabel}</dd>
          </div>
        </dl>
      </section>
    </>
  )
}

// Loading (design): the header card with a gray avatar and two bars, then
// two cards on the start side and one tall card on the end side, each with
// a title bar. Visual only (hidden from screen readers, not interactive).
function ProfileSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="adp-loading" role="status" aria-busy="true">
      <span className="adp-visually-hidden">{t('adminProfile.loading')}</span>
      <div className="adp-skeleton-layout" aria-hidden="true">
        <div className="adp-card adp-account adp-skeleton-card">
          <span className="adp-avatar-wrap">
            <span className="adp-avatar adp-skeleton-avatar" />
            <span className="adp-skeleton-badge">
              <Pencil size={10} />
            </span>
          </span>
          <span className="adp-skeleton-lines">
            <span className="adp-skeleton pv-shimmer adp-skeleton-name" />
            <span className="adp-skeleton pv-shimmer adp-skeleton-email" />
          </span>
        </div>
        <div className="adp-skeleton-grid">
          <div className="adp-skeleton-column">
            <div className="adp-card adp-skeleton-card adp-skeleton-panel">
              <span className="adp-skeleton pv-shimmer adp-skeleton-title" />
            </div>
            <div className="adp-card adp-skeleton-card adp-skeleton-panel">
              <span className="adp-skeleton pv-shimmer adp-skeleton-title" />
            </div>
          </div>
          <div className="adp-card adp-skeleton-card adp-skeleton-panel adp-skeleton-tall">
            <span className="adp-skeleton pv-shimmer adp-skeleton-title" />
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminProfile() {
  const { t } = useTranslation()
  const { user, token, logout } = useAuth()
  // 'loading' | 'ready' | 'network' | 'server'. Without a profile request
  // the session data is ready at once.
  const [status, setStatus] = useState(IS_PROFILE_REQUESTED ? 'loading' : 'ready')
  const [profile, setProfile] = useState(() => (IS_PROFILE_REQUESTED ? null : getAdminProfile(user)))
  const [attempt, setAttempt] = useState(0)
  const retryRef = useRef(null)

  useEffect(() => {
    if (!IS_PROFILE_REQUESTED) return undefined
    let isActive = true
    fetchAdminProfile({ token, user })
      .then((data) => {
        if (!isActive) return
        setProfile(data)
        setStatus('ready')
      })
      .catch((error) => {
        if (!isActive) return
        if (error?.status === 401) {
          logout()
          return
        }
        setStatus(isConnectionFailure(error) ? 'network' : 'server')
      })
    return () => {
      isActive = false
    }
  }, [attempt, token, user, logout])

  const retry = () => {
    setStatus('loading')
    setProfile(null)
    setAttempt((count) => count + 1)
  }

  // Connection back while the connection error is shown: try again.
  useEffect(() => {
    if (status !== 'network') return undefined
    const onOnline = () => retry()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [status])

  // A retry that fails again puts the focus back on "Try again".
  useEffect(() => {
    if ((status === 'network' || status === 'server') && attempt > 0) retryRef.current?.focus()
  }, [status, attempt])

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      venue={null}
      roleLabelKey="dashboardLayout.roles.admin"
      subtitle={t('dashboardLayout.roles.admin')}
      brandMark
    >
      <header className="adp-header">
        <h1 className="adp-title">{t('adminProfile.title')}</h1>
        <p className="adp-subtitle">{t('adminProfile.subtitle')}</p>
      </header>

      {status === 'loading' && <ProfileSkeleton />}

      {(status === 'network' || status === 'server') && (
        <div className="adp-error-state" role="alert">
          {status === 'network' ? (
            <WifiOff className="adp-error-icon" size={72} strokeWidth={2} aria-hidden="true" />
          ) : (
            <CircleAlert className="adp-error-icon adp-error-icon-server" size={60} strokeWidth={2} aria-hidden="true" />
          )}
          <p className="adp-error-title">{t('adminProfile.errorState.title')}</p>
          <p className="adp-error-text">
            {t(status === 'network' ? 'adminProfile.errorState.networkMessage' : 'adminProfile.errorState.serverMessage')}
          </p>
          <button ref={retryRef} type="button" className="adp-error-retry" onClick={retry}>
            {t('adminProfile.errorState.retry')}
          </button>
        </div>
      )}

      {status === 'ready' && profile && <AdminProfileContent profile={profile} />}
    </DashboardLayout>
  )
}

export default AdminProfile
