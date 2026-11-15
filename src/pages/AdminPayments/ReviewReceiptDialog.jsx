import { useEffect, useRef, useState } from 'react'
import { ExternalLink, ImageOff, ReceiptText, TriangleAlert, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MAX_REJECTION_REASON, reviewErrorKey } from '../../services/adminPaymentReceiptsService.js'
// Same confirmation look as the other dialogs (dsm-* classes).
import '../VenueOwnerSlots/DeleteSlotModal.css'

// "Review receipt" dialog, opened from the receipts table. Shows the receipt
// image (with a link to the full-size image) and the booking summary:
// booking number, player, venue, time, amount, upload time and status.
//   - Pending receipt: "Confirm payment" (calls onVerify) and "Reject
//     receipt". Rejecting asks for a required reason (max 1000 characters,
//     sent to the player) and then a final confirmation, because it cancels
//     the booking and frees its time slot; only then onReject(reason) runs.
//   - Reviewed receipt (verified / rejected): details only, with the
//     verification date or the rejection reason; no action.
// The page closes the dialog after the backend accepted the action. A failed
// request keeps it open and says why (backend 422 messages are translated;
// "no longer pending" also reloads the list through onStale). Escape and the
// close button close it, except while a request runs. Native <dialog>.

function ReviewReceiptDialog({ receipt, venueName, formats, onClose, onVerify, onReject, onStale }) {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  const reasonRef = useRef(null)
  // 'view' | 'reason' (writing the rejection reason) | 'confirm' (final check)
  const [step, setStep] = useState('view')
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState(null)
  // null | 'verify' | 'reject' (request running)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [imageFailed, setImageFailed] = useState(false)

  const { booking } = receipt
  const code = formats.bookingCode(booking.id)
  const isPending = receipt.status === 'pending'
  const notAvailable = t('adminPayments.notAvailable')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  useEffect(() => {
    if (step === 'reason') reasonRef.current?.focus()
  }, [step])

  const run = async (kind, action) => {
    if (busy) return
    setError(null)
    setBusy(kind)
    try {
      await action()
    } catch (requestError) {
      setBusy(null)
      // 401: the page signs out; nothing to show here.
      if (requestError?.status === 401) return
      const key = reviewErrorKey(requestError)
      if (key === 'reason') {
        setStep('reason')
        setReasonError('server')
        return
      }
      setError(key)
      if (key === 'notPending' || key === 'notFound') onStale()
    }
  }

  const continueToConfirm = () => {
    const text = reason.trim()
    if (!text) setReasonError('required')
    else if (text.length > MAX_REJECTION_REASON) setReasonError('tooLong')
    else {
      setReasonError(null)
      setError(null)
      setStep('confirm')
    }
  }

  const rows = [
    ['booking', <bdi key="code" dir="ltr">{code}</bdi>],
    ['player', <bdi key="player">{booking.player_name || notAvailable}</bdi>],
    ['venue', <bdi key="venue">{venueName || notAvailable}</bdi>],
    [
      'slot',
      <span key="slot" className="apr-dialog-slot">
        <span>{formats.slotDate(booking.slot_date) || notAvailable}</span>
        {formats.slotTime(booking.start_time, booking.end_time) && (
          <bdi className="apr-muted-text">{formats.slotTime(booking.start_time, booking.end_time)}</bdi>
        )}
      </span>,
    ],
    ['amount', <bdi key="amount">{formats.amount(booking.total_price) || notAvailable}</bdi>],
    ['uploadedAt', <bdi key="uploaded">{formats.moment(receipt.uploaded_at) || notAvailable}</bdi>],
    [
      'status',
      receipt.status ? (
        <span key="status" className={`apr-status apr-status-${receipt.status}`}>
          <span className="apr-status-dot" aria-hidden="true" />
          {t(`adminPayments.status.${receipt.status}`)}
        </span>
      ) : (
        notAvailable
      ),
    ],
  ]
  if (receipt.status === 'verified') {
    rows.push(['verifiedAt', <bdi key="verified">{formats.moment(receipt.verified_at) || notAvailable}</bdi>])
  }
  if (receipt.status === 'rejected') {
    rows.push([
      'rejectionReason',
      <span key="reason" className="apr-dialog-reason" dir="auto">
        {receipt.rejection_reason || notAvailable}
      </span>,
    ])
  }

  const hasImage = Boolean(receipt.image_url) && !imageFailed

  return (
    <dialog
      ref={dialogRef}
      className="apr-dialog"
      aria-labelledby="apr-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <header className="apr-dialog-header">
        <h2 id="apr-dialog-title" className="apr-dialog-title">
          {t(step === 'confirm' ? 'adminPayments.review.confirmTitle' : 'adminPayments.review.title')}{' '}
          <bdi dir="ltr" className="apr-dialog-code">
            {code}
          </bdi>
        </h2>
        <button
          type="button"
          className="apr-dialog-close"
          onClick={onClose}
          disabled={Boolean(busy)}
          aria-label={t('adminPayments.review.close')}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      {step === 'confirm' ? (
        <div className="apr-dialog-confirm">
          <div className="dsm-body">
            <span className="dsm-icon" aria-hidden="true">
              <TriangleAlert size={20} />
            </span>
            <div className="dsm-text">
              <p className="dsm-message apr-confirm-message">{t('adminPayments.review.confirmMessage', { code })}</p>
              <p className="apr-confirm-reason-label">{t('adminPayments.review.reasonLabel')}</p>
              <p className="apr-dialog-reason apr-confirm-reason" dir="auto">
                {reason.trim()}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="apr-dialog-body">
          <figure className="apr-receipt">
            {hasImage ? (
              <img
                className="apr-receipt-image"
                src={receipt.image_url}
                alt={t('adminPayments.receiptAlt', { code })}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span
                className="apr-receipt-missing"
                role="img"
                aria-label={t(receipt.image_url ? 'adminPayments.imageFailed' : 'adminPayments.noImage')}
              >
                {receipt.image_url ? <ImageOff size={36} aria-hidden="true" /> : <ReceiptText size={36} aria-hidden="true" />}
                <span>{t(receipt.image_url ? 'adminPayments.imageFailed' : 'adminPayments.noImage')}</span>
              </span>
            )}
            {hasImage && (
              <a className="apr-receipt-link" href={receipt.image_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} aria-hidden="true" />
                {t('adminPayments.review.openImage')}
              </a>
            )}
          </figure>

          <div className="apr-summary">
            <h3 className="apr-summary-title">{t('adminPayments.review.summary')}</h3>
            <dl className="apr-summary-list">
              {rows.map(([key, value]) => (
                <div key={key} className="apr-summary-row">
                  <dt>{t(`adminPayments.review.${key}`)}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            {step === 'reason' && (
              <div className="apr-reason">
                <label className="apr-reason-label" htmlFor="apr-reason-input">
                  {t('adminPayments.review.reasonLabel')}
                  <span className="apr-required" aria-hidden="true">
                    {' '}
                    *
                  </span>
                </label>
                <textarea
                  id="apr-reason-input"
                  ref={reasonRef}
                  className={reasonError ? 'apr-reason-input apr-reason-input-invalid' : 'apr-reason-input'}
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value)
                    if (reasonError) setReasonError(null)
                  }}
                  maxLength={MAX_REJECTION_REASON}
                  placeholder={t('adminPayments.review.reasonPlaceholder')}
                  dir="auto"
                  aria-invalid={reasonError ? true : undefined}
                  aria-describedby="apr-reason-hint"
                />
                <p id="apr-reason-hint" className="apr-reason-hint">
                  {t('adminPayments.review.reasonHint')}
                </p>
                {reasonError && (
                  <p className="apr-reason-error" role="alert">
                    {reasonError === 'required'
                      ? t('adminPayments.review.reasonRequired')
                      : reasonError === 'tooLong'
                        ? t('adminPayments.review.reasonTooLong', { max: MAX_REJECTION_REASON })
                        : t('adminPayments.review.errors.reason')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="dsm-error apr-dialog-error" role="alert">
          {t(`adminPayments.review.errors.${error}`)}
        </p>
      )}

      <footer className="apr-dialog-footer">
        {isPending && step === 'view' && (
          <>
            <button
              type="button"
              className="apr-button apr-button-primary"
              onClick={() => run('verify', onVerify)}
              disabled={Boolean(busy) || error === 'notPending'}
              aria-busy={busy === 'verify' || undefined}
            >
              {t(busy === 'verify' ? 'adminPayments.review.verifying' : 'adminPayments.review.verify')}
            </button>
            <button
              type="button"
              className="apr-button apr-button-danger-outline"
              onClick={() => {
                setError(null)
                setStep('reason')
              }}
              disabled={Boolean(busy) || error === 'notPending'}
            >
              {t('adminPayments.review.reject')}
            </button>
          </>
        )}

        {isPending && step === 'reason' && (
          <>
            <button type="button" className="apr-button apr-button-danger" onClick={continueToConfirm}>
              {t('adminPayments.review.continue')}
            </button>
            <button
              type="button"
              className="apr-button apr-button-secondary"
              onClick={() => {
                setReasonError(null)
                setStep('view')
              }}
            >
              {t('adminPayments.review.back')}
            </button>
          </>
        )}

        {isPending && step === 'confirm' && (
          <>
            <button
              type="button"
              className="apr-button apr-button-danger"
              onClick={() => run('reject', () => onReject(reason.trim()))}
              disabled={Boolean(busy) || error === 'notPending'}
              aria-busy={busy === 'reject' || undefined}
            >
              {t(busy === 'reject' ? 'adminPayments.review.rejecting' : 'adminPayments.review.confirmReject')}
            </button>
            <button
              type="button"
              className="apr-button apr-button-secondary"
              onClick={() => {
                setError(null)
                setStep('reason')
              }}
              disabled={Boolean(busy)}
            >
              {t('adminPayments.review.back')}
            </button>
          </>
        )}

        {!isPending && (
          <button type="button" className="apr-button apr-button-secondary" onClick={onClose}>
            {t('adminPayments.review.close')}
          </button>
        )}
      </footer>
    </dialog>
  )
}

export default ReviewReceiptDialog
