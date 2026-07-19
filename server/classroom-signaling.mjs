import { WebSocketServer, WebSocket } from 'ws'

const port = Number(process.env.PORT || 8787)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean)
const rooms = new Map()

const server = new WebSocketServer({ port, maxPayload: 12 * 1024 * 1024 })

function roomPeers(key) {
  if (!rooms.has(key)) rooms.set(key, new Set())
  return rooms.get(key)
}

function send(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload))
}

function broadcast(key, sender, payload) {
  roomPeers(key).forEach((socket) => {
    if (socket !== sender) send(socket, payload)
  })
}

server.on('connection', (socket, request) => {
  const origin = request.headers.origin || ''
  if (allowedOrigins.length && !allowedOrigins.includes(origin)) {
    socket.close(1008, 'Origin not allowed')
    return
  }

  const url = new URL(request.url, `http://${request.headers.host}`)
  const room = url.searchParams.get('room') || ''
  const token = url.searchParams.get('token') || ''
  const participant = url.searchParams.get('participant') || crypto.randomUUID()
  if (!/^TP-[A-Z0-9-]{8,40}$/i.test(room) || token.length < 24) {
    socket.close(1008, 'Invalid classroom credentials')
    return
  }

  const key = `${room}:${token}`
  const peers = roomPeers(key)
  if (peers.size >= 4) {
    socket.close(1013, 'Classroom is full')
    return
  }

  socket.isAlive = true
  socket.messageCount = 0
  socket.messageWindow = Date.now()
  socket.participant = participant
  peers.add(socket)
  broadcast(key, socket, { type: 'presence', action: 'joined', participant, count: peers.size })
  send(socket, { type: 'presence', action: 'ready', participant, count: peers.size })

  socket.on('pong', () => { socket.isAlive = true })
  socket.on('message', (data, isBinary) => {
    const now = Date.now()
    if (now - socket.messageWindow > 60_000) {
      socket.messageWindow = now
      socket.messageCount = 0
    }
    socket.messageCount += 1
    if (socket.messageCount > 500) {
      socket.close(1008, 'Message rate exceeded')
      return
    }
    if (isBinary) return
    try {
      const payload = JSON.parse(data.toString())
      if (!payload || typeof payload.type !== 'string') return
      broadcast(key, socket, { ...payload, sender: participant })
    } catch {
      send(socket, { type: 'error', message: 'Invalid signaling message' })
    }
  })

  socket.on('close', () => {
    peers.delete(socket)
    broadcast(key, socket, { type: 'presence', action: 'left', participant, count: peers.size })
    if (!peers.size) rooms.delete(key)
  })
})

const heartbeat = setInterval(() => {
  server.clients.forEach((socket) => {
    if (!socket.isAlive) {
      socket.terminate()
      return
    }
    socket.isAlive = false
    socket.ping()
  })
}, 30_000)

server.on('close', () => clearInterval(heartbeat))
process.stdout.write(`TutorPro English classroom signaling server listening on port ${port}\n`)
