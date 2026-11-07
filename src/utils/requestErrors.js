// Shared by the Venue Owner pages that load data through the services
// (Bookings, Reviews, Analytics) to choose which error state to show.
//
// A failed request is a connection problem when it never got a response
// (apiClient's ApiError status 0: offline, DNS, server unreachable) or the
// browser reports being offline. Any response from the server (403, 422,
// 5xx, ...) is a server error, not a connection problem.
export function isConnectionFailure(error) {
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
  return error?.status === 0 || isOffline
}

// API mode (VITE_API_BASE_URL set): a service whose data has no backend
// endpoint wired yet rejects with this code instead of returning the demo
// (mock) data, so demo values are never shown as real ones. Pages show their
// "not available" state for it (no retry: retrying cannot help).
export const NOT_CONNECTED = 'NOT_CONNECTED'

export function notConnectedError(what) {
  const error = new Error(`${what} is not connected to the backend yet.`)
  error.code = NOT_CONNECTED
  return error
}

export function isNotConnected(error) {
  return error?.code === NOT_CONNECTED
}
