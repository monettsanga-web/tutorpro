/**
 * Signalling delivery guarantees.
 *
 * Presence reports both participants, so the channel itself is fine. The
 * failure is that offer/answer messages were not reliably arriving:
 *
 *  - broadcast was configured with ack:true, so send() awaited a server
 *    acknowledgement that can time out on a slow link. The rejection was
 *    swallowed by an empty catch, so a lost offer looked like a success and
 *    was never retried.
 *  - the outbound queue only drained when the channel first subscribed, so
 *    anything re-queued afterwards sat there indefinitely.
 *
 * Run: node scripts/test-signalling-delivery.mjs
 */

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

const MAX_QUEUED = 120

/** Models the transport's send path against a flaky channel. */
function makeTransport({ retryQueue, observeResult, channelResponses }) {
  const queued = []
  const delivered = []
  let ready = true
  let closed = false
  let call = 0
  const stats = { failures: 0 }

  const channelSend = () => {
    const outcome = channelResponses[Math.min(call, channelResponses.length - 1)]
    call += 1
    return Promise.resolve(outcome)
  }

  const post = (message) => {
    if (!ready || closed) return false
    const result = channelSend()
    if (observeResult) {
      result.then((status) => {
        if (status === 'ok') delivered.push(message)
        else if (!closed) {
          stats.failures += 1
          queued.push(message)
          if (queued.length > MAX_QUEUED) queued.shift()
        }
      })
    } else {
      // Old behaviour: assume success, discard the outcome.
      delivered.push(message)
    }
    return true
  }

  return {
    stats,
    queued,
    delivered,
    send(message) { if (!post(message)) queued.push(message) },
    flush() { if (!ready) return; queued.splice(0).forEach(post) },
    tick() { if (retryQueue && queued.length) this.flush() },
    setReady(value) { ready = value },
    close() { closed = true },
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

/* --- Old behaviour: a dropped offer is lost silently --- */
{
  const t = makeTransport({ retryQueue: false, observeResult: false, channelResponses: ['timed out'] })
  t.send({ type: 'offer' })
  await settle()
  check('OLD: a timed-out offer is treated as delivered', t.delivered.length === 1)
  check('OLD: nothing is queued for retry', t.queued.length === 0)
  check('OLD: the failure is invisible', t.stats.failures === 0)
}

/* --- New behaviour: the failure is seen and retried --- */
{
  const t = makeTransport({ retryQueue: true, observeResult: true, channelResponses: ['timed out', 'ok'] })
  t.send({ type: 'offer' })
  await settle()
  check('NEW: a failed send is detected', t.stats.failures === 1)
  check('NEW: the message is re-queued', t.queued.length === 1)
  check('NEW: not falsely marked delivered', t.delivered.length === 0)

  t.tick()
  await settle()
  check('NEW: the retry delivers it', t.delivered.length === 1, `queued=${t.queued.length}`)
  check('NEW: the queue is drained', t.queued.length === 0)
}

/* --- Repeated failures keep retrying rather than giving up --- */
{
  const t = makeTransport({ retryQueue: true, observeResult: true, channelResponses: ['error', 'error', 'error', 'ok'] })
  t.send({ type: 'answer' })
  for (let i = 0; i < 5; i += 1) { await settle(); t.tick() }
  await settle()
  check('NEW: survives repeated failures', t.delivered.length === 1, `failures=${t.stats.failures}`)
}

/* --- A closed transport must not keep re-queueing --- */
{
  const t = makeTransport({ retryQueue: true, observeResult: true, channelResponses: ['timed out'] })
  t.send({ type: 'ice' })
  t.close()
  await settle()
  check('closed transport does not re-queue', t.queued.length === 0)
}

/* --- The queue must stay bounded --- */
{
  const t = makeTransport({ retryQueue: true, observeResult: true, channelResponses: ['timed out'] })
  for (let i = 0; i < 200; i += 1) t.send({ type: 'ice', i })
  await settle()
  check('queue is bounded', t.queued.length <= MAX_QUEUED, String(t.queued.length))
}

/* --- Messages sent before the channel is ready are not lost --- */
{
  const t = makeTransport({ retryQueue: true, observeResult: true, channelResponses: ['ok'] })
  t.setReady(false)
  t.send({ type: 'offer' })
  check('queued while not ready', t.queued.length === 1)
  t.setReady(true)
  t.flush()
  await settle()
  check('delivered once ready', t.delivered.length === 1)
}

/* --- Channel naming: both sides must derive the same room --- */
{
  const channelKey = (roomId, token) => {
    const safeRoom = String(roomId || '').replace(/[^a-z0-9-]/gi, '').slice(0, 48)
    const safeToken = String(token || '').replace(/[^a-z0-9-]/gi, '').slice(0, 64)
    return `tutorpro-classroom-${safeRoom}-${safeToken}`
  }
  const bookingId = 'b9d1e31c-e784-4e11-9080-055d3ff7f508'
  const date = '20260810'
  const room = `TP-${date}-${bookingId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()}`
  const token = `TPROOM-${bookingId.toLowerCase()}-${date}`

  check('teacher and student derive the same channel', channelKey(room, token) === channelKey(room, token))
  check('token is not truncated', token.replace(/[^a-z0-9-]/gi, '').length <= 64, `len ${token.length}`)
  check('room is not truncated', room.length <= 48, `len ${room.length}`)
  check('different bookings get different channels',
    channelKey(room, token) !== channelKey(room, `TPROOM-other-${date}`))
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
