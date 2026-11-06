// Short message shown at the bottom of the dashboard (ToastHost, rendered by
// DashboardLayout). Used for actions whose page or feature is not available
// yet ("… is under development"), so the control responds instead of doing
// nothing. Never used to report a save that did not happen.
//
// showToast(message) -> shows `message` for a few seconds (a new message
// replaces the current one).
export const TOAST_EVENT = 'playvo:toast'

export function showToast(message) {
  if (typeof window === 'undefined' || !message) return
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message } }))
}
