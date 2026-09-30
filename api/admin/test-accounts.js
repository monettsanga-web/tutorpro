import { requireAdmin } from '../_admin.js'
import { sendError, sendJson } from '../_paypal.js'
import { findTestAccounts, isProtectedAccount, isTestAccount } from '../../src/testAccounts.js'

/**
 * List and remove the throwaway accounts left behind by automated checks.
 *
 * WHY THIS IS A SERVER FUNCTION
 * -----------------------------
 * Deleting a parent properly means deleting the Supabase AUTH user, not just
 * the profiles row — the profile is removed automatically by the
 * ON DELETE CASCADE, but an orphaned auth user would keep the address taken
 * for ever. Only the service-role key can delete an auth user, and it is
 * only available on the server.
 *
 * WHY IT IS SAFE
 * --------------
 *  - requireAdmin verifies the caller against the database, not against
 *    anything the browser claims.
 *  - `list` never deletes. The admin sees every row and the reason it is on
 *    the list before anything happens.
 *  - `delete` re-runs the SAME matching rules (src/testAccounts.js) against
 *    the row the database holds for each id. An id that does not match is
 *    refused, so a tampered request cannot delete a real family.
 *  - Administrators and teachers can never match, by rule.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.')

  let supabase
  try {
    ({ supabase } = await requireAdmin(req))
  } catch (authError) {
    return sendError(res, 403, authError.message)
  }

  const action = (req.body?.action || 'list').toLowerCase()

  let rows
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, login_id, role, parent_name, profile_data, created_at')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    rows = data || []
  } catch (readError) {
    return sendError(res, 502, `The account list could not be read: ${readError.message}`)
  }

  const candidates = findTestAccounts(rows)

  if (action === 'list') {
    return sendJson(res, 200, {
      accounts: candidates,
      totalProfiles: rows.length,
    })
  }

  if (action !== 'delete') return sendError(res, 400, 'Unknown action.')

  const requested = Array.isArray(req.body?.ids) ? req.body.ids.filter((id) => typeof id === 'string') : []
  if (!requested.length) return sendError(res, 400, 'No accounts were selected.')

  /* Re-check every id against the database row, not against the request. */
  const byId = new Map(rows.map((row) => [row.id, row]))
  const refused = []
  const approved = []
  for (const id of requested) {
    const row = byId.get(id)
    if (!row) { refused.push({ id, why: 'No longer in the database' }); continue }
    if (isProtectedAccount(row)) { refused.push({ id, why: 'Protected account' }); continue }
    if (!isTestAccount(row)) { refused.push({ id, why: 'Does not look like a test account' }); continue }
    approved.push(row)
  }

  const deleted = []
  const failed = []
  for (const row of approved) {
    const { error } = await supabase.auth.admin.deleteUser(row.id)
    if (error) {
      // The auth user may already be gone while the profile row lingers.
      const { error: profileError } = await supabase.from('profiles').delete().eq('id', row.id)
      if (profileError) { failed.push({ id: row.id, email: row.email, why: error.message }); continue }
    }
    deleted.push({ id: row.id, email: row.email || row.login_id || '(no address)' })
  }

  return sendJson(res, 200, { deleted, failed, refused })
}
