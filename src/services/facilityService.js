import { API_BASE_URL, IS_API_ENABLED } from '../config/api.js'
import { MOCK_VENUE_OWNER_FACILITY } from '../mocks/mockVenueOwnerFacility.js'
import { apiRequest } from './apiClient.js'

// Venue Owner facility ("My venue") service.
//
// With the API configured (VITE_API_BASE_URL set), the venue comes from
//   GET /api/v1/venue_owner/owner/myvenues   (Bearer token, role venue_owner)
// which returns the venues whose owner_id is the signed-in user, read from
// the token by the backend (VenueController@myVenues) — no venue id is sent
// or assumed. Business rule (backend team): one venue per Venue Owner
// account, so:
//   - no venue      → rejects with code FACILITY_NONE,
//   - several       → rejects with code FACILITY_MULTIPLE (never picks one),
//   - exactly one   → resolves with it, mapped to the shape below.
// Errors from apiClient (ApiError .status: 0 network, 401, 403, 5xx) are
// passed through; the page decides what to show. There is no fallback to
// mock data in this mode.
//
// The endpoint returns the venue row only (no images, sports or other
// relations). Fields the backend does not have are null, never invented:
// sport, surface, team format, capacity, morning / evening prices, cover.
// Images are mapped if the response ever includes them (relative
// /storage/... URLs are completed with the API host).
//
// Without a configured API (mock auth) the local mock is returned, as before.
//
// getVenueOwnerFacility({ token, user }) -> Promise<{
//   id, name_ar, name_en, owner_name, sport_ar, sport_en, area_ar, area_en,
//   address_ar, address_en, status, surface_ar, surface_en, length_m,
//   width_m, team_format_ar, team_format_en, capacity_ar, capacity_en,
//   morning_hourly_price, evening_hourly_price, cover_image_url,
//   images: [{ id, image_url }],
// }>   (null for any value the backend does not provide)

export const FACILITY_NONE = 'FACILITY_NONE'
export const FACILITY_MULTIPLE = 'FACILITY_MULTIPLE'

function codedError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

// "/storage/venues/a.jpg" -> "https://<api host>/storage/venues/a.jpg".
function absoluteUrl(url) {
  if (!url) return null
  return /^https?:\/\//i.test(url) ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

function toFacility(venue, user) {
  const images = Array.isArray(venue.images)
    ? [...venue.images]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((image) => ({ id: image.id, image_url: absoluteUrl(image.image_url) }))
        .filter((image) => image.image_url)
    : []
  return {
    id: venue.id,
    name_ar: venue.name_ar ?? null,
    name_en: venue.name_en ?? null,
    // The signed-in account is the venue's owner (owner_id = user id).
    owner_name: user?.name ?? null,
    sport_ar: null,
    sport_en: null,
    area_ar: venue.area_ar ?? null,
    area_en: venue.area_en ?? null,
    address_ar: venue.address_ar ?? null,
    address_en: venue.address_en ?? null,
    status: venue.status ?? null,
    surface_ar: null,
    surface_en: null,
    length_m: venue.length_m ?? null,
    width_m: venue.width_m ?? null,
    team_format_ar: null,
    team_format_en: null,
    capacity_ar: null,
    capacity_en: null,
    morning_hourly_price: null,
    evening_hourly_price: null,
    cover_image_url: null,
    images,
  }
}

export async function getVenueOwnerFacility({ token, user } = {}) {
  if (!IS_API_ENABLED) return structuredClone(MOCK_VENUE_OWNER_FACILITY)

  const body = await apiRequest('/venue_owner/owner/myvenues', { token })
  const venues = Array.isArray(body?.data) ? body.data : null
  if (!venues) return null
  if (venues.length === 0) throw codedError(FACILITY_NONE, 'No venue is linked to this account.')
  if (venues.length > 1) throw codedError(FACILITY_MULTIPLE, 'More than one venue is linked to this account.')
  return toFacility(venues[0], user)
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
