import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Check,
  Circle,
  Copy,
  Download,
  Eraser,
  FileUp,
  Languages,
  Lock,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  MoreVertical,
  Paperclip,
  PenTool,
  PhoneOff,
  Presentation,
  Radio,
  Send,
  ShieldCheck,
  Trash2,
  Type,
  Unlock,
  Users,
  Video,
  WifiOff,
  X,
} from 'lucide-react'
import { getAccountById } from './auth.js'
import { getClassroomAccess } from './bookings.js'
import { createClassroomTransport } from './classroomTransport.js'
import { chatLanguages, translateChatText } from './chatTranslation.js'

const MAX_FILE_SIZE = 8 * 1024 * 1024
const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

function formatTime(time) {
  return new Date(`2026-01-01T${time}`).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })
}

function drawPath(context, path, width, height) {
  if (!path) return
  if (path.tool === 'text' && path.text && path.point) {
    context.save()
    context.fillStyle = path.color || '#ff4f87'
    context.font = `700 ${path.fontSize || 24}px Arial, sans-serif`
    context.textBaseline = 'top'
    context.fillText(path.text, path.point.x * width, path.point.y * height, width * 0.7)
    context.restore()
    return
  }
  if (!path.points?.length) return
  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.lineWidth = path.width || 4
  context.strokeStyle = path.color || '#ff4f87'
  context.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over'
  context.globalAlpha = path.tool === 'highlighter' ? 0.32 : 1
  context.beginPath()
  path.points.forEach((point, index) => {
    const x = point.x * width
    const y = point.y * height
    if (index === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  })
  context.stroke()
  context.restore()
}

function AccessDenied({ access, onExit }) {
  return (
    <main className="classroom-gate">
      <section>
        <span><ShieldCheck size={34} /></span>
        <small>Private booked classroom</small>
        <h1>The classroom isn’t open yet.</h1>
        <p>{access.reason}</p>
        {access.startsAt && <div><strong>{access.startsAt.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</strong><span>{access.startsAt.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}</span></div>}
        <button onClick={onExit}><ArrowLeft size={17} /> Return to dashboard</button>
      </section>
    </main>
  )
}

export default function OnlineClassroom({ booking, account, onExit }) {
  const access = getClassroomAccess(booking.id, account)
  const roomBooking = access.booking || booking
  const studentAccount = getAccountById(roomBooking.studentId)
  const learner = studentAccount?.children?.find((item) => item.id === roomBooking.learnerId) || studentAccount?.child
  const teacher = getAccountById(roomBooking.teacherId)
  const participantName = account.role === 'student' ? learner?.name : account.fullName || account.parentName || 'Participant'
  const participantIdRef = useRef(`${account.id}-${crypto.randomUUID().slice(0, 8)}`)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const sharedScreenVideoRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const annotationCanvasRef = useRef(null)
  const stageRef = useRef(null)
  const localStreamRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const screenStreamRef = useRef(null)
  const peerRef = useRef(null)
  const transportRef = useRef(null)
  const pathsRef = useRef([])
  const currentPathRef = useRef(null)
  const pendingIceRef = useRef([])
  const annotationPermissionRef = useRef(false)
  const [joined, setJoined] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const [mediaError, setMediaError] = useState('')
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false)
  const [presentedFile, setPresentedFile] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('waiting')
  const [participantCount, setParticipantCount] = useState(1)
  const [annotationMode, setAnnotationMode] = useState(false)
  const [annotationTool, setAnnotationTool] = useState('pen')
  const [annotationColor, setAnnotationColor] = useState('#ff4f87')
  const [studentAnnotationAllowed, setStudentAnnotationAllowed] = useState(false)
  const [textEditor, setTextEditor] = useState(null)
  const [textDraft, setTextDraft] = useState('')
  const [files, setFiles] = useState([])
  const [sidebarTab, setSidebarTab] = useState('chat')
  const [chatMessages, setChatMessages] = useState([])
  const [chatDraft, setChatDraft] = useState('')
  const [chatLanguage, setChatLanguage] = useState('en')
  const [chatTranslations, setChatTranslations] = useState({})
  const [translatingMessageId, setTranslatingMessageId] = useState('')
  const [chatError, setChatError] = useState('')
  const [fileError, setFileError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const setVideoStream = (element, stream) => {
    if (element && element.srcObject !== stream) element.srcObject = stream || null
  }

  useEffect(() => {
    annotationPermissionRef.current = studentAnnotationAllowed
  }, [studentAnnotationAllowed])

  const requestMedia = async () => {
    setMediaError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError('Camera and microphone access requires a modern browser over HTTPS.')
      return null
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = stream
      localStreamRef.current = stream
      setVideoStream(localVideoRef.current, stream)
      setMediaReady(true)
      setMicOn(true)
      setCameraOn(true)
      return stream
    } catch (error) {
      const message = error.name === 'NotAllowedError'
        ? 'Camera or microphone permission was denied. Allow access in your browser settings and try again.'
        : 'Camera and microphone could not be started. Check that another application is not using them.'
      setMediaError(message)
      return null
    }
  }

  const redrawAnnotations = () => {
    const canvas = annotationCanvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    pathsRef.current.forEach((path) => drawPath(context, path, canvas.width, canvas.height))
  }

  useEffect(() => {
    if (!joined) return undefined
    const startedAt = Date.now()
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [joined])

  useEffect(() => {
    setVideoStream(localVideoRef.current, cameraStreamRef.current)
    setVideoStream(sharedScreenVideoRef.current, screenStreamRef.current)
    setVideoStream(remoteVideoRef.current, remoteStreamRef.current)
  }, [joined, screenSharing, remoteScreenSharing])

  useEffect(() => {
    if (!joined || !access.allowed) return undefined
    let active = true

    const ensurePeer = () => {
      if (peerRef.current) return peerRef.current
      const peer = new RTCPeerConnection(rtcConfiguration)
      peerRef.current = peer
      localStreamRef.current?.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current))
      peer.onicecandidate = (event) => {
        if (event.candidate) transportRef.current?.send({ type: 'ice', candidate: event.candidate })
      }
      peer.ontrack = (event) => {
        const stream = event.streams[0]
        if (stream) {
          remoteStreamRef.current = stream
          setVideoStream(remoteVideoRef.current, stream)
        }
      }
      peer.onconnectionstatechange = () => {
        const status = peer.connectionState
        if (status === 'connected') setConnectionStatus('connected')
        else if (['failed', 'disconnected', 'closed'].includes(status)) setConnectionStatus(status)
        else setConnectionStatus('connecting')
      }
      return peer
    }

    const flushIce = async (peer) => {
      if (!peer.remoteDescription) return
      const candidates = pendingIceRef.current.splice(0)
      for (const candidate of candidates) {
        try { await peer.addIceCandidate(candidate) } catch { /* A stale ICE candidate can be ignored. */ }
      }
    }

    const handleMessage = async (message) => {
      if (!active) return
      if (message.type === 'presence') {
        setParticipantCount(Math.max(1, Number(message.count) || 1))
        return
      }
      if (message.type === 'join-request' && account.role === 'teacher') {
        transportRef.current?.send({ type: 'annotation-permission', allowed: annotationPermissionRef.current })
        const peer = ensurePeer()
        if (peer.connectionState === 'connected' || peer.signalingState !== 'stable') return
        try {
          const offer = await peer.createOffer()
          await peer.setLocalDescription(offer)
          transportRef.current?.send({ type: 'offer', description: peer.localDescription })
        } catch {
          setConnectionStatus('failed')
        }
        return
      }
      if (message.type === 'offer' && account.role !== 'teacher') {
        const peer = ensurePeer()
        try {
          await peer.setRemoteDescription(message.description)
          await flushIce(peer)
          const answer = await peer.createAnswer()
          await peer.setLocalDescription(answer)
          transportRef.current?.send({ type: 'answer', description: peer.localDescription })
        } catch {
          setConnectionStatus('failed')
        }
        return
      }
      if (message.type === 'answer' && account.role === 'teacher') {
        const peer = ensurePeer()
        try {
          await peer.setRemoteDescription(message.description)
          await flushIce(peer)
        } catch {
          setConnectionStatus('failed')
        }
        return
      }
      if (message.type === 'ice' && message.candidate) {
        const peer = ensurePeer()
        if (peer.remoteDescription) {
          try { await peer.addIceCandidate(message.candidate) } catch { /* Ignore stale candidates. */ }
        } else pendingIceRef.current.push(message.candidate)
        return
      }
      if (message.type === 'annotation-permission') {
        const allowed = Boolean(message.allowed)
        setStudentAnnotationAllowed(allowed)
        if (!allowed && account.role === 'student') {
          setAnnotationMode(false)
          setTextEditor(null)
        }
        return
      }
      if (message.type === 'chat-message' && message.message) {
        setChatMessages((current) => current.some((item) => item.id === message.message.id) ? current : [...current, message.message])
        setSidebarTab('chat')
        return
      }
      if (message.type === 'screen-state') {
        setRemoteScreenSharing(Boolean(message.active))
        if (message.active) setPresentedFile(null)
        return
      }
      if (message.type === 'presentation-file') {
        setPresentedFile(message.file || null)
        return
      }
      if (message.type === 'annotation-path' && message.path) {
        pathsRef.current.push(message.path)
        redrawAnnotations()
        return
      }
      if (message.type === 'annotation-clear') {
        pathsRef.current = []
        redrawAnnotations()
        return
      }
      if (message.type === 'classroom-file' && message.file) {
        setFiles((current) => current.some((file) => file.id === message.file.id) ? current : [...current, message.file])
      }
    }

    transportRef.current = createClassroomTransport({
      roomId: roomBooking.classroomId,
      token: roomBooking.classroomToken,
      participantId: participantIdRef.current,
      onMessage: handleMessage,
      onStatus: (status) => {
        if (status === 'connected' || status === 'local') {
          setConnectionStatus('waiting')
          if (account.role !== 'teacher') transportRef.current?.send({ type: 'join-request', role: account.role })
        } else setConnectionStatus(status)
      },
    })
    ensurePeer()

    const joinReminder = account.role !== 'teacher'
      ? window.setInterval(() => {
          if (peerRef.current?.connectionState !== 'connected') transportRef.current?.send({ type: 'join-request', role: account.role })
        }, 3000)
      : null

    return () => {
      active = false
      if (joinReminder) window.clearInterval(joinReminder)
      transportRef.current?.close()
      transportRef.current = null
      peerRef.current?.close()
      peerRef.current = null
      pendingIceRef.current = []
    }
  }, [joined, access.allowed, account.role, roomBooking.classroomId, roomBooking.classroomToken])

  useEffect(() => {
    if (!joined) return undefined
    const canvas = annotationCanvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return undefined
    const resize = () => {
      const bounds = stage.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(bounds.width * ratio))
      canvas.height = Math.max(1, Math.floor(bounds.height * ratio))
      redrawAnnotations()
    }
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    if (observer) observer.observe(stage)
    else window.addEventListener('resize', resize)
    resize()
    return () => {
      observer?.disconnect()
      if (!observer) window.removeEventListener('resize', resize)
    }
  }, [joined])

  useEffect(() => () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    screenStreamRef.current?.getTracks().forEach((track) => track.stop())
    transportRef.current?.close()
    peerRef.current?.close()
  }, [])

  if (!access.allowed) return <AccessDenied access={access} onExit={onExit} />

  const joinClass = async () => {
    const stream = localStreamRef.current || await requestMedia()
    if (!stream) return
    setJoined(true)
  }

  const toggleMic = () => {
    const next = !micOn
    cameraStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = next })
    setMicOn(next)
  }

  const toggleCamera = () => {
    const next = !cameraOn
    cameraStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next })
    setCameraOn(next)
  }

  const stopScreenShare = async () => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop())
    screenStreamRef.current = null
    const cameraTrack = cameraStreamRef.current?.getVideoTracks()[0]
    const sender = peerRef.current?.getSenders().find((item) => item.track?.kind === 'video')
    if (sender && cameraTrack) await sender.replaceTrack(cameraTrack)
    setVideoStream(sharedScreenVideoRef.current, null)
    transportRef.current?.send({ type: 'screen-state', active: false })
    setScreenSharing(false)
  }

  const toggleScreenShare = async () => {
    if (screenSharing) {
      await stopScreenShare()
      return
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setMediaError('Screen sharing is not supported by this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      const screenTrack = stream.getVideoTracks()[0]
      screenStreamRef.current = stream
      const sender = peerRef.current?.getSenders().find((item) => item.track?.kind === 'video')
      if (sender) await sender.replaceTrack(screenTrack)
      setVideoStream(sharedScreenVideoRef.current, stream)
      setPresentedFile(null)
      transportRef.current?.send({ type: 'screen-state', active: true })
      setScreenSharing(true)
      screenTrack.onended = stopScreenShare
    } catch (error) {
      if (error.name !== 'NotAllowedError') setMediaError('Screen sharing could not be started.')
    }
  }

  const leaveClass = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    screenStreamRef.current?.getTracks().forEach((track) => track.stop())
    transportRef.current?.send({ type: 'leave' })
    transportRef.current?.close()
    peerRef.current?.close()
    onExit()
  }

  const pointerPosition = (event) => {
    const canvas = annotationCanvasRef.current
    const bounds = canvas.getBoundingClientRect()
    return { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height }
  }

  const startDrawing = (event) => {
    if (!annotationMode || (account.role === 'student' && !studentAnnotationAllowed)) return
    const point = pointerPosition(event)
    if (annotationTool === 'text') {
      setTextEditor(point)
      setTextDraft('')
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    currentPathRef.current = {
      id: crypto.randomUUID(),
      tool: annotationTool,
      color: annotationColor,
      width: annotationTool === 'highlighter' ? 16 : annotationTool === 'eraser' ? 24 : 5,
      points: [point],
    }
  }

  const continueDrawing = (event) => {
    if (!currentPathRef.current || !annotationMode || (account.role === 'student' && !studentAnnotationAllowed)) return
    currentPathRef.current.points.push(pointerPosition(event))
    redrawAnnotations()
    const canvas = annotationCanvasRef.current
    const context = canvas?.getContext('2d')
    if (canvas && context) drawPath(context, currentPathRef.current, canvas.width, canvas.height)
  }

  const finishDrawing = () => {
    const path = currentPathRef.current
    if (!path) return
    pathsRef.current.push(path)
    currentPathRef.current = null
    redrawAnnotations()
    transportRef.current?.send({ type: 'annotation-path', path })
  }

  const clearAnnotations = () => {
    pathsRef.current = []
    currentPathRef.current = null
    redrawAnnotations()
    transportRef.current?.send({ type: 'annotation-clear' })
  }

  const commitTextAnnotation = () => {
    const text = textDraft.trim()
    if (!text || !textEditor) {
      setTextEditor(null)
      setTextDraft('')
      return
    }
    const path = { id: crypto.randomUUID(), tool: 'text', text: text.slice(0, 120), color: annotationColor, fontSize: 24, point: textEditor }
    pathsRef.current.push(path)
    redrawAnnotations()
    transportRef.current?.send({ type: 'annotation-path', path })
    setTextEditor(null)
    setTextDraft('')
  }

  const toggleStudentAnnotationPermission = () => {
    if (account.role !== 'teacher') return
    const allowed = !annotationPermissionRef.current
    annotationPermissionRef.current = allowed
    setStudentAnnotationAllowed(allowed)
    transportRef.current?.send({ type: 'annotation-permission', allowed })
  }

  const uploadFile = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setFileError('')
    if (file.size > MAX_FILE_SIZE) {
      setFileError('Lesson files must be under 8 MB for live sharing.')
      return
    }
    const reader = new FileReader()
    reader.onerror = () => setFileError('The selected file could not be read.')
    reader.onload = () => {
      const entry = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl: reader.result,
        sender: participantName,
      }
      setFiles((current) => [...current, entry])
      transportRef.current?.send({ type: 'classroom-file', file: entry })
      if (account.role === 'teacher') {
        setPresentedFile(entry)
        transportRef.current?.send({ type: 'presentation-file', file: entry })
      }
    }
    reader.readAsDataURL(file)
  }

  const presentFile = (file) => {
    setPresentedFile(file)
    transportRef.current?.send({ type: 'presentation-file', file })
  }

  const sendChatMessage = (event) => {
    event.preventDefault()
    const text = chatDraft.trim()
    if (!text) return
    if (text.length > 500) {
      setChatError('Chat messages must be under 500 characters.')
      return
    }
    const message = { id: crypto.randomUUID(), sender: participantName, role: account.role, text, createdAt: new Date().toISOString() }
    setChatMessages((current) => [...current, message])
    transportRef.current?.send({ type: 'chat-message', message })
    setChatDraft('')
    setChatError('')
  }

  const translateMessage = async (message) => {
    setTranslatingMessageId(message.id)
    setChatError('')
    try {
      const translated = await translateChatText(message.text, chatLanguage)
      setChatTranslations((current) => ({ ...current, [`${message.id}:${chatLanguage}`]: translated }))
    } catch {
      setChatError('This message could not be translated. Try again in a moment.')
    } finally {
      setTranslatingMessageId('')
    }
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomBooking.classroomId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const formatElapsed = () => `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`
  const connectionLabel = connectionStatus === 'connected' ? 'Live peer connected' : connectionStatus === 'local' ? 'Local classroom ready' : connectionStatus === 'error' || connectionStatus === 'failed' ? 'Connection needs attention' : 'Waiting for participant'

  if (!joined) {
    return (
      <main className="classroom-prejoin">
        <div className="classroom-prejoin__top"><button onClick={onExit}><ArrowLeft size={17} /> Dashboard</button><span><ShieldCheck size={15} /> Private booking classroom</span></div>
        <div className="classroom-prejoin__grid">
          <section className="prejoin-preview">
            <video ref={localVideoRef} autoPlay muted playsInline />
            {!mediaReady && <div><Camera size={35} /><strong>Camera preview</strong><span>Enable your devices before joining.</span></div>}
            <div className="prejoin-preview__controls"><button className={micOn ? 'active' : ''} onClick={toggleMic} disabled={!mediaReady}>{micOn ? <Mic size={19} /> : <MicOff size={19} />}</button><button className={cameraOn ? 'active' : ''} onClick={toggleCamera} disabled={!mediaReady}>{cameraOn ? <Camera size={19} /> : <CameraOff size={19} />}</button></div>
          </section>
          <section className="prejoin-details">
            <span className="classroom-brand"><Presentation size={20} /> TutorPro English Classroom</span>
            <small>{account.role === 'teacher' ? 'Teacher room' : account.role === 'admin' ? 'Administrator access' : 'Booked student room'}</small>
            <h1>Ready for class, {participantName}?</h1>
            <p>{teacher?.fullName} with {learner?.name} · {new Date(`${roomBooking.date}T12:00`).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })} at {formatTime(roomBooking.time)}</p>
            <div className="prejoin-room-id"><span><ShieldCheck size={16} /></span><div><small>Unique classroom ID</small><strong>{roomBooking.classroomId}</strong></div><button onClick={copyRoomId}>{copied ? <Check size={16} /> : <Copy size={16} />}</button></div>
            {mediaError && <div className="classroom-error"><WifiOff size={17} /> {mediaError}</div>}
            {!mediaReady ? <button className="classroom-main-button" onClick={requestMedia}><Camera size={18} /> Enable camera & microphone</button> : <button className="classroom-main-button" onClick={joinClass}><Video size={18} /> Enter private classroom</button>}
            <p className="prejoin-privacy"><ShieldCheck size={14} /> Only this booking’s teacher, student and administrator can access this room.</p>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className={`online-classroom ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <header className="classroom-topbar">
        <div className="classroom-topbar__brand"><span><Presentation size={21} /></span><div><strong>TutorPro English Classroom</strong><small>{roomBooking.classroomId}</small></div></div>
        <div className="classroom-session-state"><i className={connectionStatus === 'connected' ? 'live' : ''} /><span>{connectionLabel}</span><strong>{formatElapsed()}</strong></div>
        <div className="classroom-topbar__actions"><button onClick={copyRoomId}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Room ID'}</button><button onClick={() => setSidebarOpen((open) => !open)}><Users size={16} /> {participantCount}<MoreVertical size={16} /></button></div>
      </header>

      <div className="classroom-workspace">
        <section className="classroom-stage">
          <div className="classroom-video-rail">
            <div className="classroom-camera-tile classroom-camera-tile--remote">
              {!remoteScreenSharing && <video ref={remoteVideoRef} autoPlay playsInline />}
              {connectionStatus !== 'connected' && <div className="camera-tile-waiting"><Radio size={22} /><span>Waiting for {account.role === 'teacher' ? learner?.name : teacher?.fullName}</span></div>}
              <span>{account.role === 'teacher' ? learner?.name || 'Student' : teacher?.fullName || 'Teacher'}</span>
            </div>
            <div className="classroom-camera-tile classroom-camera-tile--local">
              <video ref={localVideoRef} autoPlay muted playsInline />
              <span>You · {participantName}</span>
              {!cameraOn && <CameraOff size={24} />}
            </div>
            <div className="video-rail-status"><i className={connectionStatus === 'connected' ? 'online' : ''} /><span>{connectionStatus === 'connected' ? 'Audio & video connected' : 'Waiting for connection'}</span></div>
          </div>

          <div className="classroom-lesson-board" ref={stageRef}>
            {screenSharing ? <video className="classroom-presentation-video" ref={sharedScreenVideoRef} autoPlay muted playsInline /> : remoteScreenSharing ? <video className="classroom-presentation-video" ref={remoteVideoRef} autoPlay playsInline /> : presentedFile ? <div className="classroom-file-presentation">{presentedFile.type?.startsWith('image/') ? <img src={presentedFile.dataUrl} alt={presentedFile.name} /> : presentedFile.type === 'application/pdf' ? <object data={presentedFile.dataUrl} type="application/pdf" aria-label={presentedFile.name}><div className="pdf-fallback"><Presentation size={42} /><strong>{presentedFile.name}</strong><span>This browser cannot embed the PDF.</span><a href={presentedFile.dataUrl} download={presentedFile.name}>Open PDF</a></div></object> : <div><Presentation size={54} /><strong>{presentedFile.name}</strong><span>Use the download button to open this lesson file.</span></div>}<small><Paperclip size={13} /> {presentedFile.name}</small></div> : <div className="classroom-lesson-placeholder"><span><Presentation size={49} /></span><small>Interactive lesson workspace</small><h2>{roomBooking.focus}</h2><p>The teacher can share a screen or present an uploaded lesson file here. Annotation tools work directly on this board.</p><div><i>ABC</i><i>Vocabulary</i><i>Grammar</i><i>Speaking</i></div></div>}
            <canvas
              ref={annotationCanvasRef}
              className={annotationMode ? 'annotation-canvas active' : 'annotation-canvas'}
              onPointerDown={startDrawing}
              onPointerMove={continueDrawing}
              onPointerUp={finishDrawing}
              onPointerCancel={finishDrawing}
            />
            {textEditor && <div className="annotation-text-editor" style={{ left: `${textEditor.x * 100}%`, top: `${textEditor.y * 100}%` }}><input autoFocus value={textDraft} onChange={(event) => setTextDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') commitTextAnnotation(); if (event.key === 'Escape') setTextEditor(null) }} placeholder="Type on the lesson…" maxLength="120" /><button onClick={commitTextAnnotation}><Check size={15} /></button><button onClick={() => setTextEditor(null)}><X size={15} /></button></div>}
            {annotationMode && <div className="annotation-toolbar"><button className={annotationTool === 'pen' ? 'active' : ''} onClick={() => setAnnotationTool('pen')} title="Pen"><PenTool size={17} /></button><button className={annotationTool === 'highlighter' ? 'active' : ''} onClick={() => setAnnotationTool('highlighter')} title="Highlighter"><Circle size={17} /></button><button className={annotationTool === 'text' ? 'active' : ''} onClick={() => setAnnotationTool('text')} title="Text"><Type size={17} /></button><button className={annotationTool === 'eraser' ? 'active' : ''} onClick={() => setAnnotationTool('eraser')} title="Eraser"><Eraser size={17} /></button><label title="Ink colour"><input type="color" value={annotationColor} onChange={(event) => setAnnotationColor(event.target.value)} /></label><button onClick={clearAnnotations} title="Clear annotations"><Trash2 size={17} /></button><button onClick={() => setAnnotationMode(false)} title="Close annotation"><X size={17} /></button></div>}
            <div className="classroom-stage__badge"><ShieldCheck size={13} /> Private lesson board</div>
          </div>
        </section>

        {sidebarOpen && <aside className="classroom-sidebar">
          <div className="classroom-sidebar__heading"><div><MessageCircle size={18} /><span><strong>Classroom panel</strong><small>Chat, translation and lesson files</small></span></div><button onClick={() => setSidebarOpen(false)}><X size={17} /></button></div>
          <div className="classroom-sidebar-tabs"><button className={sidebarTab === 'chat' ? 'active' : ''} onClick={() => setSidebarTab('chat')}><MessageCircle size={15} /> Chat</button><button className={sidebarTab === 'files' ? 'active' : ''} onClick={() => setSidebarTab('files')}><Paperclip size={15} /> Files <i>{files.length}</i></button></div>
          {sidebarTab === 'chat' ? <div className="classroom-chat">
            <div className="chat-translation-bar"><Languages size={15} /><span>Translate to</span><select value={chatLanguage} onChange={(event) => setChatLanguage(event.target.value)}>{chatLanguages.map((language) => <option value={language.code} key={language.code}>{language.label}</option>)}</select></div>
            <div className="classroom-chat-messages">{chatMessages.length ? chatMessages.map((message) => { const translationKey = `${message.id}:${chatLanguage}`; const translated = chatTranslations[translationKey]; const own = message.sender === participantName; return <div className={own ? 'chat-message own' : 'chat-message'} key={message.id}><div><strong>{message.sender}</strong><small>{new Date(message.createdAt).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}</small></div><p>{message.text}</p>{translated && <p className="chat-translation"><Languages size={12} /> {translated}</p>}{chatLanguage !== 'en' && !own && <button onClick={() => translateMessage(message)} disabled={translatingMessageId === message.id}>{translatingMessageId === message.id ? 'Translating…' : 'Translate'}</button>}</div> }) : <div className="chat-empty"><MessageCircle size={27} /><strong>Class chat is ready</strong><span>Messages are private to this booked classroom.</span></div>}</div>
            {chatError && <div className="classroom-file-error">{chatError}</div>}
            <form className="classroom-chat-form" onSubmit={sendChatMessage}><input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="Write a message…" maxLength="500" /><button type="submit" disabled={!chatDraft.trim()}><Send size={17} /></button></form>
          </div> : <div className="classroom-files-panel">
            <label className="classroom-file-upload"><FileUp size={22} /><strong>Upload lesson material</strong><span>PDF, image, document or slides · max 8 MB</span><input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*" onChange={uploadFile} /></label>
            {fileError && <div className="classroom-file-error">{fileError}</div>}
            <div className="classroom-file-list">{files.length ? files.map((file) => <div key={file.id}><span><Paperclip size={16} /></span><div><strong>{file.name}</strong><small>{file.sender} · {(file.size / 1024).toFixed(0)} KB</small></div>{account.role !== 'student' && <button onClick={() => presentFile(file)} title="Present on lesson board"><Presentation size={16} /></button>}<a href={file.dataUrl} download={file.name} title="Download"><Download size={16} /></a></div>) : <div className="classroom-file-empty"><FileUp size={25} /><span>No lesson files shared yet.</span></div>}</div>
          </div>}
          <div className="classroom-people"><span><Users size={17} /> Participants</span><div><i className="online" /><strong>{participantName}</strong><small>{account.role}</small></div>{connectionStatus === 'connected' && <div><i className="online" /><strong>{account.role === 'teacher' ? learner?.name : teacher?.fullName}</strong><small>{account.role === 'teacher' ? 'student' : 'teacher'}</small></div>}{account.role === 'teacher' && <button className={studentAnnotationAllowed ? 'allowed' : ''} onClick={toggleStudentAnnotationPermission}>{studentAnnotationAllowed ? <Unlock size={15} /> : <Lock size={15} />}{studentAnnotationAllowed ? 'Student can annotate' : 'Allow student annotation'}</button>}{account.role === 'student' && <div className="student-annotation-state">{studentAnnotationAllowed ? <Unlock size={14} /> : <Lock size={14} />}<span>{studentAnnotationAllowed ? 'Teacher allowed annotation' : 'Annotation requires teacher permission'}</span></div>}</div>
        </aside>}
      </div>

      <footer className="classroom-controls">
        <div><button className={micOn ? 'active' : 'off'} onClick={toggleMic}>{micOn ? <Mic size={20} /> : <MicOff size={20} />}<span>{micOn ? 'Mute' : 'Unmute'}</span></button><button className={cameraOn ? 'active' : 'off'} onClick={toggleCamera} disabled={screenSharing}>{cameraOn ? <Camera size={20} /> : <CameraOff size={20} />}<span>{cameraOn ? 'Camera' : 'Start video'}</span></button></div>
        <div><button className={screenSharing ? 'active sharing' : ''} onClick={toggleScreenShare}><MonitorUp size={20} /><span>{screenSharing ? 'Stop share' : 'Share screen'}</span></button><button className={annotationMode ? 'active annotation' : ''} onClick={() => setAnnotationMode((active) => !active)} disabled={account.role === 'student' && !studentAnnotationAllowed} title={account.role === 'student' && !studentAnnotationAllowed ? 'The teacher must allow annotation first' : 'Annotate the lesson board'}><PenTool size={20} /><span>{account.role === 'student' && !studentAnnotationAllowed ? 'Permission needed' : 'Annotate'}</span></button>{account.role === 'teacher' && <button className={studentAnnotationAllowed ? 'active permission' : ''} onClick={toggleStudentAnnotationPermission}>{studentAnnotationAllowed ? <Unlock size={20} /> : <Lock size={20} />}<span>{studentAnnotationAllowed ? 'Revoke drawing' : 'Allow student'}</span></button>}<label className="control-file-button"><FileUp size={20} /><span>Share file</span><input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*" onChange={uploadFile} /></label><button onClick={() => setSidebarOpen((open) => !open)}><Users size={20} /><span>Chat & files</span></button></div>
        <button className="leave-class-button" onClick={leaveClass}><PhoneOff size={21} /><span>Leave class</span></button>
      </footer>
    </main>
  )
}
