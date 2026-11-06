import { IS_API_ENABLED } from '../config/api.js'
import { apiRequest } from './apiClient.js'

// Admin "Profile" page data and actions.
//
// Checked against the backend (routes/api.php on main, and the live API:
// GET /api/v1/profile, /user, /me, /auth/me, /auth/profile, /admin/profile,
// /auth/change-password, /change-password, /profile/avatar … all answer 404,
// i.e. no such route with any method):
//   - There is no endpoint that returns the signed-in user's profile. The
//     only source is the login response stored in the session:
//     { id, name, email, roles } (AuthController@login) — no phone and no
//     photo, although the users table has a `phone` column.
//   - There is no endpoint to update the profile, upload a profile photo or
//     change the password of a signed-in user (only the signed-out reset
//     flow exists).
//
// So the profile is read from the session (no request, so the page has no
// loading or connection-error state to show), and the three actions below
// make NO request: they reject with a code the page turns into an honest "not
// saved" message. When the backend adds the endpoints, implement the
// requests here (path, field names and errors as the backend confirms) and
// resolve with the saved data; the page needs no other change.

// Same image types as the venue photo upload (jpg, jpeg, png, webp).
export const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
// Client-side guard only: 5 MB, as the backend's venue image rule
// (max:5120) — no profile photo rule exists yet.
export const PROFILE_PHOTO_MAX_BYTES = 5120 * 1024

export const PROFILE_UPDATE_NOT_AVAILABLE = 'PROFILE_UPDATE_NOT_AVAILABLE'
export const PROFILE_PHOTO_NOT_AVAILABLE = 'PROFILE_PHOTO_NOT_AVAILABLE'

function codedError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

// Path (under /api/v1) of the backend endpoint that returns the signed-in
// user's profile. null: there is none yet, so nothing is requested. When the
// backend adds it, set the path here (and check toProfile against its
// response): the page then shows its loading state while the request runs
// and its connection / server error states if it fails.
const PROFILE_PATH = null

// true when the profile comes from a real request (API mode + endpoint).
export const IS_PROFILE_REQUESTED = IS_API_ENABLED && PROFILE_PATH !== null

const text = (value) => (typeof value === 'string' ? value : '')

// getAdminProfile(user) -> { name, email, phone, roles }
//   From the session user; a value the session does not have is ''.
export function getAdminProfile(user) {
  return {
    name: text(user?.name),
    email: text(user?.email),
    phone: text(user?.phone),
    roles: Array.isArray(user?.roles) ? user.roles : [],
  }
}

// Profile from the endpoint's user object (fields of the users table:
// name, email, phone); the session fills what the response lacks.
function toProfile(data, user) {
  const session = getAdminProfile(user)
  if (!data || typeof data !== 'object') throw new Error('Unexpected profile response.')
  return {
    name: text(data.name) || session.name,
    email: text(data.email) || session.email,
    phone: text(data.phone) || session.phone,
    roles: Array.isArray(data.roles) ? data.roles : session.roles,
  }
}

// fetchAdminProfile({ token, user }) -> Promise<profile>
//   Only called when IS_PROFILE_REQUESTED. Errors are the apiClient's
//   ApiError (.status 0 = no connection, 401, 5xx …).
export async function fetchAdminProfile({ token, user } = {}) {
  const body = await apiRequest(PROFILE_PATH, { token })
  return toProfile(body?.data?.user ?? body?.data, user)
}

// updateAdminProfile({ name, email, phone }, { token }) -> Promise<profile>
//   NOT CONNECTED: no endpoint — always rejects PROFILE_UPDATE_NOT_AVAILABLE.
export async function updateAdminProfile() {
  throw codedError(PROFILE_UPDATE_NOT_AVAILABLE, 'Updating the profile is not available on the server.')
}

// uploadAdminProfilePhoto(file, { token }) -> Promise<{ photo_url }>
//   NOT CONNECTED: no endpoint — always rejects PROFILE_PHOTO_NOT_AVAILABLE.
export async function uploadAdminProfilePhoto() {
  throw codedError(PROFILE_PHOTO_NOT_AVAILABLE, 'Uploading a profile photo is not available on the server.')
}
