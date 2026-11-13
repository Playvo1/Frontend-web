import { useEffect, useRef, useState } from 'react'
import { CircleAlert, Info, Upload, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import { IS_API_ENABLED } from '../../config/api.js'
import { ADMIN_NAV } from '../../constants/adminNav.js'
import { useAuth } from '../../context/useAuth.js'
import {
  createAdminVenue,
  getVenueCities,
  getVenueSports,
  MAX_VENUE_PHOTO_BYTES,
  MAX_VENUE_PHOTOS,
} from '../../services/adminVenuesService.js'
import './AdminAddVenue.css'

// Admin "Add venue" page (route: /admin/venues/new), opened from "Add venue"
// on the venues page. Built from the design (three numbered cards: venue
// basics, facility details, venue owner account; then the save bar), with the
// decisions taken with the product owner:
//   - one venue name, sent as both name_ar and name_en;
//   - one address and one (optional) description, each sent only in the
//     interface language (address_ar / address_en, description_ar /
//     description_en);
//   - every new venue creates a NEW venue owner account: name, email and
//     phone (required) and an optional temporary password — left empty, it
//     is not sent and the backend generates one;
//   - up to MAX_VENUE_PHOTOS photos (JPG or PNG, at most 5 MB each), sent
//     with the venue; the first one becomes the cover (backend rule);
//   - the sport comes from GET /sports (demo mode: mock sports) and is sent
//     as sport_id; the only sport is preselected. If the list cannot be
//     loaded the field says so and no sport_id is sent (the backend then
//     links the venue to Football).
//
// Saving: ONE request, POST /admin/venues (adminVenuesService.createAdminVenue);
// the backend creates the owner account, the venue and its photos together,
// or nothing at all when it refuses the request.
//
// Cities come from GET /cities (demo mode: mock cities). While they cannot be
// loaded the city cannot be chosen and the form cannot be saved.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Photo files the backend accepts here (the approved hint says JPG or PNG).
const PHOTO_TYPES = ['image/jpeg', 'image/png']

const EMPTY_FORM = {
  sportId: '',
  name: '',
  cityId: '',
  address: '',
  description: '',
  width: '',
  length: '',
  ownerName: '',
  email: '',
  phone: '',
  password: '',
  reviewed: false,
}

// Backend field errors (422) -> form fields.
const SERVER_FIELDS = {
  owner_name: 'ownerName',
  owner_email: 'email',
  owner_phone: 'phone',
  owner_password: 'password',
  name_ar: 'name',
  name_en: 'name',
  city_id: 'cityId',
  sport_id: 'sportId',
  sport_ids: 'sportId',
  address_ar: 'address',
  address_en: 'address',
  description_ar: 'description',
  description_en: 'description',
  length_m: 'length',
  width_m: 'width',
  images: 'photos',
}

const serverField = (key) => SERVER_FIELDS[key] ?? (key.startsWith('images.') ? 'photos' : null)

function validate(form, sportsState) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'required'
  else if (form.name.trim().length > 255) errors.name = 'tooLong'
  if (!form.cityId) errors.cityId = 'required'
  if (Array.isArray(sportsState) && !form.sportId) errors.sportId = 'required'
  if (!form.address.trim()) errors.address = 'required'
  else if (form.address.trim().length > 255) errors.address = 'tooLong'
  if (form.description.trim().length > 2000) errors.description = 'descriptionTooLong'
  for (const field of ['width', 'length']) {
    const value = form[field].trim()
    if (!value) errors[field] = 'required'
    else if (!(Number(value) > 0)) errors[field] = 'positive'
    else if (Number(value) > 1000) errors[field] = 'tooLarge'
  }
  if (!form.ownerName.trim()) errors.ownerName = 'required'
  else if (form.ownerName.trim().length > 255) errors.ownerName = 'tooLong'
  if (!form.email.trim()) errors.email = 'required'
  else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'email'
  else if (form.email.trim().length > 255) errors.email = 'tooLong'
  if (!form.phone.trim()) errors.phone = 'required'
  else if (form.phone.trim().length > 20) errors.phone = 'phoneTooLong'
  if (form.password && form.password.length < 8) errors.password = 'passwordShort'
  else if (form.password.length > 255) errors.password = 'tooLong'
  if (!form.reviewed) errors.reviewed = 'reviewed'
  return errors
}

function AdminAddVenue() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { token, logout } = useAuth()
  const language = i18n.language === 'ar' ? 'ar' : 'en'
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  // null (loading) | [{ id, name_ar, … }] | 'unavailable' (API mode) | 'error'
  const [cities, setCities] = useState(null)
  // null (loading) | [{ id, name_ar, name_en }] | 'error'
  const [sports, setSports] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  // Set at once on submit (state updates are not immediate), so a double
  // click can never send the requests twice.
  const savingRef = useRef(false)
  // null | 'network' | 'server' | 'forbidden' | 'fields' | 'photosFailed'
  const [saveError, setSaveError] = useState(null)
  // Picked photos: [{ key, file, url }] (url: a local preview, revoked on removal).
  const [photos, setPhotos] = useState([])
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  const photoInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    let isActive = true
    getVenueCities(token)
      .then((list) => isActive && setCities(list))
      .catch((error) => {
        if (!isActive) return
        if (error?.status === 401) {
          logout()
          return
        }
        setCities('error')
      })
    return () => {
      isActive = false
    }
  }, [token, logout])

  useEffect(() => {
    let isActive = true
    getVenueSports(token)
      .then((list) => {
        if (!isActive) return
        setSports(list)
        // A single sport (Football today) is chosen for the admin.
        if (list.length === 1) setForm((current) => (current.sportId ? current : { ...current, sportId: String(list[0].id) }))
      })
      .catch((error) => {
        if (!isActive) return
        if (error?.status === 401) {
          logout()
          return
        }
        setSports('error')
      })
    return () => {
      isActive = false
    }
  }, [token, logout])

  // Release the photo previews when leaving the page.
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)), [])

  const cityList = Array.isArray(cities) ? cities : []
  const selectedCity = cityList.find((city) => String(city.id) === form.cityId) ?? null
  const canSave = Array.isArray(cities)

  const update = (field) => (event) => {
    const value = field === 'reviewed' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  // Adds picked / dropped files, up to MAX_VENUE_PHOTOS; files of another
  // type or over 5 MB are left out and the field says why.
  const addPhotos = (fileList) => {
    const files = Array.from(fileList ?? [])
    if (files.length === 0) return
    let problem = null
    const accepted = []
    for (const file of files) {
      if (!PHOTO_TYPES.includes(file.type)) problem ??= 'photoType'
      else if (file.size > MAX_VENUE_PHOTO_BYTES) problem ??= 'photoSize'
      else if (photos.length + accepted.length >= MAX_VENUE_PHOTOS) problem ??= 'photosLimit'
      else accepted.push(file)
    }
    if (accepted.length > 0) {
      const stamp = Date.now()
      setPhotos((current) => [
        ...current,
        ...accepted.map((file, index) => ({ key: `${stamp}-${index}-${file.name}`, file, url: URL.createObjectURL(file) })),
      ])
    }
    setErrors((current) => ({ ...current, photos: problem ?? undefined }))
  }

  const removePhoto = (key) => {
    const photo = photos.find((item) => item.key === key)
    if (photo) URL.revokeObjectURL(photo.url)
    setPhotos((current) => current.filter((item) => item.key !== key))
    setErrors((current) => ({ ...current, photos: undefined }))
  }

  // Back to the venues page: the previous entry when we came from it.
  const goBack = (state) => {
    if (!state && location.state?.from === 'venues') navigate(-1)
    else navigate('/admin/venues', { state })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (savingRef.current || !canSave) return
    const found = validate(form, sports)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setSaveError(null)
      return
    }

    savingRef.current = true
    setIsSaving(true)
    setSaveError(null)
    try {
      await createAdminVenue(
        {
          owner: {
            name: form.ownerName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            password: form.password,
          },
          name: form.name.trim(),
          city: selectedCity,
          sportId: Array.isArray(sports) ? form.sportId : '',
          address: form.address.trim(),
          description: form.description.trim(),
          language,
          length_m: Number(form.length),
          width_m: Number(form.width),
          photos: photos.map((photo) => photo.file),
        },
        token,
      )
      goBack({ created: form.name.trim() })
    } catch (error) {
      savingRef.current = false
      setIsSaving(false)
      if (error?.status === 401) {
        logout()
        return
      }
      if (error?.status === 422 && error.errors && typeof error.errors === 'object') {
        const fields = {}
        for (const [key, messages] of Object.entries(error.errors)) {
          const field = serverField(key)
          if (!field) continue
          const text = Array.isArray(messages) ? messages.join(' ') : String(messages ?? '')
          if (field === 'email' && /already/i.test(text)) fields.email = 'emailTaken'
          else if (field === 'photos') fields.photos = /at most/i.test(text) ? 'photosLimit' : 'photoServer'
          else fields[field] = 'server'
        }
        if (Object.keys(fields).length > 0) {
          setErrors(fields)
          setSaveError('fields')
          return
        }
      }
      if (error?.status === 403) setSaveError('forbidden')
      else if (error?.status === 0) setSaveError('network')
      else if (photos.length > 0 && /upload/i.test(error?.message ?? '')) setSaveError('photosFailed')
      else setSaveError('server')
    }
  }

  const errorText = (field) =>
    errors[field] ? (
      <p className="aav-error" role="alert">
        {t(`adminAddVenue.errors.${errors[field]}`)}
      </p>
    ) : null

  const label = (field, htmlFor, { required = true, optional = false, optionalText } = {}) => (
    <label className="aav-label" htmlFor={htmlFor}>
      {t(`adminAddVenue.fields.${field}`)}
      {required && (
        <span className="aav-required" aria-hidden="true">
          {' '}
          *
        </span>
      )}
      {optional && <span className="aav-optional"> {optionalText ?? t('adminAddVenue.optional')}</span>}
    </label>
  )

  const textField = (
    field,
    { type = 'text', inputMode, placeholderKey, dir, span = false, optional = false, autoComplete, hintKey } = {},
  ) => (
    <div className={span ? 'aav-field aav-span' : 'aav-field'}>
      {label(field, `aav-${field}`, optional ? { required: false, optional: true } : undefined)}
      <input
        id={`aav-${field}`}
        className={errors[field] ? 'aav-input aav-input-invalid' : 'aav-input'}
        type={type}
        inputMode={inputMode}
        dir={dir}
        value={form[field]}
        onChange={update(field)}
        placeholder={t(`adminAddVenue.placeholders.${placeholderKey ?? field}`)}
        autoComplete={autoComplete}
        disabled={isSaving}
        aria-invalid={errors[field] ? true : undefined}
      />
      {hintKey && (
        <p className="aav-hint">
          <Info size={13} aria-hidden="true" />
          {t(hintKey)}
        </p>
      )}
      {errorText(field)}
    </div>
  )

  const sectionHeader = (number, key) => (
    <header className="aav-section-header">
      <span className="aav-step" aria-hidden="true">
        {number}
      </span>
      <div>
        <h2 className="aav-section-title">{t(`adminAddVenue.sections.${key}.title`)}</h2>
        <p className="aav-section-subtitle">{t(`adminAddVenue.sections.${key}.subtitle`)}</p>
      </div>
    </header>
  )

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      venue={null}
      roleLabelKey="dashboardLayout.roles.admin"
      subtitle={t('dashboardLayout.roles.admin')}
      brandMark
    >
      <header className="aav-header">
        <h1 className="aav-title">{t('adminAddVenue.title')}</h1>
        <p className="aav-subtitle">{t('adminAddVenue.subtitle')}</p>
      </header>

      <form className="aav-form" onSubmit={handleSubmit} noValidate>
        {/* 1 — Venue basics */}
        <section className="aav-card">
          {sectionHeader(1, 'basics')}
          <div className="aav-grid">
            <div className="aav-field">
              {label('sport', 'aav-sport')}
              <select
                id="aav-sport"
                className={errors.sportId ? 'aav-input aav-input-invalid' : 'aav-input'}
                value={form.sportId}
                onChange={update('sportId')}
                disabled={!Array.isArray(sports) || isSaving}
                aria-invalid={errors.sportId ? true : undefined}
              >
                <option value="">
                  {t(sports === null ? 'adminAddVenue.citiesLoading' : 'adminAddVenue.placeholders.sport')}
                </option>
                {(Array.isArray(sports) ? sports : []).map((sport) => (
                  <option key={sport.id} value={String(sport.id)}>
                    {sport[`name_${language}`] || sport[`name_${language === 'ar' ? 'en' : 'ar'}`]}
                  </option>
                ))}
              </select>
              {sports === 'error' && (
                <p className="aav-hint" role="note">
                  <Info size={13} aria-hidden="true" />
                  {t('adminAddVenue.sportsError')}
                </p>
              )}
              {errorText('sportId')}
            </div>
            {textField('name')}

            <div className="aav-field">
              {label('city', 'aav-city')}
              <select
                id="aav-city"
                className={errors.cityId ? 'aav-input aav-input-invalid' : 'aav-input'}
                value={form.cityId}
                onChange={update('cityId')}
                disabled={!Array.isArray(cities) || isSaving}
                aria-invalid={errors.cityId ? true : undefined}
              >
                <option value="">
                  {t(cities === null ? 'adminAddVenue.citiesLoading' : 'adminAddVenue.placeholders.city')}
                </option>
                {cityList.map((city) => (
                  <option key={city.id} value={String(city.id)}>
                    {city[`name_${language}`]}
                  </option>
                ))}
              </select>
              {cities === 'error' && (
                <p className="aav-hint" role="note">
                  <Info size={13} aria-hidden="true" />
                  {t('adminAddVenue.citiesError')}
                </p>
              )}
              {errorText('cityId')}
            </div>

            <div className="aav-field">
              {label('country', 'aav-country')}
              <input
                id="aav-country"
                className="aav-input"
                value={selectedCity ? selectedCity[`country_${language}`] : ''}
                placeholder={t('adminAddVenue.placeholders.country')}
                disabled
                readOnly
              />
            </div>

            {textField('address', { span: true })}

            <div className="aav-field aav-span">
              {label('description', 'aav-description', { required: false, optional: true })}
              <textarea
                id="aav-description"
                className={errors.description ? 'aav-input aav-textarea aav-input-invalid' : 'aav-input aav-textarea'}
                value={form.description}
                onChange={update('description')}
                placeholder={t('adminAddVenue.placeholders.description')}
                maxLength={2000}
                dir="auto"
                disabled={isSaving}
                aria-invalid={errors.description ? true : undefined}
              />
              {errorText('description')}
            </div>
          </div>
        </section>

        {/* 2 — Facility details */}
        <section className="aav-card">
          {sectionHeader(2, 'facility')}
          <div className="aav-grid">
            {textField('width', { type: 'number', inputMode: 'decimal', placeholderKey: 'meters' })}
            {textField('length', { type: 'number', inputMode: 'decimal', placeholderKey: 'meters' })}
            <div className="aav-field aav-span">
              {label('photos', 'aav-photos', {
                required: false,
                optional: true,
                optionalText: t('adminAddVenue.photosOptional', { count: MAX_VENUE_PHOTOS }),
              })}
              <input
                ref={photoInputRef}
                id="aav-photos-input"
                className="aav-file-input"
                type="file"
                accept="image/jpeg,image/png"
                multiple
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  addPhotos(event.target.files)
                  event.target.value = ''
                }}
              />
              <button
                id="aav-photos"
                type="button"
                className={[
                  'aav-upload',
                  isDragging ? 'aav-upload-dragging' : '',
                  errors.photos ? 'aav-upload-invalid' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => photoInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setIsDragging(false)
                  if (!isSaving && photos.length < MAX_VENUE_PHOTOS) addPhotos(event.dataTransfer.files)
                }}
                disabled={isSaving || photos.length >= MAX_VENUE_PHOTOS}
                aria-describedby="aav-photos-hint"
              >
                <span className="aav-upload-icon" aria-hidden="true">
                  <Upload size={16} />
                </span>
                <span className="aav-upload-title">{t('adminAddVenue.uploadTitle')}</span>
                <span id="aav-photos-hint" className="aav-upload-hint">
                  {t('adminAddVenue.uploadHint', { count: MAX_VENUE_PHOTOS })}
                </span>
              </button>
              {photos.length > 0 && (
                <>
                  <p className="aav-photos-count">
                    {t('adminAddVenue.photosSelected', { count: photos.length, max: MAX_VENUE_PHOTOS })}
                  </p>
                  <ul className="aav-photo-list">
                    {photos.map((photo, index) => (
                      <li key={photo.key} className="aav-photo">
                        <img src={photo.url} alt={t('adminAddVenue.photoAlt', { number: index + 1 })} />
                        <button
                          type="button"
                          className="aav-photo-remove"
                          onClick={() => removePhoto(photo.key)}
                          disabled={isSaving}
                          aria-label={t('adminAddVenue.photoRemove', { number: index + 1 })}
                        >
                          <X size={14} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {errors.photos && (
                <p className="aav-error" role="alert">
                  {t(`adminAddVenue.errors.${errors.photos}`, { count: MAX_VENUE_PHOTOS })}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* 3 — Venue owner account */}
        <section className="aav-card">
          {sectionHeader(3, 'owner')}
          <div className="aav-grid">
            {textField('email', { type: 'email', dir: 'ltr', autoComplete: 'off' })}
            {textField('ownerName', { autoComplete: 'off' })}
            {textField('phone', { type: 'tel', inputMode: 'tel', dir: 'ltr', autoComplete: 'off' })}
            {textField('password', {
              type: 'password',
              dir: 'ltr',
              optional: true,
              autoComplete: 'new-password',
              hintKey: 'adminAddVenue.passwordHint',
            })}
          </div>

          <div className="aav-note" role="note">
            <p className="aav-note-title">{t('adminAddVenue.credentialsNote.title')}</p>
            <p className="aav-note-text">{t('adminAddVenue.credentialsNote.text')}</p>
          </div>

          <label className={errors.reviewed ? 'aav-check aav-check-invalid' : 'aav-check'}>
            <input type="checkbox" checked={form.reviewed} onChange={update('reviewed')} disabled={isSaving} />
            <span>
              <span className="aav-check-title">{t('adminAddVenue.reviewed.title')}</span>
              <span className="aav-check-text">{t('adminAddVenue.reviewed.text')}</span>
            </span>
          </label>
          {errorText('reviewed')}
        </section>

        {saveError && (
          <p className="aav-save-error" role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            {t(`adminAddVenue.saveErrors.${saveError}`)}
          </p>
        )}

        <footer className="aav-card aav-footer">
          <p className="aav-footer-note">
            {canSave || cities === null || !IS_API_ENABLED ? (
              <>
                <span className="aav-required">*</span> {t('adminAddVenue.requiredNote')}
              </>
            ) : (
              <span className="aav-footer-blocked">{t('adminAddVenue.saveBlocked')}</span>
            )}
          </p>
          <div className="aav-actions">
            <button type="button" className="aav-cancel" onClick={() => goBack()} disabled={isSaving}>
              {t('adminAddVenue.cancel')}
            </button>
            <button
              type="submit"
              className="aav-save"
              disabled={isSaving || !canSave}
              aria-busy={isSaving || undefined}
            >
              {t(isSaving ? 'adminAddVenue.saving' : 'adminAddVenue.save')}
            </button>
          </div>
        </footer>
      </form>
    </DashboardLayout>
  )
}

export default AdminAddVenue
