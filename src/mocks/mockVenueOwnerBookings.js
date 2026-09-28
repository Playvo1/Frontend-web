// MOCK DATA — development only, used to render the Venue Owner Bookings
// page from the Figma reference while the backend has no owner bookings
// endpoint (github.com/Playvo1/Backend @ 3c2c09f). Rows PV-1024…PV-1031 are
// copied from the design; the design states 12 bookings in total, so four
// more rows fill the second page. Replace via bookingsService.js once the
// backend provides the real endpoint and response shape.
//
// Field names follow the BOOKING / TIME_SLOT entities (Guidelines §3):
// captain_name, total_price, status, slot_date, start_time, end_time.
// status uses the documented BOOKING.status values (Guidelines §3.1):
// pending_payment | confirmed | cancelled.

export const MOCK_VENUE_OWNER_BOOKINGS = [
  { id: 1024, captain_name: 'Ahmed Ali', slot_date: '2026-09-18', start_time: '20:00', end_time: '21:00', total_price: 50, status: 'confirmed' },
  { id: 1025, captain_name: 'Mohammed Ali', slot_date: '2026-09-18', start_time: '21:00', end_time: '22:00', total_price: 50, status: 'confirmed' },
  { id: 1026, captain_name: 'Khalid Hassan', slot_date: '2026-09-19', start_time: '19:00', end_time: '20:00', total_price: 75, status: 'pending_payment' },
  { id: 1027, captain_name: 'Omar Saleh', slot_date: '2026-09-19', start_time: '22:00', end_time: '23:00', total_price: 50, status: 'cancelled' },
  { id: 1028, captain_name: 'Yusuf Ibrahim', slot_date: '2026-09-20', start_time: '18:00', end_time: '19:00', total_price: 75, status: 'confirmed' },
  { id: 1029, captain_name: 'Tariq Mahmoud', slot_date: '2026-09-20', start_time: '20:00', end_time: '21:00', total_price: 50, status: 'pending_payment' },
  { id: 1030, captain_name: 'Samir Nasser', slot_date: '2026-09-21', start_time: '17:00', end_time: '18:00', total_price: 100, status: 'confirmed' },
  { id: 1031, captain_name: 'Rami Yousef', slot_date: '2026-09-21', start_time: '21:00', end_time: '22:00', total_price: 50, status: 'confirmed' },
  { id: 1032, captain_name: 'Hani Khalil', slot_date: '2026-09-22', start_time: '18:00', end_time: '19:00', total_price: 50, status: 'confirmed' },
  { id: 1033, captain_name: 'Bilal Awad', slot_date: '2026-09-22', start_time: '20:00', end_time: '21:00', total_price: 75, status: 'pending_payment' },
  { id: 1034, captain_name: 'Nader Salem', slot_date: '2026-09-23', start_time: '19:00', end_time: '20:00', total_price: 50, status: 'confirmed' },
  { id: 1035, captain_name: 'Fadi Hamdan', slot_date: '2026-09-23', start_time: '21:00', end_time: '22:00', total_price: 50, status: 'cancelled' },
]
