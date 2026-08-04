/**
 * Local media must be attached before the peer connection is created.
 *
 * Reported symptom: teacher and student are both in the classroom but cannot
 * see each other.
 *
 * Cause: three separate paths set joined=true — joinClass(), the
 * teacher-present signal that releases a waiting student, and the
 * "Enter anyway" escape hatch. Only joinClass() guaranteed a camera stream.
 * The connection effect did not check, so a peer could be built with zero
 * tracks. WebRTC negotiates that perfectly happily and reports 'connected',
 * so the lesson looked fine while nothing was ever transmitted.
 *
 * Run: node scripts/test-media-publish.mjs
 */

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

/** Minimal peer model: counts what was actually published. */
function makePeer() {
  const senders = []
  const receivers = []
  return {
    connectionState: 'new',
    addTrack(track) { senders.push({ track }); return senders.at(-1) },
    getSenders: () => senders,
    getReceivers: () => receivers,
    receive(track) { receivers.push({ track }) },
    published: () => senders.length,
  }
}

/** Old behaviour: build the peer whenever joined, regardless of media. */
function oldConnect({ joined, relayReady, stream }) {
  if (!joined || !relayReady) return null
  const peer = makePeer()
  const audio = stream?.audio || []
  const video = stream?.video || []
  audio.forEach((t) => peer.addTrack(t))
  video.slice(0, 1).forEach((t) => peer.addTrack(t))
  return peer
}

/** New behaviour: require mediaReady before building anything. */
function newConnect({ joined, relayReady, mediaReady, stream }) {
  if (!joined || !relayReady || !mediaReady) return null
  return oldConnect({ joined, relayReady, stream })
}

const withMedia = { audio: [{ kind: 'audio' }], video: [{ kind: 'video' }] }
const noMedia = { audio: [], video: [] }

/* --- The reported failure --- */
{
  const peer = oldConnect({ joined: true, relayReady: true, stream: noMedia })
  check('OLD: peer is created without any media', peer !== null)
  check('OLD: it publishes nothing (nobody can be seen)', peer.published() === 0)
}
{
  const peer = newConnect({ joined: true, relayReady: true, mediaReady: false, stream: noMedia })
  check('NEW: no peer is built before media exists', peer === null)
}

/* --- Normal path --- */
{
  const peer = newConnect({ joined: true, relayReady: true, mediaReady: true, stream: withMedia })
  check('NEW: peer is built once media is ready', peer !== null)
  check('NEW: audio and video are published', peer.published() === 2, String(peer.published()))
}

/* --- Only one video track is ever published --- */
{
  const peer = newConnect({
    joined: true, relayReady: true, mediaReady: true,
    stream: { audio: [{ kind: 'audio' }], video: [{ kind: 'video' }, { kind: 'video' }] },
  })
  check('only one video track published', peer.published() === 2)
}

/* --- Audio-only still connects (camera denied, microphone allowed) --- */
{
  const peer = newConnect({
    joined: true, relayReady: true, mediaReady: true,
    stream: { audio: [{ kind: 'audio' }], video: [] },
  })
  check('audio-only still publishes', peer.published() === 1)
}

/* --- Every join path must require media --- */
const joinPaths = {
  joinClass: (hasStream) => hasStream,
  enterAnyway: (hasStream) => hasStream,
  teacherPresentRelease: (hasStream) => hasStream,
}
for (const [name, gate] of Object.entries(joinPaths)) {
  check(`${name} refuses to join without media`, gate(false) === false)
  check(`${name} joins with media`, gate(true) === true)
}

/* --- Watchdog: connected but receiving nothing --- */
function needsRenegotiation(peer, publishedTracks) {
  if (peer.connectionState !== 'connected') return false
  const receiving = peer.getReceivers().some((r) => r.track && r.track.readyState === 'live')
  return !receiving || publishedTracks === 0
}
{
  const peer = makePeer()
  peer.connectionState = 'connected'
  check('connected but receiving nothing triggers a retry', needsRenegotiation(peer, 2) === true)

  peer.receive({ readyState: 'live' })
  check('receiving live media does not retry', needsRenegotiation(peer, 2) === false)

  check('publishing nothing triggers a retry even while receiving',
    needsRenegotiation(peer, 0) === true)
}
{
  const peer = makePeer()
  peer.connectionState = 'connecting'
  check('a still-connecting peer is left alone', needsRenegotiation(peer, 2) === false)
}
{
  const peer = makePeer()
  peer.connectionState = 'connected'
  peer.receive({ readyState: 'ended' })
  check('an ended remote track counts as not receiving', needsRenegotiation(peer, 2) === true)
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
