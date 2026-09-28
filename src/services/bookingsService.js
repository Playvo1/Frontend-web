import { MOCK_VENUE_OWNER_BOOKINGS } from '../mocks/mockVenueOwnerBookings.js'

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
