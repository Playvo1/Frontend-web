import { MOCK_VENUE_OWNER_BOOKINGS } from '../mocks/mockVenueOwnerBookings.js'
import { MOCK_VENUE_OWNER_BOOKING_TIMELINE } from '../mocks/mockVenueOwnerBookingTimeline.js'

// Venue Owner bookings service — MOCK only for now.
//
// The backend (github.com/Playvo1/Backend @ 3c2c09f) has no owner bookings
// endpoint, so this returns local mock data and never makes a network
// request, even when VITE_API_BASE_URL is set. When the backend adds the
// endpoint, implement the real call here (via apiClient.js) and map its
// response to the same shape; the page will not need to change.
//
// getVenueOwnerBookings() -> Promise<[{
//   id, captain_name, slot_date, start_time, end_time, total_price,
//   status: 'pending_payment' | 'confirmed' | 'cancelled',
// }]>
export async function getVenueOwnerBookings() {
  return structuredClone(MOCK_VENUE_OWNER_BOOKINGS)
}

// getVenueOwnerBookingDetails(id) -> Promise<booking & { timeline } | null>
// One booking (same fields as above) plus its timeline for the details page:
// timeline: { created_at, payment_verified_at, confirmed_at } | null.
// Resolves null when no booking has that id.
export async function getVenueOwnerBookingDetails(id) {
  const booking = MOCK_VENUE_OWNER_BOOKINGS.find((item) => String(item.id) === String(id))
  if (!booking) return null
  return structuredClone({ ...booking, timeline: MOCK_VENUE_OWNER_BOOKING_TIMELINE[booking.id] ?? null })
}
