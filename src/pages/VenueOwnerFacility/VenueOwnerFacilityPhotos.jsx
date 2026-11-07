import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, CloudUpload, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { VENUE_IMAGE_MAX_BYTES, VENUE_IMAGE_TYPES } from '../../services/facilityService.js'
import VenuePhoto from './VenuePhoto.jsx'
// Same confirmation look as "Delete time slot?" (dsm-* classes).
import '../VenueOwnerSlots/DeleteSlotModal.css'

// "Delete photo?" confirmation (design), opened from the X of a photo: shows
// the selected photo. "Delete" removes it (demo mode: the page's local state;
// API mode: on the backend, both buttons disabled meanwhile); "Cancel" and
// Escape close it. Native <dialog> (showModal), as in the slot dialogs.
function DeletePhotoDialog({ photo, isBusy = false, onCancel, onConfirm }) {
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
        if (!isBusy) onCancel()
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
        <button type="button" className="dsm-button dsm-cancel" onClick={onCancel} disabled={isBusy}>
          {t('venueOwnerFacility.photosPage.deleteDialog.cancel')}
        </button>
        <button
          type="button"
          className="dsm-button dsm-delete"
          onClick={onConfirm}
          disabled={isBusy}
          aria-busy={isBusy || undefined}
        >
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
// X on a photo opens the "Delete photo?" confirmation; confirming calls
// onRemovePhoto. "Set as cover" calls onSetCover.
//
// Demo mode (onUploadImage / onSetCover not given): onRemovePhoto removes
// the photo from the page's local (mock) state only; the upload tile and
// "Set as cover" are UI only.
//
// API mode: the upload tile picks one or more images and sends each to the
// backend (POST .../venues/{id}/images through the page); every uploaded
// photo is added to the list, every refused file gets its own message.
// onRemovePhoto / onSetCover save on the backend and return a promise: while
// one runs, the photo actions are disabled; a failure is said above the
// photos (nothing is changed on the page).

function VenueOwnerFacilityPhotos({ facility, onBack, onRemovePhoto, onSetCover = null, onUploadImage = null }) {
  const { t, i18n } = useTranslation()
  const [photoToDelete, setPhotoToDelete] = useState(null)
  const BackIcon = i18n.dir() === 'rtl' ? ChevronRight : ChevronLeft
  const isApi = onUploadImage !== null
  const uploadInputRef = useRef(null)
  const [uploadingCount, setUploadingCount] = useState(0)
  // [{ name, kind: 'invalidType' | 'tooLarge' | 'network' | 'server' | 'uploaded' }]
  const [uploadMessages, setUploadMessages] = useState([])
  // API mode: a delete / "Set as cover" request is running.
  const [isSavingPhoto, setIsSavingPhoto] = useState(false)
  // Failed delete / "Set as cover": null | 'deleteNetwork' | 'deleteServer' |
  // 'coverNetwork' | 'coverServer'.
  const [actionMessage, setActionMessage] = useState(null)

  // API mode: runs one photo request; 401 is handled by the page.
  const runPhotoAction = async (action, failure) => {
    setIsSavingPhoto(true)
    setActionMessage(null)
    try {
      await action()
    } catch (error) {
      if (error?.status !== 401) setActionMessage(`${failure}${error?.status === 0 ? 'Network' : 'Server'}`)
    } finally {
      setIsSavingPhoto(false)
    }
  }

  const confirmDelete = async () => {
    if (!isApi) {
      onRemovePhoto(photoToDelete.id)
      setPhotoToDelete(null)
      return
    }
    await runPhotoAction(() => onRemovePhoto(photoToDelete.id), 'delete')
    setPhotoToDelete(null)
  }

  const setCover = (photo) => {
    if (!onSetCover || isSavingPhoto) return
    runPhotoAction(() => onSetCover(photo.id), 'cover')
  }

  // API mode: upload the picked files one after another.
  const uploadFiles = async (event) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0 || uploadingCount > 0) return
    const messages = []
    const valid = []
    for (const file of files) {
      if (!VENUE_IMAGE_TYPES.includes(file.type)) messages.push({ name: file.name, kind: 'invalidType' })
      else if (file.size > VENUE_IMAGE_MAX_BYTES) messages.push({ name: file.name, kind: 'tooLarge' })
      else valid.push(file)
    }
    setUploadMessages(messages)
    setUploadingCount(valid.length)
    for (const file of valid) {
      try {
        await onUploadImage(file)
        messages.push({ name: file.name, kind: 'uploaded' })
      } catch (error) {
        if (error?.status === 401) return
        messages.push({ name: file.name, kind: error?.status === 0 ? 'network' : 'server' })
      }
      setUploadMessages([...messages])
      setUploadingCount((count) => count - 1)
    }
  }

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

      {actionMessage && (
        <ul className="vofp-messages" aria-live="polite">
          <li className="vofp-message vofp-message-error">
            {t(`venueOwnerFacility.photosPage.actionMessages.${actionMessage}`)}
          </li>
        </ul>
      )}

      {uploadMessages.length > 0 && (
        <ul className="vofp-messages" aria-live="polite">
          {uploadMessages.map((message, index) => (
            <li
              key={`${message.name}-${index}`}
              className={message.kind === 'uploaded' ? 'vofp-message' : 'vofp-message vofp-message-error'}
            >
              <bdi>{message.name}</bdi>: {t(`venueOwnerFacility.photosPage.uploadMessages.${message.kind}`)}
            </li>
          ))}
        </ul>
      )}

      <ul className="vofp-grid">
        <li>
          {/* Demo mode: UI only. API mode: picks images to upload. */}
          <button
            type="button"
            className="vofp-tile vofp-upload"
            onClick={isApi ? () => uploadInputRef.current?.click() : undefined}
            disabled={uploadingCount > 0}
            aria-busy={uploadingCount > 0 || undefined}
          >
            <span className="vofp-upload-icon" aria-hidden="true">
              <CloudUpload size={16} />
            </span>
            <span className="vofp-upload-title">
              {uploadingCount > 0
                ? t('venueOwnerFacility.photosPage.uploading', { count: uploadingCount })
                : t('venueOwnerFacility.photosPage.upload')}
            </span>
            <span className="vofp-upload-hint">
              <bdi>
                {t(isApi ? 'venueOwnerFacility.photosPage.uploadHintApi' : 'venueOwnerFacility.photosPage.uploadHint')}
              </bdi>
            </span>
          </button>
          {isApi && (
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              accept={VENUE_IMAGE_TYPES.join(',')}
              className="vof-file-input"
              onChange={uploadFiles}
              tabIndex={-1}
              aria-hidden="true"
            />
          )}
        </li>
        {photos.map((photo, index) => (
          <li key={photo.id} className="vofp-tile vofp-photo-item">
            <VenuePhoto
              className="vofp-photo"
              src={photo.image_url}
              alt={t('venueOwnerFacility.photosPage.photoAlt', { number: index + 1 })}
            />
            {photo.isCover ? (
              <span className="vofp-cover">{t('venueOwnerFacility.photosPage.cover')}</span>
            ) : (
              // Hover / keyboard-focus state (design): darkened bottom with
              // "Set as cover" and X, which opens the delete confirmation.
              <span className="vofp-photo-actions">
                <button
                  type="button"
                  className="vofp-photo-remove"
                  aria-label={t('venueOwnerFacility.photosPage.removePhoto')}
                  onClick={() => setPhotoToDelete(photo)}
                  disabled={isSavingPhoto}
                >
                  <X size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="vofp-set-cover"
                  onClick={onSetCover ? () => setCover(photo) : undefined}
                  disabled={isSavingPhoto}
                >
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
          isBusy={isSavingPhoto}
          onCancel={() => setPhotoToDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </section>
  )
}

export default VenueOwnerFacilityPhotos
