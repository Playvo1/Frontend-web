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

export function getHomePath(user) {
  const role = getPrimaryRole(user)
  return role ? ROLE_HOME[role] : '/login'
}
