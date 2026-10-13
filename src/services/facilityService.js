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

// ---------------------------------------------------------------------------
// Venue cover photo ("Edit venue photo" on the "My venue" page).
//
// NOT CONNECTED: there is no documented or implemented endpoint to change a
// venue's cover photo (none on the backend's main branch @ 0d2ff90, and no
// cover / primary-image field in its venue or image data). This function
// makes NO network request and stores nothing: it always rejects with
// code COVER_SAVE_NOT_AVAILABLE, so the page can never report a save that
// did not happen.
//
// The only venue image upload on the backend today is
//   POST /api/v1/venue_owner/owner/venues/{venue}/images
//   multipart/form-data: image (jpg, jpeg, png, webp; max 5120 KB),
//                        sort_order (optional integer >= 0)
//   -> 201, data: the created image { id, image_url, sort_order, ... }
// It adds a photo to the venue's gallery; it does not set a cover. Before
// linking, the backend team must confirm:
//   1. how a cover is set (a dedicated endpoint, a field such as a flag on
//      an image, or "the image with the lowest sort_order");
//   2. where the frontend gets the owner's venue id (no GET owner/venues);
//   3. the upload field name: the backend validates "image", the Team
//      Development Guidelines say "file";
//   4. that apiClient.js can send FormData (it only sends JSON today).
// Then implement the request here and resolve with the saved cover URL.
//
// saveVenueCoverImage(file: File) -> Promise<{ cover_image_url: string }>
// (the parameter is unused until the request is implemented)
// ---------------------------------------------------------------------------

// Accepted cover images: the backend's rule for venue images
// (mimes:jpg,jpeg,png,webp, max:5120 KB).
export const COVER_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const COVER_IMAGE_MAX_BYTES = 5120 * 1024

export const COVER_SAVE_NOT_AVAILABLE = 'COVER_SAVE_NOT_AVAILABLE'

export async function saveVenueCoverImage(_file) {
  const error = new Error('Saving the venue cover photo is not available yet.')
  error.code = COVER_SAVE_NOT_AVAILABLE
  throw error
}
