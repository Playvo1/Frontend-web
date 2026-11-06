import { IS_API_ENABLED } from '../config/api.js'
import { MOCK_VENUE_OWNER_BOOKINGS } from '../mocks/mockVenueOwnerBookings.js'
import { MOCK_VENUE_OWNER_BOOKING_TIMELINE } from '../mocks/mockVenueOwnerBookingTimeline.js'
import { apiRequest } from './apiClient.js'
import { absoluteUrl, getVenueOwnerFacility } from './facilityService.js'

// Venue Owner bookings service.
//
// API mode (VITE_API_BASE_URL set) — backend contract (OwnerBookingController
// @index, routes/api.php on main):
//   GET /api/v1/venue_owner/owner/bookings?venue_id={id}&page={n}
//   (Bearer token, role venue_owner)
//   - venue_id: the signed-in owner's venue, read from
//     GET /venue_owner/owner/myvenues (facilityService) — never a fixed id.
//     Note (main @ 2a985ff): the backend does not read venue_id; it uses
//     the owner's venue from the token (404 "No venue found for this
//     owner." without one). One venue per owner (backend rule): a second
//     venue's bookings cannot be asked for separately. venue_id is still
//     sent so the request matches the documented contract.
//   - status (pending_payment | confirmed | cancelled) is optional; it is not
//     sent: the page filters by status in the browser on the full list.
//   - Laravel paginator, 10 per page (no per_page parameter):
//     data: { bookings: { data: [...], current_page, last_page, total, ... },
//             weekly_stats: { total_bookings, income } }
//     each booking: { id, captain_name, captain_role, captain_phone,
//       total_price ("100.00"), status, created_at,
//       time_slot: { venue_id, sport_id, slot_date, start_time "HH:mm:ss",
//                    end_time, ... }, captain: {...} }
// Every page is fetched so the page's search, date / status filters and
// pagination work on all of the owner's bookings. No venue / more than one
// venue linked: facilityService's FACILITY_NONE / FACILITY_MULTIPLE errors
// are passed through. Other errors are the apiClient's ApiError (.status: 0
// network, 401, 403, 422, 5xx); the page decides what to show.
//
// Demo mode (no VITE_API_BASE_URL): the local mock list, as before.

// Safety stop for the page loop (10 bookings per page).
const MAX_PAGES = 100

// "2026-10-14" or "2026-10-14T00:00:00.000000Z" -> "2026-10-14".
function toIsoDate(value) {
  return typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : ''
}

// "21:00:00" -> "21:00".
function toHourMinute(value) {
  return typeof value === 'string' && value.length >= 5 ? value.slice(0, 5) : ''
}

// Backend booking -> the booking shape the page uses (field names kept).
function toBooking(item, venue) {
  const slot = item.time_slot ?? {}
  return {
    id: item.id,
    venue_id: slot.venue_id ?? venue.id,
    venue_name_ar: venue.name_ar,
    venue_name_en: venue.name_en,
    sport_id: slot.sport_id ?? null,
    slot_date: toIsoDate(slot.slot_date),
    start_time: toHourMinute(slot.start_time),
    end_time: toHourMinute(slot.end_time),
    captain_name: item.captain_name ?? '',
    captain_role: item.captain_role ?? null,
    captain_phone: item.captain_phone ?? null,
    total_price: Number(item.total_price ?? 0),
    status: item.status,
    created_at: item.created_at ?? null,
  }
}

async function fetchAllOwnerBookings(token) {
  const venue = await getVenueOwnerFacility({ token })
  if (!venue?.id) throw new Error('The owner venue could not be read.')

  const bookings = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const query = new URLSearchParams({ venue_id: String(venue.id), page: String(page) })
    const body = await apiRequest(`/venue_owner/owner/bookings?${query}`, { token })
    const paginator = body?.data?.bookings
    if (!paginator || !Array.isArray(paginator.data)) {
      throw new Error('Unexpected bookings response.')
    }
    bookings.push(...paginator.data.map((item) => toBooking(item, venue)))
    const lastPage = Number(paginator.last_page) || 1
    if (paginator.data.length === 0 || page >= lastPage) break
  }
  return bookings
}

// getVenueOwnerBookings(token) -> Promise<[{
//   id, venue_id, venue_name_ar, venue_name_en, sport_id, captain_name,
//   captain_role, captain_phone, slot_date, start_time, end_time,
//   total_price, status: 'pending_payment' | 'confirmed' | 'cancelled',
//   created_at,
// }]>
// (The mock list only has the fields the table shows.)
export async function getVenueOwnerBookings(token) {
  if (!IS_API_ENABLED) return structuredClone(MOCK_VENUE_OWNER_BOOKINGS)
  return fetchAllOwnerBookings(token)
}

// Booking details (VenueOwnerBookingDetails page).
//
// API mode — backend contract (OwnerBookingController@show, routes/api.php on
// main @ 3de1a84, auth:sanctum + role:venue_owner; the backend only returns
// a booking of the token owner's venue):
//   GET /api/v1/venue_owner/owner/bookings/{id}
//   data: the booking row { id, time_slot_id, captain_user_id, captain_name,
//     captain_role, captain_phone, total_price ("100.00"), status
//     (pending_payment | confirmed | cancelled), hold_expires_at, created_at,
//     ... } with
//     captain: the player's user { id, name, email, phone, ... },
//     time_slot: { slot_date, start_time "HH:mm:ss", end_time, hourly_price,
//       venue: { name_ar, name_en, ... }, sport: { name_ar, name_en } },
//     payment_receipts: newest first, each { id, image_url (absolute URL),
//       status (pending | verified | rejected), uploaded_at, verified_at,
//       rejection_reason }.
//   404: no such booking for this owner's venue, or the owner has no venue.
//   403: not a venue owner. 401: signed out.
// Timeline: created_at; "payment verified" = the verified receipt's
// verified_at. The backend has no separate confirmation time: verifying the
// receipt confirms the booking in the same step (AdminPaymentReceiptController
// @verify), so "confirmed" uses that time only when the booking is confirmed.
// The backend has no paid-amount field (only total_price): nothing else is
// shown as paid.
//
// getVenueOwnerBookingDetails(id, token) -> Promise<details | null>
//   null: no booking with that id (also for an id that is not a number —
//   then no request is sent). Errors are the apiClient's ApiError (.status 0
//   network, 401, 403, 5xx); the page decides what to show.
//   Demo mode: the mock booking, as before.

// Backend timestamp ("2026-11-03T10:22:05.000000Z") -> the user's local
// "YYYY-MM-DDTHH:mm" (the format the page's date helper takes), or null.
function toLocalMinute(value) {
  if (typeof value !== 'string' || !value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const text = (value) => (typeof value === 'string' && value.trim() ? value : null)

function toReceipt(item) {
  return {
    id: item.id,
    status: item.status,
    image_url: absoluteUrl(text(item.image_url)),
    uploaded_at: toLocalMinute(item.uploaded_at ?? item.created_at),
    verified_at: toLocalMinute(item.verified_at),
    rejection_reason: text(item.rejection_reason),
  }
}

function toBookingDetails(item) {
  if (!item || typeof item !== 'object' || item.id == null) throw new Error('Unexpected booking response.')
  const slot = item.time_slot ?? {}
  const venue = slot.venue ?? {}
  const sport = slot.sport ?? {}
  const receipts = Array.isArray(item.payment_receipts) ? item.payment_receipts.map(toReceipt) : []
  const verified = receipts.find((receipt) => receipt.status === 'verified') ?? null
  return {
    id: item.id,
    status: item.status,
    venue_id: slot.venue_id ?? null,
    venue_name_ar: text(venue.name_ar),
    venue_name_en: text(venue.name_en),
    sport_name_ar: text(sport.name_ar),
    sport_name_en: text(sport.name_en),
    slot_date: toIsoDate(slot.slot_date),
    start_time: toHourMinute(slot.start_time),
    end_time: toHourMinute(slot.end_time),
    total_price: Number(item.total_price ?? 0),
    captain_name: text(item.captain_name) ?? text(item.captain?.name) ?? '',
    captain_role: text(item.captain_role),
    captain_phone: text(item.captain_phone) ?? text(item.captain?.phone),
    captain_email: text(item.captain?.email),
    hold_expires_at: toLocalMinute(item.hold_expires_at),
    // Newest receipt (the backend sends them newest first) and its status:
    // 'none' when no receipt was uploaded.
    receipt: receipts[0] ?? null,
    payment_status: receipts[0]?.status ?? 'none',
    timeline: {
      created_at: toLocalMinute(item.created_at),
      payment_verified_at: verified?.verified_at ?? null,
      confirmed_at: item.status === 'confirmed' ? (verified?.verified_at ?? null) : null,
    },
  }
}

export async function getVenueOwnerBookingDetails(id, token) {
  if (IS_API_ENABLED) {
    if (!/^\d+$/.test(String(id ?? ''))) return null
    try {
      const body = await apiRequest(`/venue_owner/owner/bookings/${encodeURIComponent(id)}`, { token })
      return toBookingDetails(body?.data)
    } catch (error) {
      if (error?.status === 404) return null
      throw error
    }
  }
  const booking = MOCK_VENUE_OWNER_BOOKINGS.find((item) => String(item.id) === String(id))
  if (!booking) return null
  return structuredClone({ ...booking, timeline: MOCK_VENUE_OWNER_BOOKING_TIMELINE[booking.id] ?? null })
}
