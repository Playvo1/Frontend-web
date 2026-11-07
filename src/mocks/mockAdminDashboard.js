// MOCK — demo-mode data for the Admin dashboard (values read from the
// design). Used only when VITE_API_BASE_URL is empty; API mode always reads
// GET /api/v1/admin/dashboard (adminDashboardService.js). Same shape as the
// service's mapped result.
export const MOCK_ADMIN_DASHBOARD = {
  totalUsers: 12480,
  totalVenues: 42,
  activeVenues: 38,
  bookingsToday: 186,
  bookingsThisMonth: 3842,
  pendingReceipts: 14,
  topVenues: [
    { id: 1, nameAr: 'ملعب النخبة الرياضي', nameEn: 'Al Nukhba Sports Field', bookings: 428, imageUrl: null, cityAr: 'غزة', cityEn: 'Gaza' },
    { id: 2, nameAr: 'ملعب النادي البحري', nameEn: 'Marine Club Field', bookings: 372, imageUrl: null, cityAr: 'دير البلح', cityEn: 'Deir al-Balah' },
    { id: 3, nameAr: 'ملعب الزوايدة', nameEn: 'Az-Zawayda Field', bookings: 315, imageUrl: null, cityAr: 'الزوايدة', cityEn: 'Az-Zawayda' },
    { id: 4, nameAr: 'ملعب الوحدة', nameEn: 'Al Wahda Field', bookings: 286, imageUrl: null, cityAr: 'غزة', cityEn: 'Gaza' },
    { id: 5, nameAr: 'ملعب اليرموك', nameEn: 'Al Yarmouk Field', bookings: 241, imageUrl: null, cityAr: 'غزة', cityEn: 'Gaza' },
  ],
  topCities: [
    { id: 1, nameAr: 'غزة', nameEn: 'Gaza', bookings: 1240 },
    { id: 2, nameAr: 'دير البلح', nameEn: 'Deir al-Balah', bookings: 936 },
    { id: 3, nameAr: 'النصيرات', nameEn: 'Nuseirat', bookings: 704 },
    { id: 4, nameAr: 'المغازي', nameEn: 'Maghazi', bookings: 582 },
    { id: 5, nameAr: 'خانيونس', nameEn: 'Khan Younis', bookings: 418 },
  ],
}
