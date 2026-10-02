import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './DeleteSlotModal.css'

// "Delete time slot?" confirmation (Figma), opened from "Delete" on an
// available slot. There is no confirmed backend endpoint for deleting a
// time slot yet, so the "Delete" button has no action: nothing is removed
// from the slot list. "Cancel" and Escape close the dialog.
//
// Same native <dialog> pattern as EditSlotModal (showModal: centered,
// focus kept inside, backdrop, Escape).
function DeleteSlotModal({ slot, timeRange, onClose }) {
  const { t } = useTranslation()
  const dialogRef = useRef(null)

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
        onClose()
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

      <footer className="dsm-footer">
        <button type="button" className="dsm-button dsm-cancel" onClick={onClose}>
          {t('venueOwnerSlots.deleteSlot.cancel')}
        </button>
        {/* No slot-delete endpoint yet: "Delete" is UI only. */}
        <button type="button" className="dsm-button dsm-delete">
          {t('venueOwnerSlots.delete')}
        </button>
      </footer>
    </dialog>
  )
}

export default DeleteSlotModal
