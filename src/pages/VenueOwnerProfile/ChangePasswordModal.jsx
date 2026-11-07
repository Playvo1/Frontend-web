import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CHANGE_PASSWORD_NOT_AVAILABLE, changePassword } from '../../services/authService.js'
import { isConnectionFailure } from '../../utils/requestErrors.js'
import { PASSWORD_MIN_LENGTH } from '../../utils/validation.js'

// "Change password" dialog of the Profile page, as the design: shield icon,
// "Security & password" title and subtitle, current password, new password
// and confirmation (each with a show/hide eye) and a full-width navy
// "Change password" button.
//
// Venue owners get their first password from an admin and change it here.
// Saving goes through authService.changePassword, which is NOT CONNECTED
// (no backend endpoint checks a current password yet): it rejects with
// CHANGE_PASSWORD_NOT_AVAILABLE and the dialog says the password was not
// changed. The success message is shown only if the request succeeds (once
// the endpoint exists).
//
// Native <dialog> (showModal), as the other dialogs: centered, focus kept
// inside. The design has no close / cancel button, so it closes with Escape
// or a click outside the box (not while a request is running).

const FIELDS = [
  { id: 'vopm-current', key: 'currentPassword', autoComplete: 'current-password' },
  { id: 'vopm-password', key: 'password', autoComplete: 'new-password' },
  { id: 'vopm-confirm', key: 'confirmPassword', autoComplete: 'new-password' },
]

function validate(values) {
  const errors = {}
  if (!values.currentPassword) errors.currentPassword = 'venueOwnerProfile.passwordModal.errors.currentRequired'
  if (!values.password) errors.password = 'resetPassword.errors.passwordRequired'
  else if (values.password.length < PASSWORD_MIN_LENGTH) errors.password = 'resetPassword.errors.passwordTooShort'
  else if (values.currentPassword && values.password === values.currentPassword) {
    errors.password = 'venueOwnerProfile.passwordModal.errors.sameAsCurrent'
  }
  if (!values.confirmPassword) errors.confirmPassword = 'resetPassword.errors.confirmRequired'
  else if (values.password && values.confirmPassword !== values.password) {
    errors.confirmPassword = 'resetPassword.errors.mismatch'
  }
  return errors
}

function ChangePasswordModal({ onClose }) {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  const [values, setValues] = useState({ currentPassword: '', password: '', confirmPassword: '' })
  // Show/hide (eye button) per field.
  const [visible, setVisible] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  // Message under the fields: null | 'notAvailable' | 'network' | 'generic'.
  const [notice, setNotice] = useState(null)
  const [isBusy, setIsBusy] = useState(false)
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  const close = () => {
    if (!isBusy) onClose()
  }

  const update = (key) => (event) => {
    const { value } = event.target
    setValues((current) => ({ ...current, [key]: value }))
    setFieldErrors((errors) => ({ ...errors, [key]: undefined }))
    setNotice(null)
  }

  const submit = async (event) => {
    event.preventDefault()
    const errors = validate(values)
    setFieldErrors(errors)
    setNotice(null)
    if (Object.keys(errors).length > 0) return

    setIsBusy(true)
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        password: values.password,
        passwordConfirmation: values.confirmPassword,
      })
      setIsDone(true)
    } catch (error) {
      if (error?.code === CHANGE_PASSWORD_NOT_AVAILABLE) setNotice('notAvailable')
      else setNotice(isConnectionFailure(error) ? 'network' : 'generic')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="vopm"
      aria-labelledby="vopm-title"
      aria-describedby="vopm-subtitle"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      // A click on the backdrop targets the <dialog> itself (the content
      // fills the box), so it closes; clicks inside the box do not.
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="vopm-body">
        <header className="vopm-header">
          <span className="vopm-icon" aria-hidden="true">
            <ShieldCheck size={22} />
          </span>
          <div className="vopm-heading">
            <h2 id="vopm-title" className="vopm-title">
              {t('venueOwnerProfile.passwordModal.title')}
            </h2>
            <p id="vopm-subtitle" className="vopm-subtitle">
              {t('venueOwnerProfile.passwordModal.subtitle')}
            </p>
          </div>
        </header>

        {isDone ? (
          <>
            <p className="vopm-notice vopm-notice-success" role="status">
              {t('venueOwnerProfile.passwordModal.success')}
            </p>
            <button type="button" className="vopm-button vopm-primary vopm-submit" onClick={onClose}>
              {t('venueOwnerProfile.passwordModal.close')}
            </button>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            {FIELDS.map(({ id, key, autoComplete }) => {
              const error = fieldErrors[key]
              const isShown = Boolean(visible[key])
              return (
                <div key={key} className="vopm-field">
                  <label className="vopm-label" htmlFor={id}>
                    {t(`venueOwnerProfile.passwordModal.${key}`)}
                  </label>
                  <div className={`vopm-input-wrap ${error ? 'vopm-input-invalid' : ''}`}>
                    <input
                      id={id}
                      type={isShown ? 'text' : 'password'}
                      className="vopm-input"
                      value={values[key]}
                      onChange={update(key)}
                      autoComplete={autoComplete}
                      aria-invalid={error ? 'true' : undefined}
                      aria-describedby={error ? `${id}-error` : undefined}
                      disabled={isBusy}
                    />
                    <button
                      type="button"
                      className="vopm-eye"
                      onClick={() => setVisible((current) => ({ ...current, [key]: !current[key] }))}
                      aria-label={t(
                        isShown
                          ? 'venueOwnerProfile.passwordModal.hidePassword'
                          : 'venueOwnerProfile.passwordModal.showPassword',
                      )}
                      aria-pressed={isShown ? 'true' : 'false'}
                      aria-controls={id}
                    >
                      {isShown ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                    </button>
                  </div>
                  {error && (
                    <p id={`${id}-error`} className="vopm-error" role="alert">
                      {t(error, { min: PASSWORD_MIN_LENGTH })}
                    </p>
                  )}
                </div>
              )
            })}
            {notice && (
              <p className="vopm-notice vopm-notice-error" role="alert">
                {t(`venueOwnerProfile.passwordModal.notices.${notice}`)}
              </p>
            )}
            <button type="submit" className="vopm-button vopm-primary vopm-submit" disabled={isBusy}>
              {isBusy ? t('venueOwnerProfile.passwordModal.submitting') : t('venueOwnerProfile.security.changePassword')}
            </button>
          </form>
        )}
      </div>
    </dialog>
  )
}

export default ChangePasswordModal
