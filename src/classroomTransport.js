import { supabase } from './supabaseClient.js'

const MAX_SEEN_MESSAGES = 500
const MAX_QUEUED_MESSAGES = 120
const DURABLE_SIGNAL_TYPES = new Set(['join-request', 'offer', 'answer', 'ice', 'annotation-permission', 'screen-state'])

function channelKey(roomId, token) {
  const safeRoom = String(roomId || '').replace(/[^a-z0-9-]/gi, '').slice(0, 48)
  const safeToken = String(token || '').replace(/[^a-z0-9-]/gi, '').slice(0, 64)
  return `tutorpro-classroom-${safeRoom}-${safeToken}`
}

function missingSignalTable(error) {
  return ['42P01', 'PGRST205', 'PGRST204'].includes(error?.code)
    || /classroom_signals|schema cache|relation .* does not exist/i.test(error?.message || '')
}

export function createClassroomTransport({ bookingId, roomId, token, participantId, onMessage, onStatus }) {
  const signalingUrl = import.meta.env?.VITE_CLASSROOM_SIGNALING_URL
  let socket
  let localChannel
  let realtimeChannel
  let databaseChannel
  let databasePollTimer
  let realtimeReady = false
  let databaseEnabled = Boolean(supabase && bookingId)
  let databaseFailures = 0
  let databaseCursor = new Date(Date.now() - 15_000).toISOString()
  let closed = false
  const queuedMessages = []
  const seenMessages = new Set()
  const seenDatabaseRows = new Set()

  const receive = (payload) => {
    if (!payload || payload.sender === participantId) return
    const messageId = payload.messageId
    if (messageId && seenMessages.has(messageId)) return
    if (messageId) {
      seenMessages.add(messageId)
      if (seenMessages.size > MAX_SEEN_MESSAGES) seenMessages.delete(seenMessages.values().next().value)
    }
    onMessage(payload)
  }

  const receiveDatabaseRow = (row) => {
    if (!row || row.room_id !== roomId || seenDatabaseRows.has(row.id)) return
    seenDatabaseRows.add(row.id)
    if (seenDatabaseRows.size > MAX_SEEN_MESSAGES) seenDatabaseRows.delete(seenDatabaseRows.values().next().value)
    if (row.created_at && row.created_at > databaseCursor) databaseCursor = row.created_at
    receive(row.payload)
  }

  const disableDatabaseFallback = () => {
    databaseEnabled = false
    if (databasePollTimer) window.clearInterval(databasePollTimer)
    databasePollTimer = null
    if (databaseChannel && supabase) supabase.removeChannel(databaseChannel)
    databaseChannel = null
  }

  const noteDatabaseError = (error) => {
    databaseFailures += 1
    if (missingSignalTable(error) || databaseFailures >= 4) disableDatabaseFallback()
  }

  const pollDatabaseSignals = async () => {
    if (!databaseEnabled || closed || !supabase) return
    try {
      const { data, error } = await supabase
        .from('classroom_signals')
        .select('id, room_id, payload, created_at')
        .eq('booking_id', bookingId)
        .eq('room_id', roomId)
        .gte('created_at', databaseCursor)
        .order('created_at', { ascending: true })
        .limit(100)
      if (error) {
        noteDatabaseError(error)
        return
      }
      databaseFailures = 0
      const rows = data || []
      rows.forEach(receiveDatabaseRow)
    } catch (error) {
      noteDatabaseError(error)
    }
  }

  const postDatabaseSignal = (message) => {
    if (!databaseEnabled || closed || !supabase || !DURABLE_SIGNAL_TYPES.has(message.type)) return
    supabase.from('classroom_signals').insert({
      booking_id: bookingId,
      room_id: roomId,
      sender_id: participantId,
      signal_type: message.type,
      payload: message,
    }).then(({ error }) => {
      if (error) noteDatabaseError(error)
      else databaseFailures = 0
    }).catch(noteDatabaseError)
  }

  const postRealtime = (message) => {
    if (!realtimeChannel || !realtimeReady || closed) return false
    realtimeChannel.send({ type: 'broadcast', event: 'signal', payload: message }).catch(() => {
      // The HTTPS database path continues trying when WebSockets are blocked.
    })
    return true
  }

  const flushRealtimeQueue = () => {
    if (!realtimeReady) return
    queuedMessages.splice(0).forEach(postRealtime)
  }

  // BroadcastChannel keeps two tabs on the same browser working even if the
  // shared signaling service is temporarily reconnecting.
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    localChannel = new BroadcastChannel(channelKey(roomId, token))
    localChannel.onmessage = (event) => receive(event.data)
  }

  if (signalingUrl) {
    try {
      const url = new URL(signalingUrl)
      url.searchParams.set('room', roomId)
      url.searchParams.set('token', token)
      url.searchParams.set('participant', participantId)
      socket = new WebSocket(url)
      socket.onopen = () => onStatus('connected')
      socket.onmessage = (event) => {
        try { receive(JSON.parse(event.data)) } catch { /* Ignore malformed signaling messages. */ }
      }
      socket.onerror = () => onStatus('error')
      socket.onclose = () => !closed && onStatus('disconnected')
      onStatus('connecting')
    } catch {
      onStatus('error')
    }
  } else if (supabase) {
    // Supabase Realtime Broadcast is the fastest cross-device signaling path.
    // The unguessable booking token is part of the private channel name.
    realtimeChannel = supabase
      .channel(channelKey(roomId, token), {
        config: {
          broadcast: { self: false, ack: true },
          presence: { key: participantId },
        },
      })
      .on('broadcast', { event: 'signal' }, ({ payload }) => receive(payload))
      .on('presence', { event: 'sync' }, () => {
        const count = Object.values(realtimeChannel.presenceState()).reduce((total, entries) => total + entries.length, 0)
        onMessage({ type: 'presence', sender: 'classroom-presence', count: Math.max(1, count) })
      })
      .subscribe((status) => {
        if (closed) return
        if (status === 'SUBSCRIBED') {
          realtimeReady = true
          realtimeChannel.track({ participantId, joinedAt: new Date().toISOString() }).catch(() => {})
          flushRealtimeQueue()
          onStatus('connected')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          realtimeReady = false
          onStatus(databaseEnabled ? 'fallback' : 'error')
        } else if (status === 'CLOSED') {
          realtimeReady = false
          onStatus(databaseEnabled ? 'fallback' : 'disconnected')
        }
      })
    onStatus('connecting')
  } else if (localChannel) {
    onStatus('local')
  } else {
    onStatus('unavailable')
  }

  // A separate Postgres Changes subscription and short HTTPS poll keep offers,
  // answers and ICE candidates moving when Realtime WebSockets are blocked.
  if (databaseEnabled && typeof window !== 'undefined') {
    databaseChannel = supabase
      .channel(`${channelKey(roomId, token)}-durable-${participantId.slice(-8)}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'classroom_signals',
        filter: `booking_id=eq.${bookingId}`,
      }, ({ new: row }) => receiveDatabaseRow(row))
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Polling uses ordinary HTTPS and intentionally remains active.
        }
      })
    void pollDatabaseSignals()
    databasePollTimer = window.setInterval(pollDatabaseSignals, 1500)
  }

  return {
    send(payload) {
      if (closed) return
      const message = {
        ...payload,
        sender: participantId,
        messageId: `${participantId}-${crypto.randomUUID()}`,
        sentAt: Date.now(),
      }
      localChannel?.postMessage(message)
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
      else if (realtimeChannel && !postRealtime(message)) {
        queuedMessages.push(message)
        if (queuedMessages.length > MAX_QUEUED_MESSAGES) queuedMessages.shift()
      }
      postDatabaseSignal(message)
    },
    close() {
      closed = true
      realtimeReady = false
      socket?.close()
      localChannel?.close()
      if (databasePollTimer) window.clearInterval(databasePollTimer)
      if (realtimeChannel && supabase) supabase.removeChannel(realtimeChannel)
      if (databaseChannel && supabase) supabase.removeChannel(databaseChannel)
    },
    mode: signalingUrl ? 'websocket' : supabase ? 'supabase-hybrid' : 'local',
  }
}
