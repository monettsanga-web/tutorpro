/**
 * The classroom connection doctor - one line of facts that says exactly
 * WHERE a stalled call is stuck.
 *
 * A failed lesson used to leave everyone staring at "Reconnecting". The
 * interesting questions are all answerable from inside the browser, so the
 * help banner now carries them, on the teacher's AND the student's device:
 *
 *   peer / ice / pair   - the WebRTC connection state, and what kind of
 *                         candidate pair it managed (host = direct on the
 *                         same network, srflx = punched through NAT,
 *                         relay = through the TURN server, none = nothing);
 *   signalling          - the Supabase Realtime channel carrying offers;
 *   in-room             - presence count (both people saw each other join);
 *   relay               - whether short-lived Cloudflare TURN credentials
 *                         were minted for this device, and the mint error
 *                         when they were not (the single most common cause
 *                         of "both in the room, no video");
 *   sig/ans/ice sent    - whether the offer actually reached the other side
 *                         and an answer came back (sig-sent with ans-recv:0
 *                         means the other device never answered - usually
 *                         its camera permission or its own relay);
 *   rt-sent / durable   - the Realtime transport's own counters and whether
 *                         the durable (database) path is on.
 *
 * Pure function so scripts/test-classroom-doctor.mjs can pin the wording
 * without a browser.
 */
export function formatConnectionDiagnostics(facts) {
  const {
    connectionStatus = 'n/a',
    iceDetail = '',
    pairType = '',
    signalingStatus = 'n/a',
    participantCount = 0,
    transportStats = null,
    relayMinted = false,
    relayError = '',
    signalCounts = {},
  } = facts || {}
  const counts = signalCounts || {}
  return [
    `peer:${connectionStatus}`,
    `ice:${iceDetail || 'n/a'}`,
    pairType ? `pair:${pairType}` : '',
    `signalling:${signalingStatus}`,
    `in-room:${participantCount}`,
    relayMinted ? 'relay:minted' : (relayError ? 'relay:mint-failed' : 'relay:none'),
    relayError ? `relayerr:${relayError}` : '',
    `sig-sent:${counts.offSent || 0}/recv:${counts.offRecv || 0}`,
    `ans-sent:${counts.ansSent || 0}/recv:${counts.ansRecv || 0}`,
    `ice-sent:${counts.iceSent || 0}/recv:${counts.iceRecv || 0}`,
    transportStats ? `rt-sent:${transportStats.sent}/recv:${transportStats.received}` : '',
    transportStats && !transportStats.databaseEnabled ? 'durable:off' : '',
    transportStats?.lastError ? `err:${transportStats.lastError}` : '',
  ].filter(Boolean).join(' · ')
}
