/* Re-creates the shared profiles row of a family the admin restored from
 * the recently-deleted list (owner, 2026-11-07). The Supabase auth user is
 * untouched by deletions, so inserting the row with the same id restores
 * cloud login with the original password.
 *
 * Privilege rule: roles are whitelisted server-side to family roles only -
 * a crafted request can never restore itself as teacher or admin. */
import { getSupabaseAdmin, sendError, sendJson } from '../_paypal.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Use POST.')
  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {})
  const admin = getSupabaseAdmin()
  if (!admin) return sendError(res, 500, 'The shared database is not configured.')
  /* The id may come straight from an admin trash snapshot, or be resolved
     from the login email: a deletion removes the profiles row but never the
     auth user, so the email still identifies the family (2026-11-07 rebuild
     of an accidentally deleted account). */
  const id = await resolveUserId(admin, body)
  if (!id) return sendError(res, 404, 'No sign-in record matches that account.')
  const role = body.role === 'parent' ? 'parent' : 'student'
  const payload = {
    id,
    role,
    status: body.status === 'active' || body.status === 'suspended' ? body.status : 'active',
    email: body.email || null,
    login_id: body.loginId || body.email || '',
    auth_provider: body.authProvider || 'email',
    parent_name: body.parentName || null,
    full_name: body.fullName || null,
    display_name: body.parentName || body.fullName || 'TutorPro Online English user',
    profile_data: body.profileData && typeof body.profileData === 'object' ? body.profileData : {},
    updated_at: new Date().toISOString(),
  }
  const { error } = await admin.from('profiles').insert(payload)
  if (error) {
    if (/duplicate|exists|conflict/i.test(error.message || '')) return sendError(res, 409, 'That profile already exists.')
    return sendError(res, 502, error.message || 'The shared profile could not be restored.')
  }
  return sendJson(res, 200, { ok: true })
}

function safeParse(text) {
  try { return JSON.parse(text) } catch { return {} }
}

async function resolveUserId(admin, body) {
  if (body.id && typeof body.id === 'string') return body.id
  const email = String(body.email || '').trim().toLowerCase()
  if (!email) return null
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) return null
    const users = data?.users || []
    const match = users.find((user) => (user.email || '').toLowerCase() === email)
    if (match) return match.id
    if (users.length < 100) break
  }
  return null
}
