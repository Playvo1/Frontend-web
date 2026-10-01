// MOCK DATA — development only, used by the Venue Owner booking details
// page ("مسار الحجز" / booking timeline) while the backend has no owner
// booking-details endpoint. Keyed by booking id; every booking has a
// details page. The PV-1024 times are copied from the Figma
// design; the others are illustrative values on each booking's date.
// Replace via bookingsService.js once the backend provides the real endpoint.
//
// Each entry: when the booking was created, when its payment was verified,
// and when it was confirmed ("YYYY-MM-DDTHH:mm", local time). Pending and
// cancelled bookings only have created_at: the later steps did not happen.

export const MOCK_VENUE_OWNER_BOOKING_TIMELINE = {
  1024: { created_at: '2026-09-18T07:42', payment_verified_at: '2026-09-18T07:44', confirmed_at: '2026-09-18T08:01' },
  1025: { created_at: '2026-09-18T09:15', payment_verified_at: '2026-09-18T09:18', confirmed_at: '2026-09-18T09:30' },
  1028: { created_at: '2026-09-20T10:05', payment_verified_at: '2026-09-20T10:09', confirmed_at: '2026-09-20T10:20' },
  1030: { created_at: '2026-09-21T08:30', payment_verified_at: '2026-09-21T08:34', confirmed_at: '2026-09-21T08:50' },
  1031: { created_at: '2026-09-21T11:12', payment_verified_at: '2026-09-21T11:15', confirmed_at: '2026-09-21T11:40' },
  1032: { created_at: '2026-09-22T09:02', payment_verified_at: '2026-09-22T09:06', confirmed_at: '2026-09-22T09:25' },
  1034: { created_at: '2026-09-23T10:40', payment_verified_at: '2026-09-23T10:43', confirmed_at: '2026-09-23T11:00' },
  // Pending (pending_payment) bookings
  1026: { created_at: '2026-09-19T08:20', payment_verified_at: null, confirmed_at: null },
  1029: { created_at: '2026-09-20T09:45', payment_verified_at: null, confirmed_at: null },
  1033: { created_at: '2026-09-22T10:10', payment_verified_at: null, confirmed_at: null },
  // Cancelled bookings
  1027: { created_at: '2026-09-19T10:30', payment_verified_at: null, confirmed_at: null },
  1035: { created_at: '2026-09-23T09:50', payment_verified_at: null, confirmed_at: null },
}
