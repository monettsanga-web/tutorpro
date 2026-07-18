import { isSupabaseConfigured, supabase } from './supabaseClient.js'

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
  const { passwordHash: _passwordHash, salt: _salt, cloudSyncPending: _cloudSyncPending, ...profile } = account
  return profile
}

function metadataFor(account) {
  return {
    role: account.role,
    status: account.status,
    display_name: account.parentName || account.fullName || 'TutorPro English user',
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

export async function registerCloudProfile({ login, password, provider, account }) {
  if (!supabase) return null
  const options = { data: metadataFor(account) }
  let result
  if (['email', 'gmail', 'yahoo'].includes(provider)) {
    result = await supabase.auth.signUp({ email: login.trim().toLowerCase(), password, options })
  } else if (provider === 'whatsapp') {
    result = await supabase.auth.signUp({ phone: login.replace(/[\s()-]/g, ''), password, options })
  } else {
    result = await supabase.auth.signInAnonymously({ options })
  }
  if (result.error) throw new Error(`Shared registration failed: ${result.error.message}`)
  return { userId: result.data.user?.id || null, session: result.data.session || null }
}

export async function signInCloudProfile(login, password) {
  if (!supabase) return null
  const identifier = login.trim()
  const credentials = identifier.includes('@')
    ? { email: identifier.toLowerCase(), password }
    : { phone: identifier.replace(/[\s()-]/g, ''), password }
  const { data, error } = await supabase.auth.signInWithPassword(credentials)
  if (error) throw new Error(`Supabase login failed: ${error.message}`)
  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
  if (profileError) throw new Error(`Shared profile could not be loaded: ${profileError.message}`)
  return profileRowToAccount(profile)
}

export function profileRowToAccount(row) {
  const data = row.profile_data && typeof row.profile_data === 'object' && !Array.isArray(row.profile_data)
    ? row.profile_data
    : {}
  return {
    ...data,
    id: row.id,
    role: ['student', 'teacher', 'admin'].includes(row.role) ? row.role : (data.role || 'student'),
    status: row.status || data.status || 'active',
    email: row.email || data.email || '',
    loginId: row.login_id || data.loginId || row.email || '',
    authProvider: row.auth_provider || data.authProvider || 'email',
    parentName: row.parent_name || data.parentName,
    fullName: row.full_name || data.fullName,
    createdAt: row.created_at || data.createdAt,
    updatedAt: row.updated_at || data.updatedAt,
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

export async function fetchPublicTeachers() {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('get_public_teachers')
  if (error) throw new Error(`Approved teachers could not be loaded: ${error.message}`)
  return (data || []).map((row) => ({
    id: row.id,
    role: 'teacher',
    status: 'approved',
    fullName: row.full_name || 'TutorPro English Teacher',
    teacher: row.teacher && typeof row.teacher === 'object' ? row.teacher : {},
    updatedAt: row.updated_at,
    publicTeacher: true,
    cloudProfile: true,
  }))
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
    display_name: account.parentName || account.fullName || 'TutorPro English user',
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

export function subscribeToCloudProfiles(onChange) {
  if (!supabase) return () => {}
  profileListeners.add(onChange)
  ensureProfileChannel()
  return () => { profileListeners.delete(onChange) }
}
