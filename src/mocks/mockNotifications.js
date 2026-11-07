// MOCK — development/demo data for the Venue Owner Notifications page,
// reproducing the design reference. Used ONLY in demo mode (no
// VITE_API_BASE_URL); in API mode the real GET /notifications list is shown
// (notificationsService.js), never this one.
//
// The design's notification kinds (new booking, reminder, cancellation, new
// review, upcoming booking, platform update) are not produced by the backend
// for venue owners yet; the `type` values below are demo-only names.
// Texts are translation keys (titleKey / bodyKey) so the demo follows the
// interface language; the backend's own notifications carry plain
// title / body strings instead.
//
// Times are relative to when the page loads, as in the design ("5
// minutes ago", "an hour ago", "2 hours ago", "yesterday", a full date).
//
// The "Read" design shows six read notifications: the three booking ones
// (new booking, reminder, cancellation) as well as the review, upcoming
// booking and platform ones. So the demo has, besides the three unread
// booking notifications of the "Unread" design, a read notification of the
// same kind for each (ids 14–16, other bookings): "All" lists nine,
// "Unread" three and "Read" six.

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * MINUTE).toISOString()
}

// Yesterday at hh:mm (local time).
function yesterdayAt(hours, minutes) {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

export function createMockNotifications() {
  return [
    {
      id: 6,
      type: 'booking_created',
      titleKey: 'venueOwnerNotifications.mock.newBooking.title',
      bodyKey: 'venueOwnerNotifications.mock.newBooking.body',
      is_read: false,
      created_at: minutesAgo(5),
      booking_id: 101,
    },
    {
      id: 16,
      type: 'booking_created',
      titleKey: 'venueOwnerNotifications.mock.newBooking.title',
      bodyKey: 'venueOwnerNotifications.mock.newBooking.body',
      is_read: true,
      created_at: minutesAgo(5),
      booking_id: 104,
    },
    {
      id: 5,
      type: 'booking_reminder',
      titleKey: 'venueOwnerNotifications.mock.reminder.title',
      bodyKey: 'venueOwnerNotifications.mock.reminder.body',
      is_read: false,
      created_at: new Date(Date.now() - HOUR).toISOString(),
      booking_id: 102,
    },
    {
      id: 15,
      type: 'booking_reminder',
      titleKey: 'venueOwnerNotifications.mock.reminder.title',
      bodyKey: 'venueOwnerNotifications.mock.reminder.body',
      is_read: true,
      created_at: new Date(Date.now() - HOUR).toISOString(),
      booking_id: 105,
    },
    {
      id: 4,
      type: 'booking_cancelled',
      titleKey: 'venueOwnerNotifications.mock.cancelled.title',
      bodyKey: 'venueOwnerNotifications.mock.cancelled.body',
      is_read: false,
      created_at: new Date(Date.now() - 2 * HOUR).toISOString(),
      booking_id: 103,
    },
    {
      id: 14,
      type: 'booking_cancelled',
      titleKey: 'venueOwnerNotifications.mock.cancelled.title',
      bodyKey: 'venueOwnerNotifications.mock.cancelled.body',
      is_read: true,
      created_at: new Date(Date.now() - 2 * HOUR).toISOString(),
      booking_id: 106,
    },
    {
      id: 3,
      type: 'new_review',
      titleKey: 'venueOwnerNotifications.mock.review.title',
      bodyKey: 'venueOwnerNotifications.mock.review.body',
      is_read: true,
      created_at: yesterdayAt(10, 45),
      booking_id: null,
    },
    {
      id: 2,
      type: 'upcoming_booking',
      titleKey: 'venueOwnerNotifications.mock.upcoming.title',
      bodyKey: 'venueOwnerNotifications.mock.upcoming.body',
      is_read: true,
      created_at: yesterdayAt(12, 30),
      booking_id: null,
    },
    {
      id: 1,
      type: 'platform_update',
      titleKey: 'venueOwnerNotifications.mock.platform.title',
      bodyKey: 'venueOwnerNotifications.mock.platform.body',
      is_read: true,
      created_at: new Date(2026, 8, 17, 10, 15).toISOString(),
      booking_id: null,
    },
  ]
}
