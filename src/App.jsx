import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Route, Routes } from 'react-router-dom'
import { ROLES } from './constants/roles.js'
import AdminDashboard from './pages/AdminDashboard/AdminDashboard.jsx'
import AdminAddVenue from './pages/AdminVenues/AdminAddVenue.jsx'
import AdminVenueDetails from './pages/AdminVenues/AdminVenueDetails.jsx'
import AdminVenues from './pages/AdminVenues/AdminVenues.jsx'
import AdminForgotPassword from './pages/AdminForgotPassword/AdminForgotPassword.jsx'
import AdminLogin from './pages/AdminLogin/AdminLogin.jsx'
import AdminNotifications from './pages/AdminNotifications/AdminNotifications.jsx'
import AdminProfile from './pages/AdminProfile/AdminProfile.jsx'
import ForgotPassword from './pages/ForgotPassword/ForgotPassword.jsx'
import Login from './pages/Login/Login.jsx'
import ResetPassword from './pages/ResetPassword/ResetPassword.jsx'
import VenueOwnerAnalytics from './pages/VenueOwnerAnalytics/VenueOwnerAnalytics.jsx'
import VenueOwnerBookingDetails from './pages/VenueOwnerBookingDetails/VenueOwnerBookingDetails.jsx'
import VenueOwnerBookings from './pages/VenueOwnerBookings/VenueOwnerBookings.jsx'
import VenueOwnerDashboard from './pages/VenueOwnerDashboard/VenueOwnerDashboard.jsx'
import VenueOwnerFacility from './pages/VenueOwnerFacility/VenueOwnerFacility.jsx'
import VenueOwnerNotifications from './pages/VenueOwnerNotifications/VenueOwnerNotifications.jsx'
import VenueOwnerProfile from './pages/VenueOwnerProfile/VenueOwnerProfile.jsx'
import VenueOwnerReviews from './pages/VenueOwnerReviews/VenueOwnerReviews.jsx'
import VenueOwnerSlots from './pages/VenueOwnerSlots/VenueOwnerSlots.jsx'
import VerifyCode from './pages/VerifyCode/VerifyCode.jsx'
import GuestRoute from './routes/GuestRoute.jsx'
import HomeRedirect from './routes/HomeRedirect.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'

// Languages that read right-to-left. Used to keep <html dir="..."> correct
// whenever the active language changes.
const RTL_LANGUAGES = ['ar']

// Root of the app. Routes follow Project Instructions §14; the remaining
// Venue Owner / Admin pages are added incrementally as each one is built.
function App() {
  const { i18n } = useTranslation()

  // Keep <html lang="..."> and <html dir="..."> in sync with the active
  // i18next language, for every page in the app (not just Login), so the
  // whole document mirrors correctly and index.css can select fonts by
  // html[lang].
  useEffect(() => {
    const applyLanguage = (language) => {
      document.documentElement.lang = language
      document.documentElement.dir = RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr'
    }

    applyLanguage(i18n.language)
    i18n.on('languageChanged', applyLanguage)
    return () => i18n.off('languageChanged', applyLanguage)
  }, [i18n])

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />

      {/* Admin login: same auth as /login, admin accounts only. */}
      <Route
        path="/admin/login"
        element={
          <GuestRoute>
            <AdminLogin />
          </GuestRoute>
        }
      />

      <Route
        path="/forgot-password"
        element={
          <GuestRoute>
            <ForgotPassword />
          </GuestRoute>
        }
      />

      {/* Admin recovery step 1 (own design); steps 2-3 are shared. */}
      <Route
        path="/admin/forgot-password"
        element={
          <GuestRoute>
            <AdminForgotPassword />
          </GuestRoute>
        }
      />

      <Route
        path="/verify-code"
        element={
          <GuestRoute>
            <VerifyCode />
          </GuestRoute>
        }
      />

      <Route
        path="/reset-password"
        element={
          <GuestRoute>
            <ResetPassword />
          </GuestRoute>
        }
      />

      <Route
        path="/venue-owner/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.VENUE_OWNER]}>
            <VenueOwnerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/venue-owner/bookings"
        element={
          <ProtectedRoute allowedRoles={[ROLES.VENUE_OWNER]}>
            <VenueOwnerBookings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/venue-owner/bookings/:bookingId"
        element={
          <ProtectedRoute allowedRoles={[ROLES.VENUE_OWNER]}>
            <VenueOwnerBookingDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/venue-owner/slots"
        element={
          <ProtectedRoute allowedRoles={[ROLES.VENUE_OWNER]}>
            <VenueOwnerSlots />
          </ProtectedRoute>
        }
      />

      <Route
        path="/venue-owner/facility"
        element={
          <ProtectedRoute allowedRoles={[ROLES.VENUE_OWNER]}>
            <VenueOwnerFacility />
          </ProtectedRoute>
        }
      />

      <Route
        path="/venue-owner/reviews"
        element={
          <ProtectedRoute allowedRoles={[ROLES.VENUE_OWNER]}>
            <VenueOwnerReviews />
          </ProtectedRoute>
        }
      />

      <Route
        path="/venue-owner/analytics"
        element={
          <ProtectedRoute allowedRoles={[ROLES.VENUE_OWNER]}>
            <VenueOwnerAnalytics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/venue-owner/profile"
        element={
          <ProtectedRoute allowedRoles={[ROLES.VENUE_OWNER]}>
            <VenueOwnerProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/venue-owner/notifications"
        element={
          <ProtectedRoute allowedRoles={[ROLES.VENUE_OWNER]}>
            <VenueOwnerNotifications />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} loginPath="/admin/login">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/venues"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} loginPath="/admin/login">
            <AdminVenues />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/venues/new"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} loginPath="/admin/login">
            <AdminAddVenue />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/venues/:venueId"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} loginPath="/admin/login">
            <AdminVenueDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} loginPath="/admin/login">
            <AdminNotifications />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/notifications/unread"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} loginPath="/admin/login">
            <AdminNotifications view="unread" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/notifications/read"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} loginPath="/admin/login">
            <AdminNotifications view="read" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} loginPath="/admin/login">
            <AdminProfile />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

export default App
