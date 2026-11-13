import { LayoutGrid, ReceiptText, UserPlus, Warehouse } from 'lucide-react'

// Admin sidebar menu (Admin dashboard design), shared by every Admin page.
// Entries without `to` have no page yet: they are shown (as in the design)
// but are not links — same convention as VENUE_OWNER_NAV.
export const ADMIN_NAV = [
  { key: 'dashboard', labelKey: 'dashboardLayout.nav.adminDashboard', icon: LayoutGrid, to: '/admin/dashboard' },
  { key: 'venues', labelKey: 'dashboardLayout.nav.venuesManagement', icon: Warehouse, to: '/admin/venues', matchNested: true },
  { key: 'payments', labelKey: 'dashboardLayout.nav.paymentReceipts', icon: ReceiptText },
  { key: 'admins', labelKey: 'dashboardLayout.nav.adminAccounts', icon: UserPlus },
]
