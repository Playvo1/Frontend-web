import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './DeleteSlotModal.css'

// "Delete time slot?" confirmation (Figma), opened from "Delete" on an
// available slot. Nothing is deleted until "Delete" is pressed here: it calls
// `onConfirm` (the page sends DELETE /venue_owner/owner/time-slots/{id}),
// shows "Deleting…" meanwhile, and the page closes the dialog only after the
// backend confirmed the deletion. A failed request keeps the dialog open
// and says why: the slot has a booking (409), it is not yours (403), it no
// longer exists (404), no connection, or another server error. "Cancel"
// and Escape close the dialog (not while deleting).
//
// Same native <dialog> pattern as EditSlotModal (showModal: centered,
// focus kept inside, backdrop, Escape).
// Request error -> message key (venueOwnerSlots.deleteSlot.errors.*).
function errorKey(error) {
  if (error?.status === 409) return 'conflict'
  if (error?.status === 403) return 'forbidden'
  if (error?.status === 404) return 'notFound'
  if (error?.status === 0) return 'network'
  return 'server'
}

function DeleteSlotModal({ slot, timeRange, onClose, onConfirm }) {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  const [isDeleting, setIsDeleting] = useState(false)
  // null | 'conflict' | 'forbidden' | 'notFound' | 'network' | 'server'
  const [error, setError] = useState(null)

  const confirm = async () => {
    if (!onConfirm || isDeleting) return
    setError(null)
    setIsDeleting(true)
    try {
      await onConfirm()
    } catch (requestError) {
      setIsDeleting(false)
      // 401: the page signs out; nothing to show here.
      if (requestError?.status !== 401) setError(errorKey(requestError))
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="dsm vos-modal"
      aria-labelledby="dsm-title"
      aria-describedby="dsm-message"
      onCancel={(event) => {
        event.preventDefault()
        if (!isDeleting) onClose()
      }}
    >
      <div className="dsm-body">
        <span className="dsm-icon" aria-hidden="true">
          <Trash2 size={20} />
        </span>
        <div className="dsm-text">
          <h2 id="dsm-title" className="dsm-title">
            {t('venueOwnerSlots.deleteSlot.title')}
          </h2>
          <p id="dsm-message" className="dsm-message">
            {t('venueOwnerSlots.deleteSlot.message')}
          </p>
          <p className="dsm-slot">
            <bdi className="dsm-slot-time">{timeRange}</bdi>
            <span className="dsm-slot-date">
              {' · '}
              <bdi>{slot.slot_date}</bdi>
            </span>
          </p>
        </div>
      </div>

      {error && (
        <p className="dsm-error" role="alert">
          {t(`venueOwnerSlots.deleteSlot.errors.${error}`)}
        </p>
      )}

      <footer className="dsm-footer">
        <button type="button" className="dsm-button dsm-cancel" onClick={onClose} disabled={isDeleting}>
          {t('venueOwnerSlots.deleteSlot.cancel')}
        </button>
        <button type="button" className="dsm-button dsm-delete" onClick={confirm} disabled={isDeleting}>
          {isDeleting ? t('venueOwnerSlots.deleteSlot.deleting') : t('venueOwnerSlots.delete')}
        </button>
      </footer>
    </dialog>
  )
}

export default DeleteSlotModal
