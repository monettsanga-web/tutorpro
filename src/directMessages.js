/**
 * Direct messages between the admin, teachers and parents.
 *
 * WHAT WAS WRONG BEFORE
 * ---------------------
 * Direct chat wrote to `localStorage` and nothing else. A message you sent was
 * saved on your own device and went nowhere: the other person never saw it, on
 * any device, ever. It looked like it worked, because your own copy appeared
 * in the thread straight away.
 *
 * That also made an email alert impossible — the server never learned the
 * message existed, so there was nothing to send an email about.
 *
 * WHAT HAPPENS NOW
 * ----------------
 * A message is written to the `direct_messages` table, which is what actually
 * delivers it to the other person. Once it is safely stored, an Edge Function
 * emails them to say a message is waiting.
 *
 * ORDER MATTERS: save first, email second. If the email provider is down or
 * the key is missing, the message is still delivered inside the site — it just
 * has no email alert. The reverse would be far worse: an email announcing a
 * message that was never saved.
 *
 * The Supabase client is injectable purely so the save-then-email ORDER can
 * be proved in a test without a network; production always uses the real one.
 *
 * THE LOCAL COPY IS KEPT
 * ----------------------
 * Existing threads live in localStorage, and messages written while offline
 * have nowhere else to go. So local storage stays as a cache and an outbox,
 * and cloud messages are merged into it. Nothing already on a device is lost.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const LOCAL_KEY = 'tutorpro_direct_messages_v1'

/** Stable key for a conversation, whichever side is looking at it. */
export function conversationKey(userA, userB) {
  return [userA, userB].sort().join('--')
}

function readLocal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeLocal(threads) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(threads))
    window.dispatchEvent(new Event('tutorpro:data-change'))
  } catch {
    // A full or blocked storage quota must not break sending.
  }
}

export function readLocalThread(userA, userB) {
  const thread = readLocal()[conversationKey(userA, userB)]
  return Array.isArray(thread) ? thread : []
}

function rowToMessage(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
    cloud: true,
  }
}

/**
 * Merge cloud messages into the local cache without losing anything.
 * Messages are matched by id, so a message this device wrote and already has
 * is updated rather than duplicated when it comes back from the server.
 */
export function mergeThread(userA, userB, incoming) {
  const threads = readLocal()
  const key = conversationKey(userA, userB)
  const existing = Array.isArray(threads[key]) ? threads[key] : []
  const byId = new Map(existing.map((message) => [message.id, message]))
  incoming.forEach((message) => byId.set(message.id, { ...byId.get(message.id), ...message }))
  const merged = [...byId.values()].sort(
    (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
  )
  threads[key] = merged
  writeLocal(threads)
  return merged
}

export function cloudMessagingEnabled() {
  return Boolean(isSupabaseConfigured && supabase)
}

/** Load a conversation from the database, newest last. */
export async function fetchThread(currentUserId, otherUserId) {
  if (!cloudMessagingEnabled()) return readLocalThread(currentUserId, otherUserId)
  const { data, error } = await supabase
    .from('direct_messages')
    // Named columns rather than '*': the table is small but this keeps the
    // response tight, and egress is a live concern on the free tier.
    .select('id, sender_id, recipient_id, body, read_at, created_at')
    .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`)
    .order('created_at', { ascending: true })
    .limit(200)

  // A failure here must never blank an open conversation, so the cached copy
  // is returned instead.
  if (error) return readLocalThread(currentUserId, otherUserId)
  // Defensive: PostgREST returns an array here, but a proxy, an error page or
  // a misconfigured gateway can return an object. Calling .map on that threw
  // a TypeError that broke the whole dashboard render.
  const rows = Array.isArray(data) ? data : data ? [data] : []
  return mergeThread(currentUserId, otherUserId, rows.map(rowToMessage))
}

/**
 * Send a message, then ask the server to email the recipient.
 *
 * Returns `{ message, emailed, emailError }` so the UI can be honest about
 * what actually happened rather than implying an email that never went.
 */
export async function sendDirectMessage({ senderId, senderRole, recipientId, body, client = supabase }) {
  const text = String(body || '').trim()
  if (!text) throw new Error('Type a message first.')
  if (text.length > 4000) throw new Error('Keep messages under 4000 characters.')
  if (!senderId || !recipientId) throw new Error('This conversation is missing a participant.')

  const local = {
    id: crypto.randomUUID(),
    senderId,
    senderRole,
    recipientId,
    body: text,
    createdAt: new Date().toISOString(),
  }

  if (!client) {
    // Offline or unconfigured: keep the old behaviour so nothing is lost, but
    // be clear that it has not been delivered anywhere.
    mergeThread(senderId, recipientId, [{ ...local, pending: true }])
    return { message: local, emailed: false, emailError: 'Not connected to the shared database.' }
  }

  const { data, error } = await client
    .from('direct_messages')
    .insert({ id: local.id, sender_id: senderId, recipient_id: recipientId, body: text })
    .select('id, sender_id, recipient_id, body, read_at, created_at')
    .single()

  if (error) {
    // Save locally so the words are not lost while the cause is investigated.
    mergeThread(senderId, recipientId, [{ ...local, pending: true, failed: true }])
    throw new Error(`Message could not be sent: ${error.message}`)
  }

  const saved = rowToMessage(data)
  mergeThread(senderId, recipientId, [saved])

  // Email second, and never let its failure look like a failure to send.
  let emailed = false
  let emailError = ''
  try {
    const { data: result, error: invokeError } = await client.functions.invoke('message-notification', {
      body: { messageId: saved.id },
    })
    if (invokeError) throw invokeError
    emailed = Boolean(result?.delivered)
    if (!emailed) emailError = result?.reason || result?.error || 'Email alert was not sent.'
  } catch (caught) {
    emailError = caught.message || 'Email alert could not be sent.'
  }

  return { message: saved, emailed, emailError }
}

/** Mark everything the other person sent as read. Drives the unread badge. */
export async function markThreadRead(currentUserId, otherUserId) {
  if (!cloudMessagingEnabled()) return
  try {
    await supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', currentUserId)
      .eq('sender_id', otherUserId)
      .is('read_at', null)
  } catch {
    // A read receipt is not worth surfacing an error for.
  }
}

/** How many unread messages this person has, for the dashboard badge. */
export async function unreadMessageCount(currentUserId) {
  if (!cloudMessagingEnabled() || !currentUserId) return 0
  const { count, error } = await supabase
    .from('direct_messages')
    // head:true returns no rows at all — just the count. Cheapest possible way
    // to poll this, which matters because it runs on an open dashboard.
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', currentUserId)
    .is('read_at', null)
  return error ? 0 : (count || 0)
}

/**
 * Live delivery for an open conversation.
 * Realtime is what makes a message appear on the other person's screen without
 * a refresh; the email is for when they are not looking at the site at all.
 */
export function subscribeToDirectMessages(currentUserId, onMessage) {
  if (!cloudMessagingEnabled() || !currentUserId) return () => {}
  const channel = supabase
    .channel(`tutorpro-direct-messages-${currentUserId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'direct_messages',
      filter: `recipient_id=eq.${currentUserId}`,
    }, (payload) => {
      if (payload?.new) onMessage(rowToMessage(payload.new))
    })
    .subscribe()
  return () => { try { supabase.removeChannel(channel) } catch { /* already closed */ } }
}
