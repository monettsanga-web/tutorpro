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
  /**
   * Extra places the same video is published, shown as plain links under the
   * player. A mirror is the whole point for a family in mainland China: when
   * the player above is a blank box to them, a link they can actually open is
   * the difference between seeing the class and seeing nothing.
   */
  mirrors = [],
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

  const { embedUrl, platform, reachableInChina, linkOnly } = toEmbedUrl(shareUrl)
  // Some platforms publish no external player at all (bilibili.tv). Framing
  // their watch page would show a whole website inside the video box, so we
  // offer an honest link instead of a broken embed. `linkOnly` says so
  // explicitly; an empty embedUrl is the belt-and-braces check.
  const canEmbed = Boolean(embedUrl) && !linkOnly
  const mode = src && !fileFailed
    ? 'file'
    : (canEmbed ? 'embed' : (shareUrl ? 'link' : 'none'))

  const frame = {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: '18px',
    overflow: 'hidden',
    background: '#000',
    border: '1px solid rgba(255,255,255,0.12)',
  }

  // Mirrors are described, not just linked. A family in mainland China needs
  // to know which of these will actually open for them before they tap.
  const describedMirrors = mirrors
    .filter((mirror) => mirror && mirror.url)
    .map((mirror) => {
      const info = toEmbedUrl(mirror.url)
      return {
        url: mirror.url,
        label: mirror.label || info.platform || 'Watch the video',
        note: mirror.note || '',
        primary: Boolean(mirror.primary),
        reachableInChina: mirror.reachableInChina ?? info.reachableInChina,
      }
    })

  const withMirrors = (player) => {
    if (!describedMirrors.length) return player
    return (
      <div className={`china-safe-video-group ${className}`}>
        {player}
        <ul className="china-safe-video__mirrors">
          {describedMirrors.map((mirror) => (
            <li key={mirror.url}>
              <a
                className={`china-safe-video__mirror-button${mirror.primary ? ' is-primary' : ''}`}
                href={mirror.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="china-safe-video__mirror-play" aria-hidden="true">
                  <Play size={15} fill="currentColor" />
                </span>
                <span>
                  <strong>{mirror.label}</strong>
                  {mirror.note && <small>{mirror.note}</small>}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const playerClass = describedMirrors.length ? 'china-safe-video' : `china-safe-video ${className}`

  if (mode === 'file') {
    return withMirrors(
      <div className={playerClass} style={frame}>
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
      </div>,
    )
  }

  if (mode === 'embed') {
    return withMirrors(
      <div className={playerClass} style={frame}>
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
      </div>,
    )
  }

  if (mode === 'link') {
    return withMirrors(
      <a
        className={`${playerClass} china-safe-video--link`}
        href={shareUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          ...frame,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          padding: '20px',
          textDecoration: 'none',
          backgroundImage: poster ? `url(${poster})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <span style={{ position: 'absolute', inset: 0, background: 'rgba(9,5,16,0.62)' }} aria-hidden="true" />
        <span style={{ position: 'relative', color: '#fff' }}>
          <Play size={40} fill="currentColor" />
          <strong style={{ display: 'block', marginTop: '10px' }}>Watch a real TutorPro class</strong>
          <small style={{ display: 'block', marginTop: '4px', color: '#d8cceb' }}>
            Opens on {platform || 'the video site'} in a new tab
          </small>
        </span>
      </a>,
    )
  }

  return withMirrors(
    <div
      className={`${playerClass} china-safe-video--empty`}
      style={{ ...frame, display: 'grid', placeItems: 'center', textAlign: 'center', padding: '20px' }}
    >
      <div style={{ color: '#b9adc7' }}>
        <Play size={28} style={{ opacity: 0.5 }} />
        <strong style={{ display: 'block', marginTop: '8px', color: '#fff' }}>Class video coming soon</strong>
        <small style={{ opacity: 0.8 }}>A short video of a real TutorPro lesson is being prepared.</small>
      </div>
    </div>,
  )
}
