import { IS_API_ENABLED } from '../config/api.js'
import { MOCK_VENUE_OWNER_BOOKINGS } from '../mocks/mockVenueOwnerBookings.js'
import { MOCK_VENUE_OWNER_BOOKING_TIMELINE } from '../mocks/mockVenueOwnerBookingTimeline.js'
import { apiRequest } from './apiClient.js'

// Venue Owner bookings service.
//
// The list comes from the Laravel backend when VITE_API_BASE_URL is set:
// GET /api/v1/owner/bookings (Bearer token, role venue_owner), whose data is
// { items, total, page, per_page, weekly_stats }. Only its documented query
// parameters are used (page, per_page); search, date and status filters stay
// in the browser on the loaded list, as before. Without a configured API URL
// (mock auth) the local mock list is returned, as before.
//
// Errors are the apiClient's ApiError (with .status: 0 network, 401, 403,
// 422, 5xx); the page decides what to show.

// Largest page size the backend accepts.
const PAGE_SIZE = 100

// Backend item -> the booking shape the page uses. The page fields keep
// their backend names; the venue name is kept in both languages
// (venue_name_ar / venue_name_en) for the caller to pick by language.
function toBooking(item) {
  return {
    id: item.id,
    venue_id: item.venue_id,
    venue_name_ar: item.venue_name_ar,
    venue_name_en: item.venue_name_en,
    sport_id: item.sport_id,
    slot_date: item.slot_date,
    start_time: item.start_time,
    end_time: item.end_time,
    captain_name: item.captain_name ?? '',
    captain_role: item.captain_role,
    captain_phone: item.captain_phone,
    total_price: Number(item.total_price),
    status: item.status,
    created_at: item.created_at,
  }
}

// Fetches every page (100 per request) so the page's local search and
// filters see all of the owner's bookings.
async function fetchAllOwnerBookings(token) {
  const bookings = []
  for (let page = 1; ; page += 1) {
    const body = await apiRequest(`/owner/bookings?page=${page}&per_page=${PAGE_SIZE}`, { token })
    const items = Array.isArray(body?.data?.items) ? body.data.items : []
    bookings.push(...items.map(toBooking))
    const total = Number(body?.data?.total ?? 0)
    if (items.length === 0 || bookings.length >= total) return bookings
  }
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

// Booking details stay MOCK: the backend has no booking-details endpoint.
// getVenueOwnerBookingDetails(id) -> Promise<booking & { timeline } | null>
// One booking (same fields as above) plus its timeline for the details page:
// timeline: { created_at, payment_verified_at, confirmed_at } | null.
// Resolves null when no booking has that id.
export async function getVenueOwnerBookingDetails(id) {
  const booking = MOCK_VENUE_OWNER_BOOKINGS.find((item) => String(item.id) === String(id))
  if (!booking) return null
  return structuredClone({ ...booking, timeline: MOCK_VENUE_OWNER_BOOKING_TIMELINE[booking.id] ?? null })
}
