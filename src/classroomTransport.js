import { supabase } from './supabaseClient.js'

const MAX_SEEN_MESSAGES = 500
const MAX_QUEUED_MESSAGES = 120

function channelKey(roomId, token) {
  const safeRoom = String(roomId || '').replace(/[^a-z0-9-]/gi, '').slice(0, 48)
  const safeToken = String(token || '').replace(/[^a-z0-9-]/gi, '').slice(0, 64)
  return `tutorpro-classroom-${safeRoom}-${safeToken}`
}

export function createClassroomTransport({ roomId, token, participantId, onMessage, onStatus }) {
  const signalingUrl = import.meta.env.VITE_CLASSROOM_SIGNALING_URL
  let socket
  let localChannel
  let realtimeChannel
  let realtimeReady = false
  let closed = false
  const queuedMessages = []
  const seenMessages = new Set()

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

  const postRealtime = (message) => {
    if (!realtimeChannel || !realtimeReady || closed) return false
    realtimeChannel.send({ type: 'broadcast', event: 'signal', payload: message }).catch(() => {
      if (!closed) onStatus('error')
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
    // Supabase Realtime Broadcast is the production cross-device signaling
    // path. The unguessable booking token is part of the private channel name.
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
          onStatus('error')
        } else if (status === 'CLOSED') {
          realtimeReady = false
          onStatus('disconnected')
        }
      })
    onStatus('connecting')
  } else if (localChannel) {
    onStatus('local')
  } else {
    onStatus('unavailable')
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
    },
    close() {
      closed = true
      realtimeReady = false
      socket?.close()
      localChannel?.close()
      if (realtimeChannel && supabase) supabase.removeChannel(realtimeChannel)
    },
    mode: signalingUrl ? 'websocket' : supabase ? 'supabase' : 'local',
  }
}
