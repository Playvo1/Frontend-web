import { Activity, CalendarDays, Clock, House, LayoutGrid, Star } from 'lucide-react'

// Venue Owner sidebar menu, shared by every Venue Owner page. Entries
// without `to` have no page yet: they are shown (as in the design) but are
// not links. Documented routes (Project Instructions §14) are noted for when
// they are built.
export const VENUE_OWNER_NAV = [
  { key: 'home', labelKey: 'dashboardLayout.nav.home', icon: LayoutGrid, to: '/venue-owner/dashboard' },
  { key: 'bookings', labelKey: 'dashboardLayout.nav.bookings', icon: CalendarDays, to: '/venue-owner/bookings' },
  { key: 'schedule', labelKey: 'dashboardLayout.nav.schedule', icon: Clock }, // /slots
  { key: 'myVenue', labelKey: 'dashboardLayout.nav.myVenue', icon: House }, // /facility
  { key: 'reviews', labelKey: 'dashboardLayout.nav.reviews', icon: Star }, // /reviews
  { key: 'analytics', labelKey: 'dashboardLayout.nav.analytics', icon: Activity }, // no documented route
]
