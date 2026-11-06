import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// A venue photo of the My venue page. If the file cannot be loaded (the
// backend lists the image but its URL answers 404, as /storage/venues/...
// does today), a placeholder says the photo is not available on the server
// instead of showing a broken image. Same size as the photo (className).
function VenuePhoto({ src, alt = '', className }) {
  const { t } = useTranslation()
  // The URL that failed (a new src is tried again).
  const [failedSrc, setFailedSrc] = useState(null)

  if (failedSrc === src) {
    return (
      <span className={`${className} vof-photo-missing`} role="img" aria-label={t('venueOwnerFacility.photoMissing')}>
        <ImageOff size={18} aria-hidden="true" />
        <span className="vof-photo-missing-text">{t('venueOwnerFacility.photoMissing')}</span>
      </span>
    )
  }
  return <img className={className} src={src} alt={alt} onError={() => setFailedSrc(src)} />
}

export default VenuePhoto
