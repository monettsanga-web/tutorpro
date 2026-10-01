import { getSupabaseAdmin } from './_paypal.js'

/**
 * Prove the caller really is the administrator before letting them touch
 * accounts.
 *
 * THE HOLE THIS CLOSES
 * --------------------
 * This used to decide by reading `profiles.role`:
 *
 *     .from('profiles').select('role').eq('id', user.id).single()
 *     if (profile.role !== 'admin') throw ...
 *
 * But `profiles` carries this row-level security policy:
 *
 *     create policy "Users can update own profile"
 *       on public.profiles for update
 *       using (id = auth.uid()) with check (id = auth.uid());
 *
 * It restricts WHICH ROW you may update, not WHICH COLUMNS. So any member of
 * the public could sign up through the normal registration form and then:
 *
 *     PATCH /rest/v1/profiles?id=eq.<their own id>   { "role": "admin" }
 *
 * and every endpoint behind this check would treat them as the
 * administrator. Verified against production: the PATCH returned 200 and
 * /api/admin/test-accounts then answered that caller with the real account
 * total.
 *
 * `admin_members` is the authority instead. It is a separate table whose
 * only policy is SELECT-your-own-row — there is no INSERT or UPDATE policy
 * at all, so nobody can add themselves to it through the API no matter what
 * they send. It is also what the database's own `is_tutorpro_admin()` uses,
 * so the server and the database now agree on who is an admin instead of
 * trusting two different things.
 *
 * The lookup runs with the service-role key, which bypasses RLS, so it reads
 * the real membership rather than whatever the caller can see.
 */
export async function requireAdmin(req) {
  const header = req.headers?.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) throw new Error('Your administrator session was not sent. Log out, log back in, and try again.')

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.id) throw new Error('Your administrator session could not be verified. Log out, log back in, and try again.')
  const userId = data.user.id

  // The authority: a table the caller cannot write to.
  const { data: membership, error: membershipError } = await supabase
    .from('admin_members')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (membershipError) throw new Error(`Administrator membership could not be checked: ${membershipError.message}`)
  if (!membership) throw new Error('Only an administrator can do this.')

  // Read the profile too, so a suspended administrator is still shut out and
  // callers keep getting the row they expect back.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, status')
    .eq('id', userId)
    .maybeSingle()
  if (profileError) throw new Error(`Your administrator profile could not be loaded: ${profileError.message}`)
  if (profile && ['suspended', 'removed', 'rejected'].includes(String(profile.status || '').toLowerCase())) {
    throw new Error('This administrator account is not active.')
  }

  return { supabase, admin: profile || { id: userId, role: 'admin', status: 'active' } }
}
