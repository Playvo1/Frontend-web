import { MOCK_VENUE_OWNER_SLOTS } from '../mocks/mockVenueOwnerSlots.js'

// Venue Owner time slots service — MOCK only for now.
//
// The backend has no owner time-slots endpoint yet, so this returns local
// mock data and never makes a network request, even when VITE_API_BASE_URL
// is set. When the backend adds the endpoint, implement the real call here
// (via apiClient.js) and map its response to the same shape; the page will
// not need to change.
//
// getVenueOwnerSlots() -> Promise<[{
//   id, slot_date, start_time, end_time, hourly_price,
//   status: 'available' | 'booked', captain_name?,
// }]>
export async function getVenueOwnerSlots() {
  return structuredClone(MOCK_VENUE_OWNER_SLOTS)
}
