import { API_BASE_URL, IS_API_ENABLED } from '../config/api.js'
import { MOCK_VENUE_OWNER_FACILITY } from '../mocks/mockVenueOwnerFacility.js'
import { apiRequest } from './apiClient.js'
import { getOwnerProfile } from './ownerProfileService.js'

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
// The endpoint returns the venue row with its relations (backend main @
// 3c1e959: VenueController@myVenues, presentOwnerVenue):
//   name_ar / name_en, address_*, area_*, length_m, width_m, status,
//   description_*, surface_*, capacity_* (strings | null),
//   morning_hourly_price / evening_hourly_price (numbers | null: the venue's
//     default prices for new slots before / from 16:00),
//   min_hourly_price, latitude, longitude,
//   sports: [{ id, name_ar, name_en }]        -> sport_ar / sport_en (joined)
//   city: { name_ar, name_en, country: {...} } -> city_ar / city_en
//   images: [{ id, image_url, sort_order, is_cover }] (by sort_order)
//   cover_image_url: the backend's cover — the image marked is_cover, else
//     the first image, else null -> cover_image_url; images: the other
//     photos (as the design: the cover apart from the photos).
// Relative /storage/... URLs are completed with the API host. Values the
// backend leaves empty stay null, never invented. team_format_* is not read:
// the design has no field of its own for it (only inside the dimensions
// text, which is left as it is).
//
// Without a configured API (mock auth) the local mock is returned, as before.
//
// getVenueOwnerFacility({ token, user }) -> Promise<{
//   id, name_ar, name_en, owner_name, sport_ar, sport_en, area_ar, area_en,
//   address_ar, address_en, status, surface_ar, surface_en, length_m,
//   width_m, team_format_ar, team_format_en, capacity_ar, capacity_en,
//   morning_hourly_price, evening_hourly_price, cover_image_url,
//   cover_image_id, images: [{ id, image_url }],
//   min_hourly_price, latitude, longitude, city_ar, city_en,
// }>   (null for any value the backend does not provide)
//
// The "My venue" page reads it through getVenueOwnerFacilityDetails and
// saves through updateVenueOwnerFacility and the photo functions (below).

export const FACILITY_NONE = 'FACILITY_NONE'
export const FACILITY_MULTIPLE = 'FACILITY_MULTIPLE'

function codedError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

// "/storage/venues/a.jpg" -> "https://<api host>/storage/venues/a.jpg".
export function absoluteUrl(url) {
  if (!url) return null
  return /^https?:\/\//i.test(url) ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

// Backend images -> { cover_image_id, cover_image_url, images } (see above).
// coverUrl: the response's cover_image_url when it has one (myvenues, the
// venue update); otherwise (an images list, e.g. after "Set as cover") the
// backend's own rule is applied: is_cover, else the first image.
function toPhotos(list, coverUrl) {
  const all = Array.isArray(list)
    ? [...list]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.id ?? 0) - (b.id ?? 0))
        .map((image) => ({ id: image.id, image_url: absoluteUrl(image.image_url), is_cover: image.is_cover === true }))
        .filter((image) => image.image_url)
    : []
  const url = coverUrl === undefined ? undefined : absoluteUrl(coverUrl)
  const cover =
    url === undefined
      ? (all.find((image) => image.is_cover) ?? all[0] ?? null)
      : (all.find((image) => image.image_url === url) ?? null)
  return {
    cover_image_id: cover?.id ?? null,
    cover_image_url: url === undefined ? (cover?.image_url ?? null) : url,
    images: all.filter((image) => image !== cover).map(({ id, image_url }) => ({ id, image_url })),
  }
}

const textOrNull = (value) => (typeof value === 'string' && value.trim() ? value : null)
const numberOrNull = (value) =>
  value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)

// "a، b" (Arabic) / "a, b" (English), or null.
function joinNames(items, field, separator) {
  return (Array.isArray(items) ? items : []).map((item) => item?.[field]).filter(Boolean).join(separator) || null
}

function toFacility(venue, user) {
  const photos = toPhotos(venue.images, venue.cover_image_url)
  const city = venue.city
  const place = (suffix) =>
    [city?.[`name_${suffix}`], city?.country?.[`name_${suffix}`]].filter(Boolean).join(suffix === 'ar' ? '، ' : ', ') ||
    null
  return {
    id: venue.id,
    name_ar: venue.name_ar ?? null,
    name_en: venue.name_en ?? null,
    // The signed-in account is the venue's owner (owner_id = user id).
    owner_name: user?.name ?? null,
    sport_ar: joinNames(venue.sports, 'name_ar', '، '),
    sport_en: joinNames(venue.sports, 'name_en', ', '),
    area_ar: venue.area_ar ?? null,
    area_en: venue.area_en ?? null,
    address_ar: venue.address_ar ?? null,
    address_en: venue.address_en ?? null,
    status: venue.status ?? null,
    description_ar: textOrNull(venue.description_ar),
    description_en: textOrNull(venue.description_en),
    surface_ar: textOrNull(venue.surface_ar),
    surface_en: textOrNull(venue.surface_en),
    length_m: venue.length_m ?? null,
    width_m: venue.width_m ?? null,
    team_format_ar: null,
    team_format_en: null,
    capacity_ar: textOrNull(venue.capacity_ar),
    capacity_en: textOrNull(venue.capacity_en),
    morning_hourly_price: numberOrNull(venue.morning_hourly_price),
    evening_hourly_price: numberOrNull(venue.evening_hourly_price),
    cover_image_id: photos.cover_image_id,
    cover_image_url: photos.cover_image_url,
    images: photos.images,
    // Backend venue row: the lowest hourly price and the map position.
    min_hourly_price: venue.min_hourly_price ?? null,
    latitude: venue.latitude ?? null,
    longitude: venue.longitude ?? null,
    // City / country: "Gaza, Palestine".
    city_ar: place('ar'),
    city_en: place('en'),
  }
}

// The owner's venue list is read by several parts of a page at the same time
// (the top bar's venue name, the "My venue" / Profile / Bookings pages), and
// every Venue Owner page mounts its own layout. To avoid one request per
// caller and per page change:
//   - callers that ask while a request is running share that request;
//   - a successful answer is reused for OWNER_VENUES_TTL_MS, then read again
//     (so a venue changed on the backend shows up on a later page);
//   - errors are never kept: the next call asks the backend again;
//   - the stored answer belongs to one token: another account (or a new
//     sign-in) never sees it.
const OWNER_VENUES_TTL_MS = 60 * 1000
let ownerVenuesCache = null // { token, venues, storedAt } | { token, promise }

function fetchOwnerVenues(token) {
  const cache = ownerVenuesCache
  if (cache?.token === token) {
    if (cache.promise) return cache.promise
    if (Date.now() - cache.storedAt < OWNER_VENUES_TTL_MS) return Promise.resolve(cache.venues)
  }

  const promise = apiRequest('/venue_owner/owner/myvenues', { token }).then(
    (body) => {
      const venues = Array.isArray(body?.data) ? body.data : null
      if (ownerVenuesCache?.promise === promise) {
        ownerVenuesCache = venues ? { token, venues, storedAt: Date.now() } : null
      }
      return venues
    },
    (error) => {
      if (ownerVenuesCache?.promise === promise) ownerVenuesCache = null
      throw error
    },
  )
  ownerVenuesCache = { token, promise }
  return promise
}

function toOwnerFacility(venues, user) {
  if (!venues) return null
  if (venues.length === 0) throw codedError(FACILITY_NONE, 'No venue is linked to this account.')
  if (venues.length > 1) throw codedError(FACILITY_MULTIPLE, 'More than one venue is linked to this account.')
  return toFacility(venues[0], user)
}

export async function getVenueOwnerFacility({ token, user } = {}) {
  if (!IS_API_ENABLED) return structuredClone(MOCK_VENUE_OWNER_FACILITY)

  const venues = await fetchOwnerVenues(token)
  return toOwnerFacility(venues, user)
}

// Forget the stored venue list (after the venue was saved), so every page
// reads the saved values from the backend.
function forgetOwnerVenues() {
  ownerVenuesCache = null
}

// The venue already read for this token and still fresh (API mode), without
// a request: lets the top bar show the name at once on the next page.
// null when nothing usable is stored (not read yet, expired, another token,
// no venue or several venues).
export function peekVenueOwnerFacility({ token, user } = {}) {
  const cache = ownerVenuesCache
  if (!IS_API_ENABLED || !cache || cache.token !== token || !cache.venues) return null
  if (Date.now() - cache.storedAt >= OWNER_VENUES_TTL_MS) return null
  try {
    return toOwnerFacility(cache.venues, user)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// "My venue" page: details, saving and photos (API mode). Checked against the
// backend (main @ 3de1a84) and its live responses (GET only).
//
// getVenueOwnerFacilityDetails({ token, user }) -> Promise<facility & {
//   imagesStatus: 'loaded',
// }>
//   The owner's venue (getVenueOwnerFacility above): myvenues already has its
//   sports, city / country and images (also for an inactive venue).
//   owner_name: the owner's account name from the Profile endpoint
//   (GET /venue_owner/owner/profile -> data.owner.name, through
//   ownerProfileService, read at the same time as the venue); null when it
//   is empty or cannot be read (the page shows "Not available"). A 401 is
//   passed through (the page signs out). Demo mode: the mock.
export async function getVenueOwnerFacilityDetails({ token, user } = {}) {
  if (!IS_API_ENABLED) {
    const facility = await getVenueOwnerFacility({ token, user })
    return facility && { ...facility, imagesStatus: 'loaded' }
  }
  const [facility, ownerName] = await Promise.all([
    getVenueOwnerFacility({ token, user }),
    getOwnerProfile({ token }).then(
      (profile) => profile.name.trim() || null,
      (error) => {
        if (error?.status === 401) throw error
        return null
      },
    ),
  ])
  return facility && { ...facility, owner_name: ownerName, imagesStatus: 'loaded' }
}

// Fields the backend lets the owner change (UpdateVenueRequest, main @
// 3c1e959; a partial update — only the keys sent are changed):
//   PUT /api/v1/venue_owner/owner/venues/{id}   (JSON)
//   name_ar, name_en: required strings when sent (max 255)
//   address_ar, address_en: required strings when sent (max 255)
//   area_*, surface_*, capacity_*: nullable strings (max 255)
//   description_*: nullable strings (max 2000)
//   length_m, width_m: nullable numbers 0–1000
//   morning_hourly_price, evening_hourly_price: nullable numbers 0–10000
//   -> 200, data: the saved venue, same shape as a myvenues item; 403 not
//      the owner; 404; 422 with field errors. status (admin only), owner,
//      city, ratings and min_hourly_price are ignored by the backend.
// The form edits the current language's texts; the owner name, status and
// sport are not editable here.
export const FACILITY_EDITABLE_FIELDS = [
  'name',
  'description',
  'area',
  'address',
  'surface',
  'dimensions',
  'capacity',
  'morningPrice',
  'eveningPrice',
]

const UPDATE_TEXT_FIELDS = [
  'name_ar',
  'name_en',
  'address_ar',
  'address_en',
  'area_ar',
  'area_en',
  'description_ar',
  'description_en',
  'surface_ar',
  'surface_en',
  'capacity_ar',
  'capacity_en',
]
const UPDATE_NUMBER_FIELDS = ['length_m', 'width_m', 'morning_hourly_price', 'evening_hourly_price']

// The changed fields only: { [field]: value } (an emptied text is null).
export function changedFacilityFields(facility, updated) {
  const changes = {}
  for (const field of UPDATE_TEXT_FIELDS) {
    const before = textOrNull(facility[field])?.trim() ?? null
    const after = textOrNull(updated[field])?.trim() ?? null
    if (after !== before) changes[field] = after
  }
  for (const field of UPDATE_NUMBER_FIELDS) {
    const before = numberOrNull(facility[field])
    const after = numberOrNull(updated[field])
    if (after !== before) changes[field] = after
  }
  return changes
}

// updateVenueOwnerFacility(facility, changes, { token, user }) -> Promise<facility>
//   changes: the changed fields only (changedFacilityFields).
//   Resolves with the facility read from the saved venue; the owner name
//   (Profile endpoint) is kept, and the photos / sports / city too when the
//   answer has none.
export async function updateVenueOwnerFacility(facility, changes, { token, user } = {}) {
  const body = await apiRequest(`/venue_owner/owner/venues/${encodeURIComponent(facility.id)}`, {
    method: 'PUT',
    token,
    body: changes,
  })
  const saved = body?.data
  if (!saved || typeof saved !== 'object') throw new Error('Unexpected venue response.')
  forgetOwnerVenues()
  const fresh = toFacility(saved, user)
  return {
    ...facility,
    ...fresh,
    owner_name: facility.owner_name,
    ...(Array.isArray(saved.images)
      ? {}
      : { cover_image_id: facility.cover_image_id, cover_image_url: facility.cover_image_url, images: facility.images }),
    ...(Array.isArray(saved.sports) ? {} : { sport_ar: facility.sport_ar, sport_en: facility.sport_en }),
    ...(saved.city ? {} : { city_ar: facility.city_ar, city_en: facility.city_en }),
    imagesStatus: facility.imagesStatus,
  }
}

// Venue photos (VenueController, owner of the venue only; 403 otherwise):
//   POST   /api/v1/venue_owner/owner/venues/{id}/images
//          multipart/form-data: image (jpg, jpeg, png, webp; max 5120 KB)
//          -> 201, data: { id, image_url (Cloudinary URL), sort_order, ... }
//   PUT    /api/v1/venue_owner/owner/venues/{id}/images/{imageId}/cover
//          -> 200, data: all the venue's images (is_cover on the new cover)
//   DELETE /api/v1/venue_owner/owner/venues/{id}/images/{imageId}
//          -> 200, data: null
//   404 when the image is not the venue's. Every successful change forgets
//   the stored venue list, so other pages read the new photos.
export const VENUE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const VENUE_IMAGE_MAX_BYTES = 5120 * 1024

// uploadVenueImage(venueId, file, { token }) -> Promise<{ id, image_url }>
export async function uploadVenueImage(venueId, file, { token } = {}) {
  const form = new FormData()
  form.append('image', file)
  const body = await apiRequest(`/venue_owner/owner/venues/${encodeURIComponent(venueId)}/images`, {
    method: 'POST',
    token,
    body: form,
  })
  const image = body?.data
  const imageUrl = absoluteUrl(image?.image_url)
  if (!image || !imageUrl) throw new Error('Unexpected image response.')
  forgetOwnerVenues()
  return { id: image.id, image_url: imageUrl }
}

// setVenueCoverImage(venueId, imageId, { token })
//   -> Promise<{ cover_image_id, cover_image_url, images }> (the saved photos)
export async function setVenueCoverImage(venueId, imageId, { token } = {}) {
  const body = await apiRequest(
    `/venue_owner/owner/venues/${encodeURIComponent(venueId)}/images/${encodeURIComponent(imageId)}/cover`,
    { method: 'PUT', token },
  )
  if (!Array.isArray(body?.data)) throw new Error('Unexpected images response.')
  forgetOwnerVenues()
  return toPhotos(body.data)
}

// deleteVenueImage(venueId, imageId, { token }) -> Promise<void>
export async function deleteVenueImage(venueId, imageId, { token } = {}) {
  await apiRequest(`/venue_owner/owner/venues/${encodeURIComponent(venueId)}/images/${encodeURIComponent(imageId)}`, {
    method: 'DELETE',
    token,
  })
  forgetOwnerVenues()
}

// ---------------------------------------------------------------------------
// Venue cover photo ("Edit venue photo" in the cover banner of the "My venue"
// page): the picked file becomes the cover.
//
// The backend sets a cover on one of the venue's images (no cover upload of
// its own), so this is two requests: POST .../images (the file is added to
// the venue's photos), then PUT .../images/{new id}/cover.
//   Resolves with the saved photos { cover_image_id, cover_image_url, images }.
//   Rejects with the request's error; when the upload worked but the cover
//   request failed, error.uploadedImage is the uploaded photo (it stays in
//   the venue's photos, not as the cover).
// Demo mode: nothing is sent; rejects with COVER_SAVE_NOT_AVAILABLE, so the
// page never reports a save that did not happen.
// ---------------------------------------------------------------------------

// Accepted cover images: the backend's rule for venue images
// (mimes:jpg,jpeg,png,webp, max:5120 KB).
export const COVER_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const COVER_IMAGE_MAX_BYTES = 5120 * 1024

export const COVER_SAVE_NOT_AVAILABLE = 'COVER_SAVE_NOT_AVAILABLE'

// saveVenueCoverImage(venueId, file, { token })
export async function saveVenueCoverImage(venueId, file, { token } = {}) {
  if (!IS_API_ENABLED) {
    const error = new Error('Saving the venue cover photo is not available in demo mode.')
    error.code = COVER_SAVE_NOT_AVAILABLE
    throw error
  }
  const image = await uploadVenueImage(venueId, file, { token })
  try {
    return await setVenueCoverImage(venueId, image.id, { token })
  } catch (error) {
    error.uploadedImage = image
    throw error
  }
}
