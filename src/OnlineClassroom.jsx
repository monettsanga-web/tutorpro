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
  Mic,
  MicOff,
  MonitorUp,
  MoreVertical,
  Paperclip,
  PenTool,
  PhoneOff,
  Presentation,
  Radio,
  ShieldCheck,
  Trash2,
  Users,
  Video,
  WifiOff,
  X,
} from 'lucide-react'
import { getAccountById } from './auth.js'
import { getClassroomAccess } from './bookings.js'
import { createClassroomTransport } from './classroomTransport.js'

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
  if (!path?.points?.length) return
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
  const [joined, setJoined] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const [mediaError, setMediaError] = useState('')
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('waiting')
  const [participantCount, setParticipantCount] = useState(1)
  const [annotationMode, setAnnotationMode] = useState(false)
  const [annotationTool, setAnnotationTool] = useState('pen')
  const [annotationColor, setAnnotationColor] = useState('#ff4f87')
  const [files, setFiles] = useState([])
  const [fileError, setFileError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const setVideoStream = (element, stream) => {
    if (element && element.srcObject !== stream) element.srcObject = stream || null
  }

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
    setVideoStream(localVideoRef.current, localStreamRef.current)
  }, [joined, screenSharing])

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
        if (stream) setVideoStream(remoteVideoRef.current, stream)
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
    localStreamRef.current = cameraStreamRef.current
    setVideoStream(localVideoRef.current, cameraStreamRef.current)
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
      localStreamRef.current = stream
      setVideoStream(localVideoRef.current, stream)
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
    if (!annotationMode) return
    event.currentTarget.setPointerCapture(event.pointerId)
    currentPathRef.current = {
      id: crypto.randomUUID(),
      tool: annotationTool,
      color: annotationColor,
      width: annotationTool === 'highlighter' ? 16 : annotationTool === 'eraser' ? 24 : 5,
      points: [pointerPosition(event)],
    }
  }

  const continueDrawing = (event) => {
    if (!currentPathRef.current || !annotationMode) return
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
    }
    reader.readAsDataURL(file)
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
        <section className="classroom-stage" ref={stageRef}>
          <video className="classroom-remote-video" ref={remoteVideoRef} autoPlay playsInline />
          {connectionStatus !== 'connected' && <div className="classroom-waiting"><span><Radio size={34} /></span><h2>Waiting for the other participant…</h2><p>Keep this room open. The connection begins automatically when they enter.</p></div>}
          <canvas
            ref={annotationCanvasRef}
            className={annotationMode ? 'annotation-canvas active' : 'annotation-canvas'}
            onPointerDown={startDrawing}
            onPointerMove={continueDrawing}
            onPointerUp={finishDrawing}
            onPointerCancel={finishDrawing}
          />
          <div className="classroom-local-tile"><video ref={localVideoRef} autoPlay muted playsInline /><span>{screenSharing ? 'Your screen' : 'You'} · {participantName}</span>{!cameraOn && !screenSharing && <CameraOff size={25} />}</div>
          {annotationMode && <div className="annotation-toolbar"><button className={annotationTool === 'pen' ? 'active' : ''} onClick={() => setAnnotationTool('pen')} title="Pen"><PenTool size={17} /></button><button className={annotationTool === 'highlighter' ? 'active' : ''} onClick={() => setAnnotationTool('highlighter')} title="Highlighter"><Circle size={17} /></button><button className={annotationTool === 'eraser' ? 'active' : ''} onClick={() => setAnnotationTool('eraser')} title="Eraser"><Eraser size={17} /></button><label title="Ink colour"><input type="color" value={annotationColor} onChange={(event) => setAnnotationColor(event.target.value)} /></label><button onClick={clearAnnotations} title="Clear annotations"><Trash2 size={17} /></button><button onClick={() => setAnnotationMode(false)} title="Close annotation"><X size={17} /></button></div>}
          <div className="classroom-stage__badge"><ShieldCheck size={13} /> End-to-end peer media</div>
        </section>

        {sidebarOpen && <aside className="classroom-sidebar">
          <div className="classroom-sidebar__heading"><div><Paperclip size={18} /><span><strong>Lesson files</strong><small>Shared in this live room</small></span></div><button onClick={() => setSidebarOpen(false)}><X size={17} /></button></div>
          <label className="classroom-file-upload"><FileUp size={22} /><strong>Upload lesson material</strong><span>PDF, image, document or slides · max 8 MB</span><input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*" onChange={uploadFile} /></label>
          {fileError && <div className="classroom-file-error">{fileError}</div>}
          <div className="classroom-file-list">{files.length ? files.map((file) => <div key={file.id}><span><Paperclip size={16} /></span><div><strong>{file.name}</strong><small>{file.sender} · {(file.size / 1024).toFixed(0)} KB</small></div><a href={file.dataUrl} download={file.name} title="Download"><Download size={16} /></a></div>) : <div className="classroom-file-empty"><FileUp size={25} /><span>No lesson files shared yet.</span></div>}</div>
          <div className="classroom-people"><span><Users size={17} /> Participants</span><div><i className="online" /><strong>{participantName}</strong><small>{account.role}</small></div>{connectionStatus === 'connected' && <div><i className="online" /><strong>{account.role === 'teacher' ? learner?.name : teacher?.fullName}</strong><small>{account.role === 'teacher' ? 'student' : 'teacher'}</small></div>}</div>
        </aside>}
      </div>

      <footer className="classroom-controls">
        <div><button className={micOn ? 'active' : 'off'} onClick={toggleMic}>{micOn ? <Mic size={20} /> : <MicOff size={20} />}<span>{micOn ? 'Mute' : 'Unmute'}</span></button><button className={cameraOn ? 'active' : 'off'} onClick={toggleCamera} disabled={screenSharing}>{cameraOn ? <Camera size={20} /> : <CameraOff size={20} />}<span>{cameraOn ? 'Camera' : 'Start video'}</span></button></div>
        <div><button className={screenSharing ? 'active sharing' : ''} onClick={toggleScreenShare}><MonitorUp size={20} /><span>{screenSharing ? 'Stop share' : 'Share screen'}</span></button><button className={annotationMode ? 'active annotation' : ''} onClick={() => setAnnotationMode((active) => !active)}><PenTool size={20} /><span>Annotate</span></button><label className="control-file-button"><FileUp size={20} /><span>Share file</span><input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*" onChange={uploadFile} /></label><button onClick={() => setSidebarOpen((open) => !open)}><Users size={20} /><span>People & files</span></button></div>
        <button className="leave-class-button" onClick={leaveClass}><PhoneOff size={21} /><span>Leave class</span></button>
      </footer>
    </main>
  )
}
