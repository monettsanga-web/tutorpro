import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { getProfileMedia } from './media.js'

function useProfileMediaUrl(accountId, kind, refreshKey) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let objectUrl = ''
    getProfileMedia(accountId, kind)
      .then((record) => {
        if (!active) return
        objectUrl = record?.blob ? URL.createObjectURL(record.blob) : ''
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

export function IntroVideo({ accountId, refreshKey = 0, className = '', compact = false }) {
  const { url, loading } = useProfileMediaUrl(accountId, 'intro-video', refreshKey)

  if (url) {
    return <video className={`profile-intro-video ${className}`} src={url} controls preload="metadata" playsInline />
  }

  return (
    <div className={`profile-video-placeholder ${className} ${loading ? 'loading' : ''}`}>
      <span><Play size={compact ? 17 : 24} fill="currentColor" /></span>
      <div><strong>{loading ? 'Loading introduction…' : 'Introduction coming soon'}</strong>{!compact && <small>The teacher has not uploaded a video yet.</small>}</div>
    </div>
  )
}
