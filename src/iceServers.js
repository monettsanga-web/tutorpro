/**
 * ICE server configuration for the classroom's WebRTC connection.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * WebRTC first tries to connect the two browsers directly. That works on most
 * home broadband. It fails when either side is behind strict NAT, carrier-grade
 * NAT (very common on mobile data), a corporate or campus firewall, or any
 * network that blocks peer-to-peer UDP.
 *
 * When the direct path fails the call needs a TURN relay: a server that
 * forwards the audio and video. Without one the lesson simply never connects,
 * and the failure is silent — which is what made this look like "bad internet".
 *
 * STUN alone (what we had before) only discovers your public address. It cannot
 * relay anything, so it does not help in any of the cases above.
 *
 * CONFIGURATION
 * -------------
 * Set these in Vercel → Settings → Environment Variables, then redeploy:
 *
 *   VITE_CLASSROOM_TURN_URL         turn:your-host:3478
 *   VITE_CLASSROOM_TURN_USERNAME    your-username
 *   VITE_CLASSROOM_TURN_CREDENTIAL  your-password
 *
 * Multiple URLs may be comma-separated, which is how you offer both UDP and a
 * TCP/TLS fallback on port 443 for the most restrictive networks:
 *
 *   VITE_CLASSROOM_TURN_URL=turn:host:3478,turn:host:80?transport=tcp,turns:host:443?transport=tcp
 */

/** STUN only discovers your public address. Kept China-reachable on purpose. */
const STUN_SERVERS = [
  { urls: 'stun:stun.qq.com:3478' },
  { urls: 'stun:stun.miwifi.com:3478' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.l.google.com:19302' },
]

function readEnv(key) {
  const value = import.meta.env?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Split a comma-separated list into clean TURN URLs.
 * Anything that is not a turn:/turns: URL is dropped rather than handed to the
 * browser, which would throw and take the whole connection down.
 */
function parseTurnUrls(raw) {
  return String(raw || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => /^turns?:/i.test(entry))
}

/** The configured TURN relay, or null when none has been set up. */
export function turnConfiguration() {
  const urls = parseTurnUrls(readEnv('VITE_CLASSROOM_TURN_URL'))
  if (!urls.length) return null
  return {
    urls,
    username: readEnv('VITE_CLASSROOM_TURN_USERNAME'),
    credential: readEnv('VITE_CLASSROOM_TURN_CREDENTIAL'),
  }
}

/** True once a relay is available, so the UI can stop warning about it. */
export function hasTurnRelay() {
  return turnConfiguration() !== null
}

/**
 * Full RTCConfiguration for the classroom peer connection.
 *
 * `iceTransportPolicy: 'relay'` can be forced for testing, to prove the relay
 * genuinely works rather than the call quietly succeeding peer-to-peer.
 */
export function buildRtcConfiguration({ relayOnly = false } = {}) {
  const turn = turnConfiguration()
  return {
    iceServers: [...STUN_SERVERS, ...(turn ? [turn] : [])],
    iceCandidatePoolSize: 10,
    ...(relayOnly && turn ? { iceTransportPolicy: 'relay' } : {}),
  }
}

/**
 * Plain-language explanation of a failed connection.
 *
 * Previously a failure showed a generic "retrying" message forever. Telling the
 * teacher what is actually wrong — and that it is fixable — is far more useful
 * than an endless spinner.
 */
export function connectionFailureAdvice({ bothPresent }) {
  if (!hasTurnRelay()) {
    return {
      title: 'Video could not connect',
      detail: bothPresent
        ? 'Both of you are in the room, but your networks will not let the video link up directly. This usually happens on mobile data, office or school wifi. A relay server fixes it permanently.'
        : 'Waiting for the other participant to enter this same booking.',
      // Only an administrator can act on this, so it is worded for them.
      adminHint: 'No TURN relay is configured. Set VITE_CLASSROOM_TURN_URL in Vercel to fix this for every lesson.',
    }
  }
  return {
    title: 'Reconnecting',
    detail: bothPresent
      ? 'Both of you are in the room. Re-establishing the video link through the relay server.'
      : 'Waiting for the other participant to enter this same booking.',
    adminHint: '',
  }
}
