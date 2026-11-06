import { IS_API_ENABLED } from '../config/api.js'
import { apiRequest } from './apiClient.js'
import { absoluteUrl } from './facilityService.js'

// Venue Owner "Profile" page: the signed-in owner's own account.
//
// API mode — backend contract (OwnerProfileController, routes/api.php on
// main @ 3de1a84, auth:sanctum + role:venue_owner; the backend reads the
// owner from the token, no id is sent):
//   GET  /api/v1/venue_owner/owner/profile
//        data: { owner: { id, name, email, phone (string | null),
//                         profile_image (absolute URL | null) },
//                venue: {...} | null }
//        (only `owner` is used here: the venue card keeps its own source,
//        facilityService — the profile's venue.address / venue.area are
//        always null on the backend today.)
//   PUT  /api/v1/venue_owner/owner/profile   (JSON)
//        name: sometimes|required|string|max:255
//        email: sometimes|required|email|max:255|unique (own row ignored)
//        phone: sometimes|nullable|string|max:30
//        -> 200, data: { id, name, email, phone }; 422 with field errors.
//   POST /api/v1/venue_owner/owner/profile/photo   (multipart/form-data)
//        photo: required|image|mimes:jpg,jpeg,png,webp|max:2048 (KB)
//        -> 200, data: { profile_image }; 422 with errors.photo.
// Errors are the apiClient's ApiError (.status: 0 network, 401, 403, 422
// with .errors, 5xx); the page decides what to show.
//
// Demo mode (no VITE_API_BASE_URL): the profile is the signed-in session
// user (as before) and nothing can be saved: update / photo reject with
// PROFILE_SAVE_NOT_AVAILABLE so the page never reports a save that did not
// happen.

export const OWNER_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
// Backend rule max:2048 (kilobytes).
export const OWNER_PHOTO_MAX_BYTES = 2048 * 1024

export const PROFILE_SAVE_NOT_AVAILABLE = 'PROFILE_SAVE_NOT_AVAILABLE'

const PROFILE_PATH = '/venue_owner/owner/profile'

function unexpected() {
  return new Error('Unexpected profile response.')
}

function notAvailable() {
  const error = new Error('Saving the profile is not available in demo mode.')
  error.code = PROFILE_SAVE_NOT_AVAILABLE
  return error
}

const text = (value) => (typeof value === 'string' ? value : '')

// -> { name, email, phone, profile_image: string | null }
function toProfile(owner) {
  if (!owner || typeof owner !== 'object') throw unexpected()
  return {
    name: text(owner.name),
    email: text(owner.email),
    phone: text(owner.phone),
    profile_image: absoluteUrl(text(owner.profile_image) || null),
  }
}

// getOwnerProfile({ token, user }) -> Promise<profile>
//   API mode: callers that ask while a request for the same token is running
//   share it (the session photo and the "My venue" page's owner name are read
//   when the app opens on that page); nothing is kept once it is answered,
//   so every later call reads the backend again.
let profileRequest = null // { token, promise }

export function getOwnerProfile({ token, user } = {}) {
  if (!IS_API_ENABLED) {
    return Promise.resolve({ name: text(user?.name), email: text(user?.email), phone: text(user?.phone), profile_image: null })
  }
  if (profileRequest?.token === token) return profileRequest.promise
  const promise = apiRequest(PROFILE_PATH, { token }).then((body) => toProfile(body?.data?.owner))
  profileRequest = { token, promise }
  const clear = () => {
    if (profileRequest?.promise === promise) profileRequest = null
  }
  promise.then(clear, clear)
  return promise
}

// updateOwnerProfile({ name, email, phone }, { token }) -> Promise<{ name, email, phone }>
//   An empty phone is sent as null (the backend allows null).
export async function updateOwnerProfile({ name, email, phone }, { token } = {}) {
  if (!IS_API_ENABLED) throw notAvailable()
  const trimmedPhone = phone.trim()
  const body = await apiRequest(PROFILE_PATH, {
    method: 'PUT',
    token,
    body: { name: name.trim(), email: email.trim(), phone: trimmedPhone === '' ? null : trimmedPhone },
  })
  const saved = body?.data
  if (!saved || typeof saved !== 'object') throw unexpected()
  return { name: text(saved.name), email: text(saved.email), phone: text(saved.phone) }
}

// uploadOwnerProfilePhoto(file, { token }) -> Promise<{ profile_image: string | null }>
export async function uploadOwnerProfilePhoto(file, { token } = {}) {
  if (!IS_API_ENABLED) throw notAvailable()
  const form = new FormData()
  form.append('photo', file)
  const body = await apiRequest(`${PROFILE_PATH}/photo`, { method: 'POST', token, body: form })
  const data = body?.data
  if (!data || typeof data !== 'object') throw unexpected()
  return { profile_image: absoluteUrl(text(data.profile_image) || null) }
}
