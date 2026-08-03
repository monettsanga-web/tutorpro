import { useState } from 'react'
import { Download, Play, Video, X } from 'lucide-react'
import { formatRecordingDuration, formatRecordingSize, getRecordingUrl } from './classroomRecording.js'

/**
 * Lesson recording playback for booking cards.
 *
 * Recordings live in a private Supabase bucket, so we never render a raw
 * storage path. A short-lived signed URL is requested only when the viewer
 * actually presses play, which keeps links from leaking in shared screenshots.
 */
export default function RecordingPlayback({ recordings = [], canDownload = false }) {
  const list = Array.isArray(recordings) ? recordings.filter((item) => item?.storagePath) : []
  const [activeId, setActiveId] = useState('')
  const [url, setUrl] = useState('')
  const [loadingId, setLoadingId] = useState('')
  const [error, setError] = useState('')

  if (!list.length) return null

  const open = async (recording) => {
    if (activeId === recording.id) { setActiveId(''); setUrl(''); return }
    setLoadingId(recording.id)
    setError('')
    const signed = await getRecordingUrl(recording.storagePath)
    setLoadingId('')
    if (!signed) {
      setError('This recording could not be opened. It may still be uploading.')
      return
    }
    setUrl(signed)
    setActiveId(recording.id)
  }

  return (
    <div className="booking-recordings">
      <b><Video size={14} /> Lesson recording{list.length > 1 ? `s (${list.length})` : ''}</b>
      {error && <p className="booking-recordings__error" role="alert">{error}</p>}
      <div className="booking-recordings__list">
        {list.map((recording) => (
          <div className="booking-recording-row" key={recording.id}>
            <button type="button" onClick={() => open(recording)} disabled={loadingId === recording.id}>
              {activeId === recording.id ? <X size={14} /> : <Play size={14} />}
              <span>
                {new Date(recording.recordedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                {recording.durationMs ? ` · ${formatRecordingDuration(recording.durationMs)}` : ''}
                {recording.size ? ` · ${formatRecordingSize(recording.size)}` : ''}
              </span>
              {loadingId === recording.id && <em>Opening…</em>}
            </button>
            {canDownload && activeId === recording.id && url && (
              <a href={url} download={`tutorpro-lesson-${recording.id}.webm`} className="booking-recording-download" title="Download recording">
                <Download size={14} />
              </a>
            )}
          </div>
        ))}
      </div>
      {activeId && url && (
        <video className="booking-recording-player" src={url} controls autoPlay playsInline>
          Your browser cannot play this recording.
        </video>
      )}
    </div>
  )
}
