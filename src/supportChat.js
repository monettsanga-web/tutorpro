import { supabase } from './supabaseClient.js'

const THREAD_KEY = 'tutorpro_support_thread_v1'

function requireSupabase() {
  if (!supabase) throw new Error('Support chat is temporarily unavailable.')
}

function chatError(error, fallback) {
  const message = error?.message || fallback
  if (/get_support|support_conversation|schema cache|function .* does not exist/i.test(message)) {
    return new Error('Support chat setup is not complete yet. The administrator needs to run support_chat.sql in Supabase.')
  }
  return new Error(message)
}

export function readSavedSupportThread() {
  try {
    const value = JSON.parse(localStorage.getItem(THREAD_KEY) || 'null')
    return value?.conversationId && value?.accessToken ? value : null
  } catch {
    return null
  }
}

export function saveSupportThread(credentials) {
  try { localStorage.setItem(THREAD_KEY, JSON.stringify(credentials)) } catch { /* The active tab still keeps the credentials. */ }
}

export function clearSavedSupportThread() {
  try { localStorage.removeItem(THREAD_KEY) } catch { /* Storage cleanup is best-effort. */ }
}

export async function createSupportConversation({ parentName, email, language, message }) {
  requireSupabase()
  const { data, error } = await supabase.rpc('create_support_conversation', {
    parent_name: parentName,
    parent_email: email,
    visitor_language: language,
    first_message: message,
  })
  if (error) throw chatError(error, 'The conversation could not be created.')
  const credentials = { conversationId: data.conversationId, accessToken: data.accessToken }
  saveSupportThread(credentials)
  return credentials
}

export async function fetchSupportThread(credentials) {
  requireSupabase()
  const { data, error } = await supabase.rpc('get_support_thread', {
    target_conversation_id: credentials.conversationId,
    visitor_token: credentials.accessToken,
  })
  if (error) throw chatError(error, 'The conversation could not be loaded.')
  return data || { status: 'open', messages: [] }
}

export async function sendParentSupportMessage(credentials, message) {
  requireSupabase()
  const { data, error } = await supabase.rpc('send_support_message', {
    target_conversation_id: credentials.conversationId,
    visitor_token: credentials.accessToken,
    message_body: message,
  })
  if (error) throw chatError(error, 'The message could not be sent.')
  return data
}

export async function fetchAdminSupportConversations() {
  requireSupabase()
  const { data, error } = await supabase.rpc('get_admin_support_conversations')
  if (error) throw chatError(error, 'Support conversations could not be loaded.')
  return data || []
}

export async function fetchAdminSupportThread(conversationId) {
  requireSupabase()
  const { data, error } = await supabase.rpc('get_admin_support_thread', { target_conversation_id: conversationId })
  if (error) throw chatError(error, 'The support conversation could not be opened.')
  return data
}

export async function sendAdminSupportMessage(conversationId, message) {
  requireSupabase()
  const { data, error } = await supabase.rpc('admin_send_support_message', {
    target_conversation_id: conversationId,
    message_body: message,
  })
  if (error) throw chatError(error, 'The reply could not be sent.')
  return data
}

export async function setSupportConversationStatus(conversationId, status) {
  requireSupabase()
  const { data, error } = await supabase.rpc('set_support_conversation_status', {
    target_conversation_id: conversationId,
    next_status: status,
  })
  if (error) throw chatError(error, 'The conversation status could not be changed.')
  return Boolean(data)
}
