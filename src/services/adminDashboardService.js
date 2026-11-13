import { IS_API_ENABLED } from '../config/api.js'
import { apiRequest } from './apiClient.js'
import { absoluteUrl } from './facilityService.js'

// Admin dashboard statistics.
//
// API mode: GET /api/v1/admin/dashboard (AdminDashboardController@index,
// auth:sanctum + role:admin), with the signed-in admin's Bearer token.
// Response checked in the backend repo (main @ 2a985ff,
// AdminDashboardController@index):
//   data: {
//     total_users, total_venues, active_venues, bookings_today,
//     bookings_this_month, pending_receipts,
//     most_booked_venues: [{                                       // top 5
//       venue_id, name_ar, name_en, bookings_count,
//       city: { id, name_ar, name_en },   // the venue's own city; null fields if none
//       image_url,                        // first venue image (sort_order), or null
//     }],
//     most_active_cities: [{ city_id, name_ar, name_en, bookings_count }],  // top 5
//   }
// Bookings are counted when pending_payment or confirmed; "today" and "this
// month" use the booking's created_at; the top lists count all time.
// image_url is built with Laravel's url() (absolute); a relative path is
// still resolved against the API host, as for the facility photos
// (absoluteUrl). A missing image or city stays null: the page shows the venue
// icon and no city line.
//
// Demo mode (no VITE_API_BASE_URL): the local mock, same shape.
//
// getAdminDashboard(token) -> Promise<{
//   totalUsers, totalVenues, activeVenues, bookingsToday, bookingsThisMonth, pendingReceipts,
//   topVenues: [{ id, nameAr, nameEn, bookings, imageUrl, cityAr, cityEn }],
//   topCities: [{ id, nameAr, nameEn, bookings }],
// }>

function unexpected() {
  return new Error('Unexpected admin dashboard response.')
}

// A count from the API (number or numeric string); anything else is a
// malformed response, never shown as 0.
function toCount(value) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (typeof number !== 'number' || !Number.isFinite(number) || number < 0) throw unexpected()
  return number
}

function toText(value) {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function toDashboard(data) {
  if (!data || typeof data !== 'object') throw unexpected()
  if (!Array.isArray(data.most_booked_venues) || !Array.isArray(data.most_active_cities)) throw unexpected()

  return {
    totalUsers: toCount(data.total_users),
    totalVenues: toCount(data.total_venues),
    activeVenues: toCount(data.active_venues),
    bookingsToday: toCount(data.bookings_today),
    bookingsThisMonth: toCount(data.bookings_this_month),
    pendingReceipts: toCount(data.pending_receipts),
    topVenues: data.most_booked_venues.map((venue) => ({
      id: venue.venue_id,
      nameAr: toText(venue.name_ar),
      nameEn: toText(venue.name_en),
      bookings: toCount(venue.bookings_count),
      imageUrl: absoluteUrl(toText(venue.image_url)),
      cityAr: toText(venue.city?.name_ar),
      cityEn: toText(venue.city?.name_en),
    })),
    topCities: data.most_active_cities.map((city) => ({
      id: city.city_id,
      nameAr: toText(city.name_ar),
      nameEn: toText(city.name_en),
      bookings: toCount(city.bookings_count),
    })),
  }
}

export async function getAdminDashboard(token) {
  if (!IS_API_ENABLED) {
    const { MOCK_ADMIN_DASHBOARD } = await import('../mocks/mockAdminDashboard.js')
    return structuredClone(MOCK_ADMIN_DASHBOARD)
  }
  const body = await apiRequest('/admin/dashboard', { token })
  return toDashboard(body?.data)
}
