import { supabase } from './supabaseClient.js'

const INTERVIEW_BUCKET = 'teacher-interview-recordings'
const MAX_RECORDING_SIZE = 8 * 1024 * 1024
const ALLOWED_RECORDING_TYPES = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav']

function requireSupabase() {
  if (!supabase) throw new Error('Secure interview recording storage is unavailable.')
}

function normalizedMimeType(value = '') {
  const type = value.split(';')[0].trim().toLowerCase()
  return ALLOWED_RECORDING_TYPES.includes(type) ? type : 'audio/webm'
}

function extensionFor(type) {
  if (type === 'audio/mp4') return 'm4a'
  if (type === 'audio/ogg') return 'ogg'
  if (type === 'audio/mpeg') return 'mp3'
  if (type === 'audio/wav') return 'wav'
  return 'webm'
}

function interviewMediaError(error, fallback) {
  const message = error?.message || fallback
  if (/teacher_interview|teacher-interview-recordings|bucket not found|schema cache|function .* does not exist/i.test(message)) {
    return new Error('Secure audio storage is not configured yet. Run teacher_interview_recordings.sql in Supabase.')
  }
  return new Error(message)
}

export async function uploadTeacherInterviewRecordings({ applicant, transcript, recordings, onProgress }) {
  requireSupabase()
  if (!Array.isArray(recordings) || !recordings.length) throw new Error('No recorded interview answers were found.')

  const { data: session, error: sessionError } = await supabase.rpc('create_teacher_interview_session', {
    applicant_name: applicant.fullName,
    applicant_login: applicant.email,
  })
  if (sessionError || !session?.sessionId || !session?.accessToken) {
    throw interviewMediaError(sessionError, 'The secure interview session could not be created.')
  }

  const credentials = { sessionId: session.sessionId, accessToken: session.accessToken }
  for (let position = 0; position < recordings.length; position += 1) {
    const recording = recordings[position]
    if (!(recording.blob instanceof Blob) || recording.blob.size < 1) throw new Error(`Recorded answer ${recording.index + 1} is empty.`)
    if (recording.blob.size > MAX_RECORDING_SIZE) throw new Error(`Recorded answer ${recording.index + 1} is larger than 8 MB. Please record a shorter answer.`)
    const mimeType = normalizedMimeType(recording.blob.type || recording.mimeType)
    const answer = transcript[recording.index]
    const path = `${credentials.sessionId}/${credentials.accessToken}/${String(recording.index + 1).padStart(2, '0')}-${crypto.randomUUID()}.${extensionFor(mimeType)}`
    const { error: uploadError } = await supabase.storage
      .from(INTERVIEW_BUCKET)
      .upload(path, recording.blob, { contentType: mimeType, upsert: false })
    if (uploadError) throw interviewMediaError(uploadError, `Answer ${recording.index + 1} could not be uploaded.`)

    const { error: registerError } = await supabase.rpc('register_teacher_interview_recording', {
      target_session_id: credentials.sessionId,
      visitor_token: credentials.accessToken,
      answer_index: recording.index,
      answer_stage: answer?.stage || '',
      answer_question: answer?.question || '',
      answer_transcript: answer?.answer || '',
      uploaded_path: path,
      mime_type: mimeType,
      byte_size: recording.blob.size,
      duration_seconds: Math.max(1, Math.round(recording.durationSeconds || 0)),
    })
    if (registerError) throw interviewMediaError(registerError, `Answer ${recording.index + 1} could not be secured.`)
    onProgress?.(position + 1, recordings.length)
  }

  return {
    credentials,
    summary: {
      recordingSessionId: credentials.sessionId,
      recordingCount: recordings.length,
      recordingStatus: 'securely-uploaded',
    },
  }
}

export async function linkTeacherInterviewSession(credentials, profileId) {
  if (!supabase || !credentials?.sessionId || !credentials?.accessToken || !profileId) return false
  const { error } = await supabase.rpc('complete_teacher_interview_session', {
    target_session_id: credentials.sessionId,
    visitor_token: credentials.accessToken,
    target_profile_id: profileId,
  })
  if (error) throw interviewMediaError(error, 'The recorded interview could not be linked to the teacher profile.')
  return true
}

export async function fetchAdminTeacherInterviewRecordings(sessionId) {
  requireSupabase()
  if (!sessionId) return []
  const { data, error } = await supabase.rpc('get_admin_teacher_interview_recordings', {
    target_session_id: sessionId,
  })
  if (error) throw interviewMediaError(error, 'Recorded interview answers could not be loaded.')
  return data || []
}

export async function createAdminInterviewRecordingUrl(path) {
  requireSupabase()
  const { data, error } = await supabase.storage.from(INTERVIEW_BUCKET).createSignedUrl(path, 60 * 30)
  if (error || !data?.signedUrl) throw interviewMediaError(error, 'The recorded answer could not be opened.')
  return data.signedUrl
}
