// MOCK DATA — development only, used to render the Venue Owner dashboard
// from the Figma reference while no backend endpoint exists for it (the
// backend at 3c2c09f has no owner/dashboard API). Values are copied from
// the design, not calculated. Replace via dashboardService.js once the
// backend provides the real endpoint and response shape.
//
// Days use keys, translated in the UI; the week starts on Saturday.

export const MOCK_VENUE_OWNER_DASHBOARD = {
  venue: {
    name: 'ملعب غزة الرياضي',
    // Documented VENUE.status value (Guidelines §3): active | inactive.
    status: 'active',
  },
  stats: {
    totalBookings: 128,
    totalBookingsChangePercent: 12,
    weekBookings: 24,
    weekRevenue: 1850,
    occupancyPercent: 78,
  },
  // Documented TIME_SLOT.status values: available | booked.
  todaySchedule: [
    { time: '08:00', status: 'available', playerName: null },
    { time: '09:00', status: 'booked', playerName: 'محمد علي' },
    { time: '10:00', status: 'booked', playerName: 'ابراهيم مقداد' },
    { time: '11:00', status: 'available', playerName: null },
    { time: '12:00', status: 'booked', playerName: 'هلال أكرم' },
    { time: '13:00', status: 'available', playerName: null },
  ],
  weeklyBookings: [
    { day: 'saturday', value: 8 },
    { day: 'sunday', value: 17 },
    { day: 'monday', value: 2 },
    { day: 'tuesday', value: 10 },
    { day: 'wednesday', value: 8 },
    { day: 'thursday', value: 15 },
    { day: 'friday', value: 19 },
  ],
  weeklyRevenue: [
    { day: 'saturday', value: 420 },
    { day: 'sunday', value: 880 },
    { day: 'monday', value: 220 },
    { day: 'tuesday', value: 680 },
    { day: 'wednesday', value: 480 },
    { day: 'thursday', value: 770 },
    { day: 'friday', value: 1130 },
  ],
}
