/**
 * A video player that works for families in mainland China.
 *
 * WHY THIS EXISTS
 * ---------------
 * YouTube has been blocked in mainland China since 2009, and the block covers
 * embedded players on other websites — not just youtube.com. A YouTube iframe
 * on tutorpro.site therefore shows Chinese families a blank black box that
 * never loads. They cannot tell it from a broken website, and the most likely
 * reaction is to close the page.
 *
 * The reliable fix is not a clever embed: it is to serve the video file from
 * our own domain. tutorpro.site is not blocked, so a plain <video> tag pointing
 * at our own MP4 plays in Beijing exactly as it plays in Manila, with no VPN,
 * no third-party player and no extra permission.
 *
 * HOW THIS COMPONENT BEHAVES
 * --------------------------
 * 1. If a self-hosted file is given, it plays that. This is the good path and
 *    the only one that works in China.
 * 2. If that file fails to load (not uploaded yet, wrong name, bad deploy) it
 *    does NOT leave a dead player. It falls back to the share link so the rest
 *    of the world still sees something.
 * 3. It never pretends. If nothing can play, it says so in plain words.
 *
 * The poster image must be served from our own domain too — YouTube's
 * thumbnail host is blocked in China as well, so borrowing the thumbnail would
 * reintroduce the same blank rectangle.
 */

import { useState } from 'react'
import { Play } from 'lucide-react'
import { toEmbedUrl } from './videoEmbeds.js'

export default function ChinaSafeVideo({
  src = '',
  poster = '',
  shareUrl = '',
  title = 'TutorPro Online English class video',
  captionsSrc = '',
  className = '',
}) {
  // Only tracks the ONE thing that cannot be derived from props: whether the
  // self-hosted file failed at runtime. Deriving the rest during render avoids
  // a state-sync effect and the cascading re-render it causes.
  const [fileFailed, setFileFailed] = useState(false)
  const [started, setStarted] = useState(false)

  // Reset the failure flag when the source changes, without an effect: React's
  // documented "adjust state during render" pattern.
  const [lastSrc, setLastSrc] = useState(src)
  if (src !== lastSrc) {
    setLastSrc(src)
    setFileFailed(false)
    setStarted(false)
  }

  const { embedUrl, platform, reachableInChina } = toEmbedUrl(shareUrl)
  const mode = src && !fileFailed ? 'file' : (embedUrl ? 'embed' : 'none')

  const frame = {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: '18px',
    overflow: 'hidden',
    background: '#000',
    border: '1px solid rgba(255,255,255,0.12)',
  }

  if (mode === 'file') {
    return (
      <div className={`china-safe-video ${className}`} style={frame}>
        <video
          src={src}
          poster={poster || undefined}
          controls
          preload="metadata"
          playsInline
          onError={() => setFileFailed(true)}
          onPlay={() => setStarted(true)}
          title={title}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
        >
          {captionsSrc && <track kind="captions" src={captionsSrc} srcLang="en" label="English" default />}
          Your browser cannot play this video.
        </video>
        {!started && !poster && (
          <span
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', color: 'rgba(255,255,255,0.75)' }}
          >
            <Play size={44} fill="currentColor" />
          </span>
        )}
      </div>
    )
  }

  if (mode === 'embed') {
    return (
      <div className={`china-safe-video ${className}`} style={frame}>
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        />
        {/* Families behind the Great Firewall see nothing in the frame above,
            so give them a line of text they can actually read and act on. */}
        {!reachableInChina && (
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, padding: '8px 12px',
              background: 'rgba(9,5,16,0.86)', color: '#d8cceb', fontSize: '0.85rem', textAlign: 'center',
            }}
          >
            Video not loading? Open it directly{platform ? ` on ${platform}` : ''} →
          </a>
        )}
      </div>
    )
  }

  return (
    <div
      className={`china-safe-video china-safe-video--empty ${className}`}
      style={{ ...frame, display: 'grid', placeItems: 'center', textAlign: 'center', padding: '20px' }}
    >
      <div style={{ color: '#b9adc7' }}>
        <Play size={28} style={{ opacity: 0.5 }} />
        <strong style={{ display: 'block', marginTop: '8px', color: '#fff' }}>Class video coming soon</strong>
        <small style={{ opacity: 0.8 }}>A short video of a real TutorPro lesson is being prepared.</small>
      </div>
    </div>
  )
}
