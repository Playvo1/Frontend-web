import { MOCK_VENUE_OWNER_FACILITY } from '../mocks/mockVenueOwnerFacility.js'

// Venue Owner facility ("My venue") service — MOCK for now.
//
// The backend is not reachable from the frontend yet and its owner venue
// endpoint is not confirmed (GET /owner/venues is not on the backend's main
// branch @ 1e2e9be), so this returns local mock data and makes no network
// request. When the endpoint is confirmed, implement the call here (via
// apiClient.js) and map its response to the same shape.
//
// getVenueOwnerFacility() -> Promise<{
//   id, name_ar, name_en, owner_name, sport_ar, sport_en, area_ar, area_en,
//   address_ar, address_en, status, surface_ar, surface_en, length_m,
//   width_m, team_format_ar, team_format_en, capacity_ar, capacity_en,
//   morning_hourly_price, evening_hourly_price, cover_image_url,
//   images: [{ id, image_url }],
// }>
export async function getVenueOwnerFacility() {
  return structuredClone(MOCK_VENUE_OWNER_FACILITY)
}
