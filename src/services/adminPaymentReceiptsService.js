import { IS_API_ENABLED } from '../config/api.js'
import { apiRequest } from './apiClient.js'
import { absoluteUrl } from './facilityService.js'

// Admin "Payment receipts" page (/admin/payments).
//
// Backend: Playvo1/Backend main @ 28ced0c, AdminPaymentReceiptController
// (admin group: auth:sanctum + role:admin). Deployed on Render (checked with
// GET requests only: 401 without a token).
//   GET /admin/payment-receipts?status=pending|verified|rejected
//       ONE status per request (pending by default), oldest first
//       (created_at), no pagination, search or date filter. Each item is the
//       receipt with booking.time_slot.venue and booking.captain loaded.
//   PUT /admin/payment-receipts/{id}/verify
//       Confirms the booking (booking confirmed, slot booked) and notifies the
//       player and the venue owner. 422 with a message when the receipt is no
//       longer pending, was already used for another booking (same image
//       hash), the booking is no longer awaiting payment, its slot is no longer
//       held, or the booking / player is missing. 404 unknown id.
//   PUT /admin/payment-receipts/{id}/reject   { reason } (required, max 1000)
//       Cancels the booking, makes the slot available again and notifies the
//       player with the reason. 422 when no longer pending, or a reason error.
//
// Privacy: the list returns the player's whole account (email, phone,
// google_id, …), the booking's share_token and the receipt hash (backend
// issue BE-01). Only the fields the page shows are kept below; nothing else
// is stored, displayed or logged.
//
// Demo mode (no VITE_API_BASE_URL): the mock receipts, loaded on demand and
// kept in memory for the session (verify / reject change them until the page
// is reloaded). API builds leave the mock module out (see vite.config.js).
// Demo receipts have no image: the page shows a placeholder icon.

export const RECEIPT_STATUSES = ['pending', 'verified', 'rejected']
export const MAX_REJECTION_REASON = 1000

// Demo mode list (in memory, reset on reload).
let demoReceipts = null
async function demoList() {
  if (!demoReceipts) {
    const { MOCK_ADMIN_PAYMENT_RECEIPTS } = await import('../mocks/mockAdminPaymentReceipts.js')
    demoReceipts ??= structuredClone(MOCK_ADMIN_PAYMENT_RECEIPTS)
  }
  return demoReceipts
}

const textOrNull = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null)
const numberOrNull = (value) =>
  value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)
// "2026-11-20", "2026-11-20 00:00:00" or "2026-11-20T00:00:00.000000Z" -> "2026-11-20"
const dateOnly = (value) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null)
// "21:00:00" -> "21:00"
const hourMinute = (value) => (typeof value === 'string' && /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : null)

// A backend receipt -> only what the page shows.
function toReceipt(item) {
  const booking = item?.booking ?? null
  const slot = booking?.time_slot ?? booking?.timeSlot ?? null
  const venue = slot?.venue ?? null
  return {
    id: item.id,
    status: RECEIPT_STATUSES.includes(item.status) ? item.status : null,
    image_url: absoluteUrl(textOrNull(item.image_url)) || null,
    uploaded_at: item.uploaded_at ?? item.created_at ?? null,
    verified_at: item.verified_at ?? null,
    rejection_reason: textOrNull(item.rejection_reason),
    booking: {
      id: booking?.id ?? item.booking_id ?? null,
      player_name: textOrNull(booking?.captain_name) ?? textOrNull(booking?.captain?.name),
      venue_ar: textOrNull(venue?.name_ar),
      venue_en: textOrNull(venue?.name_en),
      slot_date: dateOnly(slot?.slot_date),
      start_time: hourMinute(slot?.start_time),
      end_time: hourMinute(slot?.end_time),
      total_price: numberOrNull(booking?.total_price),
    },
  }
}

const time = (value) => {
  const ms = value ? Date.parse(value) : NaN
  return Number.isNaN(ms) ? 0 : ms
}

// Pending first, oldest first (the review queue, as the backend orders it),
// then the reviewed ones, newest first (as in the design).
function sortReceipts(list) {
  const pending = list.filter((receipt) => receipt.status === 'pending')
  const reviewed = list.filter((receipt) => receipt.status !== 'pending')
  pending.sort((a, b) => time(a.uploaded_at) - time(b.uploaded_at) || a.id - b.id)
  reviewed.sort((a, b) => time(b.uploaded_at) - time(a.uploaded_at) || b.id - a.id)
  return [...pending, ...reviewed]
}

// getPaymentReceipts(token) -> Promise<{
//   receipts: [{ id, status, image_url, uploaded_at, verified_at,
//     rejection_reason, booking: { id, player_name, venue_ar, venue_en,
//     slot_date, start_time, end_time, total_price } }],
//   counts: { pending, verified, rejected },
// }>
//   API: the three statuses requested together (the backend returns one
//   status per request); a failure of any of them rejects with its error.
export async function getPaymentReceipts(token) {
  let list
  if (!IS_API_ENABLED) {
    list = structuredClone(await demoList())
  } else {
    const bodies = await Promise.all(
      RECEIPT_STATUSES.map((status) => apiRequest(`/admin/payment-receipts?status=${status}`, { token })),
    )
    list = bodies.flatMap((body) => {
      if (!Array.isArray(body?.data)) throw new Error('Unexpected payment receipts response.')
      return body.data.filter((item) => item && item.id !== undefined).map(toReceipt)
    })
  }
  const counts = Object.fromEntries(
    RECEIPT_STATUSES.map((status) => [status, list.filter((receipt) => receipt.status === status).length]),
  )
  return { receipts: sortReceipts(list), counts }
}

// verifyPaymentReceipt(id, token) -> Promise<{ id, status: 'verified', verified_at }>
export async function verifyPaymentReceipt(id, token) {
  if (!IS_API_ENABLED) {
    const receipt = (await demoList()).find((item) => item.id === id)
    if (!receipt) throw Object.assign(new Error('Not found.'), { status: 404 })
    if (receipt.status !== 'pending') {
      throw Object.assign(new Error('This receipt is no longer pending.'), { status: 422 })
    }
    receipt.status = 'verified'
    receipt.verified_at = new Date().toISOString()
    return { id, status: 'verified', verified_at: receipt.verified_at }
  }
  await apiRequest(`/admin/payment-receipts/${encodeURIComponent(id)}/verify`, { method: 'PUT', token })
  return { id, status: 'verified', verified_at: new Date().toISOString() }
}

// rejectPaymentReceipt(id, reason, token) -> Promise<{ id, status: 'rejected', rejection_reason }>
export async function rejectPaymentReceipt(id, reason, token) {
  const text = String(reason ?? '').trim()
  if (!IS_API_ENABLED) {
    const receipt = (await demoList()).find((item) => item.id === id)
    if (!receipt) throw Object.assign(new Error('Not found.'), { status: 404 })
    if (receipt.status !== 'pending') {
      throw Object.assign(new Error('This receipt is no longer pending.'), { status: 422 })
    }
    receipt.status = 'rejected'
    receipt.rejection_reason = text
    return { id, status: 'rejected', rejection_reason: text }
  }
  const body = await apiRequest(`/admin/payment-receipts/${encodeURIComponent(id)}/reject`, {
    method: 'PUT',
    token,
    body: { reason: text },
  })
  return { id, status: 'rejected', rejection_reason: textOrNull(body?.data?.reason) ?? text }
}

// Backend 422 messages (AdminPaymentReceiptController) -> translation keys.
const REVIEW_MESSAGES = [
  [/no longer pending/i, 'notPending'],
  [/already been used/i, 'alreadyUsed'],
  [/no longer awaiting payment/i, 'notAwaitingPayment'],
  [/time slot is no longer available/i, 'slotUnavailable'],
  [/booking or time slot was not found/i, 'bookingMissing'],
  [/player was not found/i, 'playerMissing'],
]

// reviewErrorKey(error) -> key under adminPayments.review.errors
export function reviewErrorKey(error) {
  if (error?.status === 422) {
    if (error.errors && typeof error.errors === 'object' && error.errors.reason) return 'reason'
    const match = REVIEW_MESSAGES.find(([pattern]) => pattern.test(error.message ?? ''))
    return match ? match[1] : 'invalid'
  }
  if (error?.status === 404) return 'notFound'
  if (error?.status === 403) return 'forbidden'
  if (error?.status === 0) return 'network'
  return 'server'
}
