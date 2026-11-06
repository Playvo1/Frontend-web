import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Details of one notification ("View details"), for kinds that have no page
// of their own (e.g. a platform update): its title, full text and the date
// and time it was sent. Same native <dialog> pattern as the other dialogs
// (showModal: centered, focus kept inside, backdrop, Escape closes).
function NotificationDetailsModal({ notification, title, body, tone, Icon, onClose }) {
  const { t, i18n } = useTranslation()
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  const locale = i18n.language?.startsWith('ar') ? 'ar' : 'en'
  const date = notification.created_at ? new Date(notification.created_at) : null
  const sentAt =
    date && !Number.isNaN(date.getTime())
      ? `${new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn' }).format(date)} • ${new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', numberingSystem: 'latn' }).format(date)}`
      : ''

  return (
    <dialog
      ref={dialogRef}
      className="von-dialog"
      aria-labelledby="von-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // A click on the backdrop (outside the panel) closes the dialog.
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <div className="von-dialog-panel">
        <header className="von-dialog-header">
          <span className={`von-icon ${tone === 'muted' ? '' : `von-icon-${tone}`}`} aria-hidden="true">
            <Icon size={16} />
          </span>
          <h2 id="von-dialog-title" className="von-dialog-title">
            {title}
          </h2>
          <button
            type="button"
            className="von-dialog-close"
            onClick={onClose}
            aria-label={t('venueOwnerNotifications.details.close')}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {body && <p className="von-dialog-body">{body}</p>}

        {sentAt && (
          <dl className="von-dialog-meta">
            <dt>{t('venueOwnerNotifications.details.sentAt')}</dt>
            <dd>
              <bdi>{sentAt}</bdi>
            </dd>
          </dl>
        )}

        <footer className="von-dialog-footer">
          <button type="button" className="von-action von-action-primary" onClick={onClose}>
            {t('venueOwnerNotifications.details.close')}
          </button>
        </footer>
      </div>
    </dialog>
  )
}

export default NotificationDetailsModal
