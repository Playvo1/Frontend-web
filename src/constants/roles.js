// Role identifiers exactly as the Laravel API returns them in user.roles
// (spatie/laravel-permission — see Team Development Guidelines §7.2).
export const ROLES = {
  ADMIN: 'admin',
  VENUE_OWNER: 'venue_owner',
}

// Landing route for each web-dashboard role (Project Instructions §14).
export const ROLE_HOME = {
  [ROLES.ADMIN]: '/admin/dashboard',
  [ROLES.VENUE_OWNER]: '/venue-owner/dashboard',
}

// Only these roles have a web dashboard. A "player" account belongs to the
// mobile app and is not allowed into Playvo Web.
export const WEB_ROLES = [ROLES.ADMIN, ROLES.VENUE_OWNER]

// Picks the dashboard role for a user. Admin wins if a user somehow holds
// both roles, since the admin dashboard is the broader one.
export function getPrimaryRole(user) {
  const roles = user?.roles ?? []
  return WEB_ROLES.find((role) => roles.includes(role)) ?? null
}

// Login page of each web-dashboard role: separate pages, same POST
// /auth/login; each page accepts only its own role.
export const ROLE_LOGIN = {
  [ROLES.ADMIN]: '/admin/login',
  [ROLES.VENUE_OWNER]: '/login',
}

// A login path read from route state (password-recovery flow): only one of
// the pages above is accepted, anything else falls back to /login.
export function toLoginPath(value) {
  return Object.values(ROLE_LOGIN).includes(value) ? value : ROLE_LOGIN[ROLES.VENUE_OWNER]
}

// First password-recovery step of each login page: the Admin one has its own
// design; the later steps (/verify-code, /reset-password) are shared.
export const ROLE_FORGOT_PASSWORD = {
  [ROLES.ADMIN]: '/admin/forgot-password',
  [ROLES.VENUE_OWNER]: '/forgot-password',
}

// Recovery step 1 that belongs to a login page (see toLoginPath).
export function toForgotPasswordPath(loginPath) {
  return loginPath === ROLE_LOGIN[ROLES.ADMIN]
    ? ROLE_FORGOT_PASSWORD[ROLES.ADMIN]
    : ROLE_FORGOT_PASSWORD[ROLES.VENUE_OWNER]
}

export function getHomePath(user) {
  const role = getPrimaryRole(user)
  return role ? ROLE_HOME[role] : '/login'
}
