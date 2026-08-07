/**
 * Where a video link points, and whether a family in mainland China can reach it.
 *
 * WHY THIS IS A SEPARATE FILE
 * ---------------------------
 * These are plain functions, not components. Keeping them out of the
 * component file lets React Fast Refresh work properly during development
 * (a file that exports both components and helpers loses hot reloading).
 *
 * WHY 'reachableInChina' MATTERS
 * ------------------------------
 * YouTube has been blocked in mainland China since 2009, and the block covers
 * embedded players on third-party sites, not just youtube.com itself. So a
 * YouTube iframe on tutorpro.site renders a black rectangle that never loads
 * for Chinese families — indistinguishable from a broken website. Anything
 * flagged false here needs a visible escape hatch next to it.
 */

/** Hosts the Great Firewall blocks. Kept explicit so the reasoning is auditable. */
export const BLOCKED_IN_CHINA = [
  'youtube.com', 'youtu.be', 'ytimg.com', 'ggpht.com', 'youtube-nocookie.com',
  'google.com', 'googleapis.com', 'gstatic.com', 'googlevideo.com',
  'drive.google.com', 'vimeo.com', 'facebook.com', 'fbcdn.net',
  'twitter.com', 'instagram.com', 'whatsapp.com',
]

/** Is this URL served from a host mainland China blocks? */
export function isBlockedInChina(url) {
  if (!url) return false
  let host = ''
  try {
    host = new URL(String(url), 'https://www.tutorpro.site').hostname.toLowerCase()
  } catch {
    return false
  }
  return BLOCKED_IN_CHINA.some((bad) => host === bad || host.endsWith(`.${bad}`))
}

/**
 * Turn a share link into an embeddable player URL, and say plainly whether
 * that player will load inside mainland China.
 */
export function toEmbedUrl(url) {
  const none = { embedUrl: '', platform: '', reachableInChina: false }
  if (!url) return none
  const trimmed = String(url).trim()
  const idAfter = (marker, stopAt = /[?#/]/) => trimmed.split(marker)[1]?.split(stopAt)[0] || ''

  // --- Blocked in mainland China ---
  if (trimmed.includes('youtube.com/shorts/')) {
    const v = idAfter('youtube.com/shorts/')
    if (v) return { embedUrl: `https://www.youtube.com/embed/${v}`, platform: 'YouTube', reachableInChina: false }
  }
  if (trimmed.includes('youtube.com/watch')) {
    const v = new URLSearchParams(trimmed.split('?')[1] || '').get('v')
    if (v) return { embedUrl: `https://www.youtube.com/embed/${v}`, platform: 'YouTube', reachableInChina: false }
  }
  if (trimmed.includes('youtu.be/')) {
    const v = idAfter('youtu.be/')
    if (v) return { embedUrl: `https://www.youtube.com/embed/${v}`, platform: 'YouTube', reachableInChina: false }
  }
  if (trimmed.includes('vimeo.com/')) {
    const v = idAfter('vimeo.com/')
    if (v) return { embedUrl: `https://player.vimeo.com/video/${v}`, platform: 'Vimeo', reachableInChina: false }
  }
  if (trimmed.includes('drive.google.com/file/d/')) {
    const v = trimmed.split('drive.google.com/file/d/')[1]?.split('/')[0]
    if (v) return { embedUrl: `https://drive.google.com/file/d/${v}/preview`, platform: 'Google Drive', reachableInChina: false }
  }

  // --- bilibili.tv is the INTERNATIONAL edition, and is not bilibili.com ---
  // Two things make it unusable as an embed, both verified against the live
  // site rather than assumed:
  //   1. There is no player host. player.bilibili.tv has no DNS record at all,
  //      unlike player.bilibili.com. Only the mainland edition publishes an
  //      external player endpoint.
  //   2. The watch page is a full single-page app, not a player. Framing it
  //      gives a whole website inside a 16:9 box, not a video.
  // Uploads there are also geo-licensed per region, so a clip can be blocked
  // in the very country you meant it for. We therefore never iframe it: we
  // link out, which always works.
  if (trimmed.includes('bilibili.tv')) {
    return {
      embedUrl: '',
      platform: 'Bilibili',
      reachableInChina: false,
      linkOnly: true,
      note: 'bilibili.tv has no external player and geo-restricts uploads. Use a self-hosted file instead.',
    }
  }

  // --- Reachable inside mainland China ---
  if (trimmed.includes('bilibili.com/video/')) {
    const match = trimmed.match(/video\/(BV[a-zA-Z0-9]+)/)
    if (match?.[1]) {
      return {
        embedUrl: `https://player.bilibili.com/player.html?bvid=${match[1]}&page=1&as_wide=1&high_quality=1&danmaku=0`,
        platform: 'Bilibili',
        reachableInChina: true,
      }
    }
  }
  if (trimmed.includes('v.qq.com')) {
    const match = trimmed.match(/\/([a-zA-Z0-9]+)\.html/)
    if (match?.[1]) {
      return { embedUrl: `https://v.qq.com/txp/iframe/player.html?vid=${match[1]}`, platform: 'Tencent Video', reachableInChina: true }
    }
  }
  if (trimmed.includes('youku.com')) {
    const match = trimmed.match(/id_([a-zA-Z0-9=]+)/)
    if (match?.[1]) {
      return { embedUrl: `https://player.youku.com/embed/${match[1]}`, platform: 'Youku', reachableInChina: true }
    }
  }

  return { embedUrl: trimmed, platform: '', reachableInChina: !isBlockedInChina(trimmed) }
}

/**
 * Do we serve this file ourselves? Only our own origins count — those are the
 * ones that are not blocked in China and that we control.
 */
export function isSelfHosted(src) {
  if (!src) return false
  const value = String(src).trim()
  if (/^(https?:)?\/\//i.test(value)) {
    return /(^|\.)tutorpro\.site\//i.test(value) || /supabase\.co\/storage\//i.test(value)
  }
  return value.startsWith('/') || value.startsWith('./') || !value.includes('://')
}
