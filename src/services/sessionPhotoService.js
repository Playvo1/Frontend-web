import { IS_API_ENABLED } from '../config/api.js'
import { ROLES, getPrimaryRole } from '../constants/roles.js'
import { apiRequest } from './apiClient.js'
import { absoluteUrl } from './facilityService.js'
import { getOwnerProfile } from './ownerProfileService.js'

// The signed-in user's profile photo, for the session (top bar avatar).
// The login response has no photo ({ id, name, email, roles }), so it is
// read once from the role's own profile endpoint (backend main @ 3de1a84):
//   Venue Owner: GET /api/v1/venue_owner/owner/profile -> data.owner.profile_image
//                (role:venue_owner; ownerProfileService.getOwnerProfile)
//   Admin:       GET /api/v1/admin/profile             -> data.profile_image
//                (role:admin; AdminProfileController@show)
// profile_image is an absolute URL or null.
//
// fetchSessionPhoto(user, token) -> Promise<string | null>
//   Rejects on any failure (network, 401, 5xx, unexpected body); the caller
//   keeps the session as it is (the avatar shows the initial).
//   Demo mode / no web role: resolves undefined (nothing to read).

export async function fetchSessionPhoto(user, token) {
  if (!IS_API_ENABLED || !token) return undefined
  const role = getPrimaryRole(user)
  if (role === ROLES.VENUE_OWNER) {
    const profile = await getOwnerProfile({ token, user })
    return profile.profile_image
  }
  if (role === ROLES.ADMIN) {
    const body = await apiRequest('/admin/profile', { token })
    const data = body?.data
    if (!data || typeof data !== 'object') throw new Error('Unexpected profile response.')
    return absoluteUrl(typeof data.profile_image === 'string' ? data.profile_image : null)
  }
  return undefined
}
