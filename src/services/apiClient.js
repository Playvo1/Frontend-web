import { API_BASE_URL, API_PREFIX, IS_API_ENABLED } from '../config/api.js'

// Minimal HTTP client for the Playvo Laravel API (native fetch, no extra
// dependency).
//
// - Sends Accept/Content-Type: application/json on every request. The
//   backend needs "Accept: application/json" to return JSON for validation
//   (422) and auth (401) errors instead of redirects.
// - Adds "Authorization: Bearer <token>" when a token is passed (Sanctum).
// - Resolves with the parsed body on success; throws ApiError otherwise.
//
// The backend currently returns three body shapes (audit of 3c2c09f):
//   { success, data, message, errors }  — most endpoints
//   { success, message, data }          — send-otp / verify-reset-otp
//   { message, errors }                 — Laravel validation (422) / 401
// ApiError normalises all of them into { status, message, errors, data }.

export class ApiError extends Error {
  constructor({ status, message, errors = null, data = null }) {
    super(message || `Request failed with status ${status}`)
    this.name = 'ApiError'
    // HTTP status; 0 means the request never got a response (network/CORS).
    this.status = status
    // Laravel field errors, e.g. { email: ['...'] }, or null.
    this.errors = errors
    this.data = data
  }
}

async function parseJson(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  if (!IS_API_ENABLED) {
    // Guard: nothing should call the real API while the base URL is empty.
    throw new ApiError({ status: 0, message: 'API base URL is not configured' })
  }

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError({ status: 0, message: 'Network error' })
  }

  const payload = await parseJson(response)

  // Some endpoints report failure with success:false even on a 2xx status.
  if (!response.ok || payload?.success === false) {
    throw new ApiError({
      status: response.status,
      message: payload?.message ?? '',
      errors: payload?.errors ?? null,
      data: payload?.data ?? null,
    })
  }

  return payload ?? {}
}
