import { isSupabaseConfigured, supabase } from './supabaseClient.js'
import { isServiceRestriction, serviceRestrictionMessage } from './serviceStatus.js'

const PROFILE_SYNC_CHANNEL = 'tutorpro-profile-live-updates'
const profileListeners = new Set()
let profileChannel = null

function emitProfileChange(change) {
  profileListeners.forEach((listener) => {
    try { listener(change) } catch { /* One dashboard listener must not stop the others. */ }
  })
}

function ensureProfileChannel() {
  if (!supabase || profileChannel) return profileChannel
  profileChannel = supabase
    .channel(PROFILE_SYNC_CHANNEL, { config: { broadcast: { self: false, ack: true } } })
    .on('broadcast', { event: 'profile-refresh' }, ({ payload }) => emitProfileChange({ eventType: 'BROADCAST', new: payload }))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, emitProfileChange)
    .subscribe()
  return profileChannel
}

function safeAccount(account) {
  const { passwordHash: _passwordHash, salt: _salt, cloudSyncPending: _cloudSyncPending, lastCloudSyncedAt: _lastCloudSyncedAt, ...profile } = account
  return profile
}

function metadataFor(account) {
  return {
    role: account.role,
    status: account.status,
    display_name: account.parentName || account.fullName || 'TutorPro Online English user',
    login_id: account.loginId || account.email || '',
    auth_provider: account.authProvider || 'email',
    profile_data: safeAccount(account),
  }
}

export function cloudSyncEnabled() {
  return isSupabaseConfigured
}

function broadcastProfileRefresh() {
  const channel = ensureProfileChannel()
  if (!channel) return
  channel.send({
    type: 'broadcast',
    event: 'profile-refresh',
    payload: { changedAt: new Date().toISOString() },
  }).catch(() => {
    // Postgres Changes and polling remain available if Broadcast reconnects.
  })
}

/**
 * WeChat IDs and WhatsApp numbers are not Supabase identities.
 *
 * THE FAULT THIS FIXES
 * --------------------
 * The registration modal offers five ways to sign up. Two of them could
 * never work:
 *
 *   WhatsApp  -> supabase.auth.signUp({ phone })  -> 400
 *                {"error_code":"phone_provider_disabled",
 *                 "msg":"Phone signups are disabled"}
 *   WeChat    -> supabase.auth.signInAnonymously() -> 422
 *                {"error_code":"anonymous_provider_disabled",
 *                 "msg":"Anonymous sign-ins are disabled"}
 *
 * A parent who picked either button was told "Shared registration failed:
 * Phone signups are disabled" and could not create an account at all.
 * Logging in was broken the same way: signInCloudProfile sent anything
 * without an "@" to the phone endpoint, which is also switched off.
 *
 * Turning those providers on is not an option here — phone sign-up needs a
 * paid SMS gateway, and anonymous sign-in would let anyone create unlimited
 * accounts. Neither is something this project should depend on.
 *
 * So the handle becomes a stable address under a subdomain we own, and the
 * account is created with ordinary email+password, which IS enabled and is
 * auto-confirmed. The parent still types their WeChat ID or phone number and
 * their own password; the mapping is invisible to them and deterministic, so
 * the same handle always resolves to the same account.
 *
 * Nothing is ever sent to these addresses: notifications go to the address
 * on the profile, and the domain has no mailbox.
 */
const HANDLE_DOMAIN = 'accounts.tutorpro.site'

export function cloudLoginEmail(provider, login) {
  const raw = String(login || '').trim()
  if (provider === 'wechat') return `wechat.${raw.toLowerCase()}@${HANDLE_DOMAIN}`
  if (provider === 'whatsapp') return `whatsapp.${raw.replace(/\D/g, '')}@${HANDLE_DOMAIN}`
  return raw.toLowerCase()
}

/**
 * The login box asks for one value and does not know which button was used
 * at registration, so work it out from the shape. A WeChat ID must start
 * with a letter (see validLoginId), a WhatsApp number is digits and +, and
 * an email has an @, so the three can never be confused.
 */
export function cloudLoginCandidates(loginValue) {
  const raw = String(loginValue || '').trim()
  if (!raw) return []
  if (raw.includes('@')) return [raw.toLowerCase()]
  if (/^\+?[0-9\s()-]{8,20}$/.test(raw)) return [cloudLoginEmail('whatsapp', raw)]
  return [cloudLoginEmail('wechat', raw)]
}

/** Supabase speaks to developers. Parents need a sentence they can act on. */
function friendlyAuthMessage(message = '') {
  const text = String(message)
  if (/already registered|user_already_exists|already exists/i.test(text)) {
    return 'An account with this login already exists. Please log in instead, or use "Forgot password" to get back in.'
  }
  if (/password/i.test(text) && /weak|short|at least/i.test(text)) {
    return 'Please choose a longer password: at least eight characters, including a number.'
  }
  if (/rate limit|too many/i.test(text)) {
    return 'Too many attempts just now. Please wait a minute and try again.'
  }
  if (/phone_provider_disabled|anonymous_provider_disabled/i.test(text)) {
    return 'That sign-up method is not available right now. Please use an email address, or contact us and we will set the account up for you.'
  }
  if (/invalid.*email|email_address_invalid/i.test(text)) {
    return 'That login does not look right for the option you picked. Check it and try again.'
  }
  return `Registration could not be completed: ${text}`
}

export async function registerCloudProfile({ login, password, provider, account }) {
  if (!supabase) return null
  /* Always an email sign-up. WeChat and WhatsApp handles are mapped to an
     address first — see cloudLoginEmail above for why. */
  const email = cloudLoginEmail(provider, login)

  /*
   * The server route first, because the browser route does not finish the
   * job. `supabase.auth.signUp` creates the auth user and relies on a
   * database trigger to create the matching `profiles` row. On this
   * project that trigger is not firing. Measured on the live site:
   *
   *     POST /auth/v1/signup                       -> 200, user created
   *     GET  /rest/v1/profiles?id=eq.<new id>      -> 406, 0 rows
   *
   * A family with no profile row is invisible to the admin dashboard and
   * cannot log in from a second device, while their own browser shows
   * them signed in - which is why registrations appeared to stop.
   *
   * /api/auth/register writes the row with the service-role key, reads it
   * back to prove it exists, and confirms the email address so the parent
   * can log in immediately instead of waiting for a confirmation mail
   * that the free plan rate-limits.
   */
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, profile: { ...safeAccount(account), loginId: account.loginId || email, authProvider: provider } }),
    })
    const payload = await response.json().catch(() => ({}))
    if (response.ok && payload?.ok && payload.userId) {
      /* Sign in straight away so the parent has a real session rather than
         a local-only one. */
      const signIn = await supabase.auth.signInWithPassword({ email, password })
      return { userId: payload.userId, session: signIn.data?.session || null }
    }
    if (response.status === 409) throw new Error(payload?.error || 'An account with this login already exists. Try logging in instead.')
    if (response.status >= 400 && response.status < 500 && payload?.error) throw new Error(payload.error)
    console.warn('Server registration unavailable, falling back to browser sign-up:', payload?.error || response.status)
  } catch (routeError) {
    /* A 4xx is the server telling us something real - pass it on. Anything
       else (offline, route missing) falls through to the old path. */
    if (/already exists|valid email|at least 8 characters/i.test(routeError.message || '')) throw routeError
  }

  const options = { data: metadataFor(account) }
  const result = await supabase.auth.signUp({ email, password, options })
  if (result.error) {
    if (isServiceRestriction(result.error)) throw new Error(serviceRestrictionMessage(result.error))
    throw new Error(friendlyAuthMessage(result.error.message))
  }
  return { userId: result.data.user?.id || null, session: result.data.session || null }
}

export async function signInCloudProfile(login, password) {
  if (!supabase) return null
  const candidates = cloudLoginCandidates(login)
  if (!candidates.length) throw new Error('Enter the email, WeChat ID or phone number you registered with.')

  let lastError = null
  let data = null
  for (const email of candidates) {
    const attempt = await supabase.auth.signInWithPassword({ email, password })
    if (!attempt.error) { data = attempt.data; break }
    lastError = attempt.error
  }
  // A free-plan service restriction (HTTP 402) would otherwise surface to a
  // parent as "Supabase login failed", which reads like the site is broken
  // and their account is gone. Explain it instead.
  if (!data && lastError && isServiceRestriction(lastError)) throw new Error(serviceRestrictionMessage(lastError))
  if (!data) throw new Error(`Supabase login failed: ${lastError?.message || 'unknown error'}`)
  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
  if (profileError && isServiceRestriction(profileError)) throw new Error(serviceRestrictionMessage(profileError))
  if (profileError) throw new Error(`Shared profile could not be loaded: ${profileError.message}`)
  return profileRowToAccount(profile)
}

export function profileRowToAccount(row) {
  const data = row.profile_data && typeof row.profile_data === 'object' && !Array.isArray(row.profile_data)
    ? row.profile_data
    : {}
  const rawRole = (row.role || data.role || 'student').toLowerCase()
  const role = ['student', 'teacher', 'admin'].includes(rawRole) ? rawRole : 'student'
  return {
    ...data,
    id: row.id,
    role: role,
    status: row.status || data.status || 'active',
    email: row.email || data.email || '',
    loginId: row.login_id || data.loginId || row.email || '',
    authProvider: row.auth_provider || data.authProvider || 'email',
    parentName: row.parent_name || data.parentName,
    fullName: row.full_name || data.fullName,
    createdAt: row.created_at || data.createdAt,
    updatedAt: row.updated_at || data.updatedAt,
    /* Dedicated column after recovery_email.sql; JSON fallback before the
       migration is run. */
    recoveryEmail: row.recovery_email || data.recoveryEmail || '',
    cloudProfile: true,
  }
}

export async function verifyCloudAdmin() {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('is_tutorpro_admin')
  if (error) throw new Error(`Administrator cloud access could not be verified: ${error.message}`)
  return Boolean(data)
}

export async function fetchCloudProfiles() {
  if (!supabase) return []
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(`Shared registrations could not be loaded: ${error.message}`)
  return (data || []).map(profileRowToAccount)
}

/**
 * The approved teacher directory, as a parent or student sees it.
 *
 * /api/teachers/public is tried first and the `get_public_teachers` RPC is
 * the fallback, because the RPC cannot return a photo. It does not pass
 * the teacher record through; it rebuilds it with jsonb_build_object and a
 * fixed list of nine fields, and 'photo' is not one of them. So a photo
 * could be uploaded, resized, saved and synced correctly and a family
 * would still see a grey letter - the only pipe that reaches them drops
 * the field. The Vercel route deploys with the site and needs no SQL run
 * by hand; if a database does have the updated function, either answer
 * works and this still prefers the one that carries photos.
 */
export async function fetchPublicTeachers() {
  try {
    const response = await fetch('/api/teachers/public', { headers: { accept: 'application/json' } })
    if (response.ok) {
      const payload = await response.json()
      if (Array.isArray(payload?.teachers)) return payload.teachers.map(publicTeacherRow)
    }
  } catch {
    // Offline, or the site is being served somewhere without the API.
    // The RPC below still answers, just without photos.
  }

  if (!supabase) return []
  const { data, error } = await supabase.rpc('get_public_teachers')
  if (error) throw new Error(`Approved teachers could not be loaded: ${error.message}`)
  return (data || []).map(publicTeacherRow)
}

function publicTeacherRow(row) {
  return ({
    id: row.id,
    role: 'teacher',
    status: 'approved',
    fullName: row.full_name || 'TutorPro Online English Teacher',
    teacher: row.teacher && typeof row.teacher === 'object' ? row.teacher : {},
    updatedAt: row.updated_at,
    publicTeacher: true,
    cloudProfile: true,
  })
}

export async function updateCloudProfile(account) {
  if (!supabase || !account?.id) return null
  const payload = {
    id: account.id,
    role: account.role,
    status: account.status,
    email: account.email || null,
    login_id: account.loginId || account.email || '',
    auth_provider: account.authProvider || 'email',
    parent_name: account.parentName || null,
    full_name: account.fullName || null,
    display_name: account.parentName || account.fullName || 'TutorPro Online English user',
    profile_data: safeAccount(account),
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', account.id)
    .select('id, status, role')
    .single()
  if (error) throw new Error(`Shared profile update failed: ${error.message}`)
  if (!data?.id) throw new Error('Shared profile update was blocked by Supabase permissions.')
  broadcastProfileRefresh()
  return { ...payload, ...data }
}

export async function deleteCloudProfile(accountId) {
  if (!supabase || !accountId) return false
  const { data, error } = await supabase.from('profiles').delete().eq('id', accountId).select('id')
  if (error) throw new Error(`Shared profile deletion failed: ${error.message}`)
  if (!data?.length) throw new Error('Shared profile deletion was blocked by Supabase permissions.')
  return true
}

export async function deleteCloudTeacherAccount(account) {
  if (!supabase || !account?.id) return { mode: 'local' }
  const { data, error } = await supabase.rpc('delete_teacher_profile', { target_user_id: account.id })
  if (!error) {
    if (!data) throw new Error('The shared teacher profile could not be found.')
    return { mode: 'deleted' }
  }

  const functionUnavailable = error.code === 'PGRST202'
    || /delete_teacher_profile|schema cache|function .* does not exist/i.test(error.message || '')
  if (!functionUnavailable) throw new Error(`Shared teacher deletion failed: ${error.message}`)

  // Older Supabase projects may not have the hard-delete RPC yet. Marking the
  // profile removed revokes cloud login and hides it everywhere until the
  // administrator runs teacher_profile_delete.sql.
  await updateCloudProfile({ ...account, status: 'removed' })
  return { mode: 'deactivated' }
}


export async function requestCloudPasswordReset(loginValue, redirectTo) {
  if (!supabase) throw new Error('Password reset is not configured yet. Please contact TutorPro Online English support.')
  const login = String(loginValue || '').trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(login)) throw new Error('Password reset is available for email-based accounts. Please enter your registered email address or contact admin support.')
  const destination = redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#reset-password` : undefined)
  const { error } = await supabase.auth.resetPasswordForEmail(login, { redirectTo: destination })
  if (error) throw new Error(`Password reset email could not be sent: ${error.message}`)
  return true
}

export async function updateCloudPassword(newPassword) {
  if (!supabase) throw new Error('Password reset is not configured yet. Please contact TutorPro Online English support.')
  if (typeof newPassword !== 'string' || newPassword.length < 8 || !/[0-9]/.test(newPassword)) {
    throw new Error('Use at least 8 characters and include at least one number.')
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(`Password could not be updated: ${error.message}`)
  return true
}

/**
 * Listen for profile changes.
 *
 * The socket is only opened for a signed-in user. The public homepage used to
 * hold this channel open for the whole visit so the teacher directory could
 * update live — but an approved teacher list changes perhaps weekly, and the
 * page already fetches it on load and again when a hidden tab is revisited.
 * A logged-out visitor therefore kept a Realtime connection open, and counted
 * against the Realtime connection allowance, for a change that would almost
 * never arrive.
 *
 * Dashboards, which genuinely need live updates, are always signed in and so
 * still get the socket immediately.
 */
export function subscribeToCloudProfiles(onChange) {
  if (!supabase) return () => {}
  profileListeners.add(onChange)

  let cancelled = false

  supabase.auth.getSession()
    .then(({ data }) => { if (!cancelled && data?.session) ensureProfileChannel() })
    .catch(() => { /* Offline: cached profiles still render. */ })

  // Opens as soon as the visitor signs in, without needing a page reload.
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    if (cancelled || !session) return
    ensureProfileChannel()
  })

  return () => {
    cancelled = true
    profileListeners.delete(onChange)
    try { listener?.subscription?.unsubscribe() } catch { /* Already removed. */ }
    // The channel is shared, so it is only torn down once nothing is listening.
    if (!profileListeners.size && profileChannel) {
      try { supabase.removeChannel(profileChannel) } catch { /* Already closed. */ }
      profileChannel = null
    }
  }
}
