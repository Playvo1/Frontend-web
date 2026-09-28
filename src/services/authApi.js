import { apiRequest } from './apiClient.js'

// Real authentication endpoints, exactly as implemented in the backend
// (github.com/Playvo1/Backend, routes/api.php + AuthController, commit
// 3c2c09f). All are POST under /api/v1. Each function resolves with the
// backend body ({ success, data, message, ... }) or throws ApiError.
//
// Not implemented on purpose (no backend endpoint yet): /auth/me, admin and
// venue-owner account creation, dashboard APIs, a dedicated resend-OTP call.

// 200 → data: { token, user: { id, name, email, roles[] } }
// 401 invalid credentials · 403 inactive / email not verified · 423 locked · 422 validation
export function login(email, password) {
  return apiRequest('/auth/login', { method: 'POST', body: { email, password } })
}

// Requires the Sanctum token. 200 → "Logged out" · 401 unauthenticated
export function logout(token) {
  return apiRequest('/auth/logout', { method: 'POST', token })
}

// Emails a 6-digit code valid for 10 minutes.
// 200 → "If this email exists, a reset code was sent" · 422 unknown email / validation
export function forgotPassword(email) {
  return apiRequest('/auth/forgot-password', { method: 'POST', body: { email } })
}

// Marks the code as verified. Field name is otp_code (6 digits).
// 200 → "OTP verified successfully..." · 422 invalid/expired code or validation
export function verifyResetOtp(email, otp_code) {
  return apiRequest('/auth/verify-reset-otp', { method: 'POST', body: { email, otp_code } })
}

// Does NOT take the code: the backend uses the code previously verified
// for this email (not used, not expired). Password: min 8, confirmed.
// 200 → "Password updated" · 422 no verified code / validation
export function resetPassword(email, password, password_confirmation) {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { email, password, password_confirmation },
  })
}
