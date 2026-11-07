// Error codes shared by the mock and the real auth implementations. Pages
// map these codes to translated messages; they never see HTTP details.

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  // Backend 403 on login: account not active, or email not verified.
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  ROLE_NOT_ALLOWED: 'ROLE_NOT_ALLOWED',
  // Valid web account, but not the role this login page is for (e.g. a
  // Venue Owner on /admin/login). The session is not kept.
  ROLE_MISMATCH: 'ROLE_MISMATCH',
  INVALID_RESET_CODE: 'INVALID_RESET_CODE',
  // Backend 422 with field errors (see AuthError.fieldErrors).
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN',
}

export class AuthError extends Error {
  constructor(code, { fieldErrors = null, status = null, backendMessage = '' } = {}) {
    super(code)
    this.name = 'AuthError'
    this.code = code
    // Laravel field errors ({ field: ['...'] }) when the backend sent them.
    this.fieldErrors = fieldErrors
    // HTTP status from the backend (null for mock errors).
    this.status = status
    // Raw backend message, for debugging only — the UI shows translations.
    this.backendMessage = backendMessage
  }
}
