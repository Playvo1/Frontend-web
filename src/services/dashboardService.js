import { MOCK_VENUE_OWNER_DASHBOARD } from '../mocks/mockVenueOwnerDashboard.js'

// Dashboard data service — MOCK only for now.
//
// The backend (github.com/Playvo1/Backend @ 3c2c09f) has no venue-owner
// dashboard endpoint, so this returns local mock data and never makes a
// network request, even when VITE_API_BASE_URL is set. When the backend
// adds the endpoint, implement the real call here (via apiClient.js) and
// map its response to the same shape; the page will not need to change.
//
// getVenueOwnerDashboard() -> Promise<{
//   venue: { name, status },
//   stats: { totalBookings, totalBookingsChangePercent, weekBookings, weekRevenue, occupancyPercent },
//   todaySchedule: [{ time, status: 'available' | 'booked', playerName }],
//   weeklyBookings: [{ day, value }],
//   weeklyRevenue: [{ day, value }],
// }>
export async function getVenueOwnerDashboard() {
  return structuredClone(MOCK_VENUE_OWNER_DASHBOARD)
}

// The owner's venue ({ name, status }) for the shared layout (sidebar venue
// card, top-bar subtitle) on the other Venue Owner pages. Same mock source.
export async function getVenueOwnerVenue() {
  return structuredClone(MOCK_VENUE_OWNER_DASHBOARD.venue)
}
