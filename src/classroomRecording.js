import { supabase } from './supabaseClient.js'

/**
 * Lesson recording for the TutorPro classroom.
 *
 * Records the teacher's own camera/screen plus both sides of the audio using
 * the browser MediaRecorder API, then uploads the finished file to Supabase
 * Storage. Recordings are private and served through short-lived signed URLs
 * so only the teacher, the parent of that student, and admins can play them.
 *
 * Nothing here changes the live WebRTC call: we only tap the existing streams.
 */

const RECORDING_BUCKET = 'classroom-recordings'
const MAX_RECORDING_SIZE = 1024 * 1024 * 1024 // 1 GB
const SIGNED_URL_TTL = 21600 // 6 hours

/** Pick the best container/codec this browser can actually produce. */
export function pickRecordingMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4', // Safari
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type)) || ''
}

export function isRecordingSupported() {
  return typeof MediaRecorder !== 'undefined' && Boolean(pickRecordingMimeType())
}

export function isRecordingStorageAvailable() {
  return Boolean(supabase)
}

export function getRecordingSizeLimit() {
  return MAX_RECORDING_SIZE
}

/**
 * Mix several audio tracks (teacher mic + student remote audio) into one
 * track so the recording captures both voices, not just the local mic.
 * Returns the mixed track plus a cleanup function.
 */
function mixAudioTracks(streams = []) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  const withAudio = streams.filter((stream) => stream && stream.getAudioTracks().length > 0)
  if (!AudioContextClass || withAudio.length === 0) return { track: null, cleanup: () => {} }

  // A single audio source needs no mixing.
  if (withAudio.length === 1) {
    return { track: withAudio[0].getAudioTracks()[0], cleanup: () => {} }
  }

  const context = new AudioContextClass()
  const destination = context.createMediaStreamDestination()
  const sources = withAudio.map((stream) => {
    const source = context.createMediaStreamSource(stream)
    source.connect(destination)
    return source
  })

  return {
    track: destination.stream.getAudioTracks()[0] || null,
    cleanup: () => {
      sources.forEach((source) => { try { source.disconnect() } catch { /* already closed */ } })
      context.close().catch(() => {})
    },
  }
}

/**
 * Build the stream that actually gets recorded: one video track (screen share
 * if active, otherwise the camera) plus the mixed classroom audio.
 */
export function buildRecordingStream({ videoStream, audioStreams = [] }) {
  const tracks = []
  const videoTrack = videoStream?.getVideoTracks?.()[0]
  if (videoTrack) tracks.push(videoTrack)
  const { track: audioTrack, cleanup } = mixAudioTracks(audioStreams)
  if (audioTrack) tracks.push(audioTrack)
  if (!tracks.length) return { stream: null, cleanup }
  return { stream: new MediaStream(tracks), cleanup }
}

/**
 * Start recording. Returns a controller with stop()/pause()/resume().
 * Chunks are collected in memory and assembled into one Blob on stop.
 */
export function startClassroomRecording({ videoStream, audioStreams = [], onError, onStop }) {
  if (!isRecordingSupported()) throw new Error('Recording is not supported in this browser. Try Chrome or Edge.')

  const { stream, cleanup } = buildRecordingStream({ videoStream, audioStreams })
  if (!stream) {
    cleanup()
    throw new Error('No camera, screen or microphone is active to record.')
  }

  const mimeType = pickRecordingMimeType()
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 1_500_000 } : undefined)
  const chunks = []
  const startedAt = Date.now()

  recorder.ondataavailable = (event) => { if (event.data?.size > 0) chunks.push(event.data) }
  recorder.onerror = (event) => { cleanup(); onError?.(event.error || new Error('Recording failed.')) }
  recorder.onstop = () => {
    cleanup()
    const blob = new Blob(chunks, { type: mimeType || 'video/webm' })
    onStop?.({ blob, durationMs: Date.now() - startedAt, mimeType: mimeType || 'video/webm' })
  }

  // Emit a chunk every 5s so a crash still leaves recoverable data.
  recorder.start(5000)

  return {
    startedAt,
    get state() { return recorder.state },
    pause: () => { if (recorder.state === 'recording') recorder.pause() },
    resume: () => { if (recorder.state === 'paused') recorder.resume() },
    stop: () => { if (recorder.state !== 'inactive') recorder.stop() },
  }
}

/** Upload a finished recording and return its metadata record. */
export async function uploadClassroomRecording(bookingId, blob, meta = {}) {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (!blob || !blob.size) throw new Error('The recording is empty.')
  if (blob.size > MAX_RECORDING_SIZE) {
    throw new Error(`Recordings must be under ${Math.round(MAX_RECORDING_SIZE / 1024 / 1024)} MB. Try shorter recordings.`)
  }

  const recordingId = crypto.randomUUID()
  const extension = (blob.type || '').includes('mp4') ? 'mp4' : 'webm'
  const storagePath = `${bookingId}/${recordingId}.${extension}`

  const { error } = await supabase.storage
    .from(RECORDING_BUCKET)
    .upload(storagePath, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: blob.type || 'video/webm',
    })

  if (error) throw new Error(error.message || 'Recording upload failed.')

  return {
    id: recordingId,
    storagePath,
    size: blob.size,
    mimeType: blob.type || 'video/webm',
    durationMs: meta.durationMs || 0,
    recordedAt: new Date().toISOString(),
    recordedBy: meta.recordedBy || '',
    recordedByName: meta.recordedByName || '',
    learnerName: meta.learnerName || '',
  }
}

/** Short-lived signed URL so recordings are never public. */
export async function getRecordingUrl(storagePath) {
  if (!supabase || !storagePath) return null
  const { data, error } = await supabase.storage
    .from(RECORDING_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL)
  if (error) return null
  return data?.signedUrl || null
}

export async function deleteClassroomRecording(storagePath) {
  if (!supabase || !storagePath) return false
  const { error } = await supabase.storage.from(RECORDING_BUCKET).remove([storagePath])
  return !error
}

/** Human label such as "12:04" or "1:02:33". */
export function formatRecordingDuration(milliseconds) {
  const total = Math.max(0, Math.round((milliseconds || 0) / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatRecordingSize(bytes) {
  const megabytes = (bytes || 0) / 1024 / 1024
  if (megabytes >= 1024) return `${(megabytes / 1024).toFixed(1)} GB`
  return `${megabytes.toFixed(1)} MB`
}
