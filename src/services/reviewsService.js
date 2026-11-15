import { IS_API_ENABLED } from '../config/api.js'
import { apiRequest } from './apiClient.js'
import { getVenueOwnerFacility } from './facilityService.js'

// Venue Owner reviews service.
//
// API mode — backend contract (VenueController@ratings, routes/api.php on
// main @ 3de1a84, auth:sanctum + role:venue_owner), checked against the live
// backend (GET only) before any field was used:
//   GET /api/v1/venue_owner/owner/venues/{id}/ratings?page={n}
//   - {id}: the signed-in owner's venue from GET /venue_owner/owner/myvenues
//     (facilityService, shared and cached) — never a fixed id. Another
//     owner's venue: 404 "Venue not found or access denied.".
//   - data.venue: { id, name (name_en), avg_rating (number, the average of
//       all the venue's ratings, 2 decimals; 0 when there is none),
//       ratings_count }
//   - data.rating_distribution: [{ stars (1–5), count, percentage }] for all
//       the venue's ratings (the same on every page) -> distribution.
//   - data.ratings: Laravel paginator, newest first, 10 per page (no
//       per_page parameter): { data, current_page, last_page, total, ... };
//       each rating: { id, venue_id, booking_id, rating (1–5), comment
//       (string | null), created_at, updated_at, player_name (the booking
//       captain's account name; null when the backend has none) }.
// A missing player name stays null (the page then links the booking); a
// missing or malformed distribution stays null (the page says so). Nothing
// is invented. Pages are loaded one at a time ("more reviews" button).
//
// No venue / more than one venue linked: facilityService's FACILITY_NONE /
// FACILITY_MULTIPLE errors are passed through. Other errors are the
// apiClient's ApiError (.status: 0 network, 401, 404, 5xx).
//
// Demo mode (no VITE_API_BASE_URL): the local mock data, as before.
//
// getVenueOwnerReviews(token, page = 1) -> Promise<{
//   summary: { avg_rating: number | null, total, distribution: { 5, 4, 3, 2, 1 } | null },
//   reviews: [{ id, booking_id, player_name: string | null, rating, comment, created_at: 'YYYY-MM-DD' }],
//   page: { current, last },
// }>

function unexpected() {
  return new Error('Unexpected ratings response.')
}

// "2026-10-14T12:21:47.000000Z" -> the day in the user's time zone,
// "2026-10-14" (the format the page's date helper takes).
function toLocalDate(value) {
  const date = new Date(value)
  if (typeof value !== 'string' || Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-CA')
}

function toReview(item) {
  const rating = Number(item?.rating)
  if (!item || !Number.isInteger(rating) || rating < 1 || rating > 5) throw unexpected()
  return {
    id: item.id,
    booking_id: item.booking_id ?? null,
    player_name: typeof item.player_name === 'string' && item.player_name.trim() ? item.player_name.trim() : null,
    rating,
    comment: typeof item.comment === 'string' && item.comment.trim() ? item.comment : null,
    created_at: toLocalDate(item.created_at),
  }
}

// rating_distribution -> { 5: count, 4: …, 1: … }, or null unless it has a
// valid count for each of the five levels.
function toDistribution(list) {
  if (!Array.isArray(list)) return null
  const distribution = {}
  for (const item of list) {
    const stars = Number(item?.stars)
    const count = Number(item?.count)
    if (!Number.isInteger(stars) || stars < 1 || stars > 5 || !Number.isInteger(count) || count < 0) return null
    distribution[stars] = count
  }
  return [1, 2, 3, 4, 5].every((stars) => stars in distribution) ? distribution : null
}

export async function getVenueOwnerReviews(token, page = 1) {
  if (!IS_API_ENABLED) {
    const { MOCK_VENUE_OWNER_REVIEWS } = await import('../mocks/mockVenueOwnerReviews.js')
    return { ...structuredClone(MOCK_VENUE_OWNER_REVIEWS), page: { current: 1, last: 1 } }
  }

  const venue = await getVenueOwnerFacility({ token })
  if (!venue?.id) throw unexpected()

  const query = new URLSearchParams({ page: String(page) })
  const body = await apiRequest(
    `/venue_owner/owner/venues/${encodeURIComponent(venue.id)}/ratings?${query}`,
    { token },
  )
  const summary = body?.data?.venue
  const paginator = body?.data?.ratings
  if (!summary || !paginator || !Array.isArray(paginator.data)) throw unexpected()

  const total = Number(summary.ratings_count ?? paginator.total)
  // No rating yet: the backend's 0 is not an average.
  const average =
    summary.avg_rating === null || summary.avg_rating === undefined || total === 0 ? null : Number(summary.avg_rating)
  if (!Number.isFinite(total) || (average !== null && !Number.isFinite(average))) throw unexpected()

  return {
    summary: { avg_rating: average, total, distribution: toDistribution(body.data.rating_distribution) },
    reviews: paginator.data.map(toReview),
    page: {
      current: Number(paginator.current_page) || page,
      last: Number(paginator.last_page) || 1,
    },
  }
}
