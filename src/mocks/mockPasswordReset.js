// MOCK DATA — development only. Remove once the password-reset flow talks
// to the real Laravel backend.
//
// The real backend emails a 6-digit code (Guidelines §7.2 example:
// "482913") that expires after 10 minutes and is single-use (§2.4). With no
// backend, every reset request "sends" this fixed code, so the Verify Code
// page can be exercised: 123456 is accepted, any other 6-digit code is
// treated as invalid or expired.
export const MOCK_RESET_CODE = '123456'
