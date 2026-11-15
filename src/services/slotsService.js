import { IS_API_ENABLED } from '../config/api.js'
import { apiRequest } from './apiClient.js'
import { getVenueOwnerFacility } from './facilityService.js'

// Venue Owner time slots service.
//
// API mode — backend contract (TimeSlotController, routes/api.php on main
// @ 3de1a84, auth:sanctum + role:venue_owner; the backend finds the owner's
// venue from the token):
//   GET  /api/v1/venue_owner/owner/time-slots?date=YYYY-MM-DD&per_page=&page=
//        data: Laravel paginator ordered by slot_date, start_time; each slot
//        { id, venue_id, sport_id, slot_date, start_time "HH:mm:ss",
//          end_time, hourly_price "50.00", status: available | booked | blocked }
//        (404 when the owner has no venue)
//   POST /api/v1/venue_owner/owner/venues/{venue}/time-slots
//        { sport_id, slot_date, start_time "HH:mm", end_time "HH:mm",
//          hourly_price } -> 201; 409 only when a slot with the same sport,
//        date, start and end already exists (the backend does not check
//        overlapping times); 422 for invalid fields (end_time must be after
//        start_time; sport_id must be one of the venue's sports); 403 when
//        the venue is not the owner's
//   PUT  /api/v1/venue_owner/owner/time-slots/{id}
//        any of { slot_date, start_time, end_time, hourly_price } -> 200;
//        409 when the slot has a booking
//   DELETE /api/v1/venue_owner/owner/time-slots/{id}
//        -> 200 { success: true, data: null }; 409 "Cannot delete a time
//        slot that has booking history." (any booking, also a cancelled
//        one); 403 not the owner's slot; 404 no such slot
// There is no endpoint to change a slot's status (block / unblock), and
// slots carry no player name: nothing of that is offered.
//
// sport_id (required to create a slot) comes only from the venue's own
// sports: GET /api/v1/venues/{id} (with `sports`) for the owner's venue
// (GET /venue_owner/owner/myvenues). Creating is offered only when the venue
// has exactly one sport; otherwise getSlotCreation says why it is not.
//
// Errors are the apiClient's ApiError (.status: 0 network, 401, 403, 404,
// 409, 422 with .errors, 5xx); the page decides what to show.
//
// Demo mode (no VITE_API_BASE_URL): the local mock list; nothing is saved.
//
// Slot shape: { id, slot_date: 'YYYY-MM-DD', start_time: 'HH:mm',
//   end_time: 'HH:mm', hourly_price: number, status, sport_id?, captain_name? }

const SLOTS_PATH = '/venue_owner/owner/time-slots'
const PER_PAGE = 100
// Safety stop for the page loop.
const MAX_PAGES = 50

function unexpected() {
  return new Error('Unexpected time slots response.')
}

function toSlot(item) {
  if (!item || typeof item.slot_date !== 'string' || typeof item.start_time !== 'string') throw unexpected()
  return {
    id: item.id,
    slot_date: item.slot_date.slice(0, 10),
    start_time: item.start_time.slice(0, 5),
    end_time: typeof item.end_time === 'string' ? item.end_time.slice(0, 5) : '',
    hourly_price: Number(item.hourly_price ?? 0),
    status: item.status,
    sport_id: item.sport_id ?? null,
  }
}

async function fetchSlots(token, date) {
  const slots = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const query = new URLSearchParams({ per_page: String(PER_PAGE), page: String(page) })
    if (date) query.set('date', date)
    const body = await apiRequest(`${SLOTS_PATH}?${query}`, { token })
    const paginator = body?.data
    if (!paginator || !Array.isArray(paginator.data)) throw unexpected()
    slots.push(...paginator.data.map(toSlot))
    const lastPage = Number(paginator.last_page) || 1
    if (paginator.data.length === 0 || page >= lastPage) break
  }
  return slots
}

// All of the owner's slots (calendar dots).
// getVenueOwnerSlots(token) -> Promise<Slot[]>
export async function getVenueOwnerSlots(token) {
  if (!IS_API_ENABLED) {
    const { MOCK_VENUE_OWNER_SLOTS } = await import('../mocks/mockVenueOwnerSlots.js')
    return structuredClone(MOCK_VENUE_OWNER_SLOTS)
  }
  return fetchSlots(token)
}

// The slots of one date (the selected day), filtered by the backend.
// getVenueOwnerDaySlots(date, token) -> Promise<Slot[]>
export async function getVenueOwnerDaySlots(date, token) {
  if (!IS_API_ENABLED) {
    const { MOCK_VENUE_OWNER_SLOTS } = await import('../mocks/mockVenueOwnerSlots.js')
    return structuredClone(MOCK_VENUE_OWNER_SLOTS.filter((slot) => slot.slot_date === date))
  }
  return fetchSlots(token, date)
}

// Why creating a slot is (not) possible, and with which venue and sport.
// getSlotCreation(token) -> Promise<{ venueId, sportId } | { reason }>
//   reason: 'noSport' (the venue has no sport) | 'manySports' (more than
//   one: the form has no sport field) | 'venue' (the venue could not be read)
//   | 'demo' (demo mode: the dialog opens but saves nothing, as before)

export async function getSlotCreation(token) {
  if (!IS_API_ENABLED) return { reason: 'demo' }
  let venueId
  try {
    const facility = await getVenueOwnerFacility({ token })
    venueId = facility?.id
  } catch {
    return { reason: 'venue' }
  }
  if (!venueId) return { reason: 'venue' }
  let sports
  try {
    const body = await apiRequest(`/venues/${encodeURIComponent(venueId)}`, { token })
    sports = body?.data?.sports
  } catch {
    return { reason: 'venue' }
  }
  if (!Array.isArray(sports) || sports.length === 0) return { reason: 'noSport' }
  if (sports.length > 1) return { reason: 'manySports' }
  const sportId = sports[0]?.id
  return sportId ? { venueId, sportId } : { reason: 'noSport' }
}

// createVenueOwnerSlot({ venueId, sportId, slot_date, start_time, end_time, hourly_price }, token)
export async function createVenueOwnerSlot({ venueId, sportId, ...fields }, token) {
  await apiRequest(`/venue_owner/owner/venues/${encodeURIComponent(venueId)}/time-slots`, {
    method: 'POST',
    token,
    body: {
      sport_id: sportId,
      slot_date: fields.slot_date,
      start_time: fields.start_time,
      end_time: fields.end_time,
      hourly_price: fields.hourly_price,
    },
  })
}

// deleteVenueOwnerSlot(id, token) -> Promise<void>
export async function deleteVenueOwnerSlot(id, token) {
  await apiRequest(`${SLOTS_PATH}/${encodeURIComponent(id)}`, { method: 'DELETE', token })
}

// updateVenueOwnerSlot(id, { start_time, end_time, hourly_price }, token)
export async function updateVenueOwnerSlot(id, fields, token) {
  await apiRequest(`${SLOTS_PATH}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    token,
    body: {
      start_time: fields.start_time,
      end_time: fields.end_time,
      hourly_price: fields.hourly_price,
    },
  })
}
