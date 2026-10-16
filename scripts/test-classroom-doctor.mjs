/**
 * Pins the connection doctor's wording: the one line of facts the classroom
 * banner shows on BOTH devices when a call stalls. If a label here changes,
 * the person reading a distressed teacher's screenshot loses their map.
 */
import { formatConnectionDiagnostics } from '../src/classroomDoctor.js'

let pass = 0
let fail = 0
const ok = (condition, label) => {
  if (condition) { pass += 1; console.log(`  ok  ${label}`) }
  else { fail += 1; console.log(`FAIL  ${label}`) }
}

const base = { connectionStatus: 'failed', iceDetail: 'failed', signalingStatus: 'open', participantCount: 2, transportStats: { sent: 4, received: 3, databaseEnabled: true } }

let line = formatConnectionDiagnostics({ ...base, relayMinted: true, pairType: 'relay', signalCounts: { offSent: 1, offRecv: 0, ansSent: 0, ansRecv: 0, iceSent: 0, iceRecv: 0 } })
ok(line.includes('peer:failed') && line.includes('ice:failed'), 'peer and ICE state lead the line')
ok(line.includes('pair:relay'), 'the candidate pair type is reported (relay)')
ok(line.includes('relay:minted'), 'a minted relay says so')
ok(line.includes('sig-sent:1/recv:0') && line.includes('ans-sent:0/recv:0'), 'offer/answer counters show an unanswered offer')
ok(line.includes('rt-sent:4/recv:3'), 'the realtime transport counters are present')
ok(!line.includes('durable:off'), 'durable flag silent when the database path is on')

line = formatConnectionDiagnostics({ ...base, relayMinted: false, relayError: 'Cloudflare TURN request failed (401)', pairType: 'none', signalCounts: {} })
ok(line.includes('relay:mint-failed'), 'a failed mint is named')
ok(line.includes('relayerr:Cloudflare TURN request failed (401)'), 'and carries the mint error verbatim')
ok(line.includes('pair:none'), 'no pair at all reads pair:none')
ok(line.includes('sig-sent:0/recv:0'), 'missing counters default to zero, not undefined')

line = formatConnectionDiagnostics({ ...base, relayMinted: false, relayError: '', transportStats: { sent: 0, received: 0, databaseEnabled: false, lastError: 'realtime channel closed' } })
ok(line.includes('relay:none'), 'no relay and no error reads relay:none')
ok(line.includes('durable:off'), 'a disabled durable path is flagged')
ok(line.includes('err:realtime channel closed'), 'transport errors surface')

line = formatConnectionDiagnostics({ ...base, relayMinted: true, mediaState: 'failed', mediaError: 'Camera or microphone permission was denied.', signalCounts: {} })
ok(line.includes('media:failed') && line.includes('mediaerr:Camera or microphone permission was denied.'), 'a dead camera is named with its permission error')
line = formatConnectionDiagnostics({ ...base, relayMinted: true, mediaState: 'ok', signalCounts: {} })
ok(line.includes('media:ok') && !line.includes('mediaerr'), 'a working camera says media:ok with no error')

line = formatConnectionDiagnostics({ ...base, relayMinted: true, side: 'guest', signalCounts: { reqSent: 9, reqRecv: 0, rdySent: 0, rdyRecv: 7 } })
ok(line.includes('side:guest'), 'the line says which side of the handshake this device believes it is')
ok(line.includes('req-sent:9/recv:0') && line.includes('rdy-sent:0/recv:7'), 'join-request/teacher-ready counters separate a silent host from a silent guest')
ok(!line.includes('tie:'), 'the tie-break flag stays silent until it fires')
line = formatConnectionDiagnostics({ ...base, side: 'host', tieBreak: true, signalCounts: {} })
ok(line.includes('side:host') && line.includes('tie:on'), 'a fired tie-break is confessed on the line')
line = formatConnectionDiagnostics({ ...base, signalCounts: {} })
ok(line.includes('side:n/a'), 'a missing side reads n/a, not undefined')

line = formatConnectionDiagnostics({})
ok(line.includes('peer:n/a') && line.includes('in-room:0') && line.includes('relay:none'), 'empty facts still produce a readable line')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
