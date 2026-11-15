import { IS_API_ENABLED } from '../config/api.js'
import { apiRequest } from './apiClient.js'

// Venue Owner analytics service.
//
// API mode: GET /api/v1/venue_owner/owner/analytics?period=month
// (OwnerAnalyticsController@index, auth:sanctum + role:venue_owner), with the
// signed-in owner's Bearer token. The page shows "this month", so
// period=month is sent. Response checked against the live backend:
//   data: {
//     period: { type, from, to },
//     bookings: { total, confirmed, pending, cancelled, change_percent },
//     revenue: { total, change_percent },              // confirmed bookings
//     occupancy: { rate, bookable_slots, occupied_slots, change_percentage_points },
//   }
// The backend works out the owner's venue and its time slots itself (404
// when the owner has no venue). It returns totals only: no per-date series
// and no per-hour counts, so trend and peak_hours are null in API mode (the
// page shows those charts as "not connected"); nothing is computed or
// invented here.
//
// Demo mode (no VITE_API_BASE_URL): the local mock, same shape.
//
// getVenueOwnerAnalytics(token) -> Promise<{
//   summary: { bookings_count, revenue, occupancy_percent },
//   trend: [{ date: 'YYYY-MM-DD', bookings, revenue }] | null,
//   peak_hours: [{ hour: 'HH:mm', bookings }] | null,
// }>

function toNumber(value) {
  const number = Number(value)
  if (value === null || value === undefined || value === '' || !Number.isFinite(number)) {
    throw new Error('Unexpected analytics response.')
  }
  return number
}

export async function getVenueOwnerAnalytics(token) {
  if (!IS_API_ENABLED) {
    const { MOCK_VENUE_OWNER_ANALYTICS } = await import('../mocks/mockVenueOwnerAnalytics.js')
    return structuredClone(MOCK_VENUE_OWNER_ANALYTICS)
  }

  const body = await apiRequest('/venue_owner/owner/analytics?period=month', { token })
  const data = body?.data
  return {
    summary: {
      bookings_count: toNumber(data?.bookings?.total),
      revenue: toNumber(data?.revenue?.total),
      occupancy_percent: toNumber(data?.occupancy?.rate),
    },
    trend: null,
    peak_hours: null,
  }
}
