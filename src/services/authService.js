import { IS_API_ENABLED } from '../config/api.js'
import { WEB_ROLES } from '../constants/roles.js'
import * as authApi from './authApi.js'
import { AUTH_ERRORS, AuthError } from './authErrors.js'
import * as authMock from './authMock.js'

// Auth service — the single entry point used by AuthProvider and the auth
// pages. It picks the implementation once, from configuration:
//   - VITE_API_BASE_URL empty (current state) → authMock.js, no network.
//   - VITE_API_BASE_URL set                    → authApi.js (Laravel/Sanctum).
// Both paths expose the same functions and throw the same AuthError codes,
// so pages don't know (or care) which one is active:
//   login({ email, password })                         -> { token, user }
//   requestPasswordReset({ email })                    -> { email }
//   verifyResetCode({ email, code })                   -> { email, code }
//   resetPassword({ email, code, password, passwordConfirmation }) -> void
//   logout(token)                                      -> void (never throws)

export { AUTH_ERRORS, AuthError }

export const AUTH_MODE = IS_API_ENABLED ? 'api' : 'mock'

// ---- API error mapping ---------------------------------------------------

// Turns an ApiError into an AuthError. `on422` decides what a validation /
// business 422 means for the calling step.
function toAuthError(error, on422 = AUTH_ERRORS.VALIDATION_ERROR) {
  if (error instanceof AuthError) return error

  const details = {
    status: error?.status ?? null,
    fieldErrors: error?.errors ?? null,
    backendMessage: error?.message ?? '',
  }

  switch (error?.status) {
    case 0:
      return new AuthError(AUTH_ERRORS.NETWORK_ERROR, details)
    case 401:
      return new AuthError(AUTH_ERRORS.INVALID_CREDENTIALS, details)
    case 403:
      return new AuthError(AUTH_ERRORS.ACCOUNT_INACTIVE, details)
    case 422:
      return new AuthError(on422, details)
    case 423:
      return new AuthError(AUTH_ERRORS.ACCOUNT_LOCKED, details)
    default:
      return new AuthError(AUTH_ERRORS.UNKNOWN, details)
  }
}

// ---- Real API implementation ----------------------------------------------

const api = {
  async login({ email, password }) {
    let body
    try {
      body = await authApi.login(email.trim(), password)
    } catch (error) {
      throw toAuthError(error)
    }

    const token = body?.data?.token
    const user = body?.data?.user
    if (!token || !user) {
      throw new AuthError(AUTH_ERRORS.UNKNOWN, { backendMessage: 'Unexpected login response' })
    }

    // The backend's login accepts every role; only Admin / Venue Owner may
    // use the web dashboards. Revoke the token just issued, then refuse.
    const roles = Array.isArray(user.roles) ? user.roles : []
    if (!roles.some((role) => WEB_ROLES.includes(role))) {
      await authApi.logout(token).catch(() => {})
      throw new AuthError(AUTH_ERRORS.ROLE_NOT_ALLOWED)
    }

    return { token, user: { id: user.id, name: user.name, email: user.email, roles } }
  },

  async requestPasswordReset({ email }) {
    const trimmed = email.trim()
    try {
      await authApi.forgotPassword(trimmed)
    } catch (error) {
      throw toAuthError(error)
    }
    return { email: trimmed }
  },

  // The UI field is "code"; the backend field is "otp_code".
  async verifyResetCode({ email, code }) {
    try {
      await authApi.verifyResetOtp(email, code)
    } catch (error) {
      throw toAuthError(error, AUTH_ERRORS.INVALID_RESET_CODE)
    }
    return { email, code }
  },

  // The backend does not take the code here: it relies on the code already
  // verified for this email. A 422 on the password fields is a validation
  // error; any other 422 means there is no valid verified code.
  async resetPassword({ email, password, passwordConfirmation }) {
    try {
      await authApi.resetPassword(email, password, passwordConfirmation)
    } catch (error) {
      const hasPasswordErrors = Boolean(
        error?.errors?.password || error?.errors?.password_confirmation,
      )
      throw toAuthError(
        error,
        hasPasswordErrors ? AUTH_ERRORS.VALIDATION_ERROR : AUTH_ERRORS.INVALID_RESET_CODE,
      )
    }
  },

  // Signing out always succeeds locally; a failed revoke (e.g. token already
  // invalid) must not keep the user signed in.
  async logout(token) {
    if (!token) return
    await authApi.logout(token).catch(() => {})
  },
}

// ---- Mock implementation ---------------------------------------------------

const mock = {
  login: authMock.login,
  requestPasswordReset: authMock.requestPasswordReset,
  verifyResetCode: authMock.verifyResetCode,
  resetPassword: authMock.resetPassword,
  logout: () => authMock.logout(),
}

const impl = IS_API_ENABLED ? api : mock

export const login = (credentials) => impl.login(credentials)
export const requestPasswordReset = (params) => impl.requestPasswordReset(params)
export const verifyResetCode = (params) => impl.verifyResetCode(params)
export const resetPassword = (params) => impl.resetPassword(params)
export const logout = (token) => impl.logout(token)
