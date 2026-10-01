// MOCK DATA — development only, used to render the Venue Owner schedule
// page ("الجدول") from the Figma reference while the backend has no owner
// time-slots endpoint (the documented owner endpoints are not implemented
// in github.com/Playvo1/Backend). Replace via slotsService.js once the
// backend provides the real endpoint and response shape.
//
// Field names follow the TIME_SLOT entity (Guidelines §3): slot_date,
// start_time, end_time, hourly_price, status. status uses the documented
// TIME_SLOT.status values (Guidelines §3.1): available | booked.
// captain_name (BOOKING.captain_name) is set on booked slots only, for the
// player shown in the design.
//
// The 18 Sep 2026 slots follow the design (2 booked, 3 available, ₪50 /
// hour, "محمد عليان"); the other days only reproduce the calendar dots.

export const MOCK_VENUE_OWNER_SLOTS = [
  { id: 1, slot_date: '2026-09-08', start_time: '17:00', end_time: '18:00', hourly_price: 50, status: 'available' },
  { id: 2, slot_date: '2026-09-08', start_time: '18:00', end_time: '19:00', hourly_price: 50, status: 'booked', captain_name: 'محمد عليان' },
  { id: 3, slot_date: '2026-09-10', start_time: '17:00', end_time: '18:00', hourly_price: 50, status: 'available' },
  { id: 4, slot_date: '2026-09-10', start_time: '18:00', end_time: '19:00', hourly_price: 50, status: 'booked', captain_name: 'محمد عليان' },
  { id: 5, slot_date: '2026-09-13', start_time: '17:00', end_time: '18:00', hourly_price: 50, status: 'available' },
  { id: 6, slot_date: '2026-09-18', start_time: '08:00', end_time: '09:00', hourly_price: 50, status: 'available' },
  { id: 7, slot_date: '2026-09-18', start_time: '09:00', end_time: '10:00', hourly_price: 50, status: 'booked', captain_name: 'محمد عليان' },
  { id: 8, slot_date: '2026-09-18', start_time: '10:00', end_time: '11:00', hourly_price: 50, status: 'booked', captain_name: 'محمد عليان' },
  { id: 9, slot_date: '2026-09-18', start_time: '11:00', end_time: '12:00', hourly_price: 50, status: 'available' },
  { id: 10, slot_date: '2026-09-18', start_time: '12:00', end_time: '13:00', hourly_price: 50, status: 'available' },
  { id: 11, slot_date: '2026-09-20', start_time: '17:00', end_time: '18:00', hourly_price: 50, status: 'available' },
  { id: 12, slot_date: '2026-09-20', start_time: '18:00', end_time: '19:00', hourly_price: 50, status: 'booked', captain_name: 'محمد عليان' },
  { id: 13, slot_date: '2026-09-23', start_time: '17:00', end_time: '18:00', hourly_price: 50, status: 'available' },
  { id: 14, slot_date: '2026-09-25', start_time: '18:00', end_time: '19:00', hourly_price: 50, status: 'booked', captain_name: 'محمد عليان' },
  { id: 15, slot_date: '2026-09-27', start_time: '17:00', end_time: '18:00', hourly_price: 50, status: 'available' },
]
