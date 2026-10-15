export const SUPPORT_CHAT_OPEN_EVENT = 'tutorpro:open-support-chat'

/** Ask the shared website support launcher to open with an optional message. */
export function requestOpenSupportChat(message = '') {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent(SUPPORT_CHAT_OPEN_EVENT, {
    detail: { message: String(message || '') },
  }))
}
