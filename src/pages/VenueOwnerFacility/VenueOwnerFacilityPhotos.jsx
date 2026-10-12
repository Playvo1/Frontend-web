import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, CloudUpload, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
// Same confirmation look as "Delete time slot?" (dsm-* classes).
import '../VenueOwnerSlots/DeleteSlotModal.css'

// "Delete photo?" confirmation (design), opened from the X of a photo: shows
// the selected photo. "Delete" removes it from the page's local (mock) state
// only — no backend request; "Cancel" and Escape close it.
// Native <dialog> (showModal), as in the slot dialogs.
function DeletePhotoDialog({ photo, onCancel, onConfirm }) {
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
      className="dsm vofp-dialog"
      aria-labelledby="vofp-delete-title"
      aria-describedby="vofp-delete-message"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      <div className="dsm-body">
        <span className="dsm-icon" aria-hidden="true">
          <Trash2 size={20} />
        </span>
        <div className="dsm-text">
          <h2 id="vofp-delete-title" className="dsm-title">
            {t('venueOwnerFacility.photosPage.deleteDialog.title')}
          </h2>
          <p id="vofp-delete-message" className="dsm-message">
            {t('venueOwnerFacility.photosPage.deleteDialog.message')}
          </p>
        </div>
      </div>

      <img className="vofp-dialog-photo" src={photo.image_url} alt="" />

      <footer className="dsm-footer">
        <button type="button" className="dsm-button dsm-cancel" onClick={onCancel}>
          {t('venueOwnerFacility.photosPage.deleteDialog.cancel')}
        </button>
        <button type="button" className="dsm-button dsm-delete" onClick={onConfirm}>
          {t('venueOwnerFacility.photosPage.deleteDialog.delete')}
        </button>
      </footer>
    </dialog>
  )
}

// "Venue photos" view of the My venue page (design), opened from "View all
// photos" in the photos card. Shows the cover photo (tagged "Cover") and the
// other venue photos from the facility data (mock), after an "Upload photos"
// tile. "Back" / the breadcrumb return to the page.
//
// X on a photo opens the "Delete photo?" confirmation; confirming removes the
// photo from the page's local (mock) state only (onRemovePhoto).
//
// The upload tile is UI only: there is no confirmed backend endpoint for
// uploading venue photos yet.

function VenueOwnerFacilityPhotos({ facility, onBack, onRemovePhoto }) {
  const { t, i18n } = useTranslation()
  const [photoToDelete, setPhotoToDelete] = useState(null)
  const BackIcon = i18n.dir() === 'rtl' ? ChevronRight : ChevronLeft

  const photos = [
    ...(facility.cover_image_url ? [{ id: 'cover', image_url: facility.cover_image_url, isCover: true }] : []),
    ...facility.images,
  ]

  return (
    <section className="vofp" aria-labelledby="vofp-title">
      <div className="vofe-header">
        <div>
          <nav className="vofe-breadcrumb" aria-label={t('venueOwnerFacility.editForm.breadcrumbLabel')}>
            <button type="button" className="vofe-breadcrumb-link" onClick={onBack}>
              {t('venueOwnerFacility.title')}
            </button>
            <span className="vofe-breadcrumb-separator" aria-hidden="true">
              /
            </span>
            <span aria-current="page">{t('venueOwnerFacility.photosPage.title')}</span>
          </nav>
          <h1 id="vofp-title" className="vof-title">
            {t('venueOwnerFacility.photosPage.title')}
          </h1>
          <p className="vof-subtitle">{t('venueOwnerFacility.photosPage.subtitle')}</p>
        </div>
        <button type="button" className="vofe-back" onClick={onBack}>
          <BackIcon size={14} aria-hidden="true" />
          {t('venueOwnerFacility.editForm.back')}
        </button>
      </div>

      <ul className="vofp-grid">
        <li>
          {/* No upload endpoint yet: UI only. */}
          <button type="button" className="vofp-tile vofp-upload">
            <span className="vofp-upload-icon" aria-hidden="true">
              <CloudUpload size={16} />
            </span>
            <span className="vofp-upload-title">{t('venueOwnerFacility.photosPage.upload')}</span>
            <span className="vofp-upload-hint">
              <bdi>{t('venueOwnerFacility.photosPage.uploadHint')}</bdi>
            </span>
          </button>
        </li>
        {photos.map((photo, index) => (
          <li key={photo.id} className="vofp-tile vofp-photo-item">
            <img
              className="vofp-photo"
              src={photo.image_url}
              alt={t('venueOwnerFacility.photosPage.photoAlt', { number: index + 1 })}
            />
            {photo.isCover ? (
              <span className="vofp-cover">{t('venueOwnerFacility.photosPage.cover')}</span>
            ) : (
              // Hover / keyboard-focus state (design): darkened bottom with
              // "Set as cover" (UI only — no confirmed backend endpoint yet)
              // and X, which opens the delete confirmation.
              <span className="vofp-photo-actions">
                <button
                  type="button"
                  className="vofp-photo-remove"
                  aria-label={t('venueOwnerFacility.photosPage.removePhoto')}
                  onClick={() => setPhotoToDelete(photo)}
                >
                  <X size={18} aria-hidden="true" />
                </button>
                <button type="button" className="vofp-set-cover">
                  {t('venueOwnerFacility.photosPage.setCover')}
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>

      {photoToDelete && (
        <DeletePhotoDialog
          photo={photoToDelete}
          onCancel={() => setPhotoToDelete(null)}
          onConfirm={() => {
            onRemovePhoto(photoToDelete.id)
            setPhotoToDelete(null)
          }}
        />
      )}
    </section>
  )
}

export default VenueOwnerFacilityPhotos
