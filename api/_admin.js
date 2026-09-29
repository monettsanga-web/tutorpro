import { getSupabaseAdmin } from './_paypal.js'

/**
 * Prove the caller is the administrator before letting them touch accounts.
 *
 * The check is done against the database with the service-role key, not
 * against anything the browser claims: the request carries a Supabase access
 * token, we ask Supabase who it belongs to, and then we read that user's own
 * profile row to see whether they are an admin. A forged body cannot get
 * past it, and neither can a logged-in parent or teacher.
 */
export async function requireAdmin(req) {
  const header = req.headers?.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) throw new Error('Your administrator session was not sent. Log out, log back in, and try again.')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.id) throw new Error('Your administrator session could not be verified. Log out, log back in, and try again.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, status')
    .eq('id', data.user.id)
    .single()
  if (profileError || !profile) throw new Error('Your administrator profile could not be loaded.')
  if (profile.role !== 'admin') throw new Error('Only an administrator can do this.')

  return { supabase, admin: profile }
}
