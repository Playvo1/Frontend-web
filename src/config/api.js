// API configuration for the Laravel backend (github.com/Playvo1/Backend).
//
// VITE_API_BASE_URL is the backend host only (e.g. "https://api.example"),
// without "/api/v1". It is intentionally EMPTY until the backend team
// provides a confirmed URL — see .env.example. While it is empty the app
// runs on the mock services and never makes a network request.

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

// Trailing slashes removed so paths can always start with "/".
export const API_BASE_URL = String(rawBaseUrl).trim().replace(/\/+$/, '')

// Route prefix confirmed in the backend's routes/api.php (commit 3c2c09f).
export const API_PREFIX = '/api/v1'

// true only when a base URL has been configured.
export const IS_API_ENABLED = API_BASE_URL !== ''
