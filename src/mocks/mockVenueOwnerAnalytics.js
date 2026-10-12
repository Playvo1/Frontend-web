// MOCK — development/demo data for the Venue Owner Analytics page,
// reproducing the design reference (values read from the design, not
// calculated). There is no documented analytics endpoint for venue owners
// yet; replace via analyticsService.js once the backend provides one.
//
// Period: the current month ("this month" in the design).
export const MOCK_VENUE_OWNER_ANALYTICS = {
  summary: {
    bookings_count: 128,
    revenue: 8450,
    occupancy_percent: 78, // share of available slots that are booked
  },
  // "Bookings & revenue" chart: one point per date shown on the x-axis.
  trend: [
    { date: '2026-09-01', bookings: 20, revenue: 1200 },
    { date: '2026-09-05', bookings: 27, revenue: 1600 },
    { date: '2026-09-09', bookings: 16, revenue: 850 },
    { date: '2026-09-13', bookings: 22, revenue: 1320 },
    { date: '2026-09-17', bookings: 13, revenue: 700 },
    { date: '2026-09-21', bookings: 18, revenue: 1030 },
    { date: '2026-09-25', bookings: 12, revenue: 550 },
  ],
  // "Peak hours" chart: bookings per start hour this month.
  peak_hours: [
    { hour: '08:00', bookings: 38 },
    { hour: '09:00', bookings: 55 },
    { hour: '10:00', bookings: 72 },
    { hour: '11:00', bookings: 48 },
    { hour: '12:00', bookings: 91 },
    { hour: '17:00', bookings: 84 },
    { hour: '18:00', bookings: 112 },
    { hour: '19:00', bookings: 96 },
    { hour: '20:00', bookings: 64 },
  ],
}
