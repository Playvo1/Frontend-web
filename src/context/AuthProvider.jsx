import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getPrimaryRole } from '../constants/roles.js'
import * as authService from '../services/authService.js'
import { fetchSessionPhoto } from '../services/sessionPhotoService.js'
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

// Login waits at most this long for the profile photo, so the first page
// already shows it in the top bar; a slower answer is still applied when it
// arrives (the avatar shows the initial meanwhile).
const LOGIN_PHOTO_WAIT_MS = 3000

// A stored session whose user has no web role (Admin / Venue Owner) — an old
// or hand-edited one; login never stores it — is dropped: kept, every page
// would redirect to /login and /login back to itself, leaving a blank page
// the user could not sign in from.
function readStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    const session = raw ? JSON.parse(raw) : null
    if (!session?.token || !session?.user || session.mode !== authService.AUTH_MODE) return null
    if (!getPrimaryRole(session.user)) {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }
    return session
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

  // Profile photo (user.profile_image, shown in the top bar): the login
  // response has none, so it is read ONCE per token from the role's profile
  // endpoint (sessionPhotoService) — at sign-in, or when a stored session is
  // restored on app start. AuthProvider wraps the whole app, so moving
  // between pages never reads it again. A failed request changes nothing
  // (no sign-out): the avatar keeps the initial (or the stored photo).
  // The answer is applied only to the session of the token it was read for.
  const photoTokenRef = useRef(null)
  const loadPhoto = useCallback((user, forToken) => {
    photoTokenRef.current = forToken
    return fetchSessionPhoto(user, forToken).then(
      (photo) => {
        if (photo === undefined) return undefined
        setSession((current) => {
          if (!current || current.token !== forToken) return current
          if ((current.user.profile_image ?? null) === photo) return current
          const next = { ...current, user: { ...current.user, profile_image: photo } }
          writeStoredSession(next)
          return next
        })
        return photo
      },
      () => undefined,
    )
  }, [])

  // `requiredRole` (optional): a login page for one role only (/admin/login).
  // Another role is refused before the session is stored — its new token is
  // revoked — so the user is never signed in or redirected.
  const login = useCallback(
    async (credentials, { requiredRole } = {}) => {
      const result = await authService.login(credentials)
      if (requiredRole && getPrimaryRole(result.user) !== requiredRole) {
        await authService.logout(result.token)
        throw new authService.AuthError(authService.AUTH_ERRORS.ROLE_MISMATCH)
      }
      // Wait briefly for the photo so the first page shows it.
      const photo = await Promise.race([
        loadPhoto(result.user, result.token),
        new Promise((resolve) => setTimeout(resolve, LOGIN_PHOTO_WAIT_MS)),
      ])
      const signedIn =
        photo === undefined ? result : { ...result, user: { ...result.user, profile_image: photo } }
      writeStoredSession(signedIn)
      setSession(signedIn)
      return signedIn.user
    },
    [loadPhoto],
  )

  const token = session?.token ?? null

  // Restored session (page load / reload): read the photo once for its token,
  // in the background (the stored photo, if any, shows meanwhile).
  const sessionUserRef = useRef(session?.user ?? null)
  useEffect(() => {
    sessionUserRef.current = session?.user ?? null
  }, [session])
  useEffect(() => {
    if (!token || photoTokenRef.current === token) return
    loadPhoto(sessionUserRef.current, token)
  }, [token, loadPhoto])

  const logout = useCallback(async () => {
    try {
      await authService.logout(token)
    } finally {
      photoTokenRef.current = null
      writeStoredSession(null)
      setSession(null)
    }
  }, [token])

  // Merges saved account details (e.g. name / email / phone after the
  // Profile page saved them on the backend) into the stored user, so the
  // rest of the app (top bar) shows them. The token is never changed.
  const updateUser = useCallback((changes) => {
    setSession((current) => {
      if (!current) return current
      const next = { ...current, user: { ...current.user, ...changes } }
      writeStoredSession(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session),
      login,
      logout,
      updateUser,
    }),
    [session, login, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
