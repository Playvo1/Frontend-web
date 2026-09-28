import { useCallback, useMemo, useState } from 'react'
import * as authService from '../services/authService.js'
import { AuthContext } from './AuthContext.js'

// Holds the signed-in session ({ token, user }) for the whole app.
// The session is persisted so a page reload keeps the user signed in —
// same try/catch pattern as the language setting in i18n.js, because
// localStorage can throw in some browser contexts.
// With the real API, `token` is the Sanctum bearer token (sent by
// authService on logout). There is no /auth/me endpoint yet, so the stored
// user is not re-validated with the backend on reload.
// Each stored session is tagged with the auth mode ('mock' | 'api'), so a
// mock session is never reused once a real API URL is configured.
const SESSION_STORAGE_KEY = 'playvo_session'

function readStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    const session = raw ? JSON.parse(raw) : null
    return session?.token && session?.user && session.mode === authService.AUTH_MODE ? session : null
  } catch {
    return null
  }
}

function writeStoredSession(session) {
  try {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...session, mode: authService.AUTH_MODE }))
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  } catch {
    // Ignore — the session just won't survive a reload.
  }
}

function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession)

  const login = useCallback(async (credentials) => {
    const result = await authService.login(credentials)
    writeStoredSession(result)
    setSession(result)
    return result.user
  }, [])

  const token = session?.token ?? null

  const logout = useCallback(async () => {
    try {
      await authService.logout(token)
    } finally {
      writeStoredSession(null)
      setSession(null)
    }
  }, [token])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session),
      login,
      logout,
    }),
    [session, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
