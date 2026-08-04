import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import {
  ArrowLeft,
  ArrowLeftRight,
  Award,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  Circle,
  Minus,
  MoveUpRight,
  Square,
  StickyNote,
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
  Sparkles,
  Star,
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
import { getClassroomAccess, syncBookingNow, updateBooking } from './bookings.js'
import { createClassroomTransport } from './classroomTransport.js'
import { DEFAULT_COURSEWARE_TEMPLATE, coursewareSnapshot, getCoursewareTemplateById, getCoursewareTemplates, normalizeCoursewareTemplate } from './courseware.js'
import { fetchTencentClassroomCredentials, isTencentClassroomConfigured } from './tencentClassroom.js'
import { chatLanguages, translateChatText } from './chatTranslation.js'
import { compressPDF } from './compressPDF.js'
import { WhiteboardSlides, SafeSlidesErrorBoundary } from './components/WhiteboardSlides.jsx'
import { ClassroomDashboard } from './components/ClassroomDashboard.jsx'
import { validateAndFormatHttpsUrl } from './websitePresenter.js'
import { currentVisitorLocale, isChineseVisitor, subscribeToVisitorLocale } from './visitorLocale.js'
import {
  CLASSROOM_FILE_ACCEPT,
  getClassroomFileSizeLimit,
  isClassroomFileAllowed,
  isClassroomStorageAvailable,
  uploadClassroomFile,
  getClassroomFileUrl,
  listTeacherLibrary,
} from './classroomStorage.js'
import { formatRecordingDuration, formatRecordingSize, isRecordingStorageAvailable, isRecordingSupported, startClassroomRecording, uploadClassroomRecording } from './classroomRecording.js'

import SpeechCoachPanel from './SpeechCoachPanel.jsx'
import { recordJoin, recordLeave } from './classroomAttendance.js'
import { buildRtcConfiguration, connectionFailureAdvice, fetchDynamicIceServers, hasTurnRelay } from './iceServers.js'
const MAX_INLINE_SIZE = 8 * 1024 * 1024
const MAX_STORAGE_SIZE = getClassroomFileSizeLimit()
const rtcConfiguration = buildRtcConfiguration()

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

function resolveBookingCoursewareTemplate(booking) {
  if (booking?.coursewareTemplate?.slides?.length) return normalizeCoursewareTemplate(booking.coursewareTemplate)
  if (booking?.coursewareTemplateId) return getCoursewareTemplateById(booking.coursewareTemplateId) || DEFAULT_COURSEWARE_TEMPLATE
  return DEFAULT_COURSEWARE_TEMPLATE
}

function coursewareSlides(template) {
  return template?.slides?.length ? template.slides : DEFAULT_COURSEWARE_TEMPLATE.slides
}

const STUDENT_REACTIONS = [
  { id: 'understand', emoji: '✅', label: 'I understand', tone: 'green' },
  { id: 'help', emoji: '❓', label: 'I need help', tone: 'pink' },
  { id: 'repeat', emoji: '🔁', label: 'Please repeat', tone: 'orange' },
  { id: 'done', emoji: '🌟', label: 'I am done', tone: 'purple' },
  { id: 'hand', emoji: '✋', label: 'Raise hand', tone: 'blue' },
]

function hitTestAnnotation(path, point, width, height, threshold = 18) {
  if (path.tool === 'text' && path.point) {
    const dx = point.x - path.point.x
    const dy = point.y - path.point.y
    const textWidth = ((path.text?.length || 0) * (path.fontSize || 24) * 0.55) / width
    const textHeight = ((path.fontSize || 24) * 1.2) / height
    return Math.abs(dx) < textWidth / 2 + threshold / width && Math.abs(dy) < textHeight / 2 + threshold / height
  }
  if (['rect', 'ellipse', 'line', 'arrow'].includes(path.tool) && path.start && path.end) {
    const minX = Math.min(path.start.x, path.end.x) - threshold / width
    const maxX = Math.max(path.start.x, path.end.x) + threshold / width
    const minY = Math.min(path.start.y, path.end.y) - threshold / height
    const maxY = Math.max(path.start.y, path.end.y) + threshold / height
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
  }
  if (path.tool === 'sticky' && path.point) {
    const noteW = path.noteWidth || 0.18
    const noteH = path.noteHeight || 0.13
    return point.x >= path.point.x && point.x <= path.point.x + noteW
      && point.y >= path.point.y && point.y <= path.point.y + noteH
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
  // Shapes: rectangle, ellipse, line and arrow, drawn from start to end.
  if (['rect', 'ellipse', 'line', 'arrow'].includes(path.tool) && path.start && path.end) {
    const x1 = path.start.x * width
    const y1 = path.start.y * height
    const x2 = path.end.x * width
    const y2 = path.end.y * height
    context.save()
    context.strokeStyle = path.color || '#ff4f87'
    context.lineWidth = path.width || 4
    context.lineCap = 'round'
    context.lineJoin = 'round'
    if (isLivePreview) context.globalAlpha = 0.7
    context.beginPath()
    if (path.tool === 'rect') {
      context.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1))
    } else if (path.tool === 'ellipse') {
      context.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2)
    } else {
      context.moveTo(x1, y1)
      context.lineTo(x2, y2)
    }
    context.stroke()
    if (path.tool === 'arrow') {
      // Arrowhead sized relative to the stroke so it stays proportional.
      const angle = Math.atan2(y2 - y1, x2 - x1)
      const head = Math.max(12, (path.width || 4) * 3)
      context.beginPath()
      context.moveTo(x2, y2)
      context.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6))
      context.moveTo(x2, y2)
      context.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6))
      context.stroke()
    }
    if (selected) {
      context.strokeStyle = '#7048df'
      context.lineWidth = 2
      context.setLineDash([6, 4])
      context.strokeRect(Math.min(x1, x2) - 6, Math.min(y1, y2) - 6, Math.abs(x2 - x1) + 12, Math.abs(y2 - y1) + 12)
      context.setLineDash([])
    }
    context.restore()
    return
  }

  // Sticky note: a coloured card with wrapped text, for lesson reminders.
  if (path.tool === 'sticky' && path.point) {
    const noteW = (path.noteWidth || 0.18) * width
    const noteH = (path.noteHeight || 0.13) * height
    const x = path.point.x * width
    const y = path.point.y * height
    context.save()
    if (isLivePreview) context.globalAlpha = 0.75
    context.fillStyle = path.color || '#ffe27a'
    context.shadowColor = 'rgba(0,0,0,0.28)'
    context.shadowBlur = 10
    context.shadowOffsetY = 4
    context.beginPath()
    context.roundRect?.(x, y, noteW, noteH, 8) ?? context.rect(x, y, noteW, noteH)
    context.fill()
    context.shadowColor = 'transparent'
    // Word-wrapped body text.
    context.fillStyle = '#2a2118'
    const size = path.fontSize || 16
    context.font = `600 ${size}px Arial, sans-serif`
    context.textBaseline = 'top'
    const words = String(path.text || '').split(/\s+/).filter(Boolean)
    const maxWidth = noteW - 16
    let line = ''
    let lineY = y + 10
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word
      if (context.measureText(test).width > maxWidth && line) {
        context.fillText(line, x + 8, lineY)
        line = word
        lineY += size * 1.3
      } else line = test
    })
    if (line && lineY < y + noteH - 4) context.fillText(line, x + 8, lineY)
    if (selected) {
      context.strokeStyle = '#7048df'
      context.lineWidth = 2
      context.setLineDash([6, 4])
      context.strokeRect(x - 4, y - 4, noteW + 8, noteH + 8)
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
  // WebRTC needs exactly one side to create the offer and one to answer. That
  // was decided by account.role === 'teacher', which silently broke whenever
  // the person on the teaching side was not a teacher account — most obviously
  // an administrator opening the classroom from the admin dashboard, where
  // their own admin account is passed in. Both ends then behaved as the
  // answering side, no offer was ever created, and the pair sat forever on
  // "Both of you are in the room. Re-establishing the video link".
  //
  // Decide it from the BOOKING instead: whoever is not the booked student
  // hosts the call. Falls back to the account role when the ids are missing.
  const isBookedStudent = String(roomBooking.studentId || '') === String(account.id)
  const isHost = roomBooking.teacherId || roomBooking.studentId
    ? !isBookedStudent
    : account.role === 'teacher'
  const teacherClassroom = account.role === 'teacher' ? account.teacher?.classroom : teacher?.teacher?.classroom
  const useTencentClassroom = teacherClassroom?.platform === 'voov' && isTencentClassroomConfigured()
  const voovFallbackLink = teacherClassroom?.voovLink || ''
  const participantName = account.role === 'student' ? learner?.name : account.fullName || account.parentName || 'Participant'
  // Stable per person AND per booking. Previously this used a fresh random
  // UUID on every mount, so a refresh, a reconnect or React StrictMode's double
  // mount each registered as a brand-new participant. Presence counted the
  // ghosts (a 1-to-1 lesson showing 5 people) and, because count > 1 looked
  // like "both here", the video handshake kept retrying against people who had
  // already gone. Supabase presence is keyed on this id, so reusing it means a
  // rejoin REPLACES the previous entry instead of stacking another one.
  // Cloudflare mints short-lived TURN credentials, so the ICE config is not
  // known at module load. Fetched once when the classroom opens and reused for
  // every reconnect within the session.
  const rtcConfigRef = useRef(rtcConfiguration)
  const participantIdRef = useRef(`${account.id}::${roomBooking.id}`)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const localTencentViewRef = useRef(null)
  const remoteTencentViewRef = useRef(null)
  const remoteTencentScreenRef = useRef(null)
  const remoteTencentScreenUserRef = useRef(null)
  const trtcRef = useRef(null)
  const trtcModuleRef = useRef(null)
  const sharedScreenVideoRef = useRef(null)
  const remoteScreenVideoRef = useRef(null)
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
  const classJoinedAtRef = useRef(null)
  const recorderRef = useRef(null)
  const recordingTimerRef = useRef(null)
  const [recording, setRecording] = useState(false)
  const [remoteRecording, setRemoteRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordingStatus, setRecordingStatus] = useState('')
  const [recordingError, setRecordingError] = useState('')
  const [savedRecordings, setSavedRecordings] = useState(() => (booking?.classroomRecordings || []))
  const [joined, setJoined] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [teacherPresent, setTeacherPresent] = useState(false)
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
  const [visitorLocale, setVisitorLocale] = useState(currentVisitorLocale)
  const [lowBandwidthMode, setLowBandwidthMode] = useState(false)
  const [reconnectKey, setReconnectKey] = useState(0)
  const [participantCount, setParticipantCount] = useState(1)
  const [iceDetail, setIceDetail] = useState('')
  const [transportStats, setTransportStats] = useState(null)
  const [annotationMode, setAnnotationMode] = useState(false)
  const [annotationTool, setAnnotationTool] = useState('pen')
  const [stickyColor, setStickyColor] = useState('#ffe27a')
  const [annotationColor, setAnnotationColor] = useState('#ff4f87')
  const [studentAnnotationAllowed, setStudentAnnotationAllowed] = useState(false)
  const [textEditor, setTextEditor] = useState(null)
  const [textDraft, setTextDraft] = useState('')
  const [files, setFiles] = useState([])
  const [cosSlidePage, setCosSlidePage] = useState(1)
  const [documentViewMode, setDocumentViewMode] = useState('fit-width')
  const [documentZoom, setDocumentZoom] = useState(1)
  const [documentScrollRatio, setDocumentScrollRatio] = useState(null)
  const [useGoogleClassroomMode, setUseGoogleClassroomMode] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('chat')
  const [speechSummary, setSpeechSummary] = useState(null)
  // Practice words come from the teacher's most recent feedback on this booking,
  // falling back to the current courseware slide's vocabulary.
  const speechPracticeWords = Array.isArray(roomBooking?.teacherFeedback?.practiceWords)
    ? roomBooking.teacherFeedback.practiceWords
    : []
  const chinaConnection = isChineseVisitor(visitorLocale) || isChineseVisitor({ language: '', country: studentAccount?.registrationCountry })
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
  const [latestStudentReaction, setLatestStudentReaction] = useState(null)
  const [sentReactionId, setSentReactionId] = useState('')
  const [remotePointerPosition, setRemotePointerPosition] = useState(null)
  const [selectedPathId, setSelectedPathId] = useState(null)
  const [presenterUrl, setPresenterUrl] = useState('')
  const [presenterUrlInput, setPresenterUrlInput] = useState('')
  const [presenterUrlDraft, setPresenterUrlDraft] = useState('')
  const [websiteFrameKey, setWebsiteFrameKey] = useState(0)
  const [embedError, setEmbedError] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [canUndoClear, setCanUndoClear] = useState(false)
  const [coursewareTemplate, setCoursewareTemplate] = useState(() => resolveBookingCoursewareTemplate(roomBooking))
  const [availableCoursewareTemplates, setAvailableCoursewareTemplates] = useState(() => getCoursewareTemplates())
  const [coursewareSlideIndex, setCoursewareSlideIndex] = useState(0)
  const [coursewareShowAnswer, setCoursewareShowAnswer] = useState(false)
  const [classStars, setClassStars] = useState(0)
  const activeCoursewareSlides = coursewareSlides(coursewareTemplate)
  const coursewareTemplateChoices = availableCoursewareTemplates.some((template) => template.id === coursewareTemplate.id)
    ? availableCoursewareTemplates
    : [coursewareTemplate, ...availableCoursewareTemplates]

  const setVideoStream = (element, stream) => {
    if (element && element.srcObject !== stream) {
      element.srcObject = stream || null
      if (stream) element.play?.().catch(() => {})
    }
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

  useEffect(() => {
    const refreshCoursewareTemplates = () => setAvailableCoursewareTemplates(getCoursewareTemplates())
    window.addEventListener('storage', refreshCoursewareTemplates)
    window.addEventListener('tutorpro:courseware-change', refreshCoursewareTemplates)
    return () => {
      window.removeEventListener('storage', refreshCoursewareTemplates)
      window.removeEventListener('tutorpro:courseware-change', refreshCoursewareTemplates)
    }
  }, [])

  useEffect(() => {
    setCoursewareTemplate(resolveBookingCoursewareTemplate(roomBooking))
    setCoursewareSlideIndex(0)
    setCoursewareShowAnswer(false)
  }, [roomBooking.id, roomBooking.coursewareTemplateId, roomBooking.coursewareTemplate?.updatedAt])

  // Hide support widget while classroom is open
  useEffect(() => {
    if (!joined) return undefined
    document.body.classList.add('classroom-active')
    return () => document.body.classList.remove('classroom-active')
  }, [joined])

  useEffect(() => subscribeToVisitorLocale(setVisitorLocale), [])

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
        video: lowBandwidthMode
          ? { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 12, max: 18 }, facingMode: 'user' }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 }, facingMode: 'user' },
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
    setVideoStream(remoteScreenVideoRef.current, remoteStreamRef.current)
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

  // Sample the transport counters for the staff diagnostics line. Polled
  // rather than read during render, which would be an impure read of a ref.
  useEffect(() => {
    if (!joined || connectionStatus === 'connected') return undefined
    const timer = window.setInterval(() => {
      setTransportStats(transportRef.current?.stats?.() || null)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [joined, connectionStatus])

  // Load the teacher's previously uploaded material so it can be re-shared
  // without uploading the same file every lesson.
  const [libraryFiles, setLibraryFiles] = useState([])
  useEffect(() => {
    if (!joined || account.role !== 'teacher' || !isClassroomStorageAvailable()) return undefined
    let active = true
    listTeacherLibrary(account.id)
      .then((items) => { if (active) setLibraryFiles(items) })
      .catch(() => { /* The library is a convenience; uploading still works. */ })
    return () => { active = false }
  }, [joined, account.role, account.id, uploadingFile])

  const shareLibraryFile = async (item) => {
    try {
      setFileError('')
      const signedUrl = await getClassroomFileUrl(item.storagePath)
      if (!signedUrl) throw new Error('That file could not be opened. It may have been removed.')
      const entry = { ...item, dataUrl: signedUrl, sender: participantName }
      setFiles((current) => current.some((f) => f.storagePath === entry.storagePath) ? current : [...current, entry])
      transportRef.current?.send({ type: 'classroom-file-storage', file: entry })
      await presentFile(entry)
    } catch (error) {
      setFileError(error.message || 'That file could not be shared.')
    }
  }

  // Mint Cloudflare TURN credentials as soon as the classroom opens, so the
  // relay is ready before the first connection attempt rather than after it has
  // already failed. Harmless and instant when Cloudflare is not configured.
  const [relayReady, setRelayReady] = useState(false)
  useEffect(() => {
    if (!joined || !access.allowed) return undefined
    let active = true
    // The whole connection waits on relayReady, so this must never be able to
    // hang. If the credential lookup is slow we proceed without the relay
    // rather than leave the pair staring at a spinner; a later ICE restart
    // picks the relay up once it arrives.
    const failSafe = window.setTimeout(() => { if (active) setRelayReady(true) }, 4000)
    fetchDynamicIceServers()
      .then((servers) => {
        if (!active) return
        if (servers.length) {
          rtcConfigRef.current = {
            ...rtcConfigRef.current,
            iceServers: [...buildRtcConfiguration().iceServers, ...servers],
          }
        }
      })
      .catch(() => { /* Direct connection is still attempted. */ })
      .finally(() => { if (active) setRelayReady(true) })
    return () => { active = false; window.clearTimeout(failSafe) }
  }, [joined, access.allowed])

  useEffect(() => {
    // Wait for the relay lookup so the very first offer already carries relay
    // candidates. Without this the first attempt could fail on a restrictive
    // network and only the retry would succeed.
    if (!joined || !access.allowed || !relayReady) return undefined
    let active = true

    const ensurePeer = () => {
      if (peerRef.current) return peerRef.current
      const peer = new RTCPeerConnection(rtcConfigRef.current)
      peerRef.current = peer
      const outgoingStream = screenSharing && screenStreamRef.current ? screenStreamRef.current : localStreamRef.current
      const audioTracks = localStreamRef.current?.getAudioTracks() || []
      const videoTracks = outgoingStream?.getVideoTracks() || localStreamRef.current?.getVideoTracks() || []
      audioTracks.forEach((track) => peer.addTrack(track, localStreamRef.current))
      videoTracks.slice(0, 1).forEach((track) => peer.addTrack(track, outgoingStream || localStreamRef.current))
      peer.onicecandidate = (event) => {
        if (event.candidate) transportRef.current?.send({ type: 'ice', candidate: event.candidate })
      }
      peer.ontrack = (event) => {
        const stream = event.streams[0]
        if (stream) {
          remoteStreamRef.current = stream
          setVideoStream(remoteVideoRef.current, stream)
          setVideoStream(remoteScreenVideoRef.current, stream)
        }
      }
      // An ICE restart is the correct recovery when the chosen network path
      // dies (wifi to mobile handover, a NAT binding expiring, a relay
      // switching). Without it the connection sat in 'failed' forever and the
      // only way out was for someone to leave and rejoin.
      peer.oniceconnectionstatechange = () => {
        setIceDetail(peer.iceConnectionState)
        if (peer.iceConnectionState !== 'failed') return
        try {
          if (typeof peer.restartIce === 'function') peer.restartIce()
          // Only the teacher re-offers, so both sides cannot renegotiate at
          // once and glare.
          if (isHost) void sendTeacherOffer(true)
        } catch { /* The periodic reconnect below is the backstop. */ }
      }
      peer.onconnectionstatechange = () => {
        const status = peer.connectionState
        if (status === 'connected') setConnectionStatus('connected')
        else if (['failed', 'disconnected', 'closed'].includes(status)) {
          setConnectionStatus(status)
          if (status !== 'closed' && !isHost) transportRef.current?.send({ type: 'join-request', role: account.role, reconnect: true })
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
      if (peerRef.current) {
        peerRef.current.onconnectionstatechange = null
        // Detach the ICE handler too, otherwise a dying peer can fire a
        // restart against a connection we have already replaced.
        peerRef.current.oniceconnectionstatechange = null
      }
      peerRef.current?.close()
      peerRef.current = null
      pendingIceRef.current = []
      return ensurePeer()
    }

    const sendTeacherOffer = async (forceRestart = false) => {
      let peer = ensurePeer()
      // A handshake that never completes leaves the peer in 'connecting' with a
      // non-stable signalingState. The old guard then returned early on every
      // retry, so the call sat on "re-establishing the video link" forever.
      // Treat an offer that has been outstanding too long as stale and rebuild.
      const offerIsStale = offerStartedAtRef.current && Date.now() - offerStartedAtRef.current > 7000
      const stuckConnecting = peer.connectionState === 'connecting' && offerIsStale
      if (forceRestart || stuckConnecting || peer.connectionState === 'failed' || peer.connectionState === 'closed' || (peer.signalingState !== 'stable' && offerIsStale)) {
        peer = resetPeer()
      }
      if (peer.connectionState === 'connected') return
      // Only bail on a non-stable state when the offer is still fresh; a stale
      // one has already triggered the reset above.
      if (peer.signalingState !== 'stable' && !offerIsStale) return
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
        // Ignore our own entries. Presence keys are `${accountId}::${bookingId}`,
        // so anything sharing our prefix is another tab or a stale entry of
        // ours, not the other participant.
        const others = Array.isArray(message.peers)
          ? message.peers.filter((peer) => String(peer) !== participantIdRef.current)
          : null
        const count = others ? Math.max(1, others.length + 1) : Math.max(1, Number(message.count) || 1)
        setParticipantCount(count)
        if (count > 1 && !useTencentClassroom) {
          if (isHost) transportRef.current?.send({ type: 'teacher-ready' })
          else transportRef.current?.send({ type: 'join-request', role: account.role })
        } else if (count === 1) {
          // Presence dropped back to just us. Covers the cases where no 'leave'
          // is ever sent: the other side closed the tab, shut the laptop or
          // lost connection. Clear their video so it does not sit frozen.
          setRemoteScreenSharing(false)
          setRemoteScreenPaused(false)
          remoteStreamRef.current = null
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
          if (remoteScreenVideoRef.current) remoteScreenVideoRef.current.srcObject = null
        }
        return
      }
      if (message.type === 'leave') {
        // The other participant ended the class. Without this the remaining
        // person kept seeing the last frozen frame of the teacher's camera or
        // shared screen, which looked like the lesson was still live.
        setRemoteScreenSharing(false)
        setRemoteScreenPaused(false)
        setParticipantCount(1)
        setConnectionStatus('disconnected')
        remoteStreamRef.current = null
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
        if (remoteScreenVideoRef.current) remoteScreenVideoRef.current.srcObject = null
        // Drop the peer so a later rejoin negotiates cleanly instead of
        // resuming a half-dead connection.
        peerRef.current?.close()
        peerRef.current = null
        pendingIceRef.current = []
        offerStartedAtRef.current = 0
        return
      }
      if (message.type === 'teacher-ready' && !isHost && !useTencentClassroom) {
        transportRef.current?.send({ type: 'join-request', role: account.role })
        return
      }
      if (message.type === 'join-request' && isHost) {
        // A student just arrived. If the teacher is already in the room, tell
        // them immediately so they are not left waiting.
        if (joined) transportRef.current?.send({ type: 'teacher-present', present: true })
      }
      if (message.type === 'join-request' && isHost && !useTencentClassroom) {
        transportRef.current?.send({ type: 'annotation-permission', allowed: annotationPermissionRef.current })
        transportRef.current?.send({ type: 'pointer-permission', allowed: pointerPermissionRef.current })
        if (studentMuted) transportRef.current?.send({ type: 'mute-student', muted: true })
        await sendTeacherOffer(Boolean(message.reconnect))
        return
      }
      if (message.type === 'offer' && !isHost && !useTencentClassroom) {
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
      if (message.type === 'answer' && isHost && !useTencentClassroom) {
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
      if (message.type === 'courseware-state') {
        const incomingTemplate = message.template?.slides?.length
          ? normalizeCoursewareTemplate(message.template)
          : message.templateId
            ? getCoursewareTemplateById(message.templateId)
            : null
        const slides = coursewareSlides(incomingTemplate || coursewareTemplate)
        if (incomingTemplate) setCoursewareTemplate(incomingTemplate)
        setCoursewareSlideIndex(Math.max(0, Math.min(slides.length - 1, Number(message.slideIndex) || 0)))
        setCoursewareShowAnswer(Boolean(message.showAnswer))
        if (message.clearPresentation) { setPresenterUrl(''); setPresentedFile(null); setRemoteScreenSharing(false) }
        return
      }
      if (message.type === 'courseware-reward') {
        setClassStars(Number(message.stars) || 0)
        confetti({ particleCount: 55, spread: 65, origin: { y: 0.72 }, colors: ['#bce94e', '#7048df', '#ff4f87'] })
        return
      }
      if (message.type === 'teacher-present') {
        // Release any waiting student as soon as the teacher announces presence.
        setTeacherPresent(Boolean(message.present))
        if (message.present && account.role === 'student') {
          setWaiting((isWaiting) => { if (isWaiting) setJoined(true); return false })
        }
        return
      }
      if (message.type === 'recording-state') {
        // Students are always told when the teacher is recording.
        setRemoteRecording(Boolean(message.recording))
        return
      }
      if (message.type === 'student-reaction') {
        setLatestStudentReaction(message.reaction || null)
        if (account.role === 'teacher' && message.reaction) {
          setSidebarOpen(true)
        }
        return
      }
      if (message.type === 'student-reaction-clear') {
        setLatestStudentReaction(null)
        return
      }
      if (message.type === 'presentation-file') {
        const incomingFile = message.file || null
        if (incomingFile?.storagePath && !incomingFile.dataUrl) {
          const fileUrl = await getClassroomFileUrl(incomingFile.storagePath)
          setPresentedFile({ ...incomingFile, dataUrl: fileUrl || '' })
        } else setPresentedFile(incomingFile)
        return
      }
      if (message.type === 'slide-page') {
        setCosSlidePage(Number(message.page) || 1)
        return
      }
      if (message.type === 'document-scroll') {
        const ratio = Number(message.ratio)
        if (Number.isFinite(ratio)) setDocumentScrollRatio(Math.max(0, Math.min(1, ratio)))
        return
      }
      if (message.type === 'document-view-state') {
        setCosSlidePage(Number(message.page) || 1)
        if (['fit-width', 'fit-page'].includes(message.viewMode)) setDocumentViewMode(message.viewMode)
        const incomingZoom = Number(message.zoom)
        if (Number.isFinite(incomingZoom)) setDocumentZoom(Math.max(0.5, Math.min(2.5, incomingZoom)))
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
        setPresenterUrlDraft('')
        setEmbedError('')
        setWebsiteFrameKey(Number(message.reloadKey) || Date.now())
        if (message.url) { setPresentedFile(null); setRemoteScreenSharing(false) }
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
      // 'connecting' with a long-outstanding offer means the handshake stalled,
      // which the browser never reports as 'failed'. Ask for a restart in that
      // case too, otherwise the pair can wait indefinitely.
      const stalled = offerStartedAtRef.current && Date.now() - offerStartedAtRef.current > 7000
      const needsRestart = ['failed', 'disconnected'].includes(peerRef.current?.connectionState) || stalled
      if (isHost) {
        if (needsRestart) void sendTeacherOffer(true)
        else transportRef.current?.send({ type: 'teacher-ready' })
      } else {
        transportRef.current?.send({ type: 'join-request', role: account.role, reconnect: needsRestart })
      }
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
  }, [joined, access.allowed, relayReady, isHost, account.role, roomBooking.id, roomBooking.classroomId, roomBooking.classroomToken, reconnectKey, useTencentClassroom, studentMuted])

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

  /**
   * Persist a join or leave event onto the booking so parents and admins can
   * see who actually attended. Best-effort: attendance must never block the
   * lesson from starting.
   */
  const saveAttendance = (action) => {
    if (!roomBooking?.id) return
    try {
      const latest = getBookings().find((item) => item.id === roomBooking.id) || roomBooking
      const name = account.role === 'teacher'
        ? (account.fullName || 'Teacher')
        : (learner?.name || roomBooking.learnerName || 'Student')
      const next = action === 'join'
        ? recordJoin(latest.attendance, account.role, { name })
        : recordLeave(latest.attendance, account.role)
      const updated = updateBooking(roomBooking.id, { attendance: next })
      syncBookingNow(updated).catch(() => {})
    } catch {
      // Attendance is a reporting aid, never a blocker.
    }
  }

  const joinClass = async () => {
    const stream = localStreamRef.current || await requestMedia()
    if (!stream) return
    if (!classJoinedAtRef.current) classJoinedAtRef.current = new Date().toISOString()
    saveAttendance('join')
    // Students wait until the teacher is in the room. Teachers enter directly.
    if (!isHost && account.role === 'student' && !teacherPresent) {
      setWaiting(true)
      return
    }
    setWaiting(false)
    setJoined(true)
    if (isHost) {
      transportRef.current?.send({ type: 'teacher-present', present: true })
    }
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
      else if (peerRef.current) peerRef.current.addTrack(screenTrack, stream)
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

  /* ---------------- Lesson recording (teacher only) ---------------- */

  const persistRecording = (record) => {
    if (!roomBooking?.id) return
    try {
      const existing = Array.isArray(roomBooking.classroomRecordings) ? roomBooking.classroomRecordings : []
      const next = [...existing, record].slice(-20)
      const updated = updateBooking(roomBooking.id, {
        classroomRecordings: next,
        lastRecordingAt: record.recordedAt,
      })
      setSavedRecordings(next)
      syncBookingNow(updated).catch(() => {})
    } catch {
      // Recording is already stored; booking metadata is best-effort.
    }
  }

  const stopRecording = () => {
    if (!recorderRef.current) return
    setRecordingStatus('Saving recording…')
    recorderRef.current.stop()
    recorderRef.current = null
    window.clearInterval(recordingTimerRef.current)
    setRecording(false)
    transportRef.current?.send({ type: 'recording-state', recording: false })
  }

  const startRecording = () => {
    setRecordingError('')
    if (!isRecordingSupported()) {
      setRecordingError('Recording needs Chrome, Edge or Safari. Please switch browser.')
      return
    }
    if (!isRecordingStorageAvailable()) {
      setRecordingError('Recording storage is not configured. Run the classroom_recordings_storage.sql file in Supabase.')
      return
    }
    try {
      // Record whatever the teacher is presenting, plus both voices.
      const videoSource = screenSharing && screenStreamRef.current ? screenStreamRef.current : localStreamRef.current
      const controller = startClassroomRecording({
        videoStream: videoSource,
        audioStreams: [localStreamRef.current, remoteStreamRef.current].filter(Boolean),
        onError: (error) => {
          setRecordingError(error?.message || 'Recording stopped unexpectedly.')
          setRecording(false)
          window.clearInterval(recordingTimerRef.current)
        },
        onStop: async ({ blob, durationMs, mimeType }) => {
          try {
            setRecordingStatus('Uploading recording…')
            const record = await uploadClassroomRecording(roomBooking.id, blob, {
              durationMs,
              mimeType,
              recordedBy: account.id,
              recordedByName: account.fullName || 'TutorPro Teacher',
              learnerName: learner?.name || roomBooking.learnerName || 'Student',
            })
            persistRecording(record)
            setRecordingStatus(`Recording saved · ${formatRecordingDuration(durationMs)} · ${formatRecordingSize(blob.size)}`)
            window.setTimeout(() => setRecordingStatus(''), 6000)
          } catch (uploadError) {
            setRecordingError(uploadError?.message || 'The recording could not be uploaded.')
            setRecordingStatus('')
          }
        },
      })
      recorderRef.current = controller
      setRecording(true)
      setRecordingSeconds(0)
      setRecordingStatus('')
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000)
      // Students must always know when they are being recorded.
      transportRef.current?.send({ type: 'recording-state', recording: true })
    } catch (error) {
      setRecordingError(error?.message || 'Recording could not start.')
    }
  }

  const toggleRecording = () => { if (recording) stopRecording(); else startRecording() }

  useEffect(() => () => {
    // Never leave a recorder or its timer running after the classroom closes.
    window.clearInterval(recordingTimerRef.current)
    try { recorderRef.current?.stop() } catch { /* already stopped */ }
    recorderRef.current = null
  }, [])

  const saveClassroomSessionSummary = () => {
    if (account.role !== 'teacher' || !roomBooking?.id || !joined) return
    const endedAt = new Date().toISOString()
    const startedAt = classJoinedAtRef.current || new Date(Date.now() - (elapsed * 1000)).toISOString()
    const currentSlide = activeCoursewareSlides[coursewareSlideIndex] || null
    const summary = {
      startedAt,
      endedAt,
      elapsedSeconds: elapsed,
      teacherId: account.id,
      teacherName: account.fullName || teacher?.fullName || 'TutorPro Teacher',
      learnerName: learner?.name || roomBooking.learnerName || 'Student',
      coursewareTitle: coursewareTemplate?.title || '',
      coursewareSlideNumber: coursewareSlideIndex + 1,
      coursewareSlideTitle: currentSlide?.title || '',
      classStars,
      lastStudentReaction: latestStudentReaction ? {
        label: latestStudentReaction.label,
        emoji: latestStudentReaction.emoji,
        studentName: latestStudentReaction.studentName,
        createdAt: latestStudentReaction.createdAt,
      } : null,
      presentedFileName: presentedFile?.name || '',
      presentedFileSource: presentedFile?.source || '',
      websiteUrl: presenterUrl || '',
      documentPage: cosSlidePage,
      documentViewMode,
      documentZoom,
      sharedFileCount: files.length,
      sharedFiles: files.slice(-10).map((file) => ({ name: file.name, size: file.size, source: file.source || 'inline' })),
      speechSummary: speechSummary ? {
        summary: speechSummary.summary,
        averageScore: speechSummary.averageScore,
        wordCount: speechSummary.stats?.wordCount || 0,
        uniqueCount: speechSummary.stats?.uniqueCount || 0,
        practiceWords: speechSummary.practiceWords || [],
        strongWords: speechSummary.strongWords || [],
        homework: speechSummary.homework || [],
      } : null,
      chatMessageCount: chatMessages.length,
      annotationCount: pathsRef.current.length,
      participantCount,
      connectionStatus,
      savedAt: endedAt,
    }
    try {
      const updated = updateBooking(roomBooking.id, {
        classroomSummary: summary,
        classEndedAt: endedAt,
        classStars,
        lastClassroomActivityAt: endedAt,
      })
      syncBookingNow(updated).catch(() => {})
    } catch {
      // Session recap is best-effort and should not block leaving the classroom.
    }
  }

  const leaveClass = () => {
    saveAttendance('leave')
    if (recorderRef.current) stopRecording()
    saveClassroomSessionSummary()
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    screenStreamRef.current?.getTracks().forEach((track) => track.stop())
    // Send the departure, then give it a moment to flush. Closing the
    // transport in the same tick often discarded the message, so the other
    // participant was never told and sat looking at a frozen video tile.
    const transport = transportRef.current
    const peer = peerRef.current
    transport?.send({ type: 'leave' })
    transportRef.current = null
    peerRef.current = null
    window.setTimeout(() => {
      try { transport?.close() } catch { /* Already closed. */ }
      try { peer?.close() } catch { /* Already closed. */ }
    }, 250)
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
    // Sticky note: reuse the text editor to capture the note body.
    if (annotationTool === 'sticky') {
      setTextEditor(point)
      setTextDraft('')
      liveTextPathRef.current = null
      return
    }
    // Shape tools: drag from start point to end point.
    if (['rect', 'ellipse', 'line', 'arrow'].includes(annotationTool)) {
      event.currentTarget.setPointerCapture(event.pointerId)
      currentPathRef.current = {
        id: crypto.randomUUID(),
        tool: annotationTool,
        color: annotationColor,
        width: 5,
        start: point,
        end: point,
      }
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
      if ((path.tool === 'text' || path.tool === 'sticky') && path.point) {
        path.point = { x: newX, y: newY }
      } else if (path.start && path.end) {
        const dx = newX - path.start.x
        const dy = newY - path.start.y
        path.start = { x: path.start.x + dx, y: path.start.y + dy }
        path.end = { x: path.end.x + dx, y: path.end.y + dy }
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
    // Shapes track a moving end point instead of accumulating points.
    if (currentPathRef.current.start) {
      currentPathRef.current.end = point
      redrawAnnotations(); syncUndoState()
      const shapeCanvas = annotationCanvasRef.current
      const shapeContext = shapeCanvas?.getContext('2d')
      if (shapeCanvas && shapeContext) drawPath(shapeContext, currentPathRef.current, shapeCanvas.width, shapeCanvas.height, { isLivePreview: true })
      return
    }
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
    // The sticky tool reuses this editor, so build the right kind of annotation.
    const path = annotationTool === 'sticky'
      ? { id: crypto.randomUUID(), tool: 'sticky', text: text.slice(0, 240), color: stickyColor, fontSize: 16, noteWidth: 0.18, noteHeight: 0.13, point: textEditor }
      : { id: crypto.randomUUID(), tool: 'text', text: text.slice(0, 500), color: annotationColor, fontSize: 24, point: textEditor }
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

  const sendStudentReaction = (reactionId) => {
    if (account.role !== 'student') return
    const option = STUDENT_REACTIONS.find((item) => item.id === reactionId)
    if (!option) return
    const reaction = {
      ...option,
      id: `${reactionId}-${Date.now()}`,
      reactionId,
      studentName: learner?.name || participantName || 'Student',
      createdAt: new Date().toISOString(),
    }
    setLatestStudentReaction(reaction)
    setSentReactionId(reactionId)
    transportRef.current?.send({ type: 'student-reaction', reaction })
    window.setTimeout(() => setSentReactionId(''), 2200)
  }

  const clearStudentReaction = () => {
    if (account.role !== 'teacher') return
    setLatestStudentReaction(null)
    transportRef.current?.send({ type: 'student-reaction-clear' })
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
    const reloadKey = Date.now()
    setPresenterUrl(finalUrl)
    setPresenterUrlInput(finalUrl)
    setPresentedFile(null)
    setRemoteScreenSharing(false)
    setWebsiteFrameKey(reloadKey)
    transportRef.current?.send({ type: 'presenter-url', url: finalUrl, reloadKey })
    setPresenterUrlDraft('')
  }

  const stopWebsiteEmbed = () => {
    setPresenterUrl('')
    setPresenterUrlInput('')
    setEmbedError('')
    setWebsiteFrameKey(Date.now())
    transportRef.current?.send({ type: 'presenter-url', url: '', reloadKey: Date.now() })
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

  const reloadEmbeddedWebsite = () => {
    if (!presenterUrl) return
    const reloadKey = Date.now()
    setWebsiteFrameKey(reloadKey)
    setEmbedError('')
    transportRef.current?.send({ type: 'presenter-url', url: presenterUrl, reloadKey })
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

      setUploadStatus(isClassroomStorageAvailable() ? 'Uploading to Supabase classroom storage…' : 'Preparing secure classroom file…')
      if (isClassroomStorageAvailable()) {
        const stored = await uploadClassroomFile(roomBooking.id, file, {
          // A teacher's material is saved to their own library so it can be
          // re-shared in any future lesson without uploading again.
          teacherId: account.role === 'teacher' ? account.id : '',
        })
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
        transportRef.current?.send({ type: 'classroom-file-storage', file: entry })
        if (account.role === 'teacher') await presentFile(entry)
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
        if (account.role === 'teacher') await presentFile(entry)
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

  const presentFile = async (file) => {
    const fileUrl = await resolveFileUrl(file)
    const entry = fileUrl ? { ...file, dataUrl: fileUrl } : file
    if (file.storagePath && !fileUrl) {
      setFileError('Could not create a Supabase viewing link for this file. Please try uploading it again.')
      return
    }
    setPresentedFile(entry)
    setCosSlidePage(1)
    setDocumentViewMode('fit-width')
    setDocumentZoom(1)
    transportRef.current?.send({ type: 'presentation-file', file: entry })
    transportRef.current?.send({ type: 'document-view-state', page: 1, viewMode: 'fit-width', zoom: 1 })
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
  // Say what is actually wrong instead of spinning on a generic 'retrying'
  // message. When no relay is configured the call cannot recover on its own,
  // so pretending it is still trying is misleading.
  const connectionAdvice = connectionFailureAdvice({ bothPresent: participantCount > 1 })
  // Surfaced to staff only. Without this a stalled call gives no clue whether
  // signalling, ICE gathering or the relay itself is the problem.
  const connectionDiagnostics = [
    `peer:${connectionStatus}`,
    `ice:${iceDetail || 'n/a'}`,
    `signalling:${signalingStatus}`,
    `in-room:${participantCount}`,
    transportStats ? `sig-sent:${transportStats.sent}/recv:${transportStats.received}` : '',
    transportStats && !transportStats.databaseEnabled ? 'durable:off' : '',
    transportStats?.lastError ? `err:${transportStats.lastError}` : '',
  ].filter(Boolean).join(' · ')
  const connectionHelpText = connectionAdvice.detail
  const showRelayWarning = participantCount > 1
    && !hasTurnRelay()
    && ['failed', 'disconnected'].includes(connectionStatus)

  const broadcastCoursewareState = (slideIndex = coursewareSlideIndex, showAnswer = coursewareShowAnswer, clearPresentation = false, template = coursewareTemplate) => {
    const snapshot = coursewareSnapshot(template)
    transportRef.current?.send({ type: 'courseware-state', slideIndex, showAnswer, clearPresentation, templateId: snapshot.id, template: snapshot })
  }

  const persistCoursewareSelection = (template) => {
    if (account.role !== 'teacher') return
    try {
      const snapshot = coursewareSnapshot(template)
      const updated = updateBooking(roomBooking.id, {
        coursewareTemplateId: snapshot.id,
        coursewareTemplate: snapshot,
        coursewareAssignedAt: new Date().toISOString(),
        coursewareAssignedBy: account.id,
      })
      syncBookingNow(updated).catch(() => {})
    } catch {
      // The live signal still updates the current classroom if booking persistence is temporarily unavailable.
    }
  }

  const chooseCoursewareTemplate = (templateId) => {
    const template = getCoursewareTemplateById(templateId) || coursewareTemplateChoices.find((item) => item.id === templateId) || DEFAULT_COURSEWARE_TEMPLATE
    const normalized = normalizeCoursewareTemplate(template)
    setCoursewareTemplate(normalized)
    setCoursewareSlideIndex(0)
    setCoursewareShowAnswer(false)
    setPresenterUrl('')
    setPresentedFile(null)
    setRemoteScreenSharing(false)
    persistCoursewareSelection(normalized)
    broadcastCoursewareState(0, false, true, normalized)
  }

  const goToCoursewareSlide = (nextIndex) => {
    const index = Math.max(0, Math.min(activeCoursewareSlides.length - 1, nextIndex))
    setCoursewareSlideIndex(index)
    setCoursewareShowAnswer(false)
    setPresenterUrl('')
    setPresentedFile(null)
    setRemoteScreenSharing(false)
    broadcastCoursewareState(index, false, true)
  }

  const toggleCoursewareAnswer = () => {
    const next = !coursewareShowAnswer
    setCoursewareShowAnswer(next)
    broadcastCoursewareState(coursewareSlideIndex, next, true)
  }

  const rewardStudent = () => {
    const next = classStars + 1
    setClassStars(next)
    transportRef.current?.send({ type: 'courseware-reward', stars: next })
    confetti({ particleCount: 75, spread: 70, origin: { y: 0.7 }, colors: ['#bce94e', '#7048df', '#ff4f87'] })
  }

  const renderCoursewareSlide = () => {
    const slide = activeCoursewareSlides[coursewareSlideIndex] || activeCoursewareSlides[0] || DEFAULT_COURSEWARE_TEMPLATE.slides[0]
    return (
      <div className="classroom-courseware-stage">
        <div className="classroom-courseware-stage__bg" aria-hidden="true" />
        <div className="classroom-courseware-card">
          <div className="classroom-courseware-card__top"><span>{slide.type}</span><small>{coursewareTemplate.title} · Slide {coursewareSlideIndex + 1}/{activeCoursewareSlides.length}</small></div>
          <h2>{slide.title}</h2>
          <p className="classroom-courseware-objective">{slide.objective}</p>
          <div className="classroom-courseware-prompt"><strong>Student task</strong><p>{slide.prompt}</p></div>
          {coursewareShowAnswer && <div className="classroom-courseware-answer"><strong>Suggested answer</strong><p>{slide.answer}</p></div>}
          <div className="classroom-courseware-vocab">{slide.vocabulary.map((word) => <i key={word}>{word}</i>)}</div>
        </div>
        <aside className="classroom-courseware-notes"><span><Sparkles size={17} /> Teacher notes</span><p>{slide.teacherNote}</p><div><Star size={16} fill="currentColor" /> {classStars} class star{classStars === 1 ? '' : 's'}</div></aside>
      </div>
    )
  }

  const isEdbFile = (file) => /\.edb$/i.test(file.name)
  const isEpubFile = (file) => /\.epub$/i.test(file.name)

  const syncDocumentViewState = (changes = {}) => {
    const nextPage = Math.max(1, Number(changes.page ?? cosSlidePage) || 1)
    const nextMode = ['fit-width', 'fit-page'].includes(changes.viewMode) ? changes.viewMode : documentViewMode
    const nextZoom = Math.max(0.5, Math.min(2.5, Number(changes.zoom ?? documentZoom) || 1))
    setCosSlidePage(nextPage)
    setDocumentViewMode(nextMode)
    setDocumentZoom(nextZoom)
    transportRef.current?.send({ type: 'document-view-state', page: nextPage, viewMode: nextMode, zoom: nextZoom })
    transportRef.current?.send({ type: 'slide-page', page: nextPage })
  }

  const renderPresentedFile = (file) => {
    const fileUrl = file.dataUrl || file.url || ''
    const lowerName = String(file.name || '').toLowerCase()
    const boardPreviewSupported = fileUrl && (
      file.type?.startsWith('image/')
      || file.type === 'application/pdf'
      || ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ppt', '.pptx', '.doc', '.docx'].some((extension) => lowerName.endsWith(extension))
    )
    if (boardPreviewSupported) {
      return (
        <div className="classroom-file-presentation" style={{ width: '100%', height: '100%', padding: '0' }}>
          <SafeSlidesErrorBoundary>
            <WhiteboardSlides
              fileId={file.id}
              fileName={file.name}
              fileUrl={fileUrl}
              isTeacher={account.role === 'teacher'}
              currentPage={cosSlidePage}
              viewMode={documentViewMode}
              zoom={documentZoom}
              onPageChange={(newPage) => syncDocumentViewState({ page: newPage })}
              onViewChange={(viewState) => syncDocumentViewState(viewState)}
              onScrollRatioChange={(ratio) => transportRef.current?.send({ type: 'document-scroll', ratio })}
              followScrollRatio={account.role === 'teacher' ? undefined : documentScrollRatio}
            />
          </SafeSlidesErrorBoundary>
        </div>
      )
    }
    if (isEdbFile(file)) {
      return (
        <div className="classroom-file-presentation">
          <div><Presentation size={54} /><strong>{file.name}</strong><span>ClassIn EDB files can be downloaded and opened in ClassIn.</span><a href={fileUrl || '#'} download={file.name}>Download EDB file</a></div>
          <small><Paperclip size={13} /> {file.name}</small>
        </div>
      )
    }
    if (isEpubFile(file)) {
      return (
        <div className="classroom-file-presentation">
          <div><Presentation size={54} /><strong>{file.name}</strong><span>EPUB books can be downloaded and opened in your e-reader.</span><a href={fileUrl || '#'} download={file.name}>Download EPUB</a></div>
          <small><Paperclip size={13} /> {file.name}</small>
        </div>
      )
    }
    return (
      <div className="classroom-file-presentation">
        {file.type?.startsWith('image/') ? <img src={fileUrl} alt={file.name} /> :
         file.type === 'application/pdf' ? <object data={fileUrl} type="application/pdf" aria-label={file.name}><div className="pdf-fallback"><Presentation size={42} /><strong>{file.name}</strong><span>This browser cannot embed the PDF.</span><a href={fileUrl} download={file.name}>Open PDF</a></div></object> :
         <div><Presentation size={54} /><strong>{file.name}</strong><span>{file.storagePath ? 'Preparing the Supabase viewing link…' : 'Use the download button to open this lesson file.'}</span></div>}
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
    const displayUrl = presenterUrl.replace(/^https?:\/\//, '')
    return (
      <div className="classroom-website-embed classroom-website-embed--browser">
        <div className="website-embed-header website-embed-header--browser">
          <Globe size={18} />
          <label className="website-embed-address" aria-label="Classroom website address">
            <span>URL</span>
            <input
              type="url"
              value={presenterUrlInput}
              onChange={(event) => setPresenterUrlInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && account.role === 'teacher') handleUpdatePresenterUrl() }}
              readOnly={account.role === 'student'}
            />
          </label>
          {account.role === 'teacher' && <button onClick={handleUpdatePresenterUrl} title="Go to this website"><ArrowRight size={16} /></button>}
          <button onClick={reloadEmbeddedWebsite} title="Refresh website"><RefreshCw size={16} /></button>
          <button onClick={() => handleOpenWebsite(presenterUrl)} title="Open in a new tab"><ExternalLink size={16} /></button>
          {account.role === 'teacher' && <button onClick={stopWebsiteEmbed} title="Close website presenter"><X size={16} /></button>}
        </div>
        {embedError && <div className="website-embed-error"><WifiOff size={16} /> {embedError}</div>}
        <iframe
          key={`${presenterUrl}:${websiteFrameKey}`}
          src={presenterUrl}
          className="website-embed-frame"
          title={`Classroom website browser: ${displayUrl}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-presentation"
          referrerPolicy="no-referrer-when-downgrade"
          allow="fullscreen; autoplay; clipboard-read; clipboard-write; encrypted-media; picture-in-picture"
          onLoad={() => setEmbedError('')}
          onError={() => setEmbedError('This website blocked classroom embedding. Open it in a new tab or use screen share backup.')}
        />
        <div className="website-embed-help">
          <span><ShieldCheck size={13} /> In-class web presenter</span>
          <p>If this website stays blank, it blocks embedded classroom browsers. Use <button onClick={() => handleOpenWebsite(presenterUrl)}>Open tab</button>{account.role === 'teacher' ? <> or <button onClick={handleStartTabShare}>screen share backup</button></> : null}.</p>
        </div>
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
            <span className="classroom-brand"><Presentation size={20} /> TutorPro Online English Classroom</span>
            {useTencentClassroom && <span className="tencent-provider-badge"><Video size={14} /> Embedded VooV / Tencent RTC</span>}
            {chinaConnection && <div className="china-classroom-connect-card"><div><Globe size={17} /><strong>China connection mode</strong></div><p>For China networks, Chrome/Edge plus Tencent/VooV gives the best class connection. If video does not connect, open the VooV backup link.</p><div><button type="button" onClick={() => setLowBandwidthMode((value) => !value)}>{lowBandwidthMode ? 'Standard video' : 'Low-bandwidth mode'}</button>{voovFallbackLink && <a href={voovFallbackLink} target="_blank" rel="noreferrer">Open VooV backup</a>}</div></div>}
            <small>{account.role === 'teacher' ? 'Teacher room' : account.role === 'admin' ? 'Administrator access' : 'Booked student room'}</small>
            <h1>Ready for class, {participantName}?</h1>
            <p>{teacher?.fullName} with {learner?.name} · {new Date(`${roomBooking.date}T12:00`).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })} at <strong className="classroom-lesson-time">{formatTime(roomBooking.time)}</strong></p>
            <div className="prejoin-room-id"><span><ShieldCheck size={16} /></span><div><small>Unique classroom ID</small><strong>{roomBooking.classroomId}</strong></div><button onClick={copyRoomId}>{copied ? <Check size={16} /> : <Copy size={16} />}</button></div>
            {mediaError && <div className="classroom-error"><WifiOff size={17} /> {mediaError}</div>}
            {waiting ? (
              <div className="classroom-waiting-room" role="status" aria-live="polite">
                <span className="classroom-waiting-room__spinner" aria-hidden="true" />
                <strong>Waiting for {teacher?.fullName || 'your teacher'} to start the class</strong>
                <small>You are in the waiting room. The lesson will open automatically the moment your teacher joins — please keep this page open.</small>
                <button className="classroom-secondary-button" onClick={() => { setWaiting(false); setJoined(true) }}>Enter anyway</button>
              </div>
            ) : !mediaReady ? <button className="classroom-main-button" onClick={requestMedia}><Camera size={18} /> Enable camera & microphone</button> : <button className="classroom-main-button" onClick={joinClass}><Video size={18} /> {account.role === 'student' && !teacherPresent ? 'Join and wait for teacher' : 'Enter private classroom'}</button>}
            <p className="prejoin-privacy"><ShieldCheck size={14} /> Only this booking's teacher, student and administrator can access this room.</p>
          </section>
        </div>
      </main>
    )
  }

  if (useGoogleClassroomMode) {
    return <ClassroomDashboard onExit={() => setUseGoogleClassroomMode(false)} />;
  }

  return (
    <main className={`online-classroom ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <header className="classroom-topbar">
        <div className="classroom-topbar__brand"><span><Presentation size={21} /></span><div><strong>TutorPro Online English Classroom</strong><small>{roomBooking.classroomId}</small></div></div>
        <div className="classroom-session-state"><i className={connectionStatus === 'connected' ? 'live' : ''} /><span>{connectionLabel}</span><strong>{formatElapsed()}</strong></div>
        <div className="classroom-topbar__actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => setUseGoogleClassroomMode(true)}
            style={{
              background: '#bce94e',
              color: '#090510',
              fontWeight: '850',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '0.956rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🎓 Google Classroom
          </button>
          <button onClick={copyRoomId}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Room ID'}</button>
          <button onClick={() => setSidebarOpen((open) => !open)}><Users size={16} /> {participantCount}<MoreVertical size={16} /></button>
        </div>
      </header>

      {showConnectionHelp && <div className={`classroom-connection-help classroom-connection-help--${connectionStatus}`}><span><WifiOff size={18} /></span><div><strong>{chinaConnection ? 'China-friendly connection help' : participantCount > 1 ? connectionAdvice.title : 'Waiting for the same booked classroom'}</strong><small>{chinaConnection ? 'If cross-border video does not connect, retry once or use the VooV/Tencent backup link.' : connectionHelpText} Room ID: {roomBooking.classroomId}{showRelayWarning && account.role !== 'student' ? ` · ${connectionAdvice.adminHint}` : ''}{account.role !== 'student' ? ` · ${connectionDiagnostics}` : ''}</small></div><div className="classroom-connection-help__actions"><button type="button" onClick={retryConnection}><RefreshCw size={15} /> Retry</button>{voovFallbackLink && <a href={voovFallbackLink} target="_blank" rel="noreferrer"><ExternalLink size={15} /> VooV backup</a>}<button type="button" onClick={() => { setLowBandwidthMode(true); retryConnection() }}>Low bandwidth</button></div></div>}

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
              <div className="teacher-screen-sharing-active" style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <video 
                  ref={sharedScreenVideoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1,
                    background: '#090510'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  zIndex: 2,
                  background: 'rgba(19, 10, 37, 0.85)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(188, 233, 78, 0.3)',
                  color: '#bce94e',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.917rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                  <MonitorUp className="w-3.5 h-3.5 animate-pulse" style={{ width: '14px', height: '14px' }} />
                  <span>Sharing Screen (Active Preview)</span>
                </div>
              </div>
            ) : remoteScreenSharing ? (useTencentClassroom ? <div className={`tencent-video-view tencent-screen-view classroom-presentation-video--${remoteScreenFit}`} ref={remoteTencentScreenRef} /> : <video className={`classroom-presentation-video classroom-presentation-video--${remoteScreenFit}`} ref={remoteScreenVideoRef} autoPlay playsInline muted={false} />) : presenterUrl ? renderEmbeddedWebsite() : presentedFile ? renderPresentedFile(presentedFile) : renderCoursewareSlide()}
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
              <button className={annotationTool === 'sticky' ? 'active' : ''} onClick={() => setAnnotationTool('sticky')} title="Sticky note"><StickyNote size={17} /></button>
              <button className={annotationTool === 'rect' ? 'active' : ''} onClick={() => setAnnotationTool('rect')} title="Rectangle"><Square size={17} /></button>
              <button className={annotationTool === 'ellipse' ? 'active' : ''} onClick={() => setAnnotationTool('ellipse')} title="Ellipse"><Circle size={17} /></button>
              <button className={annotationTool === 'line' ? 'active' : ''} onClick={() => setAnnotationTool('line')} title="Line"><Minus size={17} /></button>
              <button className={annotationTool === 'arrow' ? 'active' : ''} onClick={() => setAnnotationTool('arrow')} title="Arrow"><MoveUpRight size={17} /></button>
              <button className={annotationTool === 'eraser' ? 'active' : ''} onClick={() => setAnnotationTool('eraser')} title="Eraser"><Eraser size={17} /></button>
              <label title="Ink colour"><input type="color" value={annotationColor} onChange={(event) => setAnnotationColor(event.target.value)} /></label>
              {annotationTool === 'sticky' && <label title="Sticky note colour" className="annotation-sticky-colour"><input type="color" value={stickyColor} onChange={(event) => setStickyColor(event.target.value)} /></label>}
              <span className="annotation-toolbar__divider" />
              <button onClick={undoAnnotation} title="Undo" disabled={!canUndo}><Undo2 size={17} /></button>
              <button onClick={redoAnnotation} title="Redo" disabled={!canRedo}><Redo2 size={17} /></button>
              <button onClick={clearAnnotations} title="Clear all"><Trash2 size={17} /></button>
              {canUndoClear && <button onClick={undoClear} title="Undo clear"><RotateCcw size={17} /></button>}
              {selectedPathId && <button onClick={deleteSelectedObject} title="Delete selected"><X size={17} /></button>}
              <button onClick={() => setAnnotationMode(false)} title="Close annotation"><X size={17} /></button>
            </div>}
            {screenSharing && <div className="screen-share-controls" role="toolbar" aria-label="Teacher screen sharing controls"><span><i /> You are presenting</span><button onClick={toggleScreenPause} title={screenPaused ? 'Resume screen sharing' : 'Pause screen sharing'}>{screenPaused ? <Play size={16} /> : <Pause size={16} />}<b>{screenPaused ? 'Resume' : 'Pause'}</b></button><button onClick={toggleScreenFit} title="Change screen fit"><MonitorUp size={16} /><b>{screenFit === 'fit' ? 'Fill' : 'Fit'}</b></button><button onClick={toggleStageFullscreen} title={stageFullscreen ? 'Exit full screen' : 'Open lesson board full screen'}>{stageFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}<b>{stageFullscreen ? 'Exit' : 'Full screen'}</b></button><button className="stop" onClick={stopScreenShare} title="Stop screen sharing"><X size={16} /><b>Stop</b></button></div>}
            {!screenSharing && !remoteScreenSharing && !presenterUrl && !presentedFile && account.role === 'teacher' && <div className="courseware-controls" role="toolbar" aria-label="Courseware controls"><label className="courseware-picker"><span>Lesson</span><select value={coursewareTemplate.id} onChange={(event) => chooseCoursewareTemplate(event.target.value)}>{coursewareTemplateChoices.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}</select></label><button onClick={() => goToCoursewareSlide(coursewareSlideIndex - 1)} disabled={coursewareSlideIndex === 0}><ArrowLeft size={15} /> Prev</button><button onClick={() => goToCoursewareSlide(coursewareSlideIndex + 1)} disabled={coursewareSlideIndex >= activeCoursewareSlides.length - 1}>Next <ArrowLeftRight size={15} /></button><button onClick={toggleCoursewareAnswer}>{coursewareShowAnswer ? 'Hide answer' : 'Show answer'}</button><button onClick={rewardStudent}><Award size={15} /> Give star</button><button onClick={toggleStageFullscreen}>{stageFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />} Board</button></div>}
            {(recording || remoteRecording) && <div className="classroom-recording-badge" role="status"><i /> REC{recording ? ` ${formatRecordingDuration(recordingSeconds * 1000)}` : ''}<small>This lesson is being recorded</small></div>}
            {account.role === 'teacher' && recordingStatus && <div className="classroom-recording-toast" role="status">{recordingStatus}</div>}
            {account.role === 'teacher' && recordingError && <div className="classroom-recording-toast classroom-recording-toast--error" role="alert">{recordingError}<button onClick={() => setRecordingError('')}><X size={12} /></button></div>}
            {account.role === 'teacher' && latestStudentReaction && <div className={`student-reaction-alert student-reaction-alert--${latestStudentReaction.tone || 'purple'}`}><span>{latestStudentReaction.emoji}</span><div><strong>{latestStudentReaction.studentName || learner?.name || 'Student'}</strong><small>{latestStudentReaction.label}</small></div><button onClick={clearStudentReaction}><X size={14} /></button></div>}
            <div className="classroom-stage__badge"><ShieldCheck size={13} /> Private lesson board</div>
          </div>
        </section>

        {sidebarOpen && <aside className="classroom-sidebar">
          <div className="classroom-sidebar__heading"><div><MessageCircle size={18} /><span><strong>Classroom panel</strong><small>Chat, translation and lesson files</small></span></div><button onClick={() => setSidebarOpen(false)}><X size={17} /></button></div>
          <div className="classroom-sidebar-tabs"><button className={sidebarTab === 'chat' ? 'active' : ''} onClick={() => setSidebarTab('chat')}><MessageCircle size={15} /> Chat</button><button className={sidebarTab === 'files' ? 'active' : ''} onClick={() => setSidebarTab('files')}><Paperclip size={15} /> Files <i>{files.length}</i></button><button className={sidebarTab === 'coach' ? 'active' : ''} onClick={() => setSidebarTab('coach')} title="AI speech coach"><Sparkles size={15} /> Coach</button></div>
          {sidebarTab === 'coach' ? <SpeechCoachPanel role={account.role} studentName={learner?.name || roomBooking.learnerName || 'Student'} practiceWords={speechPracticeWords} onSummary={setSpeechSummary} /> : sidebarTab === 'chat' ? <div className="classroom-chat">
            <div className="chat-translation-bar"><Languages size={15} /><span>Translate to</span><select value={chatLanguage} onChange={(event) => setChatLanguage(event.target.value)}>{chatLanguages.map((language) => <option value={language.code} key={language.code}>{language.label}</option>)}</select></div>
            <div className="classroom-chat-messages">{chatMessages.length ? chatMessages.map((message) => { const translationKey = `${message.id}:${chatLanguage}`; const translated = chatTranslations[translationKey]; const own = message.sender === participantName; return <div className={own ? 'chat-message own' : 'chat-message'} key={message.id}><div><strong>{message.sender}</strong><small>{new Date(message.createdAt).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}</small></div><p>{message.text}</p>{translated && <p className="chat-translation"><Languages size={12} /> {translated}</p>}{chatLanguage !== 'en' && !own && <button onClick={() => translateMessage(message)} disabled={translatingMessageId === message.id}>{translatingMessageId === message.id ? 'Translating…' : 'Translate'}</button>}</div> }) : <div className="chat-empty"><MessageCircle size={27} /><strong>Class chat is ready</strong><span>Messages are private to this booked classroom.</span></div>}</div>
            {chatError && <div className="classroom-file-error">{chatError}</div>}
            {unmuteRequested && account.role === 'student' && <div className="classroom-unmute-request"><Volume2 size={16} /><span>The teacher is asking you to unmute.</span><button onClick={acceptUnmuteRequest}><Mic size={15} /> Unmute me</button></div>}
            <form className="classroom-chat-form" onSubmit={sendChatMessage}><input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="Write a message…" maxLength="500" /><button type="submit" disabled={!chatDraft.trim()}><Send size={17} /></button></form>
          </div> : <div className="classroom-files-panel">
            <div className="flex gap-2 mb-3">
              <label className="classroom-file-upload flex-1"><FileUp size={22} /><strong>Upload to Supabase classroom storage</strong><span>PDF, PPT, PPTX, DOC, images, EPUB, EDB · max {Math.round((isClassroomStorageAvailable() ? MAX_STORAGE_SIZE : MAX_INLINE_SIZE) / 1024 / 1024)} MB · visible on the lesson board</span><input type="file" accept={CLASSROOM_FILE_ACCEPT} onChange={uploadFile} disabled={uploadingFile} /></label>
            </div>
            {fileError && <div className="classroom-file-error">{fileError}</div>}
            {uploadingFile && <div className="classroom-file-uploading"><span className="classroom-file-uploading__spinner" /> {uploadStatus || 'Uploading…'}</div>}
            <div className="classroom-file-list">{files.length ? files.map((file) => <div key={file.id}><span><Paperclip size={16} /></span><div><strong>{file.name}</strong><small>{file.sender} · {(file.size / 1024).toFixed(0)} KB{file.source === 'supabase' ? ' · Cloud' : ''}</small></div>{account.role !== 'student' && <button onClick={() => presentFile(file)} title="Present on lesson board"><Presentation size={16} /></button>}<a href={file.dataUrl || '#'} download={file.name} title="Download" onClick={async (e) => { if (!file.dataUrl && file.storagePath) { e.preventDefault(); const url = await resolveFileUrl(file); if (url) window.open(url, '_blank') } }}><Download size={16} /></a></div>) : <div className="classroom-file-empty"><FileUp size={25} /><span>No lesson files shared yet.</span></div>}</div>
            {account.role === 'teacher' && libraryFiles.length > 0 && (
              <div className="classroom-library">
                <div className="classroom-library__head">
                  <strong>My saved materials</strong>
                  <small>Uploaded before — share again without re-uploading</small>
                </div>
                <div className="classroom-library__list">
                  {libraryFiles
                    .filter((item) => !files.some((shared) => shared.storagePath === item.storagePath))
                    .slice(0, 30)
                    .map((item) => (
                      <button key={item.storagePath} type="button" onClick={() => shareLibraryFile(item)} title={`Share ${item.name}`}>
                        <Paperclip size={14} />
                        <span>{item.name}</span>
                        <Presentation size={14} />
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>}
          <div className="classroom-people"><span><Users size={17} /> Participants</span><div><i className="online" /><strong>{participantName}</strong><small>{account.role}</small></div>{connectionStatus === 'connected' && <div><i className="online" /><strong>{account.role === 'teacher' ? learner?.name : teacher?.fullName}</strong><small>{account.role === 'teacher' ? 'student' : 'teacher'}</small></div>}{account.role === 'teacher' && <>
            <button className={studentAnnotationAllowed ? 'allowed' : ''} onClick={toggleStudentAnnotationPermission}>{studentAnnotationAllowed ? <Unlock size={15} /> : <Lock size={15} />}{studentAnnotationAllowed ? 'Student can annotate' : 'Allow student annotation'}</button>
            <button className={`classroom-people-pointer ${studentPointerAllowed ? 'allowed' : ''}`} onClick={toggleStudentPointerPermission}><Pointer size={15} />{studentPointerAllowed ? 'Student can use pointer' : 'Allow student pointer'}</button>
            <button className={`classroom-people-mute ${studentMuted ? 'muted' : ''}`} onClick={toggleStudentMute}>{studentMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}{studentMuted ? 'Student is muted' : 'Mute student'}</button>
            {studentMuted && !unmuteRequested && <button className="classroom-people-unmute-request" onClick={sendUnmuteRequest}><Volume2 size={15} /> Ask student to unmute</button>}
            {latestStudentReaction && <div className={`teacher-reaction-card teacher-reaction-card--${latestStudentReaction.tone || 'purple'}`}><span>{latestStudentReaction.emoji}</span><div><strong>{latestStudentReaction.label}</strong><small>{latestStudentReaction.studentName || learner?.name || 'Student'} · {new Date(latestStudentReaction.createdAt).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}</small></div><button onClick={clearStudentReaction}>Clear</button></div>}
          </>}{account.role === 'student' && <>
            <div className="student-reaction-pad"><strong>Quick answer to teacher</strong><div>{STUDENT_REACTIONS.map((reaction) => <button key={reaction.id} className={sentReactionId === reaction.id ? 'sent' : ''} onClick={() => sendStudentReaction(reaction.id)}><span>{reaction.emoji}</span>{sentReactionId === reaction.id ? 'Sent' : reaction.label}</button>)}</div></div>
            <div className="student-annotation-state">{studentAnnotationAllowed ? <Unlock size={14} /> : <Lock size={14} />}<span>{studentAnnotationAllowed ? 'Teacher allowed annotation' : 'Annotation requires teacher permission'}</span></div>
            <div className="student-pointer-state">{studentPointerAllowed ? <Pointer size={14} /> : <MousePointer2 size={14} />}<span>{studentPointerAllowed ? 'You can use the pointer tool' : 'Pointer tool requires teacher permission'}</span></div>
            {remoteMuted && <div className="student-muted-state"><VolumeX size={14} /><span>The teacher muted your microphone</span></div>}
          </>}</div>
        </aside>}
      </div>

      <footer className="classroom-controls">
        <div><button className={micOn ? 'active' : 'off'} onClick={toggleMic}>{micOn ? <Mic size={20} /> : <MicOff size={20} />}<span>{micOn ? 'Mute' : 'Unmute'}</span></button><button className={cameraOn ? 'active' : 'off'} onClick={toggleCamera} disabled={screenSharing}>{cameraOn ? <Camera size={20} /> : <CameraOff size={20} />}<span>{cameraOn ? 'Camera' : 'Start video'}</span></button></div>
        <div>{account.role !== 'student' && <button className={screenSharing ? 'active sharing' : ''} onClick={toggleScreenShare}><MonitorUp size={20} /><span>{screenSharing ? 'Stop share' : 'Share screen'}</span></button>}{account.role !== 'student' && <button className="control-website-button" onClick={() => setPresenterUrlDraft(presenterUrl || 'https://')} title="Present a website"><Globe size={20} /><span>Website</span></button>}<button className={annotationMode ? 'active annotation' : ''} onClick={() => setAnnotationMode((active) => !active)} disabled={account.role === 'student' && !studentAnnotationAllowed && !studentPointerAllowed} title={account.role === 'student' && !studentAnnotationAllowed && !studentPointerAllowed ? 'The teacher must allow annotation or pointer first' : 'Annotate the lesson board'}><PenTool size={20} /><span>{account.role === 'student' && !studentAnnotationAllowed && !studentPointerAllowed ? 'Permission needed' : 'Annotate'}</span></button><label className="control-file-button"><FileUp size={20} /><span>Share file</span><input type="file" accept={CLASSROOM_FILE_ACCEPT} onChange={uploadFile} disabled={uploadingFile} /></label><button onClick={() => setSidebarOpen((open) => !open)}><Users size={20} /><span>Chat & files</span></button>{account.role === 'teacher' && <button className={recording ? 'active recording-live' : ''} onClick={toggleRecording} title={recording ? 'Stop and save the recording' : 'Record this lesson'}><Circle size={20} fill={recording ? 'currentColor' : 'none'} /><span>{recording ? `Stop · ${formatRecordingDuration(recordingSeconds * 1000)}` : 'Record'}</span></button>}<button className="leave-class-button" onClick={leaveClass}><PhoneOff size={21} /><span>End class</span></button></div>
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
