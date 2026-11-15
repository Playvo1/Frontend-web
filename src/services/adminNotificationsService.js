import { IS_API_ENABLED } from '../config/api.js'
import { getNotifications, markNotificationRead } from './notificationsService.js'

// Notifications of the signed-in Admin (Admin Notifications page).
//
// API mode: the same backend endpoints as every other role
// (notificationsService.js; Playvo1/Backend main @ 28ced0c,
// NotificationController, auth:sanctum, any role):
//   GET /api/v1/notifications?page={n}  — the token's own notifications only
//     (20 per page, newest first, + unread_count);
//   PUT /api/v1/notifications/{id}/read — marks one as read (404 when the id
//     is not one of the admin's notifications).
// There is no "mark all as read", delete or unread-count-only endpoint, so
// markAllAdminNotificationsRead sends PUT /notifications/{id}/read for each
// unread notification, a few at a time.
// What the backend sends to admins today: one notification per admin when a
// player uploads a payment receipt (BookingController@uploadPaymentReceipt):
//   type 'payment_receipt_uploaded', booking_id, title / body in Arabic
//   (stored text, shown as is), is_read, sent_at.
// The other kinds the page knows (payment_receipts_pending, venue_created,
// admin_created) only exist in the demo list.
//
// Demo mode (no VITE_API_BASE_URL): the local admin demo list
// (mockAdminNotifications.js); marking as read only changes the page's state.

// Requests sent at the same time by "Mark all as read".
const MARK_ALL_CONCURRENCY = 4

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

// markAllAdminNotificationsRead(ids, token) -> Promise<{ failedIds: [], error }>
//   One request per notification (no bulk endpoint), at most
//   MARK_ALL_CONCURRENCY at a time. Resolves with the ids whose request
//   failed and the first failure (null when all succeeded); rejects only
//   with a 401 (no further request is sent) so the page can sign out.
export async function markAllAdminNotificationsRead(ids, token) {
  const failedIds = []
  let error = null
  let unauthorized = null
  let next = 0
  const worker = async () => {
    while (next < ids.length && !unauthorized) {
      const id = ids[next]
      next += 1
      try {
        await markNotificationRead(id, token)
      } catch (requestError) {
        if (requestError?.status === 401) unauthorized = requestError
        failedIds.push(id)
        error ??= requestError
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(MARK_ALL_CONCURRENCY, ids.length) }, worker))
  if (unauthorized) throw unauthorized
  return { failedIds, error }
}
