import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { getProfileMedia } from './media.js'
import { getAccountById } from './auth.js'

function useProfileMediaUrl(accountId, kind, refreshKey) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let objectUrl = ''
    getProfileMedia(accountId, kind)
      .then((record) => {
        if (!active) return
        const isBlob = record?.blob && (record.blob instanceof Blob || (typeof File !== 'undefined' && record.blob instanceof File))
        objectUrl = isBlob ? URL.createObjectURL(record.blob) : ''
        setUrl(objectUrl)
        setLoading(false)
      })
      .catch(() => {
        if (active) {
          setUrl('')
          setLoading(false)
        }
      })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [accountId, kind, refreshKey])

  return { url, loading }
}

export function ProfilePhoto({ accountId, name, refreshKey = 0, className = '' }) {
  const { url, loading } = useProfileMediaUrl(accountId, 'avatar', refreshKey)
  const initial = name?.trim()?.slice(0, 1)?.toUpperCase() || 'T'

  return (
    <span className={`profile-media-photo ${className} ${url ? 'has-photo' : ''} ${loading ? 'loading' : ''}`}>
      {url ? <img src={url} alt={`${name} profile`} /> : <strong>{initial}</strong>}
    </span>
  )
}

export function getEmbedUrl(url) {
  if (!url) return ''
  const trimmed = url.trim()

  // YouTube Shorts
  if (trimmed.includes('youtube.com/shorts/')) {
    const parts = trimmed.split('youtube.com/shorts/')
    const id = parts[1]?.split(/[?#]/)[0]
    if (id) return `https://www.youtube.com/embed/${id}`
  }

  // YouTube standard
  if (trimmed.includes('youtube.com/watch')) {
    const searchParams = new URLSearchParams(trimmed.split('?')[1] || '')
    const id = searchParams.get('v')
    if (id) return `https://www.youtube.com/embed/${id}`
  }
  if (trimmed.includes('youtu.be/')) {
    const parts = trimmed.split('youtu.be/')
    const id = parts[1]?.split(/[?#]/)[0]
    if (id) return `https://www.youtube.com/embed/${id}`
  }

  // Vimeo
  if (trimmed.includes('vimeo.com/')) {
    const parts = trimmed.split('vimeo.com/')
    const id = parts[1]?.split(/[?#]/)[0]
    if (id) return `https://player.vimeo.com/video/${id}`
  }

  // Google Drive
  if (trimmed.includes('drive.google.com/file/d/')) {
    const parts = trimmed.split('drive.google.com/file/d/')
    const id = parts[1]?.split('/')[0]
    if (id) return `https://drive.google.com/file/d/${id}/preview`
  }

  // Bilibili
  if (trimmed.includes('bilibili.com/video/')) {
    const match = trimmed.match(/video\/(BV[a-zA-Z0-9]+)/)
    if (match && match[1]) {
      return `https://player.bilibili.com/player.html?bvid=${match[1]}&page=1&as_wide=1&high_quality=1&danmaku=0`
    }
  }

  return trimmed
}

export function SampleClassPlayer({ url, className = '' }) {
  if (!url) {
    return (
      <div className={`profile-video-placeholder ${className}`} style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.15)', color: '#b9adc7', gap: '8px' }}>
        <span><Play size={24} style={{ opacity: 0.5 }} /></span>
        <strong>Video Coming Soon!</strong>
        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>A video recording is being prepared.</span>
      </div>
    )
  }

  const embedUrl = getEmbedUrl(url)
  const isRawVideo = /\.(mp4|webm|mov|ogg|m4v)($|\?)/i.test(url) || url.startsWith('blob:') || url.startsWith('data:video')

  if (isRawVideo) {
    return (
      <video 
        className={`profile-intro-video ${className}`} 
        src={url} 
        controls 
        preload="metadata" 
        playsInline 
        style={{ width: '100%', height: '220px', borderRadius: '12px', objectFit: 'cover', background: '#000' }}
      />
    )
  }

  return (
    <div className={`video-iframe-container ${className}`} style={{ position: 'relative', width: '100%', height: '220px', borderRadius: '12px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255,255,255,0.1)' }}>
      <iframe
        src={embedUrl}
        title="Video Player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
        }}
      />
    </div>
  )
}

export function IntroVideo({ accountId, refreshKey = 0, className = '', compact = false }) {
  const { url, loading } = useProfileMediaUrl(accountId, 'intro-video', refreshKey)
  const teacher = getAccountById(accountId)
  const pastedIntroUrl = teacher?.teacher?.introVideoUrl || ''

  if (pastedIntroUrl) {
    return <SampleClassPlayer url={pastedIntroUrl} className={className} />
  }

  if (url) {
    return <video className={`profile-intro-video ${className}`} src={url} controls preload="metadata" playsInline style={{ width: '100%', height: '220px', borderRadius: '12px', objectFit: 'cover' }} />
  }

  return (
    <div className={`profile-video-placeholder ${className} ${loading ? 'loading' : ''}`}>
      <span><Play size={compact ? 17 : 24} fill="currentColor" /></span>
      <div><strong>{loading ? 'Loading introduction…' : 'Introduction coming soon'}</strong>{!compact && <small>The teacher has not uploaded a video yet.</small>}</div>
    </div>
  )
}
