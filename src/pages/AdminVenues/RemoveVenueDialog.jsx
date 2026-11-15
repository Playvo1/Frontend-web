import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
// Same confirmation look as "Delete time slot?" (dsm-* classes).
import '../VenueOwnerSlots/DeleteSlotModal.css'

// "Remove venue?" confirmation, opened from "Remove" in the venues table.
// Nothing changes until "Remove" is pressed here: it calls `onConfirm` (the
// page sets the venue's status to inactive on the backend), shows
// "Removing…" meanwhile, and the page closes the dialog only after the
// backend confirmed it. A failed request keeps the dialog open and says why:
// the venue has upcoming confirmed bookings (422), it no longer exists (404),
// no permission (403), no connection, or another server error. "Cancel" and
// Escape close it (not while removing). Native <dialog> (showModal), as in
// the slot dialogs.

function errorKey(error) {
  if (error?.status === 422) return 'upcomingBookings'
  if (error?.status === 404) return 'notFound'
  if (error?.status === 403) return 'forbidden'
  if (error?.status === 0) return 'network'
  return 'server'
}

function RemoveVenueDialog({ venueName, onClose, onConfirm }) {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  const [isRemoving, setIsRemoving] = useState(false)
  // null | 'upcomingBookings' | 'notFound' | 'forbidden' | 'network' | 'server'
  const [error, setError] = useState(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  const confirm = async () => {
    if (isRemoving) return
    setError(null)
    setIsRemoving(true)
    try {
      await onConfirm()
    } catch (requestError) {
      setIsRemoving(false)
      // 401: the page signs out; nothing to show here.
      if (requestError?.status !== 401) setError(errorKey(requestError))
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="dsm avm-dialog"
      aria-labelledby="avm-remove-title"
      aria-describedby="avm-remove-message"
      onCancel={(event) => {
        event.preventDefault()
        if (!isRemoving) onClose()
      }}
    >
      <div className="dsm-body">
        <span className="dsm-icon" aria-hidden="true">
          <Trash2 size={20} />
        </span>
        <div className="dsm-text">
          <h2 id="avm-remove-title" className="dsm-title">
            {t('adminVenues.removeDialog.title')}
          </h2>
          <p id="avm-remove-message" className="dsm-message">
            {t('adminVenues.removeDialog.message', { name: venueName })}
          </p>
        </div>
      </div>

      {error && (
        <p className="dsm-error" role="alert">
          {t(`adminVenues.removeDialog.errors.${error}`)}
        </p>
      )}

      <footer className="dsm-footer">
        <button type="button" className="dsm-button dsm-cancel" onClick={onClose} disabled={isRemoving}>
          {t('adminVenues.removeDialog.cancel')}
        </button>
        <button type="button" className="dsm-button dsm-delete" onClick={confirm} disabled={isRemoving}>
          {t(isRemoving ? 'adminVenues.removeDialog.removing' : 'adminVenues.removeDialog.confirm')}
        </button>
      </footer>
    </dialog>
  )
}

export default RemoveVenueDialog
