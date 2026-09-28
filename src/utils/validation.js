// Shared client-side validation helpers. The backend still validates
// everything (Laravel Form Requests); these only give instant feedback.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(value.trim())
}

// Minimum password length enforced by the backend (min:8 on
// register/reset-password, github.com/Playvo1/Backend @ 3c2c09f).
export const PASSWORD_MIN_LENGTH = 8

// Password-reset codes are 6 digits (Guidelines §7.2 example: "482913").
export const RESET_CODE_LENGTH = 6

const RESET_CODE_PATTERN = new RegExp(`^\\d{${RESET_CODE_LENGTH}}$`)

export function isValidResetCode(value) {
  return RESET_CODE_PATTERN.test(value)
}

// Keeps only digits (converting Arabic-Indic ٠-٩ and Persian ۰-۹ digits to
// 0-9, since Arabic keyboards may type those) and caps the length, so the
// code field accepts exactly what the backend expects.
export function normalizeResetCode(value) {
  return value
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, '')
    .slice(0, RESET_CODE_LENGTH)
}
