import { useEffect, useState } from 'react'
import { Check, CircleAlert, Clock, ImageOff, ReceiptText, Search, WifiOff, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout.jsx'
import Input from '../../components/Input/Input.jsx'
import { showToast } from '../../components/Toast/toast.js'
import { ADMIN_NAV } from '../../constants/adminNav.js'
import { useAuth } from '../../context/useAuth.js'
import {
  RECEIPT_STATUSES,
  getPaymentReceipts,
  rejectPaymentReceipt,
  verifyPaymentReceipt,
} from '../../services/adminPaymentReceiptsService.js'
import { isConnectionFailure } from '../../utils/requestErrors.js'
import ReviewReceiptDialog from './ReviewReceiptDialog.jsx'
import { inUploadRange, useReceiptFormats } from './receiptFormat.js'
import '../../styles/skeleton.css'
import './AdminPayments.css'

// Admin "Payment receipts" page (route: /admin/payments), built from the
// design: title + subtitle; three statistics cards (awaiting review — marked
// "Priority" —, verified, rejected); one card with the search (booking number
// or player name), status and upload-date filters, the "Showing x of y" line
// and the receipts table (booking number, player, venue, booking time, upload
// time, receipt thumbnail, status, "Review receipt"). Receipts awaiting review
// come first (oldest first, the review queue) on a light background, then
// the reviewed ones, newest first.
//
// Data: adminPaymentReceiptsService — API mode: GET /admin/payment-receipts
// for each status (the backend returns one status per request, without
// pagination), so the counts are exact and the search and filters run here
// on the full list. Demo mode: the mock receipts (no images: a placeholder).
//
// "Review receipt" opens ReviewReceiptDialog: the receipt image and the
// booking summary; a pending receipt can be confirmed (verify) or rejected
// (a required reason, then a final confirmation). After a review the row
// shows the saved status at once and the lists are read again from the
// backend; the rows stay on screen meanwhile.

const SKELETON_ROWS = 6
const DATE_RANGES = ['today', 'week', 'month']

const STAT_ICONS = { pending: Clock, verified: Check, rejected: X }

// Receipt thumbnail; no image (demo mode) or one that cannot be loaded (e.g.
// an old /storage file the server no longer has) shows a placeholder icon,
// with its own label for each case.
function ReceiptThumb({ src, alt, label, failedLabel }) {
  const [failedSrc, setFailedSrc] = useState(null)
  if (!src || failedSrc === src) {
    return (
      <span className="apr-thumb apr-thumb-missing" role="img" aria-label={src ? failedLabel : label} title={src ? failedLabel : label}>
        {src ? <ImageOff size={16} aria-hidden="true" /> : <ReceiptText size={16} aria-hidden="true" />}
      </span>
    )
  }
  return <img className="apr-thumb" src={src} alt={alt} loading="lazy" onError={() => setFailedSrc(src)} />
}

function AdminPayments() {
  const { t, i18n } = useTranslation()
  const { token, logout } = useAuth()
  const language = i18n.language === 'ar' ? 'ar' : 'en'
  const formats = useReceiptFormats(language, t)
  // { receipts, counts } | null (first load)
  const [data, setData] = useState(null)
  // null | 'forbidden' | 'network' | 'server' (shown only while no list is loaded)
  const [errorKind, setErrorKind] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [range, setRange] = useState('')
  // Receipt whose review dialog is open, or null.
  const [reviewing, setReviewing] = useState(null)

  useEffect(() => {
    let isActive = true
    getPaymentReceipts(token)
      .then((loaded) => {
        if (!isActive) return
        setData(loaded)
        setErrorKind(null)
      })
      .catch((error) => {
        if (!isActive) return
        if (error?.status === 401) {
          logout()
          return
        }
        // A failed reload after a review keeps the list already shown.
        setErrorKind(error?.status === 403 ? 'forbidden' : isConnectionFailure(error) ? 'network' : 'server')
      })
    return () => {
      isActive = false
    }
  }, [attempt, token, logout])

  const reload = () => setAttempt((count) => count + 1)
  const retry = () => {
    setErrorKind(null)
    reload()
  }

  const localized = (booking, field) =>
    booking[`${field}_${language}`] || booking[`${field}_${language === 'ar' ? 'en' : 'ar'}`] || null

  const receipts = data?.receipts ?? []
  const counts = Object.fromEntries(
    RECEIPT_STATUSES.map((key) => [key, receipts.filter((receipt) => receipt.status === key).length]),
  )

  // Search: the booking number ("4809", "PV-4809", "#PV-4809") or the
  // player's name.
  const query = search.trim().toLowerCase().replace(/^#/, '')
  const filtered = receipts.filter((receipt) => {
    if (status && receipt.status !== status) return false
    if (!inUploadRange(receipt.uploaded_at, range)) return false
    if (!query) return true
    const code = `pv-${receipt.booking.id ?? ''}`
    return code.includes(query) || String(receipt.booking.id ?? '') === query || (receipt.booking.player_name ?? '').toLowerCase().includes(query)
  })

  const isLoading = !data && !errorKind
  const showError = !data && errorKind
  const hasFilters = query !== '' || status !== '' || range !== ''

  // Saved by the dialog: show the new status at once, then read the lists
  // again from the backend.
  const applyReview = (saved) => {
    setData((loaded) =>
      loaded
        ? {
            ...loaded,
            receipts: loaded.receipts.map((receipt) => (receipt.id === saved.id ? { ...receipt, ...saved } : receipt)),
          }
        : loaded,
    )
    reload()
  }

  const verify = async (receipt) => {
    try {
      const saved = await verifyPaymentReceipt(receipt.id, token)
      applyReview(saved)
      setReviewing(null)
      showToast(t('adminPayments.verifiedToast', { code: formats.bookingCode(receipt.booking.id) }))
    } catch (error) {
      if (error?.status === 401) logout()
      throw error
    }
  }

  const reject = async (receipt, reason) => {
    try {
      const saved = await rejectPaymentReceipt(receipt.id, reason, token)
      applyReview(saved)
      setReviewing(null)
      showToast(t('adminPayments.rejectedToast', { code: formats.bookingCode(receipt.booking.id) }))
    } catch (error) {
      if (error?.status === 401) logout()
      throw error
    }
  }

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      venue={null}
      roleLabelKey="dashboardLayout.roles.admin"
      subtitle={t('dashboardLayout.roles.admin')}
      brandMark
    >
      <header className="apr-header">
        <h1 className="apr-title">{t('adminPayments.title')}</h1>
        <p className="apr-subtitle">{t('adminPayments.subtitle')}</p>
      </header>

      <section className="apr-stats" aria-label={t('adminPayments.title')}>
        {RECEIPT_STATUSES.map((key) => {
          const Icon = STAT_ICONS[key]
          return (
            <article key={key} className={`apr-stat apr-stat-${key}`}>
              <div className="apr-stat-top">
                <span className={`apr-stat-icon apr-stat-icon-${key}`} aria-hidden="true">
                  <Icon size={16} />
                </span>
                {key === 'pending' && <span className="apr-priority">{t('adminPayments.stats.priority')}</span>}
              </div>
              {data ? (
                <p className="apr-stat-value">{counts[key]}</p>
              ) : (
                <span className="apr-skeleton pv-shimmer apr-skeleton-value" aria-hidden="true" />
              )}
              <p className="apr-stat-label">{t(`adminPayments.stats.${key}`)}</p>
            </article>
          )
        })}
      </section>

      <section className="apr-card" aria-labelledby="apr-table-title">
        <h2 id="apr-table-title" className="apr-visually-hidden">
          {t('adminPayments.tableLabel')}
        </h2>

        <div className="apr-filters">
          <div className="apr-search">
            <Input
              icon={Search}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('adminPayments.searchPlaceholder')}
              aria-label={t('adminPayments.searchPlaceholder')}
            />
          </div>
          <select
            className="apr-select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label={t('adminPayments.statusLabel')}
          >
            <option value="">{t('adminPayments.allStatuses')}</option>
            {RECEIPT_STATUSES.map((key) => (
              <option key={key} value={key}>
                {t(`adminPayments.status.${key}`)}
              </option>
            ))}
          </select>
          <select
            className="apr-select"
            value={range}
            onChange={(event) => setRange(event.target.value)}
            aria-label={t('adminPayments.dateLabel')}
          >
            <option value="">{t('adminPayments.dates.all')}</option>
            {DATE_RANGES.map((key) => (
              <option key={key} value={key}>
                {t(`adminPayments.dates.${key}`)}
              </option>
            ))}
          </select>
        </div>

        {data && (receipts.length > 0 || hasFilters) && (
          <p className="apr-count">{t('adminPayments.showing', { shown: filtered.length, total: receipts.length })}</p>
        )}

        {(isLoading || (data && receipts.length > 0)) && (
          <div className="apr-table-scroll">
            <table className="apr-table" aria-busy={isLoading}>
              <thead>
                <tr>
                  {['booking', 'player', 'venue', 'slot', 'uploadedAt', 'receipt', 'status', 'action'].map((column) => (
                    <th key={column} scope="col">
                      {t(`adminPayments.columns.${column}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: SKELETON_ROWS }, (_, row) => (
                    <tr key={`skeleton-${row}`} aria-hidden="true">
                      {['code', 'name', 'venue', 'slot', 'date', 'thumb', 'badge', 'button'].map((column) => (
                        <td key={column}>
                          <span className={`apr-skeleton pv-shimmer apr-skeleton-${column}`} />
                        </td>
                      ))}
                    </tr>
                  ))}

                {filtered.map((receipt) => {
                  const { booking } = receipt
                  const code = formats.bookingCode(booking.id)
                  const isPending = receipt.status === 'pending'
                  return (
                    <tr key={receipt.id} className={isPending ? 'apr-row-pending' : undefined}>
                      <td className="apr-code">
                        <bdi dir="ltr">{code}</bdi>
                      </td>
                      <td className="apr-player">
                        <bdi>{booking.player_name || t('adminPayments.notAvailable')}</bdi>
                      </td>
                      <td className="apr-muted">
                        <bdi>{localized(booking, 'venue') || t('adminPayments.notAvailable')}</bdi>
                      </td>
                      <td>
                        <span className="apr-slot">
                          <span className="apr-slot-date">
                            {formats.slotDate(booking.slot_date) || t('adminPayments.notAvailable')}
                          </span>
                          {formats.slotTime(booking.start_time, booking.end_time) && (
                            <bdi className="apr-slot-time">{formats.slotTime(booking.start_time, booking.end_time)}</bdi>
                          )}
                        </span>
                      </td>
                      <td className="apr-uploaded">
                        <bdi>{formats.moment(receipt.uploaded_at) || '—'}</bdi>
                      </td>
                      <td>
                        <ReceiptThumb
                          src={receipt.image_url}
                          alt={t('adminPayments.receiptAlt', { code })}
                          label={t('adminPayments.noImage')}
                          failedLabel={t('adminPayments.imageFailed')}
                        />
                      </td>
                      <td>
                        {receipt.status && (
                          <span className={`apr-status apr-status-${receipt.status}`}>
                            <span className="apr-status-dot" aria-hidden="true" />
                            {t(`adminPayments.status.${receipt.status}`)}
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={isPending ? 'apr-review apr-review-primary' : 'apr-review'}
                          onClick={() => setReviewing(receipt)}
                        >
                          {t('adminPayments.reviewButton')}
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {data && receipts.length > 0 && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="apr-no-results">
                      {t('adminPayments.noResults')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {data && receipts.length === 0 && (
          <div className="apr-state" role="status">
            <ReceiptText className="apr-state-icon" size={40} aria-hidden="true" />
            <p className="apr-state-title">{t('adminPayments.empty')}</p>
          </div>
        )}

        {showError && (
          <div className="apr-state" role="alert">
            {errorKind === 'network' ? (
              <WifiOff className="apr-state-icon" size={48} aria-hidden="true" />
            ) : (
              <CircleAlert className="apr-state-icon apr-state-icon-error" size={44} aria-hidden="true" />
            )}
            <p className="apr-state-title">{t('adminPayments.errorState.title')}</p>
            <p className="apr-state-text">{t(`adminPayments.errorState.${errorKind}`)}</p>
            {errorKind !== 'forbidden' && (
              <button type="button" className="apr-retry" onClick={retry}>
                {t('adminPayments.errorState.retry')}
              </button>
            )}
          </div>
        )}
      </section>

      {reviewing && (
        <ReviewReceiptDialog
          receipt={reviewing}
          venueName={localized(reviewing.booking, 'venue')}
          formats={formats}
          onClose={() => setReviewing(null)}
          onVerify={() => verify(reviewing)}
          onReject={(reason) => reject(reviewing, reason)}
          onStale={reload}
        />
      )}
    </DashboardLayout>
  )
}

export default AdminPayments
