import { MOCK_VENUE_OWNER_REVIEWS } from '../mocks/mockVenueOwnerReviews.js'

// Venue Owner reviews service — MOCK for now.
//
// The documented API only has the player-side POST /bookings/{id}/rating;
// there is no confirmed endpoint for a venue owner to list their venue's
// ratings and comments, so this returns local mock data and makes no network
// request. When the endpoint is confirmed, implement the call here (via
// apiClient.js) and map its response to the same shape.
//
// getVenueOwnerReviews() -> Promise<{
//   summary: { avg_rating, total, distribution: { 5, 4, 3, 2, 1 } },
//   reviews: [{ id, player_name, rating, comment, created_at }], // newest first
// }>
export async function getVenueOwnerReviews() {
  return structuredClone(MOCK_VENUE_OWNER_REVIEWS)
}
