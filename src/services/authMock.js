import { WEB_ROLES } from '../constants/roles.js'
import { MOCK_RESET_CODE } from '../mocks/mockPasswordReset.js'
import { MOCK_USERS } from '../mocks/mockUsers.js'
import { AUTH_ERRORS, AuthError } from './authErrors.js'

// MOCK auth implementation — used while VITE_API_BASE_URL is empty (see
// authService.js). Same behaviour as before the API layer was added; it
// never makes a network request. Mock accounts: src/mocks/mockUsers.js,
// mock reset code: src/mocks/mockPasswordReset.js (123456).

const MOCK_LATENCY_MS = 700

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function login({ email, password }) {
  await wait(MOCK_LATENCY_MS)

  const account = MOCK_USERS.find(
    (user) => user.email.toLowerCase() === email.trim().toLowerCase() && user.password === password,
  )

  // Generic failure — never reveal whether the email or the password was
  // wrong (Milestones US-1.2).
  if (!account) {
    throw new AuthError(AUTH_ERRORS.INVALID_CREDENTIALS)
  }

  if (account.status === 'locked') {
    throw new AuthError(AUTH_ERRORS.ACCOUNT_LOCKED)
  }

  // Only Admin / Venue Owner accounts may enter the web dashboards.
  if (!account.roles.some((role) => WEB_ROLES.includes(role))) {
    throw new AuthError(AUTH_ERRORS.ROLE_NOT_ALLOWED)
  }

  // Never expose the (mock) password beyond this module.
  const { password: _password, ...user } = account

  return {
    token: `mock-token-${account.id}-${Date.now()}`,
    user,
  }
}

// Always resolves, never revealing whether the email exists.
export async function requestPasswordReset({ email }) {
  await wait(MOCK_LATENCY_MS)
  return { email: email.trim() }
}

// Accepts MOCK_RESET_CODE; anything else is "invalid or expired".
export async function verifyResetCode({ email, code }) {
  await wait(MOCK_LATENCY_MS)
  if (code !== MOCK_RESET_CODE) {
    throw new AuthError(AUTH_ERRORS.INVALID_RESET_CODE)
  }
  return { email, code }
}

// Updates the in-memory mock account (if that email exists), so the new
// password works on /login until the page is reloaded.
export async function resetPassword({ email, code, password }) {
  await wait(MOCK_LATENCY_MS)
  if (code !== MOCK_RESET_CODE) {
    throw new AuthError(AUTH_ERRORS.INVALID_RESET_CODE)
  }
  const account = MOCK_USERS.find((user) => user.email.toLowerCase() === email.trim().toLowerCase())
  if (account) {
    account.password = password
  }
}

export async function logout() {
  await wait(0)
}
