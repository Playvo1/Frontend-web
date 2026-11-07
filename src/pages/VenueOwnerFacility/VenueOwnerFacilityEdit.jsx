import { useState } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// "Edit venue details" view of the My venue page (design), opened from the
// "Edit" button of the venue information card. The form starts from the
// current facility data; "Save changes" hands the edited copy to the page's
// onSave, which returns a promise: demo mode keeps it in the page's state,
// API mode saves it on the backend (see VenueOwnerFacility). While it runs
// the button says "Saving…"; a rejection keeps the form open with a message
// (connection / server / the backend's field errors). "Cancel" / "Back"
// discard the edits.
//
// editableFields (API mode): the fields the backend can save
// (facilityService.FACILITY_EDITABLE_FIELDS: name, description, area,
// address, surface, dimensions, capacity, morning / evening prices). The
// other fields (owner, status, sport) are shown disabled with a note, are not
// validated and are not changed. null (demo mode): every field, as before.
//
// Text fields edit the current language's value (e.g. name_ar in Arabic).

// Sports shown in the design: only football is available; the others are
// marked "Soon".
const SPORTS = [
  { key: 'football', emoji: '⚽', available: true },
  { key: 'tennis', emoji: '🎾', available: false },
  { key: 'basketball', emoji: '🏀', available: false },
  { key: 'volleyball', emoji: '🏐', available: false },
]

// Required fields (marked * in the design) that the form checks on save.
const REQUIRED_FIELDS = ['name', 'owner', 'area', 'address', 'status', 'surface', 'capacity']

function toForm(facility, suffix, dimensionsText) {
  return {
    name: facility[`name_${suffix}`] ?? '',
    owner: facility.owner_name ?? '',
    description: facility[`description_${suffix}`] ?? '',
    area: facility[`area_${suffix}`] ?? '',
    address: facility[`address_${suffix}`] ?? '',
    status: facility.status ?? 'active',
    surface: facility[`surface_${suffix}`] ?? '',
    dimensions: dimensionsText,
    capacity: facility[`capacity_${suffix}`] ?? '',
    morningPrice: String(facility.morning_hourly_price ?? ''),
    eveningPrice: String(facility.evening_hourly_price ?? ''),
  }
}

// "40 × 20 م · 5 في 5" -> { length: 40, width: 20, format: '5 في 5' };
// null when the text does not start with "<length> × <width>".
function parseDimensions(text) {
  const match = text.match(/^\s*(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)[^·]*(?:·\s*(.*))?$/)
  if (!match) return null
  return { length: Number(match[1]), width: Number(match[2]), format: match[3]?.trim() ?? '' }
}

// Backend field errors (422) -> the form field they belong to. The form
// edits the current language's values only: an error on the other
// language's value (e.g. address_en while editing in Arabic) cannot be fixed
// here, so it is reported as 'otherLanguage' instead of marking the field
// on screen.
const SERVER_FIELDS = {
  name_ar: 'name',
  name_en: 'name',
  description_ar: 'description',
  description_en: 'description',
  address_ar: 'address',
  address_en: 'address',
  area_ar: 'area',
  area_en: 'area',
  surface_ar: 'surface',
  surface_en: 'surface',
  capacity_ar: 'capacity',
  capacity_en: 'capacity',
  length_m: 'dimensions',
  width_m: 'dimensions',
  morning_hourly_price: 'morningPrice',
  evening_hourly_price: 'eveningPrice',
}

function VenueOwnerFacilityEdit({ facility, dimensionsText, editableFields = null, onCancel, onSave }) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.dir() === 'rtl'
  const suffix = i18n.language === 'ar' ? 'ar' : 'en'
  const [form, setForm] = useState(() => toForm(facility, suffix, dimensionsText))
  // { [field]: true (required) | 'invalidDimensions' | 'server' }
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  // null | 'network' | 'server' | 'location' (the venue has no map position:
  // the backend cannot save it) | 'fields' (see errors) | 'otherLanguage'
  // (a value of the other language is missing / invalid on the backend)
  const [saveError, setSaveError] = useState(null)
  const isEditable = (field) => editableFields === null || editableFields.includes(field)

  const BackIcon = isRtl ? ChevronRight : ChevronLeft

  const update = (field) => (event) => {
    const { value } = event.target
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: false }))
  }

  const updatePrice = (field) => (event) => {
    const value = event.target.value.replace(/[^\d.]/g, '')
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (isSaving) return
    const missing = Object.fromEntries(
      REQUIRED_FIELDS.filter((field) => isEditable(field) && !String(form[field]).trim()).map((field) => [
        field,
        true,
      ]),
    )
    const dimensions = parseDimensions(form.dimensions)
    // Saved on the backend: a dimensions text that cannot be read is an
    // error, not silently dropped.
    if (editableFields !== null && form.dimensions.trim() && !dimensions) {
      missing.dimensions = 'invalidDimensions'
    }
    if (Object.keys(missing).length > 0) {
      setErrors(missing)
      return
    }

    // API mode: an emptied dimensions field clears them.
    const clearsDimensions = editableFields !== null && !form.dimensions.trim()
    setIsSaving(true)
    setSaveError(null)
    Promise.resolve(
      onSave({
      ...facility,
      [`name_${suffix}`]: form.name.trim(),
      owner_name: form.owner.trim(),
      [`description_${suffix}`]: form.description.trim(),
      [`area_${suffix}`]: form.area.trim(),
      [`address_${suffix}`]: form.address.trim(),
      status: form.status,
      [`surface_${suffix}`]: form.surface.trim(),
      [`capacity_${suffix}`]: form.capacity.trim(),
      ...(dimensions && {
        length_m: dimensions.length,
        width_m: dimensions.width,
        [`team_format_${suffix}`]: dimensions.format,
      }),
      ...(clearsDimensions && { length_m: null, width_m: null }),
      morning_hourly_price: form.morningPrice === '' ? facility.morning_hourly_price : Number(form.morningPrice),
      evening_hourly_price: form.eveningPrice === '' ? facility.evening_hourly_price : Number(form.eveningPrice),
      }),
    ).catch((error) => {
      // A 401 is handled by the page (sign out); nothing to show here.
      if (error?.status === 401) return
      setIsSaving(false)
      if (error?.status === 0) {
        setSaveError('network')
        return
      }
      if (error?.status === 422 && error.errors && typeof error.errors === 'object') {
        const fields = {}
        const otherSuffix = suffix === 'ar' ? 'en' : 'ar'
        let isOtherLanguage = false
        for (const key of Object.keys(error.errors)) {
          if (!SERVER_FIELDS[key]) continue
          if (key.endsWith(`_${otherSuffix}`)) isOtherLanguage = true
          else fields[SERVER_FIELDS[key]] = 'server'
        }
        if (error.errors.latitude || error.errors.longitude) {
          setSaveError('location')
        } else if (Object.keys(fields).length > 0) {
          setSaveError('fields')
        } else {
          setSaveError(isOtherLanguage ? 'otherLanguage' : 'server')
        }
        setErrors(fields)
        return
      }
      setSaveError('server')
    })
  }

  const label = (field, htmlFor, required) => (
    <label className="vofe-label" htmlFor={htmlFor}>
      {t(`venueOwnerFacility.editForm.fields.${field}`)}
      {required && (
        <span className="vofe-required" aria-hidden="true">
          {' '}
          *
        </span>
      )}
    </label>
  )

  const errorText = (field) =>
    errors[field] && (
      <p className="vofe-error" role="alert">
        {t(
          errors[field] === 'invalidDimensions'
            ? 'venueOwnerFacility.editForm.invalidDimensions'
            : errors[field] === 'server'
              ? 'venueOwnerFacility.editForm.serverInvalid'
              : 'venueOwnerFacility.editForm.required',
        )}
      </p>
    )

  const textField = (field, { required = true } = {}) => (
    <div className="vofe-field">
      {label(field, `vofe-${field}`, required && isEditable(field))}
      <input
        id={`vofe-${field}`}
        className={errors[field] ? 'vofe-input vofe-input-invalid' : 'vofe-input'}
        value={form[field]}
        onChange={update(field)}
        disabled={!isEditable(field)}
        aria-invalid={errors[field] ? true : undefined}
      />
      {errorText(field)}
    </div>
  )

  const priceField = (field) => (
    <div className="vofe-field">
      {label(field, `vofe-${field}`, false)}
      <div className="vofe-input vofe-price">
        <span className="vofe-currency" aria-hidden="true">
          ₪
        </span>
        <input
          id={`vofe-${field}`}
          className="vofe-price-input"
          inputMode="decimal"
          value={form[field]}
          onChange={updatePrice(field)}
          disabled={!isEditable(field)}
        />
      </div>
    </div>
  )

  return (
    <form className="vofe" onSubmit={handleSubmit} noValidate>
      <div className="vofe-header">
        <div>
          <nav className="vofe-breadcrumb" aria-label={t('venueOwnerFacility.editForm.breadcrumbLabel')}>
            <button type="button" className="vofe-breadcrumb-link" onClick={onCancel}>
              {t('venueOwnerFacility.title')}
            </button>
            <span className="vofe-breadcrumb-separator" aria-hidden="true">
              \
            </span>
            <span aria-current="page">{t('venueOwnerFacility.editForm.breadcrumb')}</span>
          </nav>
          <h1 className="vof-title">{t('venueOwnerFacility.editForm.title')}</h1>
          <p className="vof-subtitle">{t('venueOwnerFacility.editForm.subtitle')}</p>
        </div>
        <button type="button" className="vofe-back" onClick={onCancel}>
          <BackIcon size={14} aria-hidden="true" />
          {t('venueOwnerFacility.editForm.back')}
        </button>
      </div>

      <section className="vof-card vofe-card" aria-labelledby="vofe-card-title">
        <header className="vofe-card-header">
          <h2 id="vofe-card-title" className="vof-card-title">
            {t('venueOwnerFacility.editForm.cardTitle')}
          </h2>
          <p className="vofe-card-note">
            {t('venueOwnerFacility.editForm.requiredNote')}{' '}
            <span className="vofe-required">*</span> {t('venueOwnerFacility.editForm.requiredNoteEnd')}
          </p>
          {editableFields !== null && (
            <p className="vofe-api-note" role="note">
              <Info className="vofe-info-icon" size={14} aria-hidden="true" />
              <span>{t('venueOwnerFacility.editForm.apiEditableNote')}</span>
            </p>
          )}
        </header>

        <div className="vofe-body">
          <div className="vofe-grid">
            <div className="vofe-stack">
              {textField('name')}
              {textField('owner')}
            </div>

            <fieldset className="vofe-field vofe-sports">
              <legend className="vofe-label">
                {t('venueOwnerFacility.editForm.fields.sport')}
                <span className="vofe-required" aria-hidden="true">
                  {' '}
                  *
                </span>
              </legend>
              <div className="vofe-sport-grid">
                {SPORTS.map(({ key, emoji, available }) => {
                  // API mode: selected only when the backend lists it.
                  const selected =
                    editableFields === null
                      ? available
                      : String(facility.sport_en ?? '').toLowerCase().includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      className={selected ? 'vofe-sport vofe-sport-selected' : 'vofe-sport'}
                      aria-pressed={selected}
                      disabled={!available || !isEditable('sport')}
                    >
                      {!available && <span className="vofe-sport-soon">{t('venueOwnerFacility.editForm.soon')}</span>}
                      <span className="vofe-sport-icon" aria-hidden="true">
                        {emoji}
                      </span>
                      <span className="vofe-sport-name">{t(`venueOwnerFacility.editForm.sports.${key}`)}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div className="vofe-field vofe-span">
              {label('description', 'vofe-description', isEditable('description'))}
              <textarea
                id="vofe-description"
                className="vofe-input vofe-textarea"
                value={form.description}
                onChange={update('description')}
                disabled={!isEditable('description')}
                placeholder={t('venueOwnerFacility.editForm.descriptionPlaceholder')}
              />
            </div>
          </div>

          <hr className="vofe-divider" />

          <div className="vofe-grid">
            {textField('area')}
            {textField('address')}
            <div className="vofe-field">
              {label('status', 'vofe-status', isEditable('status'))}
              <select
                id="vofe-status"
                className="vofe-input"
                value={form.status}
                onChange={update('status')}
                disabled={!isEditable('status')}
              >
                <option value="active">{t('venueOwnerFacility.status.active')}</option>
                <option value="inactive">{t('venueOwnerFacility.status.inactive')}</option>
              </select>
            </div>
            {textField('surface')}
            {textField('dimensions', { required: false })}
            {textField('capacity')}
            {priceField('morningPrice')}
            {priceField('eveningPrice')}
          </div>

          <p className="vofe-info">
            <Info className="vofe-info-icon" size={14} aria-hidden="true" />
            <span>
              {t('venueOwnerFacility.editForm.photosNoteStart')}{' '}
              <strong>{t('venueOwnerFacility.title')}</strong>{' '}
              {t('venueOwnerFacility.editForm.photosNoteEnd')}
            </span>
          </p>
        </div>
      </section>

      {saveError && (
        <p className="vofe-save-error" role="alert">
          {t(`venueOwnerFacility.editForm.saveErrors.${saveError}`)}
        </p>
      )}

      <footer className="vofe-footer">
        <button type="button" className="vofe-cancel" onClick={onCancel} disabled={isSaving}>
          {t('venueOwnerFacility.editForm.cancel')}
        </button>
        <button type="submit" className="vofe-save" disabled={isSaving} aria-busy={isSaving || undefined}>
          {t(isSaving ? 'venueOwnerFacility.editForm.saving' : 'venueOwnerFacility.editForm.save')}
        </button>
      </footer>
    </form>
  )
}

export default VenueOwnerFacilityEdit
