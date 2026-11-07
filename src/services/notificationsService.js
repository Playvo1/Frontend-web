import { IS_API_ENABLED } from '../config/api.js'
import { createMockNotifications } from '../mocks/mockNotifications.js'
import { apiRequest } from './apiClient.js'

// Notifications of the signed-in user.
//
// API mode — backend contract (NotificationController, routes/api.php on
// main @ 3de1a84, auth:sanctum, any role; the backend only returns the
// notifications whose user_id is the token's user, so a Venue Owner never
// sees another account's or an admin's notifications). Checked against the
// live backend (GET only):
//   GET /api/v1/notifications?page={n}
//     data: Laravel paginator, 20 per page, newest first:
//       { data: [...], current_page, last_page, total, ...,
//         unread_count (all the user's unread notifications, every page) }
//     each notification: { id, user_id, booking_id (or null), type, title,
//       body, is_read (boolean), sent_at (or null), created_at, updated_at }
//   PUT /api/v1/notifications/{id}/read  -> marks one notification as read
//     (data: the updated notification; 404 for another user's id)
// There is no "mark all as read", unread-count-only or delete endpoint
// (404); nothing else is offered. title / body are shown as the backend
// stores them.
//
// Every page is fetched so the All / Unread / Read tabs and the unread count
// cover all of the user's notifications. Errors are the apiClient's
// ApiError (.status: 0 network, 401, 404, 5xx); the page decides what to
// show.
//
// Demo mode (no VITE_API_BASE_URL): the local mock list (demo texts as
// translation keys), and "mark as read" only changes the page's state.
//
// getNotifications(token) -> Promise<[{
//   id, type, title, body, titleKey?, bodyKey?, is_read, created_at, booking_id,
// }]>   (newest first)

// Safety stop for the page loop (20 notifications per page).
const MAX_PAGES = 50

// Unread count for the top-bar bell (API mode): the backend's unread_count,
// read from page 1 only. It is kept briefly per token so moving between
// pages does not read it again each time; loading the notifications page
// refreshes it (same page-1 request, shared when both ask at once) and
// marking a notification as read updates it. Listeners (the bell) are told
// through UNREAD_EVENT with { detail: count }.
const UNREAD_TTL_MS = 60 * 1000
export const UNREAD_EVENT = 'playvo:notifications-unread'
let unreadCache = null // { token, count, storedAt } | { token, promise }

function storeUnread(token, count) {
  unreadCache = { token, count, storedAt: Date.now() }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(UNREAD_EVENT, { detail: count }))
}

function toNotification(item) {
  return {
    id: item.id,
    type: typeof item.type === 'string' ? item.type : '',
    title: typeof item.title === 'string' ? item.title : '',
    body: typeof item.body === 'string' ? item.body : '',
    is_read: Boolean(item.is_read),
    // When it was sent; the row's creation time if sent_at is empty.
    created_at: item.sent_at ?? item.created_at ?? null,
    booking_id: item.booking_id ?? null,
  }
}

export async function getNotifications(token) {
  if (!IS_API_ENABLED) return createMockNotifications()
  const { notifications, unreadCount } = await fetchAllNotifications(token)
  storeUnread(token, unreadCount ?? notifications.filter((item) => !item.is_read).length)
  return notifications
}

// One page of the list. Page 1 is shared while it runs (the bell and the
// notifications page ask for it at the same time when the page opens).
let pageOneRequest = null // { token, promise }

function fetchPage(page, token) {
  if (page === 1 && pageOneRequest?.token === token) return pageOneRequest.promise
  const promise = apiRequest(`/notifications?page=${page}`, { token }).then((body) => {
    const paginator = body?.data
    if (!paginator || !Array.isArray(paginator.data)) {
      throw new Error('Unexpected notifications response.')
    }
    return paginator
  })
  if (page === 1) {
    pageOneRequest = { token, promise }
    const clear = () => {
      if (pageOneRequest?.promise === promise) pageOneRequest = null
    }
    promise.then(clear, clear)
  }
  return promise
}

// unread_count of a page, or null when the answer has none.
function unreadCountOf(paginator) {
  const count = Number(paginator.unread_count)
  return paginator.unread_count !== undefined && paginator.unread_count !== null && Number.isInteger(count) && count >= 0
    ? count
    : null
}

// firstPage: page 1 already read (not asked again), or omitted.
async function fetchAllNotifications(token, firstPage = null) {
  const notifications = []
  let unreadCount = null
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const paginator = page === 1 && firstPage ? firstPage : await fetchPage(page, token)
    if (page === 1) unreadCount = unreadCountOf(paginator)
    notifications.push(...paginator.data.map(toNotification))
    const lastPage = Number(paginator.last_page) || 1
    if (paginator.data.length === 0 || page >= lastPage) break
  }
  return { notifications, unreadCount }
}

// markNotificationRead(id, token) -> Promise<void>
export async function markNotificationRead(id, token) {
  if (!IS_API_ENABLED) return
  await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT', token })
  const cache = unreadCache
  if (cache?.token === token && typeof cache.count === 'number') storeUnread(token, Math.max(0, cache.count - 1))
}

// getUnreadNotificationsCount(token) -> Promise<number | null>
//   API mode: the number of unread notifications of the signed-in user.
//   Demo mode: null (the bell keeps its design dot over the demo list).
export function getUnreadNotificationsCount(token) {
  if (!IS_API_ENABLED) return Promise.resolve(null)
  const cache = unreadCache
  if (cache?.token === token) {
    if (cache.promise) return cache.promise
    if (Date.now() - cache.storedAt < UNREAD_TTL_MS) return Promise.resolve(cache.count)
  }
  // The backend's unread_count (page 1); without it, counted on the list.
  const promise = fetchPage(1, token)
    .then(async (paginator) => {
      const count = unreadCountOf(paginator)
      if (count !== null) return count
      const { notifications } = await fetchAllNotifications(token, paginator)
      return notifications.filter((item) => !item.is_read).length
    })
    .then(
      (count) => {
        if (unreadCache?.promise === promise) storeUnread(token, count)
        return count
      },
      (error) => {
        if (unreadCache?.promise === promise) unreadCache = null
        throw error
      },
    )
  unreadCache = { token, promise }
  return promise
}
