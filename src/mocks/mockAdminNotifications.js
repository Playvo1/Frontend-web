// MOCK — development/demo data for the Admin Notifications page, following
// the design reference (receipts, venues, admin accounts). Used ONLY in demo
// mode (no VITE_API_BASE_URL); in API mode the real GET /notifications list
// of the signed-in admin is shown (adminNotificationsService.js), never this
// one.
//
// The backend (main) creates no notifications for admins yet; the `type`
// values below are demo-only names. Texts are translation keys
// (titleKey / bodyKey) so the demo follows the interface language.
// Times are relative to when the page loads.

const MINUTE = 60 * 1000

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * MINUTE).toISOString()
}

// Yesterday / n days ago at hh:mm (local time).
function daysAgoAt(days, hours, minutes) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

export function createMockAdminNotifications() {
  return [
    {
      id: 1,
      type: 'payment_receipt_uploaded',
      titleKey: 'adminNotifications.mock.receiptUploaded.title',
      bodyKey: 'adminNotifications.mock.receiptUploaded.body',
      is_read: false,
      created_at: minutesAgo(10),
      booking_id: null,
    },
    {
      id: 2,
      type: 'venue_created',
      titleKey: 'adminNotifications.mock.venueCreated.title',
      bodyKey: 'adminNotifications.mock.venueCreated.body',
      is_read: false,
      created_at: minutesAgo(95),
      booking_id: null,
    },
    {
      id: 3,
      type: 'payment_receipts_pending',
      titleKey: 'adminNotifications.mock.receiptsPending.title',
      bodyKey: 'adminNotifications.mock.receiptsPending.body',
      is_read: true,
      created_at: daysAgoAt(1, 9, 30),
      booking_id: null,
    },
    {
      id: 4,
      type: 'admin_created',
      titleKey: 'adminNotifications.mock.adminCreated.title',
      bodyKey: 'adminNotifications.mock.adminCreated.body',
      is_read: true,
      created_at: daysAgoAt(3, 14, 15),
      booking_id: null,
    },
  ]
}
