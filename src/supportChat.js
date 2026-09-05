import { supabase } from './supabaseClient.js'

const THREAD_KEY = 'tutorpro_support_thread_v1'
const SUPPORT_BUCKET = 'support-attachments'
const MAX_ATTACHMENT_SIZE = 3 * 1024 * 1024
const ALLOWED_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']

function validateAttachment(file) {
  if (!file) throw new Error('Choose a file to upload.')
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) throw new Error('Upload a JPG, PNG, WebP, PDF or text file.')
  if (file.size < 1 || file.size > MAX_ATTACHMENT_SIZE) throw new Error('Keep chat attachments under 3 MB.')
}

function safeFileName(name) {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-120) || 'attachment'
}

function requireSupabase() {
  if (!supabase) throw new Error('Support chat is temporarily unavailable.')
}

function chatError(error, fallback) {
  const message = error?.message || fallback
  if (/get_account_support|send_account_support|function .* does not exist|schema cache/i.test(message)) {
    return new Error('Support chat account-mode setup is not complete yet. The administrator needs to run the latest support_chat.sql in Supabase.')
  }
  if (/get_support|support_conversation|support-attachments|bucket not found|schema cache/i.test(message)) {
    return new Error('Support chat setup is not complete yet. The administrator needs to run support_chat.sql in Supabase.')
  }
  return new Error(message)
}

function keyFor(storageKey = '') {
  return storageKey ? `${THREAD_KEY}:${storageKey}` : THREAD_KEY
}

export function readSavedSupportThread(storageKey = '') {
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(storageKey)) || 'null')
    return value?.conversationId && (value?.accessToken || value?.accountMode) ? value : null
  } catch {
    return null
  }
}

export function saveSupportThread(credentials, storageKey = '') {
  try { localStorage.setItem(keyFor(storageKey), JSON.stringify(credentials)) } catch { /* The active tab still keeps the credentials. */ }
}

export function clearSavedSupportThread(storageKey = '') {
  try { localStorage.removeItem(keyFor(storageKey)) } catch { /* Storage cleanup is best-effort. */ }
}

export async function createSupportConversation({ parentName, email, language, message, accountMode = false, storageKey = '' }) {
  requireSupabase()
  if (accountMode) {
    const { data, error } = await supabase.rpc('get_or_create_account_support_conversation', {
      parent_name: parentName,
      parent_email: email,
      visitor_language: language,
      first_message: message,
    })
    if (error) throw chatError(error, 'The account support conversation could not be opened.')
    const credentials = { conversationId: data.conversationId, accountMode: true }
    saveSupportThread(credentials, storageKey)
    return credentials
  }

  const { data, error } = await supabase.rpc('create_support_conversation', {
    parent_name: parentName,
    parent_email: email,
    visitor_language: language,
    first_message: message,
  })
  if (error) throw chatError(error, 'The conversation could not be created.')
  const credentials = { conversationId: data.conversationId, accessToken: data.accessToken }
  saveSupportThread(credentials, storageKey)
  return credentials
}

export async function fetchSupportThread(credentials) {
  requireSupabase()
  if (credentials.accountMode) {
    const { data, error } = await supabase.rpc('get_account_support_thread', {
      target_conversation_id: credentials.conversationId,
    })
    if (error) throw chatError(error, 'The account support conversation could not be loaded.')
    return data || { status: 'open', messages: [] }
  }

  const { data, error } = await supabase.rpc('get_support_thread', {
    target_conversation_id: credentials.conversationId,
    visitor_token: credentials.accessToken,
  })
  if (error) throw chatError(error, 'The conversation could not be loaded.')
  return data || { status: 'open', messages: [] }
}

/**
 * Tell the administrator by email that a parent or teacher has written in.
 *
 * WHY THIS EXISTS
 * ---------------
 * The admin's replies already triggered `support-notification`, so the parent
 * got an email. The other direction did nothing: a parent could send a
 * question and it would sit unread in the Support inbox until the admin
 * happened to open the dashboard. Nobody was told.
 *
 * WHY FAILURES ARE SWALLOWED
 * --------------------------
 * The message is already saved by the time this runs. If the email provider
 * is down, the right outcome is a delivered message with no alert — not a
 * failed send. So this never throws; it reports back instead, and the caller
 * decides what to say.
 *
 * The Edge Function is given only the conversation id and the text it should
 * quote. It looks the conversation up itself, so this cannot be used to mail
 * arbitrary addresses.
 */
export async function notifyAdminOfSupportMessage(credentials, messageBody) {
  if (!supabase || !credentials?.conversationId) return { notified: false, reason: 'not connected' }
  try {
    const { data, error } = await supabase.functions.invoke('support-notification', {
      body: {
        conversationId: credentials.conversationId,
        messageBody: messageBody || 'Sent an attachment.',
        // Tells the function this came FROM the parent, so it emails the
        // administrator rather than emailing the parent their own message.
        direction: 'to-admin',
      },
    })
    if (error) throw error
    return { notified: true, data }
  } catch (error) {
    return { notified: false, reason: error?.message || 'Email alert could not be sent.' }
  }
}

export async function sendParentSupportMessage(credentials, message) {
  requireSupabase()
  if (credentials.accountMode) {
    const { data, error } = await supabase.rpc('send_account_support_message', {
      target_conversation_id: credentials.conversationId,
      message_body: message,
    })
    if (error) throw chatError(error, 'The message could not be sent.')
    return data
  }

  const { data, error } = await supabase.rpc('send_support_message', {
    target_conversation_id: credentials.conversationId,
    visitor_token: credentials.accessToken,
    message_body: message,
  })
  if (error) throw chatError(error, 'The message could not be sent.')
  return data
}

export async function uploadParentSupportAttachment(credentials, file, message = '') {
  requireSupabase()
  validateAttachment(file)
  const folderToken = credentials.accountMode ? 'account' : credentials.accessToken
  const path = `${credentials.conversationId}/${folderToken}/${crypto.randomUUID()}-${safeFileName(file.name)}`
  const { error: uploadError } = await supabase.storage.from(SUPPORT_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw chatError(uploadError, 'The attachment could not be uploaded.')

  if (credentials.accountMode) {
    const { data, error } = await supabase.rpc('send_account_support_attachment', {
      target_conversation_id: credentials.conversationId,
      message_body: message,
      uploaded_path: path,
      original_name: file.name.slice(-180),
      mime_type: file.type,
      byte_size: file.size,
    })
    if (error) throw chatError(error, 'The attachment message could not be sent.')
    return data
  }

  const { data, error } = await supabase.rpc('send_support_attachment', {
    target_conversation_id: credentials.conversationId,
    visitor_token: credentials.accessToken,
    message_body: message,
    uploaded_path: path,
    original_name: file.name.slice(-180),
    mime_type: file.type,
    byte_size: file.size,
  })
  if (error) throw chatError(error, 'The attachment message could not be sent.')
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

export async function uploadAdminSupportAttachment(conversationId, file, message = '') {
  requireSupabase()
  validateAttachment(file)
  const path = `${conversationId}/admin/${crypto.randomUUID()}-${safeFileName(file.name)}`
  const { error: uploadError } = await supabase.storage.from(SUPPORT_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw chatError(uploadError, 'The attachment could not be uploaded.')
  const { data, error } = await supabase.rpc('admin_send_support_attachment', {
    target_conversation_id: conversationId,
    message_body: message,
    uploaded_path: path,
    original_name: file.name.slice(-180),
    mime_type: file.type,
    byte_size: file.size,
  })
  if (error) throw chatError(error, 'The attachment message could not be sent.')
  return data
}

export async function downloadSupportAttachment(attachment) {
  requireSupabase()
  const { data, error } = await supabase.storage.from(SUPPORT_BUCKET).download(attachment.path)
  if (error) throw chatError(error, 'The attachment could not be downloaded.')
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = attachment.name || 'support-attachment'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

export async function setSupportConversationStatus(conversationId, status) {
  requireSupabase()
  const { data, error } = await supabase.rpc('set_support_conversation_status', {
    target_conversation_id: conversationId,
    next_status: status,
  })
  if (error) throw chatError(error, 'The conversation status could not be updated.')
  return data
}
