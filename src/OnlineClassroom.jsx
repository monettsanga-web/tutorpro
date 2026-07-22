import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowLeftRight,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Download,
  Eraser,
  ExternalLink,
  FileUp,
  Globe,
  Languages,
  Lock,
  MessageCircle,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  MonitorUp,
  MousePointer2,
  Move,
  MoreVertical,
  Paperclip,
  Pause,
  PenTool,
  PhoneOff,
  Play,
  Pointer,
  Presentation,
  Radio,
  Redo2,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Smartphone,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Users,
  Video,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react'
import { getAccountById } from './auth.js'
import { getClassroomAccess } from './bookings.js'
import { createClassroomTransport } from './classroomTransport.js'
import { fetchTencentClassroomCredentials, isTencentClassroomConfigured } from './tencentClassroom.js'
import { chatLanguages, translateChatText } from './chatTranslation.js'
import { compressPDF } from './compressPDF.js'
import { CosCloudIcon } from './components/CosCloudIcon.jsx'
import { WhiteboardSlides } from './components/WhiteboardSlides.jsx'
import { isAllowlistedTutorProUrl, validateAndFormatHttpsUrl } from './websitePresenter.js'
import {
  CLASSROOM_FILE_ACCEPT,
  getClassroomFileSizeLimit,
  isClassroomFileAllowed,
  isClassroomStorageAvailable,
  uploadClassroomFile,
  getClassroomFileUrl,
} from './classroomStorage.js'

const MAX_INLINE_SIZE = 8 * 1024 * 1024
const MAX_STORAGE_SIZE = getClassroomFileSizeLimit()
const turnServer = import.meta.env.VITE_CLASSROOM_TURN_URL
  ? {
      urls: import.meta.env.VITE_CLASSROOM_TURN_URL,
      username: import.meta.env.VITE_CLASSROOM_TURN_USERNAME || '',
      credential: import.meta.env.VITE_CLASSROOM_TURN_CREDENTIAL || '',
    }
  : null
const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.qq.com:3478' },
    { urls: 'stun:stun.miwifi.com:3478' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    ...(turnServer ? [turnServer] : []),
  ],
  iceCandidatePoolSize: 10,
}

function formatTime(time) {
  return new Date(`2026-01-01T${time}`).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })
}

function isPdfFile(file) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('The selected file could not be read.'))
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(file)
  })
}

function hitTestAnnotation(path, point, width, height, threshold = 18) {
  if (path.tool === 'text' && path.point) {
    const dx = point.x - path.point.x
    const dy = point.y - path.point.y
    const textWidth = ((path.text?.length || 0) * (path.fontSize || 24) * 0.55) / width
    const textHeight = ((path.fontSize || 24) * 1.2) / height
    return Math.abs(dx) < textWidth / 2 + threshold / width && Math.abs(dy) < textHeight / 2 + threshold / height
  }
  if (path.points?.length) {
    return path.points.some((p) => {
      const dx = (point.x - p.x) * width
      const dy = (point.y - p.y) * height
      return Math.sqrt(dx * dx + dy * dy) < threshold + (path.width || 4) / 2
    })
  }
  return false
}

function drawPath(context, path, width, height, options = {}) {
  if (!path) return
  const { selected, isLivePreview } = options

  if (path.tool === 'text' && (path.text || isLivePreview) && path.point) {
    context.save()
    context.fillStyle = path.color || '#ff4f87'
    context.font = `700 ${path.fontSize || 24}px Arial, sans-serif`
    context.textBaseline = 'top'
    if (isLivePreview) context.globalAlpha = 0.7
    context.fillText(path.text || '', path.point.x * width, path.point.y * height, width * 0.7)
    if (selected) {
      const metrics = context.measureText(path.text || '')
      const textH = (path.fontSize || 24) * 1.2
      context.strokeStyle = '#7048df'
      context.lineWidth = 2
      context.setLineDash([6, 4])
      context.strokeRect(
        path.point.x * width - 4,
        path.point.y * height - 4,
        metrics.width + 8,
        textH + 8,
      )
      context.setLineDash([])
    }
    context.restore()
    return
  }
  if (path.tool === 'pointer' && path.point) {
    context.save()
    context.beginPath()
    context.arc(path.point.x * width, path.point.y * height, 8, 0, Math.PI * 2)
    context.fillStyle = path.color || '#ff4f87'
    context.globalAlpha = 0.8
    context.fill()
    context.strokeStyle = '#fff'
    context.lineWidth = 2
    context.stroke()
    if (path.label) {
      context.fillStyle = '#fff'
      context.font = '600 10px Arial, sans-serif'
      context.textAlign = 'center'
      context.globalAlpha = 1
      context.fillText(path.label, path.point.x * width, path.point.y * height + 20)
    }
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
  if (selected) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    path.points.forEach((p) => {
      const x = p.x * width
      const y = p.y * height
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    })
    context.strokeStyle = '#7048df'
    context.lineWidth = 2
    context.setLineDash([6, 4])
    context.globalCompositeOperation = 'source-over'
    context.globalAlpha = 1
    context.strokeRect(minX - 6, minY - 6, maxX - minX + 12, maxY - minY + 12)
    context.setLineDash([])
  }
  context.restore()
}

function AccessDenied({ access, onExit }) {
  return (
    <main className="classroom-gate">
      <section>
        <span><ShieldCheck size={34} /></span>
        <small>Private booked classroom</small>
        <h1>The classroom isn't open yet.</h1>
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
  const teacherClassroom = account.role === 'teacher' ? account.teacher?.classroom : teacher?.teacher?.classroom
  const useTencentClassroom = teacherClassroom?.platform === 'voov' && isTencentClassroomConfigured()
  const participantName = account.role === 'student' ? learner?.name : account.fullName || account.parentName || 'Participant'
  const participantIdRef = useRef(`${account.id}-${crypto.randomUUID().slice(0, 8)}`)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const localTencentViewRef = useRef(null)
  const remoteTencentViewRef = useRef(null)
  const remoteTencentScreenRef = useRef(null)
  const remoteTencentScreenUserRef = useRef(null)
  const trtcRef = useRef(null)
  const trtcModuleRef = useRef(null)
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
  const undonePathsRef = useRef([])
  const clearedPathsBackupRef = useRef(null)
  const currentPathRef = useRef(null)
  const pendingIceRef = useRef([])
  const offerStartedAtRef = useRef(0)
  const annotationPermissionRef = useRef(false)
  const pointerPermissionRef = useRef(false)
  const liveTextPathRef = useRef(null)
  const selectedPathIdRef = useRef(null)
  const dragOffsetRef = useRef(null)
  const [joined, setJoined] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const [mediaError, setMediaError] = useState('')
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [screenPaused, setScreenPaused] = useState(false)
  const [screenFit, setScreenFit] = useState('fit')
  const [stageFullscreen, setStageFullscreen] = useState(false)
  const [remoteScreenSharing, setRemoteScreenSharing] = useState(false)
  const [remoteScreenPaused, setRemoteScreenPaused] = useState(false)
  const [remoteScreenFit, setRemoteScreenFit] = useState('fit')
  const [presentedFile, setPresentedFile] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('waiting')
  const [signalingStatus, setSignalingStatus] = useState('connecting')
  const [reconnectKey, setReconnectKey] = useState(0)
  const [participantCount, setParticipantCount] = useState(1)
  const [annotationMode, setAnnotationMode] = useState(false)
  const [annotationTool, setAnnotationTool] = useState('pen')
  const [annotationColor, setAnnotationColor] = useState('#ff4f87')
  const [studentAnnotationAllowed, setStudentAnnotationAllowed] = useState(false)
  const [textEditor, setTextEditor] = useState(null)
  const [textDraft, setTextDraft] = useState('')
  const [files, setFiles] = useState([])
  const [cosSlidePage, setCosSlidePage] = useState(1)
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
  const [studentMuted, setStudentMuted] = useState(false)
  const [unmuteRequested, setUnmuteRequested] = useState(false)
  const [remoteMuted, setRemoteMuted] = useState(false)
  const [studentPointerAllowed, setStudentPointerAllowed] = useState(false)
  const [remotePointerPosition, setRemotePointerPosition] = useState(null)
  const [selectedPathId, setSelectedPathId] = useState(null)
  const [presenterUrl, setPresenterUrl] = useState('')
  const [presenterUrlInput, setPresenterUrlInput] = useState('')
  const [presenterUrlDraft, setPresenterUrlDraft] = useState('')
  const [embedError, setEmbedError] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [canUndoClear, setCanUndoClear] = useState(false)

  const setVideoStream = (element, stream) => {
    if (element && element.srcObject !== stream) element.srcObject = stream || null
  }

  useEffect(() => {
    annotationPermissionRef.current = studentAnnotationAllowed
  }, [studentAnnotationAllowed])

  useEffect(() => {
    pointerPermissionRef.current = studentPointerAllowed
  }, [studentPointerAllowed])

  useEffect(() => {
    selectedPathIdRef.current = selectedPathId
  }, [selectedPathId])

  // Hide support widget while classroom is open
  useEffect(() => {
    if (!joined) return undefined
    document.body.classList.add('classroom-active')
    return () => document.body.classList.remove('classroom-active')
  }, [joined])

  useEffect(() => {
    const updateFullscreenState = () => setStageFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', updateFullscreenState)
    return () => document.removeEventListener('fullscreenchange', updateFullscreenState)
  }, [])

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

  const syncUndoState = () => {
    setCanUndo(pathsRef.current.length > 0)
    setCanRedo(undonePathsRef.current.length > 0)
    setCanUndoClear(Boolean(clearedPathsBackupRef.current))
  }

  const redrawAnnotations = () => {
    const canvas = annotationCanvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    pathsRef.current.forEach((path) => {
      const isSelected = path.id === selectedPathIdRef.current
      drawPath(context, path, canvas.width, canvas.height, { selected: isSelected })
    })
    if (liveTextPathRef.current) {
      drawPath(context, liveTextPathRef.current, canvas.width, canvas.height, { isLivePreview: true })
    }
    if (remotePointerPosition) {
      drawPath(context, { tool: 'pointer', point: remotePointerPosition, color: '#4fc3f7', label: account.role === 'teacher' ? (learner?.name || 'Student') : (teacher?.fullName || 'Teacher') }, canvas.width, canvas.height)
    }
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
    if (useTencentClassroom && remoteScreenSharing && trtcRef.current && remoteTencentScreenUserRef.current && remoteTencentScreenRef.current) {
      const { userId, streamType } = remoteTencentScreenUserRef.current
      trtcRef.current.startRemoteVideo({
        userId,
        streamType,
        view: remoteTencentScreenRef.current,
      }).catch(() => {})
    }
  }, [useTencentClassroom, remoteScreenSharing])

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
        else if (['failed', 'disconnected', 'closed'].includes(status)) {
          setConnectionStatus(status)
          if (status !== 'closed' && account.role !== 'teacher') transportRef.current?.send({ type: 'join-request', role: account.role, reconnect: true })
        } else setConnectionStatus('connecting')
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

    const resetPeer = () => {
      if (peerRef.current) peerRef.current.onconnectionstatechange = null
      peerRef.current?.close()
      peerRef.current = null
      pendingIceRef.current = []
      return ensurePeer()
    }

    const sendTeacherOffer = async (forceRestart = false) => {
      let peer = ensurePeer()
      const offerIsStale = offerStartedAtRef.current && Date.now() - offerStartedAtRef.current > 7000
      if (forceRestart || peer.connectionState === 'failed' || peer.connectionState === 'closed' || (peer.signalingState !== 'stable' && offerIsStale)) {
        peer = resetPeer()
      }
      if (peer.connectionState === 'connected' || peer.signalingState !== 'stable') return
      try {
        offerStartedAtRef.current = Date.now()
        const offer = await peer.createOffer({ iceRestart: forceRestart })
        await peer.setLocalDescription(offer)
        transportRef.current?.send({ type: 'offer', description: peer.localDescription })
      } catch {
        setConnectionStatus('failed')
      }
    }

    const handleMessage = async (message) => {
      if (!active) return
      if (message.type === 'presence') {
        const count = Math.max(1, Number(message.count) || 1)
        setParticipantCount(count)
        if (count > 1 && !useTencentClassroom) {
          if (account.role === 'teacher') transportRef.current?.send({ type: 'teacher-ready' })
          else transportRef.current?.send({ type: 'join-request', role: account.role })
        }
        return
      }
      if (message.type === 'teacher-ready' && account.role !== 'teacher' && !useTencentClassroom) {
        transportRef.current?.send({ type: 'join-request', role: account.role })
        return
      }
      if (message.type === 'join-request' && account.role === 'teacher' && !useTencentClassroom) {
        transportRef.current?.send({ type: 'annotation-permission', allowed: annotationPermissionRef.current })
        transportRef.current?.send({ type: 'pointer-permission', allowed: pointerPermissionRef.current })
        if (studentMuted) transportRef.current?.send({ type: 'mute-student', muted: true })
        await sendTeacherOffer(Boolean(message.reconnect))
        return
      }
      if (message.type === 'offer' && account.role !== 'teacher' && !useTencentClassroom) {
        let peer = ensurePeer()
        if (peer.signalingState !== 'stable' || ['failed', 'closed'].includes(peer.connectionState)) peer = resetPeer()
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
      if (message.type === 'answer' && account.role === 'teacher' && !useTencentClassroom) {
        const peer = ensurePeer()
        if (peer.signalingState !== 'have-local-offer') return
        try {
          await peer.setRemoteDescription(message.description)
          offerStartedAtRef.current = 0
          await flushIce(peer)
        } catch {
          setConnectionStatus('failed')
        }
        return
      }
      if (message.type === 'ice' && message.candidate && !useTencentClassroom) {
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
      if (message.type === 'pointer-permission') {
        setStudentPointerAllowed(Boolean(message.allowed))
        if (!message.allowed && account.role === 'student') {
          setAnnotationTool('pen')
        }
        return
      }
      if (message.type === 'mute-student') {
        if (account.role === 'student') {
          const muted = Boolean(message.muted)
          setRemoteMuted(muted)
          if (muted) {
            try {
              if (trtcRef.current) await trtcRef.current.stopLocalAudio()
              else cameraStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = false })
              setMicOn(false)
            } catch { /* Mute failed */ }
          }
        }
        return
      }
      if (message.type === 'unmute-request') {
        if (account.role === 'student') setUnmuteRequested(true)
        return
      }
      if (message.type === 'chat-message' && message.message) {
        setChatMessages((current) => current.some((item) => item.id === message.message.id) ? current : [...current, message.message])
        setSidebarTab('chat')
        return
      }
      if (message.type === 'screen-state') {
        setRemoteScreenSharing(Boolean(message.active))
        setRemoteScreenPaused(Boolean(message.active && message.paused))
        if (['fit', 'fill'].includes(message.fit)) setRemoteScreenFit(message.fit)
        if (message.active) setPresentedFile(null)
        return
      }
      if (message.type === 'presentation-file') {
        setPresentedFile(message.file || null)
        return
      }
      if (message.type === 'slide-page') {
        setCosSlidePage(Number(message.page) || 1)
        return
      }
      if (message.type === 'annotation-path' && message.path) {
        pathsRef.current.push(message.path)
        redrawAnnotations(); syncUndoState()
        return
      }
      if (message.type === 'annotation-undo' && message.pathId) {
        const index = pathsRef.current.findIndex((p) => p.id === message.pathId)
        if (index >= 0) {
          const [removed] = pathsRef.current.splice(index, 1)
          undonePathsRef.current.push(removed)
          redrawAnnotations(); syncUndoState()
        }
        return
      }
      if (message.type === 'annotation-redo' && message.path) {
        const index = undonePathsRef.current.findIndex((p) => p.id === message.path.id)
        if (index >= 0) undonePathsRef.current.splice(index, 1)
        pathsRef.current.push(message.path)
        redrawAnnotations(); syncUndoState()
        return
      }
      if (message.type === 'annotation-clear') {
        clearedPathsBackupRef.current = message.backup || pathsRef.current.slice()
        pathsRef.current = []
        undonePathsRef.current = []
        currentPathRef.current = null
        redrawAnnotations(); syncUndoState()
        return
      }
      if (message.type === 'annotation-undo-clear' && message.backup) {
        pathsRef.current = message.backup
        clearedPathsBackupRef.current = null
        redrawAnnotations(); syncUndoState()
        return
      }
      if (message.type === 'object-select' && message.pathId !== undefined) {
        setSelectedPathId(message.pathId || null)
        redrawAnnotations(); syncUndoState()
        return
      }
      if (message.type === 'pointer-move' && message.point) {
        setRemotePointerPosition(message.point)
        redrawAnnotations(); syncUndoState()
        return
      }
      if (message.type === 'presenter-url' && message.url !== undefined) {
        setPresenterUrl(message.url)
        setPresenterUrlInput(message.url)
        return
      }
      if (message.type === 'classroom-file' && message.file) {
        setFiles((current) => current.some((file) => file.id === message.file.id) ? current : [...current, message.file])
      }
      if (message.type === 'classroom-file-storage' && message.file) {
        setFiles((current) => current.some((file) => file.id === message.file.id) ? current : [...current, message.file])
      }
    }

    transportRef.current = createClassroomTransport({
      bookingId: roomBooking.id,
      roomId: roomBooking.classroomId,
      token: roomBooking.classroomToken,
      participantId: participantIdRef.current,
      onMessage: handleMessage,
      onStatus: (status) => {
        setSignalingStatus(status)
        if (useTencentClassroom) return
        if (status === 'connected' || status === 'local' || status === 'fallback') {
          setConnectionStatus((current) => current === 'connected' ? current : 'waiting')
          if (account.role === 'teacher') transportRef.current?.send({ type: 'teacher-ready' })
          else transportRef.current?.send({ type: 'join-request', role: account.role })
        } else setConnectionStatus(status)
      },
    })
    if (!useTencentClassroom) ensurePeer()

    const connectionReminder = useTencentClassroom ? null : window.setInterval(() => {
      if (peerRef.current?.connectionState === 'connected') return
      if (account.role === 'teacher') transportRef.current?.send({ type: 'teacher-ready' })
      else transportRef.current?.send({ type: 'join-request', role: account.role, reconnect: ['failed', 'disconnected'].includes(peerRef.current?.connectionState) })
    }, 2500)

    return () => {
      active = false
      window.clearInterval(connectionReminder)
      transportRef.current?.close()
      transportRef.current = null
      peerRef.current?.close()
      peerRef.current = null
      pendingIceRef.current = []
      offerStartedAtRef.current = 0
    }
  }, [joined, access.allowed, account.role, roomBooking.id, roomBooking.classroomId, roomBooking.classroomToken, reconnectKey, useTencentClassroom, studentMuted])

  useEffect(() => {
    if (!joined || !access.allowed || !useTencentClassroom) return undefined
    let disposed = false
    let tencentClient = null

    const connectTencentClassroom = async () => {
      try {
        setConnectionStatus('connecting')
        setSignalingStatus('tencent')
        const [{ default: TRTC }, credentials] = await Promise.all([
          import('trtc-sdk-v5'),
          fetchTencentClassroomCredentials(roomBooking.id),
        ])
        if (disposed) return
        const support = await TRTC.isSupported()
        if (!support?.result) throw new Error('This browser does not support Tencent RTC. Use current Chrome, Edge or Safari.')

        cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
        cameraStreamRef.current = null
        localStreamRef.current = null
        setVideoStream(localVideoRef.current, null)

        tencentClient = TRTC.create()
        trtcRef.current = tencentClient
        trtcModuleRef.current = TRTC
        tencentClient.on(TRTC.EVENT.REMOTE_USER_ENTER, () => {
          if (disposed) return
          setParticipantCount(2)
          setConnectionStatus('connected')
        })
        tencentClient.on(TRTC.EVENT.REMOTE_USER_EXIT, () => {
          if (disposed) return
          setParticipantCount(1)
          setConnectionStatus('waiting')
          setRemoteScreenSharing(false)
        })
        tencentClient.on(TRTC.EVENT.REMOTE_VIDEO_AVAILABLE, ({ userId, streamType }) => {
          if (disposed) return
          const isScreen = String(streamType).toLowerCase().includes('sub')
          if (isScreen) {
            remoteTencentScreenUserRef.current = { userId, streamType }
            setRemoteScreenSharing(true)
          }
          window.requestAnimationFrame(() => {
            const view = isScreen ? remoteTencentScreenRef.current : remoteTencentViewRef.current
            if (view) tencentClient.startRemoteVideo({ userId, streamType, view }).catch(() => {})
          })
          setParticipantCount(2)
          setConnectionStatus('connected')
        })
        tencentClient.on(TRTC.EVENT.REMOTE_VIDEO_UNAVAILABLE, ({ streamType }) => {
          if (String(streamType).toLowerCase().includes('sub')) {
            remoteTencentScreenUserRef.current = null
            setRemoteScreenSharing(false)
          }
        })
        tencentClient.on(TRTC.EVENT.SCREEN_SHARE_STOPPED, () => {
          if (disposed) return
          setScreenSharing(false)
          setScreenPaused(false)
          transportRef.current?.send({ type: 'screen-state', active: false, paused: false })
        })
        tencentClient.on(TRTC.EVENT.ERROR, (error) => {
          if (!disposed) {
            setMediaError(`Tencent RTC connection error: ${error?.message || 'Please retry the classroom.'}`)
            setConnectionStatus('failed')
          }
        })

        await tencentClient.enterRoom({
          sdkAppId: credentials.sdkAppId,
          userId: credentials.userId,
          userSig: credentials.userSig,
          strRoomId: credentials.roomId,
          scene: 'rtc',
        })
        if (disposed) return
        await Promise.all([
          tencentClient.startLocalVideo({ view: localTencentViewRef.current }),
          tencentClient.startLocalAudio(),
        ])
        setMediaReady(true)
        setMicOn(true)
        setCameraOn(true)
        setConnectionStatus('waiting')
      } catch (error) {
        if (!disposed) {
          setMediaError(error?.message || 'The embedded Tencent classroom could not start.')
          setConnectionStatus('failed')
        }
      }
    }

    void connectTencentClassroom()
    return () => {
      disposed = true
      if (trtcRef.current === tencentClient) trtcRef.current = null
      trtcModuleRef.current = null
      if (tencentClient) {
        void tencentClient.stopScreenShare().catch(() => {})
        void tencentClient.stopLocalVideo().catch(() => {})
        void tencentClient.stopLocalAudio().catch(() => {})
        void tencentClient.exitRoom().catch(() => {})
        tencentClient.destroy()
      }
    }
  }, [joined, access.allowed, roomBooking.id, reconnectKey, useTencentClassroom])

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
      redrawAnnotations(); syncUndoState()
    }
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    if (observer) observer.observe(stage)
    else window.addEventListener('resize', resize)
    resize()
    return () => {
      observer?.disconnect()
      if (!observer) window.removeEventListener('resize', resize)
    }
  }, [joined, remotePointerPosition])

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

  const retryConnection = () => {
    transportRef.current?.close()
    peerRef.current?.close()
    transportRef.current = null
    peerRef.current = null
    pendingIceRef.current = []
    offerStartedAtRef.current = 0
    setParticipantCount(1)
    setSignalingStatus('connecting')
    setConnectionStatus('connecting')
    setReconnectKey((value) => value + 1)
  }

  const toggleMic = async () => {
    const next = !micOn
    try {
      if (trtcRef.current) {
        if (next) await trtcRef.current.startLocalAudio()
        else await trtcRef.current.stopLocalAudio()
      } else cameraStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = next })
      setMicOn(next)
      if (next) setRemoteMuted(false)
    } catch {
      setMediaError('The microphone could not be changed in Tencent RTC.')
    }
  }

  const toggleCamera = async () => {
    const next = !cameraOn
    try {
      if (trtcRef.current) {
        if (next) await trtcRef.current.startLocalVideo({ view: localTencentViewRef.current })
        else await trtcRef.current.stopLocalVideo()
      } else cameraStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next })
      setCameraOn(next)
    } catch {
      setMediaError('The camera could not be changed in Tencent RTC.')
    }
  }

  const stopScreenShare = async () => {
    if (trtcRef.current) {
      await trtcRef.current.stopScreenShare().catch(() => {})
      transportRef.current?.send({ type: 'screen-state', active: false, paused: false })
      setScreenPaused(false)
      setScreenSharing(false)
      return
    }
    const stream = screenStreamRef.current
    screenStreamRef.current = null
    stream?.getTracks().forEach((track) => {
      track.onended = null
      track.stop()
    })
    const cameraTrack = cameraStreamRef.current?.getVideoTracks()[0]
    const sender = peerRef.current?.getSenders().find((item) => item.track?.kind === 'video')
    if (sender && cameraTrack) await sender.replaceTrack(cameraTrack)
    setVideoStream(sharedScreenVideoRef.current, null)
    transportRef.current?.send({ type: 'screen-state', active: false, paused: false })
    setScreenPaused(false)
    setScreenSharing(false)
  }

  const toggleScreenPause = () => {
    if (trtcRef.current) {
      setMediaError('Pause the shared screen from your browser\'s sharing control when using Tencent RTC.')
      return
    }
    const track = screenStreamRef.current?.getVideoTracks()[0]
    if (!track) return
    const paused = !screenPaused
    track.enabled = !paused
    setScreenPaused(paused)
    transportRef.current?.send({ type: 'screen-state', active: true, paused, fit: screenFit })
  }

  const toggleScreenFit = () => {
    const fit = screenFit === 'fit' ? 'fill' : 'fit'
    setScreenFit(fit)
    transportRef.current?.send({ type: 'screen-state', active: true, paused: screenPaused, fit })
  }

  const toggleStageFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await stageRef.current?.requestFullscreen()
    } catch {
      setMediaError('Full-screen lesson board is not available in this browser.')
    }
  }

  const toggleScreenShare = async () => {
    if (account.role === 'student') {
      setMediaError('Only the teacher can present a screen in this classroom.')
      return
    }
    if (screenSharing) {
      await stopScreenShare()
      return
    }
    if (trtcRef.current) {
      try {
        setMediaError('')
        await trtcRef.current.startScreenShare()
        setPresentedFile(null)
        setScreenPaused(false)
        setScreenFit('fit')
        setScreenSharing(true)
        transportRef.current?.send({ type: 'screen-state', active: true, paused: false, fit: 'fit' })
      } catch (error) {
        if (error?.extraCode !== 5302) setMediaError('Tencent RTC screen sharing could not be started.')
      }
      return
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setMediaError('Screen sharing is not supported by this browser.')
      return
    }
    try {
      setMediaError('')
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 30 } },
        audio: true,
      })
      const screenTrack = stream.getVideoTracks()[0]
      screenStreamRef.current = stream
      const sender = peerRef.current?.getSenders().find((item) => item.track?.kind === 'video')
      if (sender) await sender.replaceTrack(screenTrack)
      setVideoStream(sharedScreenVideoRef.current, stream)
      setPresentedFile(null)
      setScreenPaused(false)
      setScreenFit('fit')
      transportRef.current?.send({ type: 'screen-state', active: true, paused: false, fit: 'fit' })
      setScreenSharing(true)
      screenTrack.onended = () => { stopScreenShare() }
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
    document.body.classList.remove('classroom-active')
    onExit()
  }

  const pointerPosition = (event) => {
    const canvas = annotationCanvasRef.current
    const bounds = canvas.getBoundingClientRect()
    return { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height }
  }

  const canAnnotate = () => annotationMode && (account.role === 'teacher' || studentAnnotationAllowed)
  const canUsePointer = () => account.role === 'teacher' || studentPointerAllowed

  const startDrawing = (event) => {
    const point = pointerPosition(event)
    // Pointer tool - just sends position
    if (annotationTool === 'pointer') {
      if (!canUsePointer()) return
      transportRef.current?.send({ type: 'pointer-move', point })
      return
    }
    if (!canAnnotate()) return
    // Select tool
    if (annotationTool === 'select') {
      const canvas = annotationCanvasRef.current
      let found = null
      for (let i = pathsRef.current.length - 1; i >= 0; i--) {
        if (hitTestAnnotation(pathsRef.current[i], point, canvas.width, canvas.height)) {
          found = pathsRef.current[i].id
          break
        }
      }
      setSelectedPathId(found)
      transportRef.current?.send({ type: 'object-select', pathId: found || '' })
      redrawAnnotations(); syncUndoState()
      return
    }
    // Move tool
    if (annotationTool === 'move') {
      if (!selectedPathId) return
      const path = pathsRef.current.find((p) => p.id === selectedPathId)
      if (!path) return
      const refPoint = path.point || path.points?.[0]
      if (refPoint) {
        dragOffsetRef.current = { x: point.x - refPoint.x, y: point.y - refPoint.y }
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    // Text tool
    if (annotationTool === 'text') {
      setTextEditor(point)
      setTextDraft('')
      liveTextPathRef.current = null
      return
    }
    // Drawing tools (pen, highlighter, eraser)
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
    const point = pointerPosition(event)
    // Pointer tool
    if (annotationTool === 'pointer') {
      if (!canUsePointer()) return
      transportRef.current?.send({ type: 'pointer-move', point })
      return
    }
    // Move tool
    if (annotationTool === 'move' && selectedPathId && dragOffsetRef.current) {
      const path = pathsRef.current.find((p) => p.id === selectedPathId)
      if (!path) return
      const newX = point.x - dragOffsetRef.current.x
      const newY = point.y - dragOffsetRef.current.y
      if (path.tool === 'text' && path.point) {
        path.point = { x: newX, y: newY }
      } else if (path.points?.length) {
        const refPoint = path.points[0]
        const dx = newX - refPoint.x
        const dy = newY - refPoint.y
        path.points = path.points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
      }
      redrawAnnotations(); syncUndoState()
      return
    }
    if (!currentPathRef.current || !canAnnotate()) return
    currentPathRef.current.points.push(point)
    redrawAnnotations(); syncUndoState()
    const canvas = annotationCanvasRef.current
    const context = canvas?.getContext('2d')
    if (canvas && context) drawPath(context, currentPathRef.current, canvas.width, canvas.height)
  }

  const finishDrawing = () => {
    // Move tool
    if (annotationTool === 'move' && selectedPathId) {
      const path = pathsRef.current.find((p) => p.id === selectedPathId)
      if (path) {
        transportRef.current?.send({ type: 'annotation-path', path })
      }
      dragOffsetRef.current = null
      return
    }
    const path = currentPathRef.current
    if (!path) return
    pathsRef.current.push(path)
    currentPathRef.current = null
    redrawAnnotations(); syncUndoState()
    transportRef.current?.send({ type: 'annotation-path', path })
  }

  const undoAnnotation = () => {
    if (!pathsRef.current.length) return
    const path = pathsRef.current.pop()
    undonePathsRef.current.push(path)
    redrawAnnotations(); syncUndoState()
    transportRef.current?.send({ type: 'annotation-undo', pathId: path.id })
  }

  const redoAnnotation = () => {
    if (!undonePathsRef.current.length) return
    const path = undonePathsRef.current.pop()
    pathsRef.current.push(path)
    redrawAnnotations(); syncUndoState()
    transportRef.current?.send({ type: 'annotation-redo', path })
  }

  const clearAnnotations = () => {
    const backup = pathsRef.current.slice()
    clearedPathsBackupRef.current = backup
    pathsRef.current = []
    undonePathsRef.current = []
    currentPathRef.current = null
    redrawAnnotations(); syncUndoState()
    transportRef.current?.send({ type: 'annotation-clear', backup })
  }

  const undoClear = () => {
    if (!clearedPathsBackupRef.current) return
    pathsRef.current = clearedPathsBackupRef.current
    clearedPathsBackupRef.current = null
    redrawAnnotations(); syncUndoState()
    transportRef.current?.send({ type: 'annotation-undo-clear', backup: pathsRef.current.slice() })
  }

  const handleTextDraftChange = (text) => {
    setTextDraft(text)
    if (textEditor) {
      liveTextPathRef.current = {
        id: 'live-text',
        tool: 'text',
        text,
        color: annotationColor,
        fontSize: 24,
        point: textEditor,
      }
      redrawAnnotations(); syncUndoState()
    }
  }

  const commitTextAnnotation = () => {
    const text = textDraft.trim()
    if (!text || !textEditor) {
      setTextEditor(null)
      setTextDraft('')
      liveTextPathRef.current = null
      redrawAnnotations(); syncUndoState()
      return
    }
    const path = { id: crypto.randomUUID(), tool: 'text', text: text.slice(0, 500), color: annotationColor, fontSize: 24, point: textEditor }
    pathsRef.current.push(path)
    undonePathsRef.current = []
    liveTextPathRef.current = null
    redrawAnnotations(); syncUndoState()
    transportRef.current?.send({ type: 'annotation-path', path })
    setTextEditor(null)
    setTextDraft('')
  }

  const deleteSelectedObject = () => {
    if (!selectedPathId) return
    const index = pathsRef.current.findIndex((p) => p.id === selectedPathId)
    if (index >= 0) {
      pathsRef.current.splice(index, 1)
      setSelectedPathId(null)
      redrawAnnotations(); syncUndoState()
      transportRef.current?.send({ type: 'annotation-undo', pathId: selectedPathId })
    }
  }

  const toggleStudentAnnotationPermission = () => {
    if (account.role !== 'teacher') return
    const allowed = !annotationPermissionRef.current
    annotationPermissionRef.current = allowed
    setStudentAnnotationAllowed(allowed)
    transportRef.current?.send({ type: 'annotation-permission', allowed })
  }

  const toggleStudentPointerPermission = () => {
    if (account.role !== 'teacher') return
    const allowed = !pointerPermissionRef.current
    pointerPermissionRef.current = allowed
    setStudentPointerAllowed(allowed)
    transportRef.current?.send({ type: 'pointer-permission', allowed })
  }

  const toggleStudentMute = () => {
    if (account.role !== 'teacher') return
    const muted = !studentMuted
    setStudentMuted(muted)
    setUnmuteRequested(false)
    transportRef.current?.send({ type: 'mute-student', muted })
  }

  const sendUnmuteRequest = () => {
    transportRef.current?.send({ type: 'unmute-request' })
    setUnmuteRequested(true)
  }

  const acceptUnmuteRequest = async () => {
    setRemoteMuted(false)
    setUnmuteRequested(false)
    try {
      if (trtcRef.current) await trtcRef.current.startLocalAudio()
      else cameraStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = true })
      setMicOn(true)
    } catch { /* Unmute failed */ }
  }

  const openPresenterUrl = (targetUrlInput) => {
    const inputToValidate = targetUrlInput || presenterUrlDraft
    const result = validateAndFormatHttpsUrl(inputToValidate)
    if (!result.valid) {
      setEmbedError(result.error)
      return
    }
    setEmbedError('')
    const finalUrl = result.url
    setPresenterUrl(finalUrl)
    setPresenterUrlInput(finalUrl)
    transportRef.current?.send({ type: 'presenter-url', url: finalUrl })
    setPresenterUrlDraft('')
    if (account.role === 'teacher') {
      window.open(finalUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const stopWebsiteEmbed = () => {
    setPresenterUrl('')
    setPresenterUrlInput('')
    transportRef.current?.send({ type: 'presenter-url', url: '' })
  }

  const handleOpenWebsite = (urlToOpen) => {
    const targetUrl = urlToOpen || presenterUrl
    if (!targetUrl) return
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }

  const handleStartTabShare = async () => {
    if (!screenSharing) {
      await toggleScreenShare()
    }
  }

  const handleStopShare = async () => {
    if (screenSharing) {
      await stopScreenShare()
    }
  }

  const handleReopenWebsite = (urlToOpen) => {
    const targetUrl = urlToOpen || presenterUrl
    if (!targetUrl) return
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }

  const handleUpdatePresenterUrl = () => {
    openPresenterUrl(presenterUrlInput)
  }

  const uploadFile = async (event) => {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''
    if (!selectedFile) return
    setFileError('')
    if (!isClassroomFileAllowed(selectedFile)) {
      setFileError('This file type is not supported. Use PDF, PPT, PPTX, DOC, DOCX, images, EPUB, EDB or TXT.')
      return
    }

    const sizeLimit = isClassroomStorageAvailable() ? MAX_STORAGE_SIZE : MAX_INLINE_SIZE
    const selectedPdf = isPdfFile(selectedFile)
    let file = selectedFile
    setUploadingFile(true)

    try {
      // A PDF over the delivery limit is rewritten before rejecting it. pdf-lib
      // uses object streams only, so page and image quality are unchanged.
      if (selectedPdf && file.size > sizeLimit) {
        setUploadStatus('Compressing PDF…')
        try {
          file = await compressPDF(file)
        } catch {
          setFileError(`This PDF is over ${Math.round(sizeLimit / 1024 / 1024)} MB and could not be losslessly compressed. Try a smaller, unlocked PDF.`)
          return
        }
      }

      if (file.size > sizeLimit) {
        const sizeMessage = `Lesson files must be under ${Math.round(sizeLimit / 1024 / 1024)} MB.`
        setFileError(selectedPdf
          ? `${sizeMessage} This PDF could not be losslessly compressed enough to upload.`
          : sizeMessage)
        return
      }

      setUploadStatus('Uploading…')
      if (isClassroomStorageAvailable() && file.size > MAX_INLINE_SIZE) {
        const stored = await uploadClassroomFile(roomBooking.id, file)
        const signedUrl = await getClassroomFileUrl(stored.storagePath)
        const entry = {
          id: stored.id,
          name: stored.name,
          size: stored.size,
          type: stored.type,
          storagePath: stored.storagePath,
          dataUrl: signedUrl || '',
          source: 'supabase',
          sender: participantName,
        }
        setFiles((current) => [...current, entry])
        transportRef.current?.send({ type: 'classroom-file-storage', file: { id: stored.id, name: stored.name, size: stored.size, type: stored.type, storagePath: stored.storagePath, source: 'supabase', sender: participantName } })
        if (account.role === 'teacher') {
          setPresentedFile(entry)
          transportRef.current?.send({ type: 'presentation-file', file: entry })
        }
      } else {
        const dataUrl = await readFileAsDataUrl(file)
        const entry = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          sender: participantName,
        }
        setFiles((current) => [...current, entry])
        transportRef.current?.send({ type: 'classroom-file', file: entry })
        if (account.role === 'teacher') {
          setPresentedFile(entry)
          transportRef.current?.send({ type: 'presentation-file', file: entry })
        }
      }
    } catch (error) {
      setFileError(error.message || 'File upload failed.')
    } finally {
      setUploadingFile(false)
      setUploadStatus('')
    }
  }

  const resolveFileUrl = async (file) => {
    if (file.dataUrl) return file.dataUrl
    if (file.storagePath && isClassroomStorageAvailable()) {
      const url = await getClassroomFileUrl(file.storagePath)
      if (url) return url
    }
    return ''
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
  const connectionLabel = connectionStatus === 'connected'
    ? useTencentClassroom ? 'Tencent RTC connected' : 'Live peer connected'
    : signalingStatus === 'tencent'
      ? 'Tencent RTC · waiting for participant'
      : signalingStatus === 'fallback'
      ? 'Secure fallback · waiting for peer'
      : connectionStatus === 'local'
        ? 'Local classroom ready'
        : ['error', 'failed', 'disconnected'].includes(connectionStatus)
          ? 'Connection needs attention'
          : 'Waiting for participant'
  const showConnectionHelp = connectionStatus !== 'connected' && elapsed >= 6
  const connectionHelpText = participantCount > 1
    ? 'Both participants were found. TutorPro English is retrying the secure video handshake.'
    : 'Keep this classroom open while the other participant enters this exact booking.'

  const isEdbFile = (file) => /\.edb$/i.test(file.name)
  const isEpubFile = (file) => /\.epub$/i.test(file.name)

  const renderPresentedFile = (file) => {
    if (file.source === 'cos' || file.key?.includes('classrooms/')) {
      return (
        <div className="classroom-file-presentation" style={{ width: '100%', height: '100%', padding: '0' }}>
          <WhiteboardSlides
            fileId={file.id}
            fileName={file.name}
            fileUrl={file.dataUrl || file.url}
            isTeacher={account.role === 'teacher'}
            currentPage={cosSlidePage}
            onPageChange={(newPage) => {
              setCosSlidePage(newPage)
              transportRef.current?.send({ type: 'slide-page', page: newPage })
            }}
          />
        </div>
      )
    }
    if (isEdbFile(file)) {
      return (
        <div className="classroom-file-presentation">
          <div><Presentation size={54} /><strong>{file.name}</strong><span>ClassIn EDB files can be downloaded and opened in ClassIn.</span><a href={file.dataUrl || '#'} download={file.name}>Download EDB file</a></div>
          <small><Paperclip size={13} /> {file.name}</small>
        </div>
      )
    }
    if (isEpubFile(file)) {
      return (
        <div className="classroom-file-presentation">
          <div><Presentation size={54} /><strong>{file.name}</strong><span>EPUB books can be downloaded and opened in your e-reader.</span><a href={file.dataUrl || '#'} download={file.name}>Download EPUB</a></div>
          <small><Paperclip size={13} /> {file.name}</small>
        </div>
      )
    }
    return (
      <div className="classroom-file-presentation">
        {file.type?.startsWith('image/') ? <img src={file.dataUrl} alt={file.name} /> :
         file.type === 'application/pdf' ? <object data={file.dataUrl} type="application/pdf" aria-label={file.name}><div className="pdf-fallback"><Presentation size={42} /><strong>{file.name}</strong><span>This browser cannot embed the PDF.</span><a href={file.dataUrl} download={file.name}>Open PDF</a></div></object> :
         <div><Presentation size={54} /><strong>{file.name}</strong><span>Use the download button to open this lesson file.</span></div>}
        <small><Paperclip size={13} /> {file.name}</small>
      </div>
    )
  }

  const renderWebsitePresenterCard = () => {
    if (!presenterUrl) return null
    return (
      <div className="classroom-website-presenter-card">
        <header className="website-presenter-card__header">
          <div className="website-presenter-card__title">
            <span><Globe size={22} /></span>
            <div>
              <strong>Website Presenter</strong>
              <small>Interactive HTTPS website tab streaming</small>
            </div>
          </div>
          {account.role === 'teacher' && (
            <button onClick={stopWebsiteEmbed} title="Stop presenting website" className="website-presenter-close-btn">
              <X size={18} />
            </button>
          )}
        </header>

        <div className="website-presenter-url-bar">
          <span>HTTPS URL:</span>
          <input
            type="url"
            value={presenterUrlInput}
            onChange={(e) => setPresenterUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdatePresenterUrl() }}
            placeholder="https://example.com"
            readOnly={account.role === 'student'}
          />
          {account.role === 'teacher' && (
            <button onClick={handleUpdatePresenterUrl} className="website-url-update-btn">
              Update URL
            </button>
          )}
        </div>

        <div className="website-presenter-card__instructions">
          <h3>In-Class Instructions</h3>
          <ol className="website-presenter-steps">
            <li>
              <CheckCircle2 size={16} />
              <div>
                <strong>Website opened</strong>
                <span>The website opens in a separate browser tab for teacher control.</span>
              </div>
            </li>
            <li>
              <ArrowLeftRight size={16} />
              <div>
                <strong>Return to TutorPro</strong>
                <span>Switch back to this classroom tab in your browser.</span>
              </div>
            </li>
            <li>
              <MonitorUp size={16} />
              <div>
                <strong>Click Share browser tab</strong>
                <span>Click "Start Tab Share" below to begin streaming the tab.</span>
              </div>
            </li>
            <li>
              <ExternalLink size={16} />
              <div>
                <strong>Select the opened website tab</strong>
                <span>Choose the opened website tab in your browser's share dialog.</span>
              </div>
            </li>
          </ol>

          <p className="website-presenter-notice">
            <strong>Note:</strong> The teacher controls the original website tab while students see the live stream on the lesson board. Navigation must be performed directly on the original website tab.
          </p>

          <div className="website-presenter-mobile-note">
            <Smartphone size={15} />
            <span>
              <strong>Mobile browser note:</strong> On mobile devices where supported, tap "Start Tab Share" and select "Browser Tab" or "Single Tab". If your browser only supports screen capture, choose "Screen".
            </span>
          </div>
        </div>

        {account.role === 'teacher' && (
          <div className="website-presenter-controls">
            <button onClick={() => handleOpenWebsite(presenterUrl)} className="website-ctrl-btn website-ctrl-btn--open">
              <ExternalLink size={16} /> Open Website
            </button>
            {!screenSharing ? (
              <button onClick={handleStartTabShare} className="website-ctrl-btn website-ctrl-btn--start">
                <MonitorUp size={16} /> Start Tab Share
              </button>
            ) : (
              <button onClick={handleStopShare} className="website-ctrl-btn website-ctrl-btn--stop">
                <X size={16} /> Stop Share
              </button>
            )}
            <button onClick={() => handleReopenWebsite(presenterUrl)} className="website-ctrl-btn website-ctrl-btn--reopen">
              <RefreshCw size={16} /> Reopen Website
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderEmbeddedWebsite = () => {
    if (!presenterUrl) return null
    if (!isAllowlistedTutorProUrl(presenterUrl)) {
      return renderWebsitePresenterCard()
    }
    const displayUrl = presenterUrl.replace(/^https?:\/\//, '')
    return (
      <div className="classroom-website-embed">
        <div className="website-embed-header">
          <Globe size={18} />
          <span>TutorPro Resource: {displayUrl}</span>
          <button onClick={stopWebsiteEmbed} title="Stop presenting website"><X size={16} /></button>
        </div>
        {embedError && <div className="website-embed-error"><WifiOff size={16} /> {embedError}</div>}
        <iframe
          src={presenterUrl}
          className="website-embed-frame"
          title={`Embedded website: ${displayUrl}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => setEmbedError('')}
          onError={() => setEmbedError('This resource cannot be embedded directly.')}
        />
      </div>
    )
  }

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
            {useTencentClassroom && <span className="tencent-provider-badge"><Video size={14} /> Embedded VooV / Tencent RTC</span>}
            <small>{account.role === 'teacher' ? 'Teacher room' : account.role === 'admin' ? 'Administrator access' : 'Booked student room'}</small>
            <h1>Ready for class, {participantName}?</h1>
            <p>{teacher?.fullName} with {learner?.name} · {new Date(`${roomBooking.date}T12:00`).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })} at <strong className="classroom-lesson-time">{formatTime(roomBooking.time)}</strong></p>
            <div className="prejoin-room-id"><span><ShieldCheck size={16} /></span><div><small>Unique classroom ID</small><strong>{roomBooking.classroomId}</strong></div><button onClick={copyRoomId}>{copied ? <Check size={16} /> : <Copy size={16} />}</button></div>
            {mediaError && <div className="classroom-error"><WifiOff size={17} /> {mediaError}</div>}
            {!mediaReady ? <button className="classroom-main-button" onClick={requestMedia}><Camera size={18} /> Enable camera & microphone</button> : <button className="classroom-main-button" onClick={joinClass}><Video size={18} /> Enter private classroom</button>}
            <p className="prejoin-privacy"><ShieldCheck size={14} /> Only this booking's teacher, student and administrator can access this room.</p>
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

      {showConnectionHelp && <div className={`classroom-connection-help classroom-connection-help--${connectionStatus}`}><span><WifiOff size={18} /></span><div><strong>{participantCount > 1 ? 'Reconnecting both participants' : 'Waiting for the same booked classroom'}</strong><small>{connectionHelpText} Room ID: {roomBooking.classroomId}</small></div><button type="button" onClick={retryConnection}><RefreshCw size={15} /> Retry connection</button></div>}

      <div className="classroom-workspace">
        <section className="classroom-stage">
          <div className="classroom-video-rail">
            <div className="classroom-camera-tile classroom-camera-tile--remote">
              {useTencentClassroom ? <div className="tencent-video-view" ref={remoteTencentViewRef} /> : !remoteScreenSharing && <video ref={remoteVideoRef} autoPlay playsInline />}
              {connectionStatus !== 'connected' && <div className="camera-tile-waiting"><Radio size={22} /><span>Waiting for {account.role === 'teacher' ? learner?.name : teacher?.fullName}</span></div>}
              <span>{account.role === 'teacher' ? learner?.name || 'Student' : teacher?.fullName || 'Teacher'}</span>
            </div>
            <div className="classroom-camera-tile classroom-camera-tile--local">
              {useTencentClassroom ? <div className="tencent-video-view" ref={localTencentViewRef} /> : <video ref={localVideoRef} autoPlay muted playsInline />}
              <span>You · {participantName}</span>
              {!cameraOn && <CameraOff size={24} />}
            </div>
            <div className="video-rail-status"><i className={connectionStatus === 'connected' ? 'online' : ''} /><span>{connectionStatus === 'connected' ? 'Audio & video connected' : 'Waiting for connection'}</span></div>
          </div>

          <div className="classroom-lesson-board" ref={stageRef}>
            {screenSharing ? (
              <div className="teacher-screen-sharing-active">
                <MonitorUp size={44} />
                <strong>Your browser tab is being shared</strong>
                <span>Students see the live stream on their lesson board. The teacher controls the original website tab.</span>
                {presenterUrl && (
                  <div className="teacher-share-website-actions">
                    <button onClick={() => handleOpenWebsite(presenterUrl)} className="teacher-share-btn">
                      <ExternalLink size={15} /> Open Website Tab
                    </button>
                    <button onClick={() => handleReopenWebsite(presenterUrl)} className="teacher-share-btn">
                      <RefreshCw size={15} /> Reopen Website Tab
                    </button>
                  </div>
                )}
              </div>
            ) : remoteScreenSharing ? (useTencentClassroom ? <div className={`tencent-video-view tencent-screen-view classroom-presentation-video--${remoteScreenFit}`} ref={remoteTencentScreenRef} /> : <video className={`classroom-presentation-video classroom-presentation-video--${remoteScreenFit}`} ref={remoteVideoRef} autoPlay playsInline />) : presenterUrl ? renderEmbeddedWebsite() : presentedFile ? renderPresentedFile(presentedFile) : <div className="classroom-lesson-placeholder"><span><Presentation size={49} /></span><small>Interactive lesson workspace</small><h2>{roomBooking.focus}</h2><p>The teacher can share a browser tab, present a website, or share an uploaded lesson file here. Annotation tools work directly on this board.</p><div><i>ABC</i><i>Vocabulary</i><i>Grammar</i><i>Speaking</i></div></div>}
            {remoteScreenSharing && remoteScreenPaused && <div className="screen-share-paused"><Pause size={26} /><strong>Screen sharing is paused</strong><span>The teacher can resume it from the classroom controls.</span></div>}
            <canvas
              ref={annotationCanvasRef}
              className={annotationMode ? 'annotation-canvas active' : 'annotation-canvas'}
              onPointerDown={startDrawing}
              onPointerMove={continueDrawing}
              onPointerUp={finishDrawing}
              onPointerCancel={finishDrawing}
            />
            {textEditor && <div className="annotation-text-editor annotation-text-editor--live" style={{ left: `${textEditor.x * 100}%`, top: `${textEditor.y * 100}%` }}><input autoFocus value={textDraft} onChange={(event) => handleTextDraftChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commitTextAnnotation() } if (event.key === 'Escape') { setTextEditor(null); setTextDraft(''); liveTextPathRef.current = null; redrawAnnotations() } }} onBlur={commitTextAnnotation} placeholder="Type on the lesson…" maxLength="500" /></div>}
            {annotationMode && <div className="annotation-toolbar">
              <button className={annotationTool === 'pointer' ? 'active' : ''} onClick={() => setAnnotationTool('pointer')} title="Pointer" disabled={!canUsePointer()}><Pointer size={17} /></button>
              <button className={annotationTool === 'select' ? 'active' : ''} onClick={() => setAnnotationTool('select')} title="Select"><MousePointer2 size={17} /></button>
              <button className={annotationTool === 'move' ? 'active' : ''} onClick={() => setAnnotationTool('move')} title="Move" disabled={!selectedPathId}><Move size={17} /></button>
              <span className="annotation-toolbar__divider" />
              <button className={annotationTool === 'pen' ? 'active' : ''} onClick={() => setAnnotationTool('pen')} title="Pen"><PenTool size={17} /></button>
              <button className={annotationTool === 'highlighter' ? 'active' : ''} onClick={() => setAnnotationTool('highlighter')} title="Highlighter"><Circle size={17} /></button>
              <button className={annotationTool === 'text' ? 'active' : ''} onClick={() => setAnnotationTool('text')} title="Text"><Type size={17} /></button>
              <button className={annotationTool === 'eraser' ? 'active' : ''} onClick={() => setAnnotationTool('eraser')} title="Eraser"><Eraser size={17} /></button>
              <label title="Ink colour"><input type="color" value={annotationColor} onChange={(event) => setAnnotationColor(event.target.value)} /></label>
              <span className="annotation-toolbar__divider" />
              <button onClick={undoAnnotation} title="Undo" disabled={!canUndo}><Undo2 size={17} /></button>
              <button onClick={redoAnnotation} title="Redo" disabled={!canRedo}><Redo2 size={17} /></button>
              <button onClick={clearAnnotations} title="Clear all"><Trash2 size={17} /></button>
              {canUndoClear && <button onClick={undoClear} title="Undo clear"><RotateCcw size={17} /></button>}
              {selectedPathId && <button onClick={deleteSelectedObject} title="Delete selected"><X size={17} /></button>}
              <button onClick={() => setAnnotationMode(false)} title="Close annotation"><X size={17} /></button>
            </div>}
            {screenSharing && <div className="screen-share-controls" role="toolbar" aria-label="Teacher screen sharing controls"><span><i /> You are presenting</span><button onClick={toggleScreenPause} title={screenPaused ? 'Resume screen sharing' : 'Pause screen sharing'}>{screenPaused ? <Play size={16} /> : <Pause size={16} />}<b>{screenPaused ? 'Resume' : 'Pause'}</b></button><button onClick={toggleScreenFit} title="Change screen fit"><MonitorUp size={16} /><b>{screenFit === 'fit' ? 'Fill' : 'Fit'}</b></button><button onClick={toggleStageFullscreen} title={stageFullscreen ? 'Exit full screen' : 'Open lesson board full screen'}>{stageFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}<b>{stageFullscreen ? 'Exit' : 'Full screen'}</b></button><button className="stop" onClick={stopScreenShare} title="Stop screen sharing"><X size={16} /><b>Stop</b></button></div>}
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
            {unmuteRequested && account.role === 'student' && <div className="classroom-unmute-request"><Volume2 size={16} /><span>The teacher is asking you to unmute.</span><button onClick={acceptUnmuteRequest}><Mic size={15} /> Unmute me</button></div>}
            <form className="classroom-chat-form" onSubmit={sendChatMessage}><input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="Write a message…" maxLength="500" /><button type="submit" disabled={!chatDraft.trim()}><Send size={17} /></button></form>
          </div> : <div className="classroom-files-panel">
            <div className="flex gap-2 mb-3">
              <label className="classroom-file-upload flex-1"><FileUp size={22} /><strong>Upload lesson material</strong><span>PDF, PPT, PPTX, DOC, images, EPUB, EDB · max {isClassroomStorageAvailable() ? '50' : '8'} MB</span><input type="file" accept={CLASSROOM_FILE_ACCEPT} onChange={uploadFile} disabled={uploadingFile} /></label>
              <div className="flex flex-col justify-center">
                <CosCloudIcon
                  bookingId={roomBooking.id}
                  supabaseToken={roomBooking.classroomToken || ''}
                  supabaseUrl={import.meta.env.VITE_SUPABASE_URL || 'https://losmkvvwzijipqrlelyt.supabase.co'}
                  onShareDocument={(file) => {
                    const entry = {
                      id: file.id,
                      name: file.name,
                      size: file.size,
                      type: file.type || 'application/octet-stream',
                      dataUrl: file.url,
                      source: 'cos',
                      sender: participantName,
                    };
                    setFiles((current) => [...current, entry]);
                    transportRef.current?.send({ type: 'classroom-file', file: entry });
                    if (account.role === 'teacher') {
                      setPresentedFile(entry);
                      transportRef.current?.send({ type: 'presentation-file', file: entry });
                    }
                  }}
                  isTeacher={account.role === 'teacher'}
                />
              </div>
            </div>
            {fileError && <div className="classroom-file-error">{fileError}</div>}
            {uploadingFile && <div className="classroom-file-uploading"><span className="classroom-file-uploading__spinner" /> {uploadStatus || 'Uploading…'}</div>}
            <div className="classroom-file-list">{files.length ? files.map((file) => <div key={file.id}><span><Paperclip size={16} /></span><div><strong>{file.name}</strong><small>{file.sender} · {(file.size / 1024).toFixed(0)} KB{file.source === 'supabase' ? ' · Cloud' : ''}</small></div>{account.role !== 'student' && <button onClick={() => presentFile(file)} title="Present on lesson board"><Presentation size={16} /></button>}<a href={file.dataUrl || '#'} download={file.name} title="Download" onClick={async (e) => { if (!file.dataUrl && file.storagePath) { e.preventDefault(); const url = await resolveFileUrl(file); if (url) window.open(url, '_blank') } }}><Download size={16} /></a></div>) : <div className="classroom-file-empty"><FileUp size={25} /><span>No lesson files shared yet.</span></div>}</div>
          </div>}
          <div className="classroom-people"><span><Users size={17} /> Participants</span><div><i className="online" /><strong>{participantName}</strong><small>{account.role}</small></div>{connectionStatus === 'connected' && <div><i className="online" /><strong>{account.role === 'teacher' ? learner?.name : teacher?.fullName}</strong><small>{account.role === 'teacher' ? 'student' : 'teacher'}</small></div>}{account.role === 'teacher' && <>
            <button className={studentAnnotationAllowed ? 'allowed' : ''} onClick={toggleStudentAnnotationPermission}>{studentAnnotationAllowed ? <Unlock size={15} /> : <Lock size={15} />}{studentAnnotationAllowed ? 'Student can annotate' : 'Allow student annotation'}</button>
            <button className={`classroom-people-pointer ${studentPointerAllowed ? 'allowed' : ''}`} onClick={toggleStudentPointerPermission}><Pointer size={15} />{studentPointerAllowed ? 'Student can use pointer' : 'Allow student pointer'}</button>
            <button className={`classroom-people-mute ${studentMuted ? 'muted' : ''}`} onClick={toggleStudentMute}>{studentMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}{studentMuted ? 'Student is muted' : 'Mute student'}</button>
            {studentMuted && !unmuteRequested && <button className="classroom-people-unmute-request" onClick={sendUnmuteRequest}><Volume2 size={15} /> Ask student to unmute</button>}
          </>}{account.role === 'student' && <>
            <div className="student-annotation-state">{studentAnnotationAllowed ? <Unlock size={14} /> : <Lock size={14} />}<span>{studentAnnotationAllowed ? 'Teacher allowed annotation' : 'Annotation requires teacher permission'}</span></div>
            <div className="student-pointer-state">{studentPointerAllowed ? <Pointer size={14} /> : <MousePointer2 size={14} />}<span>{studentPointerAllowed ? 'You can use the pointer tool' : 'Pointer tool requires teacher permission'}</span></div>
            {remoteMuted && <div className="student-muted-state"><VolumeX size={14} /><span>The teacher muted your microphone</span></div>}
          </>}</div>
        </aside>}
      </div>

      <footer className="classroom-controls">
        <div><button className={micOn ? 'active' : 'off'} onClick={toggleMic}>{micOn ? <Mic size={20} /> : <MicOff size={20} />}<span>{micOn ? 'Mute' : 'Unmute'}</span></button><button className={cameraOn ? 'active' : 'off'} onClick={toggleCamera} disabled={screenSharing}>{cameraOn ? <Camera size={20} /> : <CameraOff size={20} />}<span>{cameraOn ? 'Camera' : 'Start video'}</span></button></div>
        <div>{account.role !== 'student' && <button className={screenSharing ? 'active sharing' : ''} onClick={toggleScreenShare}><MonitorUp size={20} /><span>{screenSharing ? 'Stop share' : 'Share screen'}</span></button>}{account.role !== 'student' && <button className="control-website-button" onClick={() => setPresenterUrlDraft(presenterUrl || 'https://')} title="Present a website"><Globe size={20} /><span>Website</span></button>}<button className={annotationMode ? 'active annotation' : ''} onClick={() => setAnnotationMode((active) => !active)} disabled={account.role === 'student' && !studentAnnotationAllowed && !studentPointerAllowed} title={account.role === 'student' && !studentAnnotationAllowed && !studentPointerAllowed ? 'The teacher must allow annotation or pointer first' : 'Annotate the lesson board'}><PenTool size={20} /><span>{account.role === 'student' && !studentAnnotationAllowed && !studentPointerAllowed ? 'Permission needed' : 'Annotate'}</span></button><label className="control-file-button"><FileUp size={20} /><span>Share file</span><input type="file" accept={CLASSROOM_FILE_ACCEPT} onChange={uploadFile} disabled={uploadingFile} /></label><button onClick={() => setSidebarOpen((open) => !open)}><Users size={20} /><span>Chat & files</span></button><button className="leave-class-button" onClick={leaveClass}><PhoneOff size={21} /><span>End class</span></button></div>
      </footer>

      {presenterUrlDraft !== '' && account.role === 'teacher' && <div className="classroom-presenter-overlay">
        <div className="classroom-presenter-dialog">
          <header>
            <Globe size={20} />
            <div>
              <strong>Website Presenter</strong>
              <small>Validate an HTTPS URL to open in a separate tab and stream to class.</small>
            </div>
            <button onClick={() => { setPresenterUrlDraft(''); setEmbedError('') }}><X size={17} /></button>
          </header>
          <form onSubmit={(e) => { e.preventDefault(); openPresenterUrl() }}>
            <input
              type="url"
              value={presenterUrlDraft}
              onChange={(e) => setPresenterUrlDraft(e.target.value)}
              placeholder="https://example.com"
              autoFocus
            />
            {embedError && <div className="website-presenter-error">{embedError}</div>}
            <div>
              <button type="submit">
                <ExternalLink size={16} /> Open & Present Website
              </button>
              {presenterUrl && (
                <button type="button" onClick={handleStartTabShare} className="presenter-share-btn">
                  <MonitorUp size={16} /> Start Tab Share
                </button>
              )}
            </div>
          </form>
        </div>
      </div>}
    </main>
  )
}
