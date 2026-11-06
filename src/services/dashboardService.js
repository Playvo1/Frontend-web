import { IS_API_ENABLED } from '../config/api.js'
import { MOCK_VENUE_OWNER_DASHBOARD } from '../mocks/mockVenueOwnerDashboard.js'
import { apiRequest } from './apiClient.js'
import { getVenueOwnerFacility } from './facilityService.js'
import { getVenueOwnerDaySlots } from './slotsService.js'

// Dashboard data service.
//
// The backend has no single dashboard endpoint. In API mode the dashboard is
// put together from existing endpoints (all with the owner's Bearer token;
// the backend finds the owner's venue from the token). Responses were
// checked against the backend code (main @ 3de1a84) before any field was used.
//
// getVenueOwnerDashboard(token) — the parts that do not depend on the period:
//   GET /venue_owner/owner/myvenues            (facilityService, cached)
//       the venue: name_ar / name_en, status.
//   GET /venue_owner/owner/time-slots?date={today}   (slotsService)
//       today's slots: start_time, end_time, status available | booked |
//       blocked.
//   GET /venue_owner/owner/bookings?venue_id={id}&page={n}
//       only when a slot of today is booked or blocked (held by a booking
//       that awaits payment): its player is the captain_name of its (not
//       cancelled) booking, matched by time_slot_id.
//   GET /venue_owner/owner/analytics?period=week   (shared with the cards)
//       bookings_overview.items: [{ day: 'Saturday'…'Friday', date, bookings }]
//       — bookings created on each day of the current week (Saturday..
//       Friday, as the chart) -> weeklyBookings. Nothing is computed here.
//   No endpoint returns revenue per day (only per month: revenue_chart), so
//   weeklyRevenue stays null in API mode (the chart says so).
//
// getVenueOwnerDashboardStats(period, token) — the statistics cards:
//   GET /venue_owner/owner/analytics?period=day|week|month|last_month
//   (the picker's today | week | month | lastMonth; OwnerAnalyticsController
//   @index, any other value is 422). For the period:
//     period: { type, from, to }  — day = today, week = Saturday..Friday,
//       month / last_month = calendar months, in the backend time zone
//       (UTC); the change is vs the previous day / week / month.
//     bookings.total / .change_percent — bookings of the period's slots
//       created in the period, and the change vs the previous period (null
//       when the previous period had none).
//     revenue.total — total_price of the confirmed ones.
//     occupancy.rate — booked / (available + booked) slots of the period
//       (0 when there is none: shown as null here, not as 0%).
//   The "This week" card always uses period=week (the same request when the
//   selected period is the week), so every number on the cards follows the
//   backend's one definition.
//
// Each analytics answer is kept briefly per token and period (the cards and
// the bookings chart share the week's request; going back to a period does
// not ask again); a failed request is never kept.
//
// Errors: facilityService's FACILITY_NONE / FACILITY_MULTIPLE, or the
// apiClient's ApiError (.status: 0 network, 401, 404, 5xx).
//
// Demo mode (no VITE_API_BASE_URL): the local mock data, as before (the mock
// statistics are the same for every period).

// The picker's periods -> the backend's `period` values.
const BACKEND_PERIODS = { today: 'day', week: 'week', month: 'month', lastMonth: 'last_month' }
export const API_PERIODS = Object.keys(BACKEND_PERIODS)

// The chart's day keys (venueOwnerDashboard.days.*), Saturday first.
const CHART_DAYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']
export const PERIOD_NOT_SUPPORTED = 'PERIOD_NOT_SUPPORTED'

// Safety stop for the bookings page loop (10 bookings per page).
const MAX_BOOKING_PAGES = 100

function unexpected(what) {
  return new Error(`Unexpected ${what} response.`)
}

function toNumber(value, what) {
  const number = Number(value)
  if (value === null || value === undefined || value === '' || !Number.isFinite(number)) throw unexpected(what)
  return number
}

// Today in the browser's time zone, as YYYY-MM-DD.
function todayIso() {
  return new Date().toLocaleDateString('en-CA')
}

async function fetchBookingsPage(venueId, page, token) {
  const query = new URLSearchParams({ venue_id: String(venueId), page: String(page) })
  const body = await apiRequest(`/venue_owner/owner/bookings?${query}`, { token })
  const paginator = body?.data?.bookings
  if (!paginator || !Array.isArray(paginator.data)) throw unexpected('bookings')
  return paginator
}

// Player names of today's booked slots: { [time_slot_id]: captain_name }.
// Reads booking pages only while a booked slot is still unmatched.
async function playerNamesFor(bookedSlotIds, venueId, token) {
  const names = {}
  const pending = new Set(bookedSlotIds.map(String))
  let lastPage = 1
  for (let page = 1; pending.size > 0 && page <= Math.min(lastPage, MAX_BOOKING_PAGES); page += 1) {
    const paginator = await fetchBookingsPage(venueId, page, token)
    lastPage = Number(paginator.last_page) || 1
    for (const item of paginator.data) {
      const slotId = String(item.time_slot_id ?? item.time_slot?.id ?? '')
      if (pending.has(slotId) && item.status !== 'cancelled') {
        names[slotId] = item.captain_name || null
        pending.delete(slotId)
      }
    }
  }
  return names
}

// getVenueOwnerDashboard(token) -> Promise<{
//   venue: { name, status } (demo) | { name_ar, name_en, status } (API),
//   todaySchedule: [{ time, endTime?, status: 'available' | 'booked' | 'blocked', playerName }],
//   weeklyBookings: [{ day, value }] | null,
//   weeklyRevenue: [{ day, value }] | null,
// }>
export async function getVenueOwnerDashboard(token) {
  if (!IS_API_ENABLED) {
    const { venue, todaySchedule, weeklyBookings, weeklyRevenue } = structuredClone(MOCK_VENUE_OWNER_DASHBOARD)
    return { venue, todaySchedule, weeklyBookings, weeklyRevenue }
  }

  const venue = await getVenueOwnerFacility({ token })
  if (!venue?.id) throw unexpected('venue')
  const todaySlots = await getVenueOwnerDaySlots(todayIso(), token)
  const booked = todaySlots
    .filter((slot) => slot.status === 'booked' || slot.status === 'blocked')
    .map((slot) => slot.id)
  const names = booked.length > 0 ? await playerNamesFor(booked, venue.id, token) : {}

  return {
    venue: { name_ar: venue.name_ar, name_en: venue.name_en, status: venue.status },
    todaySchedule: todaySlots.map((slot) => ({
      time: slot.start_time,
      endTime: slot.end_time,
      status: slot.status,
      playerName: names[String(slot.id)] ?? null,
    })),
    weeklyBookings: toWeeklyBookings((await fetchAnalytics('week', token)).bookingsOverview),
    weeklyRevenue: null,
  }
}

// bookings_overview items -> [{ day, value }] in the chart's Saturday-first
// order, or null when the answer does not have exactly those seven days.
function toWeeklyBookings(items) {
  if (!Array.isArray(items) || items.length !== CHART_DAYS.length) return null
  const byDay = Object.fromEntries(items.map((item) => [String(item?.day ?? '').toLowerCase(), item?.bookings]))
  if (!CHART_DAYS.every((day) => day in byDay)) return null
  return CHART_DAYS.map((day) => ({ day, value: toNumber(byDay[day], 'analytics') }))
}

// Analytics answers per token and backend period, kept for ANALYTICS_TTL_MS.
const ANALYTICS_TTL_MS = 60 * 1000
const analyticsCache = new Map() // `${token}|${period}` -> { promise, storedAt }

function fetchAnalytics(period, token) {
  const key = `${token}|${period}`
  const cached = analyticsCache.get(key)
  if (cached && Date.now() - cached.storedAt < ANALYTICS_TTL_MS) return cached.promise
  const promise = readAnalytics(period, token)
  analyticsCache.set(key, { promise, storedAt: Date.now() })
  promise.catch(() => {
    if (analyticsCache.get(key)?.promise === promise) analyticsCache.delete(key)
  })
  return promise
}

async function readAnalytics(period, token) {
  const body = await apiRequest(`/venue_owner/owner/analytics?period=${period}`, { token })
  const data = body?.data
  if (data?.period?.type !== period) throw unexpected('analytics')
  const change = data.bookings?.change_percent
  const bookableSlots = toNumber(data.occupancy?.bookable_slots, 'analytics')
  return {
    from: data.period.from,
    to: data.period.to,
    bookings: toNumber(data.bookings?.total, 'analytics'),
    bookingsChangePercent: change === null || change === undefined ? null : toNumber(change, 'analytics'),
    revenue: toNumber(data.revenue?.total, 'analytics'),
    occupancyPercent: bookableSlots > 0 ? toNumber(data.occupancy?.rate, 'analytics') : null,
    bookingsOverview: data.bookings_overview?.items ?? null,
  }
}

// getVenueOwnerDashboardStats(period, token) -> Promise<{
//   totalBookings, totalBookingsChangePercent (number | null),
//   weekBookings, weekRevenue, occupancyPercent (number | null),
//   revenue (API: the selected period's revenue),
//   range: { from, to } | null (API: the selected period's dates),
//   weekRange: { from, to } | null (API: the backend's week),
// }>
// period: 'today' | 'week' | 'month' | 'lastMonth'.
export async function getVenueOwnerDashboardStats(period, token) {
  if (!IS_API_ENABLED) {
    const stats = structuredClone(MOCK_VENUE_OWNER_DASHBOARD.stats)
    return { ...stats, revenue: stats.weekRevenue, range: null, weekRange: null }
  }
  const backendPeriod = BACKEND_PERIODS[period]
  if (!backendPeriod) {
    const error = new Error(`The period "${period}" is not supported by the backend.`)
    error.code = PERIOD_NOT_SUPPORTED
    throw error
  }

  // The owner's venue first, so "no venue" is reported as on the other pages.
  await getVenueOwnerFacility({ token })
  const [selected, week] = await Promise.all([
    fetchAnalytics(backendPeriod, token),
    backendPeriod === 'week' ? null : fetchAnalytics('week', token),
  ])
  const thisWeek = week ?? selected
  return {
    totalBookings: selected.bookings,
    totalBookingsChangePercent: selected.bookingsChangePercent,
    weekBookings: thisWeek.bookings,
    weekRevenue: thisWeek.revenue,
    occupancyPercent: selected.occupancyPercent,
    revenue: selected.revenue,
    range: { from: selected.from, to: selected.to },
    weekRange: { from: thisWeek.from, to: thisWeek.to },
  }
}

// The owner's venue ({ name, status }) for the shared layout (sidebar venue
// card, top-bar subtitle) on the other Venue Owner pages. Same mock source in
// demo mode; null in API mode (the layout then shows no venue card) until it
// is wired to the owner's venue.
export async function getVenueOwnerVenue() {
  if (IS_API_ENABLED) return null
  return structuredClone(MOCK_VENUE_OWNER_DASHBOARD.venue)
}
