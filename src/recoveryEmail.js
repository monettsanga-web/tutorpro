/**
 * The address a family can be reached at if they forget their password.
 *
 * WHY AN ACCOUNT MIGHT NOT HAVE ONE
 * ---------------------------------
 * A parent who registers with a WhatsApp number or a WeChat ID never
 * gives us an email address. Their login is
 * `whatsapp.639...@accounts.tutorpro.site` or
 * `wechat.<id>@accounts.tutorpro.site` - a handle this site invents so
 * Supabase has something shaped like an email to store. Nobody reads
 * that mailbox because it does not exist.
 *
 * So when one of those parents forgets their password, there is nothing
 * to send a code to unless WhatsApp sending is configured. This is the
 * other half of that problem: let them add a real address now, while
 * they are still logged in, so the code has somewhere to go later.
 */

import { supabase } from './supabaseClient.js'

/** The login handles this site invents are not real mailboxes. */
export const HANDLE_DOMAIN = '@accounts.tutorpro.site'

export function isRealEmail(value = '') {
  const email = String(value).trim().toLowerCase()
  if (!email || email.endsWith(HANDLE_DOMAIN)) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}

/**
 * What this account can currently be reached at, and whether that is a
 * real address or just the invented handle.
 */
export function recoveryStateFor(account) {
  const login = account?.loginId || account?.email || ''
  const stored = account?.recoveryEmail || ''
  const loginIsReal = isRealEmail(login) ? login : ''
  return {
    login,
    loginIsReal: Boolean(loginIsReal),
    recoveryEmail: stored,
    /* The address a reset code would actually go to today. */
    reachableAt: loginIsReal || (isRealEmail(stored) ? stored : ''),
  }
}

/**
 * Save a recovery address. Works for the account owner, and for an
 * administrator setting one on somebody else's account.
 *
 * Pass an empty string to remove it.
 */
export async function saveRecoveryEmail(accountId, email, login = '') {
  const value = String(email || '').trim().toLowerCase()
  if (value && !isRealEmail(value)) {
    throw new Error(value.endsWith(HANDLE_DOMAIN)
      ? 'That is a login handle, not a mailbox. Use a real email address.'
      : 'Enter a valid email address.')
  }

  if (!supabase) throw new Error('This device is not connected to the shared database.')

  /*
   * An administrator can sit on this dashboard for hours. The local
   * session survives that - it was deliberately moved to localStorage so
   * people stop being logged out - but the Supabase ACCESS TOKEN expires
   * in an hour, and without one this save is refused. The refusal then
   * reads like "the email did not save", which is exactly how it was
   * reported.
   *
   * So: ask for a refreshed token before giving up on the session.
   */
  let { data } = await supabase.auth.getSession()
  let token = data?.session?.access_token
  if (!token) {
    const refreshed = await supabase.auth.refreshSession().catch(() => null)
    token = refreshed?.data?.session?.access_token || ''
  }
  if (!token) throw new Error('Your sign-in has expired. Log out, log back in, and the email will save.')

  const response = await fetch('/api/auth/reset', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'set-recovery-email', accountId, email: value, login }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || `The recovery email could not be saved (HTTP ${response.status}).`)
  }
  return payload.recoveryEmail || ''
}
