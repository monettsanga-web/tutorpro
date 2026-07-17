import { isSupabaseConfigured, supabase } from './supabaseClient.js'

function safeAccount(account) {
  const { passwordHash: _passwordHash, salt: _salt, ...profile } = account
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
  const { error } = await supabase.from('profiles').update(payload).eq('id', account.id)
  if (error) throw new Error(`Shared profile update failed: ${error.message}`)
  return payload
}

export async function deleteCloudProfile(accountId) {
  if (!supabase || !accountId) return false
  const { error } = await supabase.from('profiles').delete().eq('id', accountId)
  if (error) throw new Error(`Shared profile deletion failed: ${error.message}`)
  return true
}

export function subscribeToCloudProfiles(onChange) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel('tutorpro-admin-profiles')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, onChange)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}
