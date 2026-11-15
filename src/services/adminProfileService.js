import { IS_API_ENABLED } from '../config/api.js'
import { apiRequest } from './apiClient.js'
import { absoluteUrl } from './facilityService.js'

// Admin "Profile" page: the signed-in admin's own account.
//
// API mode — backend contract (Playvo1/Backend main @ 28ced0c, checked in
// the code and on the deployed server with GET only; the backend reads the
// admin from the Bearer token, no id is sent):
//   GET  /api/v1/admin/profile            (auth:sanctum + role:admin)
//        AdminProfileController@show
//        data: { id, name, email, phone (string | null), status, roles,
//                created_at, profile_image (absolute URL | null) }
//   PUT  /api/v1/admin/profile            (JSON) AdminProfileController@update
//        name:  sometimes|required|string|max:255
//        email: sometimes|required|email|max:255|unique (own row ignored)
//        phone: sometimes|nullable|string|max:30
//        -> 200, data: { id, name, email, phone }; 422 with field errors.
//   POST /api/v1/admin/profile/photo      (multipart/form-data)
//        AdminProfileController@updatePhoto
//        photo: required|image|mimes:jpg,jpeg,png,webp|max:2048 (KB)
//        -> 200, data: { profile_image }; 422 with errors.photo.
//   PUT  /api/v1/auth/password            (JSON, any signed-in role,
//        throttle 5/min) AuthController@changePassword
//        current_password: required; password: required|min:8|confirmed
//        (+ password_confirmation)
//        -> 200, no data. The current session stays signed in; the account's
//        other sessions are signed out by the backend.
//        422: errors.current_password (wrong / account without password),
//        errors.password (same as current, too short, confirmation); 429.
// Errors are the apiClient's ApiError (.status: 0 network, 401, 403, 404,
// 422 with .errors, 429, 5xx); the page decides what to show.
//
// The password request lives here (not in authService.changePassword) so
// only the Admin profile is connected; the Venue Owner "Change password"
// dialog keeps using authService as before.
//
// Demo mode (no VITE_API_BASE_URL): the profile is the signed-in session
// user and nothing is requested; the three actions reject with their
// *_NOT_AVAILABLE code so the page never reports a save that did not happen.

// Backend rule: jpg, jpeg, png, webp, max:2048 (kilobytes).
export const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const PROFILE_PHOTO_MAX_BYTES = 2048 * 1024

export const PROFILE_UPDATE_NOT_AVAILABLE = 'PROFILE_UPDATE_NOT_AVAILABLE'
export const PROFILE_PHOTO_NOT_AVAILABLE = 'PROFILE_PHOTO_NOT_AVAILABLE'
export const PASSWORD_CHANGE_NOT_AVAILABLE = 'PASSWORD_CHANGE_NOT_AVAILABLE'

const PROFILE_PATH = '/admin/profile'
const PASSWORD_PATH = '/auth/password'

// true when the profile comes from a request (API mode): the page then shows
// its loading state while it runs and its error states if it fails.
export const IS_PROFILE_REQUESTED = IS_API_ENABLED

function codedError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function unexpected() {
  return new Error('Unexpected profile response.')
}

const text = (value) => (typeof value === 'string' ? value : '')

// getAdminProfile(user) -> { name, email, phone, status, roles, profile_image }
//   From the session user (demo mode); a value the session does not have is
//   '' (status: 'active', as the backend only signs in active accounts).
export function getAdminProfile(user) {
  return {
    name: text(user?.name),
    email: text(user?.email),
    phone: text(user?.phone),
    status: text(user?.status) || 'active',
    roles: Array.isArray(user?.roles) ? user.roles : [],
    profile_image: null,
  }
}

function toProfile(data) {
  if (!data || typeof data !== 'object') throw unexpected()
  return {
    name: text(data.name),
    email: text(data.email),
    phone: text(data.phone),
    status: text(data.status) || 'active',
    roles: Array.isArray(data.roles) ? data.roles : [],
    profile_image: absoluteUrl(text(data.profile_image) || null),
  }
}

// fetchAdminProfile({ token }) -> Promise<profile>
//   API mode only. Callers that ask while a request for the same token is
//   running share it (the session photo is read from the same endpoint when
//   the app opens; React StrictMode runs effects twice in development);
//   nothing is kept once it is answered, so every later call reads the
//   backend again.
let profileRequest = null // { token, promise }

export function fetchAdminProfile({ token } = {}) {
  if (profileRequest?.token === token) return profileRequest.promise
  const promise = apiRequest(PROFILE_PATH, { token }).then((body) => toProfile(body?.data))
  profileRequest = { token, promise }
  const clear = () => {
    if (profileRequest?.promise === promise) profileRequest = null
  }
  promise.then(clear, clear)
  return promise
}

// updateAdminProfile({ name, email, phone }, { token }) -> Promise<{ name, email, phone }>
//   An empty phone is sent as null (the backend allows null).
export async function updateAdminProfile({ name, email, phone }, { token } = {}) {
  if (!IS_API_ENABLED) {
    throw codedError(PROFILE_UPDATE_NOT_AVAILABLE, 'Updating the profile is not available in demo mode.')
  }
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

// uploadAdminProfilePhoto(file, { token }) -> Promise<{ profile_image: string | null }>
export async function uploadAdminProfilePhoto(file, { token } = {}) {
  if (!IS_API_ENABLED) {
    throw codedError(PROFILE_PHOTO_NOT_AVAILABLE, 'Uploading a profile photo is not available in demo mode.')
  }
  const form = new FormData()
  form.append('photo', file)
  const body = await apiRequest(`${PROFILE_PATH}/photo`, { method: 'POST', token, body: form })
  const data = body?.data
  if (!data || typeof data !== 'object') throw unexpected()
  return { profile_image: absoluteUrl(text(data.profile_image) || null) }
}

// changeAdminPassword({ currentPassword, password, passwordConfirmation }, { token }) -> Promise<void>
//   The passwords are only sent in the request body; never stored or logged.
export async function changeAdminPassword({ currentPassword, password, passwordConfirmation }, { token } = {}) {
  if (!IS_API_ENABLED) {
    throw codedError(PASSWORD_CHANGE_NOT_AVAILABLE, 'Changing the password is not available in demo mode.')
  }
  await apiRequest(PASSWORD_PATH, {
    method: 'PUT',
    token,
    body: { current_password: currentPassword, password, password_confirmation: passwordConfirmation },
  })
}
