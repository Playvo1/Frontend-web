import { isValidEmail } from '../utils/validation.js'

// Contact for "Request facility registration" (policy card of the signed-out
// pages). Venue owners cannot self-register (SRS §1.5.1, Milestones US-1.4):
// an admin creates their account, so the request goes to the Playvo admins
// by email — the backend has no endpoint for registration requests.
//
// The admin inbox for these requests, as given by the project owner
// (VENUE_REQUEST_DEFAULT_EMAIL). VITE_VENUE_REQUEST_EMAIL, when set, replaces
// it for an environment without a code change. An invalid value leaves no
// address: the button then says the address is not available instead of
// opening a mail.
const VENUE_REQUEST_DEFAULT_EMAIL = 'ghadaaiud@gmail.com'

const rawEmail = String(import.meta.env.VITE_VENUE_REQUEST_EMAIL || VENUE_REQUEST_DEFAULT_EMAIL).trim()

// '' when not configured (or not a valid address).
export const VENUE_REQUEST_EMAIL = rawEmail && isValidEmail(rawEmail) ? rawEmail : ''

export const VENUE_REQUEST_SUBJECT = 'New Venue Registration Request - Playvo'

// mailto: link with the subject and a body to fill in. Line breaks are CRLF
// (RFC 6068); the address is used as given (already validated).
export function venueRequestMailto(body) {
  const encode = (value) => encodeURIComponent(value.replace(/\r?\n/g, '\r\n'))
  return `mailto:${VENUE_REQUEST_EMAIL}?subject=${encode(VENUE_REQUEST_SUBJECT)}&body=${encode(body)}`
}
