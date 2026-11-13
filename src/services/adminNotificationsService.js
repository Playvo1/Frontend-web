import { IS_API_ENABLED } from '../config/api.js'
import { getNotifications, markNotificationRead } from './notificationsService.js'

// Notifications of the signed-in Admin (Admin Notifications page).
//
// API mode: the same backend endpoints as every other role
// (notificationsService.js — GET /api/v1/notifications, auth:sanctum, the
// token's own notifications only; PUT /api/v1/notifications/{id}/read).
// The backend has no "mark all as read" endpoint, so markAllAdminNotificationsRead
// sends PUT /notifications/{id}/read for each unread notification. Note: the
// backend (main) creates no notifications for admins yet, so the real list
// is empty until it does.
//
// Demo mode (no VITE_API_BASE_URL): the local admin demo list
// (mockAdminNotifications.js); marking as read only changes the page's state.

// getAdminNotifications(token) -> Promise<[{ id, type, title, body,
//   titleKey?, bodyKey?, is_read, created_at, booking_id }]>  (newest first)
export function getAdminNotifications(token) {
  if (!IS_API_ENABLED) {
    return import('../mocks/mockAdminNotifications.js').then((mocks) => mocks.createMockAdminNotifications())
  }
  return getNotifications(token)
}

// markAdminNotificationRead(id, token) -> Promise<void>
export function markAdminNotificationRead(id, token) {
  return markNotificationRead(id, token)
}

// markAllAdminNotificationsRead(ids, token) -> Promise<{ failedIds: [] }>
//   One request per notification (no bulk endpoint). Resolves with the ids
//   whose request failed; rejects only with a 401 so the page can sign out.
export async function markAllAdminNotificationsRead(ids, token) {
  const results = await Promise.allSettled(ids.map((id) => markNotificationRead(id, token)))
  const unauthorized = results.find((result) => result.status === 'rejected' && result.reason?.status === 401)
  if (unauthorized) throw unauthorized.reason
  return { failedIds: ids.filter((_, index) => results[index].status === 'rejected') }
}
