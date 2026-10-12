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
