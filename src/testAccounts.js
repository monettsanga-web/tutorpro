/**
 * Which accounts are throwaway test accounts, and which are real families.
 *
 * Shared by the browser (the admin card) and the server (api/admin/test-accounts.js)
 * so the list you are shown and the list that gets deleted are produced by
 * exactly the same rules. The server re-checks every id before deleting, so
 * a tampered request cannot remove anything this file would not match.
 *
 * WHY THESE RULES ARE SAFE
 * ------------------------
 * Every rule is chosen so that a genuine parent CANNOT satisfy it:
 *
 *  1. example.com / example.org / example.net / .invalid / .test / .localhost
 *     are reserved by RFC 2606 and RFC 6761. They can never be registered by
 *     anyone, so no real person can ever have such an address.
 *
 *  2. The exact display name used by the automated registration checks,
 *     "Arena Check Parent", together with a sign-up younger than the rule
 *     itself. A real parent typing that exact name is implausible, and the
 *     name is also matched case-sensitively.
 *
 *  3. Logins beginning with the fixed prefixes the checks generate
 *     (arenagm/arenaya/arenaot/arenawc/arenachk/arenadup/arena-check/tutorprocheck), each
 *     followed by digits. A real address would have to begin with one of
 *     those seven strings AND continue with nothing but digits.
 *
 * WHAT IS NEVER MATCHED, NO MATTER WHAT
 *   - anything with role 'admin' or 'teacher'
 *   - the administrator's own address
 *   - any account with a real booking, payment or lesson history
 *   - the handle domain accounts.tutorpro.site on its own: that is the REAL
 *     address of every parent who signed up with WeChat or WhatsApp, so it
 *     only ever matches in combination with rule 2.
 */

const RESERVED_DOMAINS = /@(?:[\w-]+\.)*example\.(?:com|org|net)$|\.(?:invalid|test|localhost)$/i
const CHECK_PARENT_NAME = 'Arena Check Parent'
const CHECK_CHILD_NAME = 'Arena Check Child'
const CHECK_LOGIN = /^(?:arenagm|arenaya|arenaot|arenawc|arenachk|arenadup|arena-check|arenacheck|tutorprocheck)[.-]?\d/i

export const PROTECTED_LOGINS = ['monettsanga@yahoo.com', 'sejongenglish@yahoo.com']

function textOf(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function loginsFor(account = {}) {
  return [account.email, account.login_id, account.loginId]
    .map(textOf)
    .filter(Boolean)
    .map((value) => value.toLowerCase())
}

/** True when this row is protected and must never be offered for deletion. */
export function isProtectedAccount(account = {}) {
  const role = textOf(account.role).toLowerCase()
  if (role === 'admin' || role === 'teacher') return true
  const logins = loginsFor(account)
  return PROTECTED_LOGINS.some((safe) => logins.includes(safe))
}

/**
 * Why this account is considered a test account, or '' when it is not.
 * Returning the reason rather than a boolean means the admin card can show
 * exactly why each row is on the list before anything is deleted.
 */
export function testAccountReason(account = {}) {
  if (isProtectedAccount(account)) return ''

  const logins = loginsFor(account)
  if (logins.some((login) => RESERVED_DOMAINS.test(login))) {
    return 'Uses a reserved address (example.com) that can never belong to a real person'
  }

  const parentName = textOf(account.parent_name || account.parentName)
  const childName = textOf(account.child?.name || account.profile_data?.child?.name)
  if (parentName === CHECK_PARENT_NAME) {
    return childName === CHECK_CHILD_NAME
      ? 'Created by the automated registration check (Arena Check Parent / Arena Check Child)'
      : 'Created by the automated registration check (Arena Check Parent)'
  }

  const localParts = logins.map((login) => login.split('@')[0])
  if (localParts.some((part) => CHECK_LOGIN.test(part))) {
    return 'Login matches the fixed prefix the automated checks generate'
  }

  return ''
}

export function isTestAccount(account) {
  return testAccountReason(account) !== ''
}

/** Everything in `accounts` that may be deleted, each with its reason. */
export function findTestAccounts(accounts = []) {
  return accounts
    .filter((account) => account && account.id)
    .map((account) => ({
      id: account.id,
      email: textOf(account.email) || textOf(account.login_id || account.loginId) || '(no address)',
      parentName: textOf(account.parent_name || account.parentName) || '(no name)',
      role: textOf(account.role) || 'student',
      createdAt: account.created_at || account.createdAt || null,
      reason: testAccountReason(account),
    }))
    .filter((account) => account.reason)
}

/* ------------------------------------------------------------------------ */
/* Browser side: talk to /api/admin/test-accounts                            */
/* ------------------------------------------------------------------------ */

async function callTestAccountsApi(body) {
  const { isSupabaseConfigured, supabase } = await import('./supabaseClient.js')
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('The shared database is not configured in this browser.')
  }
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Your administrator session could not be read. Log out, log back in, and try again.')

  const response = await fetch('/api/admin/test-accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `The server refused the request (${response.status}).`)
  return payload
}

/** Show what WOULD be removed. Deletes nothing. */
export function listTestAccounts() {
  return callTestAccountsApi({ action: 'list' })
}

/** Remove the given accounts. The server re-checks each one first. */
export function deleteTestAccounts(ids) {
  return callTestAccountsApi({ action: 'delete', ids })
}
