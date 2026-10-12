import { MOCK_VENUE_OWNER_ANALYTICS } from '../mocks/mockVenueOwnerAnalytics.js'

// Venue Owner analytics service — MOCK for now.
//
// There is no documented endpoint for a venue owner's analytics (bookings,
// revenue, occupancy, peak hours), so this returns local mock data and makes
// no network request. When the endpoint is confirmed, implement the call
// here (via apiClient.js) and map its response to the same shape.
//
// getVenueOwnerAnalytics() -> Promise<{
//   summary: { bookings_count, revenue, occupancy_percent },
//   trend: [{ date: 'YYYY-MM-DD', bookings, revenue }],
//   peak_hours: [{ hour: 'HH:mm', bookings }],
// }>
export async function getVenueOwnerAnalytics() {
  return structuredClone(MOCK_VENUE_OWNER_ANALYTICS)
}
