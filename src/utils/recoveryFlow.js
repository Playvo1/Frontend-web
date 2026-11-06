import { ROLES, ROLE_LOGIN, toLoginPath } from '../constants/roles.js'

// Which login page a password-recovery flow belongs to (/login or
// /admin/login), so /verify-code and /reset-password (shared by both roles)
// return to the right one.
//
// The login path travels in the route state from step to step (it survives
// a page refresh with the rest of that state). As a fallback — when a step
// is opened without that state, e.g. its URL typed in the same tab — the
// step-1 page also remembers it in sessionStorage. Only that login path is
// stored (no email, code or password); it lasts for the tab only and is
// cleared once the password is reset.
const STORAGE_KEY = 'playvo_recovery_login'

export function rememberRecoveryLoginPath(loginPath) {
  try {
    sessionStorage.setItem(STORAGE_KEY, toLoginPath(loginPath))
  } catch {
    // Storage unavailable: the route state alone is used.
  }
}

export function clearRecoveryLoginPath() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear.
  }
}

// Login path for a recovery step: the route-state value if valid, else the
// remembered one, else /login.
export function getRecoveryLoginPath(stateLoginPath) {
  if (stateLoginPath !== undefined && toLoginPath(stateLoginPath) === stateLoginPath) return stateLoginPath
  try {
    return toLoginPath(sessionStorage.getItem(STORAGE_KEY))
  } catch {
    return ROLE_LOGIN[ROLES.VENUE_OWNER]
  }
}
