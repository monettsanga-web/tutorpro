export function createClassroomTransport({ roomId, token, participantId, onMessage, onStatus }) {
  const signalingUrl = import.meta.env.VITE_CLASSROOM_SIGNALING_URL
  let socket
  let channel
  let closed = false

  const receive = (payload) => {
    if (!payload || payload.sender === participantId) return
    onMessage(payload)
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
  } else if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(`tutorpro-classroom-${roomId}-${token}`)
    channel.onmessage = (event) => receive(event.data)
    onStatus('local')
  } else {
    onStatus('unavailable')
  }

  return {
    send(payload) {
      const message = { ...payload, sender: participantId }
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
      else if (channel) channel.postMessage(message)
    },
    close() {
      closed = true
      socket?.close()
      channel?.close()
    },
    mode: signalingUrl ? 'websocket' : 'local',
  }
}
