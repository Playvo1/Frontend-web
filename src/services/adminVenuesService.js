import { IS_API_ENABLED } from '../config/api.js'
import { apiRequest } from './apiClient.js'
import { absoluteUrl } from './facilityService.js'

// Admin "Venues management" pages (/admin/venues, /admin/venues/new,
// /admin/venues/:venueId).
//
// Backend: Playvo1/Backend main @ 28ced0c ("Feature/admin venues (#36)";
// routes/api.php, AdminVenueController, AdminVenueRequest,
// ReferenceDataController and their feature tests). Deployed on Render
// (checked with GET requests only: every admin route below answers 401
// without a token, /cities and /sports answer 200). The admin group is
// auth:sanctum + role:admin (403 for another role, 401 without a token).
//   GET  /admin/venues          list (AdminVenueController@index)
//   GET  /admin/venues/{id}     details, any status (404 unknown / deleted)
//   POST /admin/venues          create (see the "Add venue" section)
//   PUT  /admin/venues/{id}/status   { status: 'active' | 'inactive' }
//        "inactive" is the backend's venue removal (FR-29): the venue stays
//        stored with status inactive. 422 "Resolve this venue's upcoming
//        bookings before removing it." when it has a confirmed booking on a
//        later date; 404 unknown id. (The old /admin/admin/venues… paths
//        still work on the backend but are no longer used here.)
//   GET  /cities, GET /sports  (public reference lists)
//
// Demo mode (no VITE_API_BASE_URL): the local mock list, kept in memory for
// the session (a venue added or removed in demo mode shows on the list until
// the page is reloaded), filtered and paged here the same way. Nothing is
// sent. The mock module is loaded on demand inside the demo branches, so API
// builds leave it (and its demo photos) out entirely (see vite.config.js).

const joinNames = (items, field) =>
  (Array.isArray(items) ? items : []).map((item) => item?.[field]).filter(Boolean).join(field.endsWith('_ar') ? '، ' : ', ') ||
  null

const textOrNull = (value) => (typeof value === 'string' && value.trim() ? value : null)
const numberOrNull = (value) =>
  value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)

// The documented VENUE.status values (Team Guidelines §3.1).
export const VENUE_STATUSES = ['active', 'inactive']

// Venues per page on the list (the backend allows 1–100).
export const VENUES_PER_PAGE = 20

// Demo mode: the mock module (loaded once, on demand) and the venue list
// kept in memory (reset on reload).
const loadMocks = () => import('../mocks/mockAdminVenues.js')
let demoVenues = null
async function demoList() {
  if (!demoVenues) {
    const { MOCK_ADMIN_VENUES } = await loadMocks()
    demoVenues ??= structuredClone(MOCK_ADMIN_VENUES)
  }
  return demoVenues
}

// getAdminVenues({ search, cityId, status, page }, token)
//   -> Promise<{ venues: [{ id, name_ar, name_en, city_ar, city_en,
//        address_ar, address_en, owner_name, created_at, status,
//        image_url }], total, page, lastPage }>
//   API: GET /admin/venues?page=&per_page=VENUES_PER_PAGE[&search=][&city_id=][&status=]
//   — the backend searches the name, address and area in both languages,
//   newest first; data is a Laravel paginator (data, total, current_page,
//   last_page). 422 for an unknown status or per_page > 100.
//   Demo mode: the same filters on the mock list (cityId is the city's
//   English name there; see getVenueFilterCities).
export async function getAdminVenues({ search = '', cityId = '', status = '', page = 1 } = {}, token) {
  const term = search.trim()
  if (!IS_API_ENABLED) {
    const query = term.toLowerCase()
    const matching = (await demoList()).filter((venue) => {
      if (cityId && venue.city_en !== cityId) return false
      if (status && venue.status !== status) return false
      if (!query) return true
      return [venue.name_ar, venue.name_en, venue.address_ar, venue.address_en].some((value) =>
        String(value ?? '').toLowerCase().includes(query),
      )
    })
    const lastPage = Math.max(1, Math.ceil(matching.length / VENUES_PER_PAGE))
    const start = (page - 1) * VENUES_PER_PAGE
    return {
      venues: structuredClone(matching.slice(start, start + VENUES_PER_PAGE)),
      total: matching.length,
      page,
      lastPage,
    }
  }

  const params = new URLSearchParams({ page: String(page), per_page: String(VENUES_PER_PAGE) })
  if (term) params.set('search', term)
  if (cityId) params.set('city_id', String(cityId))
  if (status) params.set('status', status)
  const body = await apiRequest(`/admin/venues?${params}`, { token })
  const paginator = body?.data
  if (!paginator || !Array.isArray(paginator.data)) throw new Error('Unexpected venues response.')
  return {
    venues: paginator.data
      .filter((venue) => venue && venue.id !== undefined)
      .map((venue) => ({
        id: venue.id,
        name_ar: venue.name_ar ?? null,
        name_en: venue.name_en ?? null,
        city_ar: venue.city?.name_ar ?? null,
        city_en: venue.city?.name_en ?? null,
        address_ar: textOrNull(venue.address_ar),
        address_en: textOrNull(venue.address_en),
        owner_name: venue.owner?.name ?? null,
        created_at: venue.created_at ?? null,
        status: VENUE_STATUSES.includes(venue.status) ? venue.status : null,
        image_url: absoluteUrl(venue.cover_image_url) || null,
      })),
    total: Number.isInteger(Number(paginator.total)) ? Number(paginator.total) : paginator.data.length,
    page: Number(paginator.current_page) || page,
    lastPage: Number(paginator.last_page) || 1,
  }
}

// getVenueFilterCities(token) -> Promise<[{ id, name_ar, name_en }]>
//   The list page's city filter. API: GET /cities (id = city_id). Demo mode:
//   the cities of the mock venues (id = the English name).
export async function getVenueFilterCities(token) {
  if (IS_API_ENABLED) return getVenueCities(token)
  const seen = new Map()
  for (const venue of await demoList()) {
    if (venue.city_en && !seen.has(venue.city_en)) {
      seen.set(venue.city_en, { id: venue.city_en, name_ar: venue.city_ar, name_en: venue.city_en })
    }
  }
  return [...seen.values()]
}

// removeAdminVenue(id, token) -> Promise<{ id, status }>
//   PUT /admin/venues/{id}/status with status "inactive".
//   Demo mode: no request; resolves with the inactive status.
export async function removeAdminVenue(id, token) {
  if (!IS_API_ENABLED) {
    const venue = (await demoList()).find((item) => item.id === id)
    if (venue) venue.status = 'inactive'
    return { id, status: 'inactive' }
  }
  const body = await apiRequest(`/admin/venues/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    token,
    body: { status: 'inactive' },
  })
  const status = body?.data?.status
  if (!VENUE_STATUSES.includes(status)) throw new Error('Unexpected venue status response.')
  return { id, status }
}

// ---------------------------------------------------------------------------
// "Add venue" page (/admin/venues/new). Checked against the backend code
// (Playvo1/Backend main @ 28ced0c, "Feature/admin venues (#36)":
// routes/api.php, AdminVenueController@store, AdminVenueRequest,
// ReferenceDataController and their feature tests). Whether that commit is
// deployed could not be checked from here (no request was sent).
//
//   GET  /cities   (public) -> data: [{ id, name_ar, name_en,
//        country: { id, name_ar, name_en } | null }]
//   GET  /sports   (public) -> data: [{ id, name_ar, name_en }] (deployed:
//        Football only)
//   POST /admin/venues   (multipart/form-data: the photos are files)
//        The venue, its owner and its photos in ONE request; the database work
//        runs in one transaction (nothing is created when anything fails).
//        Owner: this page always creates a NEW venue owner account —
//          owner_name (max 255), owner_email (unique), owner_phone (required
//          for a new owner, max 20) and owner_password (optional, min 8):
//          without owner_password the backend generates one (12 chars) and
//          emails it to the owner; a typed password is NOT emailed (the admin
//          hands it over). (The backend also accepts owner_id for an existing
//          owner; not used: there is no endpoint that lists owners and the
//          approved design has no owner choice.)
//        name_ar (required), name_en (optional: falls back to name_ar),
//        city_id (required), address_ar/_en, description_ar/_en (optional,
//        max 2000), length_m, width_m (0–1000),
//        images[] (up to 6 files, jpg/jpeg/png/webp, max 5 MB each; the first
//        becomes the cover). sport_id (optional; without it the venue gets
//        Football).
//        -> 201, data: the venue details + owner_account { id, email,
//        created, credentials_emailed }.
//        500 "Failed to upload venue images." when the photo upload fails.
//   (The old POST /admin/admin/venues still works but is not used here.)
//
// Demo mode: mock cities; creating only adds the venue to the in-memory demo
// list (no photo is uploaded or kept anywhere).

// Backend limits for the venue photos (AdminVenueRequest).
export const MAX_VENUE_PHOTOS = 6
export const MAX_VENUE_PHOTO_BYTES = 5 * 1024 * 1024

// getVenueCities(token) -> Promise<[{ id, name_ar, name_en, country_ar, country_en }]>
export async function getVenueCities(token) {
  if (!IS_API_ENABLED) {
    const { MOCK_CITIES } = await loadMocks()
    return structuredClone(MOCK_CITIES)
  }
  const body = await apiRequest('/cities', { token })
  if (!Array.isArray(body?.data)) throw new Error('Unexpected cities response.')
  return body.data
    .filter((city) => city && city.id !== undefined)
    .map((city) => ({
      id: city.id,
      name_ar: city.name_ar ?? null,
      name_en: city.name_en ?? null,
      country_ar: city.country?.name_ar ?? null,
      country_en: city.country?.name_en ?? null,
    }))
}

// getVenueSports(token) -> Promise<[{ id, name_ar, name_en }]>
//   GET /sports (public). Demo mode: mock sports.
export async function getVenueSports(token) {
  if (!IS_API_ENABLED) {
    const { MOCK_SPORTS } = await loadMocks()
    return structuredClone(MOCK_SPORTS)
  }
  const body = await apiRequest('/sports', { token })
  if (!Array.isArray(body?.data)) throw new Error('Unexpected sports response.')
  return body.data
    .filter((sport) => sport && sport.id !== undefined)
    .map((sport) => ({ id: sport.id, name_ar: sport.name_ar ?? null, name_en: sport.name_en ?? null }))
}

// createAdminVenue({ owner, name, city, sportId, address, description, language, length_m, width_m, photos }, token)
//   -> Promise<{ id, ownerAccount: { id, email, created, credentials_emailed } | null }>
//   owner: { name, email, phone, password } — the new venue owner account; an
//   empty password is left out of the request so the backend generates one.
//   name: one text sent as both name_ar and name_en (decided with the
//   product owner). address and description: sent only in the interface
//   language (address_ar / address_en, description_ar / description_en); an
//   empty description is not sent. sportId: from GET /sports (left out when
//   empty). photos: File[] (at most MAX_VENUE_PHOTOS).
export async function createAdminVenue(
  { owner, name, city, sportId = '', address, description = '', language, length_m, width_m, photos = [] },
  token,
) {
  const addressField = language === 'en' ? 'address_en' : 'address_ar'
  const descriptionField = language === 'en' ? 'description_en' : 'description_ar'
  if (!IS_API_ENABLED) {
    const list = await demoList()
    const venue = {
      id: Math.max(0, ...list.map((item) => item.id)) + 1,
      name_ar: name,
      name_en: name,
      city_ar: city.name_ar,
      city_en: city.name_en,
      address_ar: null,
      address_en: null,
      [addressField]: address,
      owner_name: owner.name,
      created_at: new Date().toLocaleDateString('en-CA'),
      status: 'active',
      image_url: null,
    }
    list.unshift(venue)
    return { id: venue.id, ownerAccount: null }
  }

  const form = new FormData()
  form.append('owner_name', owner.name)
  form.append('owner_email', owner.email)
  form.append('owner_phone', owner.phone)
  if (owner.password) form.append('owner_password', owner.password)
  form.append('name_ar', name)
  form.append('name_en', name)
  form.append('city_id', String(city.id))
  if (sportId !== '' && sportId !== null && sportId !== undefined) form.append('sport_id', String(sportId))
  form.append(addressField, address)
  if (description) form.append(descriptionField, description)
  form.append('length_m', String(length_m))
  form.append('width_m', String(width_m))
  for (const photo of photos.slice(0, MAX_VENUE_PHOTOS)) form.append('images[]', photo)

  const body = await apiRequest('/admin/venues', { method: 'POST', token, body: form })
  const id = body?.data?.id
  if (!id) throw new Error('Unexpected venue response.')
  return { id, ownerAccount: body.data.owner_account ?? null }
}

// ---------------------------------------------------------------------------
// Venue details page (/admin/venues/:venueId).
//
//   GET /admin/venues/{id}   (AdminVenueController@show, any status)
//   -> data: { id, name_ar/_en, status, address_ar/_en, area_ar/_en,
//      city { id, name_ar/_en } | null, country { … } | null,
//      sports [{ id, name_ar/_en }], length_m, width_m, description_ar/_en,
//      created_at, owner { id, name, email, phone, status } | null,
//      images [{ id, image_url (absolute), is_cover, sort_order }],
//      images_count, cover_image_url, … }
//   404 unknown or deleted venue, 403 not an admin.
// The cover is the backend's rule: the image marked is_cover, else the first.
//
// getAdminVenueDetails(id, token) -> Promise<{
//   id, name_ar, name_en, status, city_ar, city_en, country_ar, country_en,
//   address_ar, address_en, sport_ar, sport_en, length_m, width_m,
//   created_at, description_ar, description_en,
//   cover_image_url, images: [{ id, image_url }],
//   owner: { name, email, phone, status } | null,
// }>
//   404: rejects with the ApiError (status 404); demo mode rejects the same
//   way for an unknown id.

// The backend's USER.status values (venue owner account status).
const OWNER_STATUSES = ['active', 'locked', 'unverified']

export async function getAdminVenueDetails(id, token) {
  if (!IS_API_ENABLED) {
    const venue = (await demoList()).find((item) => String(item.id) === String(id))
    if (!venue) {
      const error = new Error('Venue not found.')
      error.status = 404
      throw error
    }
    const { MOCK_ADMIN_VENUE_DETAILS, MOCK_ADMIN_VENUE_DETAIL_DEFAULTS } = await loadMocks()
    const details = { ...MOCK_ADMIN_VENUE_DETAIL_DEFAULTS, ...MOCK_ADMIN_VENUE_DETAILS[venue.id] }
    const images = venue.image_url
      ? [{ id: 0, image_url: venue.image_url }, ...details.images.filter((image) => image.image_url !== venue.image_url).slice(0, 3)]
      : []
    return structuredClone({
      ...venue,
      ...details,
      cover_image_url: images[0]?.image_url ?? null,
      images,
      owner: {
        name: venue.owner_name,
        email: details.owner_email ?? null,
        phone: details.owner_phone ?? null,
        status: details.owner_status,
      },
    })
  }

  const body = await apiRequest(`/admin/venues/${encodeURIComponent(id)}`, { token })
  const venue = body?.data
  if (!venue || typeof venue !== 'object' || venue.id === undefined) throw new Error('Unexpected venue response.')
  const images = (Array.isArray(venue.images) ? [...venue.images] : [])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.id ?? 0) - (b.id ?? 0))
    .map((image) => ({ id: image.id, image_url: absoluteUrl(image.image_url), is_cover: image.is_cover === true }))
    .filter((image) => image.image_url)
  const cover = images.find((image) => image.is_cover) ?? images[0] ?? null
  const owner = venue.owner && typeof venue.owner === 'object' ? venue.owner : null
  return {
    id: venue.id,
    name_ar: venue.name_ar ?? null,
    name_en: venue.name_en ?? null,
    status: VENUE_STATUSES.includes(venue.status) ? venue.status : null,
    city_ar: venue.city?.name_ar ?? null,
    city_en: venue.city?.name_en ?? null,
    country_ar: venue.country?.name_ar ?? null,
    country_en: venue.country?.name_en ?? null,
    address_ar: textOrNull(venue.address_ar),
    address_en: textOrNull(venue.address_en),
    sport_ar: joinNames(venue.sports, 'name_ar'),
    sport_en: joinNames(venue.sports, 'name_en'),
    length_m: numberOrNull(venue.length_m),
    width_m: numberOrNull(venue.width_m),
    created_at: venue.created_at ?? null,
    description_ar: textOrNull(venue.description_ar),
    description_en: textOrNull(venue.description_en),
    cover_image_url: cover?.image_url ?? (absoluteUrl(venue.cover_image_url) || null),
    // The cover first, then the others (as the design's gallery).
    images: [cover, ...images.filter((image) => image !== cover)].filter(Boolean).map(({ id: imageId, image_url }) => ({
      id: imageId,
      image_url,
    })),
    owner: owner
      ? {
          name: textOrNull(owner.name),
          email: textOrNull(owner.email),
          phone: textOrNull(owner.phone),
          status: OWNER_STATUSES.includes(owner.status) ? owner.status : null,
        }
      : null,
  }
}
