import { useRef, useState } from 'react'
import { Play, Volume2, VolumeX, X } from 'lucide-react'

/**
 * Promo video player.
 *
 * The video and its narration are two separate files: the WebM is encoded with
 * OpenCV, which writes video only, so the voiceover ships as an MP3 alongside
 * and is kept in sync here.
 *
 * Design decisions:
 *  - Poster-first. A 3.5 MB video is never downloaded until the parent chooses
 *    to watch, so it costs nothing on page load or on mobile data.
 *  - Muted-by-default is not used; instead the video only starts on a click,
 *    which means we can play narration immediately without autoplay blocking.
 *  - If audio fails for any reason the video still plays, so the message is
 *    never lost.
 */
export default function PromoVideo({ lang = 'en', poster = '/assets/tutorpro-hero.webp', className = '' }) {
  const [started, setStarted] = useState(false)
  const [muted, setMuted] = useState(false)
  const videoRef = useRef(null)
  const audioRef = useRef(null)

  const base = lang === 'ko' ? 'tutorpro-promo-ko' : 'tutorpro-promo-en'
  const copy = lang === 'ko'
    ? { play: '소개 영상 보기', sub: '1분 미만 · 첫 수업 무료', close: '닫기' }
    : { play: 'Watch how it works', sub: 'Under a minute · First class free', close: 'Close' }

  const start = () => {
    setStarted(true)
    // Play both tracks together on the next tick, once the elements exist.
    window.setTimeout(() => {
      const video = videoRef.current
      const audio = audioRef.current
      video?.play().catch(() => {})
      if (audio && !muted) audio.play().catch(() => {})
    }, 40)
  }

  const stop = () => {
    videoRef.current?.pause()
    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.currentTime = 0
    setStarted(false)
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    const audio = audioRef.current
    if (!audio) return
    if (next) audio.pause()
    else {
      // Re-sync the narration to wherever the video has reached.
      audio.currentTime = videoRef.current?.currentTime || 0
      audio.play().catch(() => {})
    }
  }

  // Keep narration aligned if the viewer scrubs the video.
  const handleSeek = () => {
    const audio = audioRef.current
    const video = videoRef.current
    if (audio && video && !muted) audio.currentTime = video.currentTime
  }

  if (!started) {
    return (
      <button type="button" className={`promo-video promo-video--poster ${className}`.trim()} onClick={start}>
        <img src={poster} alt="" loading="lazy" />
        <span className="promo-video__scrim" aria-hidden="true" />
        <span className="promo-video__cta">
          <span className="promo-video__play"><Play size={22} fill="currentColor" /></span>
          <strong>{copy.play}</strong>
          <small>{copy.sub}</small>
        </span>
      </button>
    )
  }

  return (
    <div className={`promo-video promo-video--playing ${className}`.trim()}>
      <video
        ref={videoRef}
        src={`/assets/${base}.webm`}
        controls
        playsInline
        onSeeked={handleSeek}
        onEnded={stop}
        aria-label={lang === 'ko' ? 'TutorPro 온라인 영어 소개 영상' : 'TutorPro Online English introduction video'}
      />
      {/* Narration lives in a separate file because the encoder cannot mux audio. */}
      <audio ref={audioRef} src={`/assets/${base}.mp3`} preload="auto" />
      <div className="promo-video__bar">
        <button type="button" onClick={toggleMute}>
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          {muted ? (lang === 'ko' ? '소리 켜기' : 'Sound on') : (lang === 'ko' ? '음소거' : 'Mute')}
        </button>
        <button type="button" onClick={stop}><X size={15} /> {copy.close}</button>
      </div>
    </div>
  )
}
