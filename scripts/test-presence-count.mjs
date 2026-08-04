/**
 * Presence counting.
 *
 * Reported symptom, confirmed by screenshot: the banner said "Both of you are
 * in the room" while the student's tile still read "Waiting for ...". The
 * student had not joined at all.
 *
 * Cause: the count summed presence ENTRIES rather than distinct participants.
 * Supabase keeps an array of entries per presence key, so one person holding
 * two live tracks — React StrictMode's double mount, a refresh, or a reconnect
 * before the previous entry expired — was counted as two people. The classroom
 * then believed the room was full and tried to negotiate video with somebody
 * who was not there, which can never succeed.
 *
 * Run: node scripts/test-presence-count.mjs
 */

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

/** The old count: sum every entry. */
const oldCount = (state) =>
  Math.max(1, Object.values(state).reduce((total, entries) => total + entries.length, 0))

/** The new count: distinct participants. */
function newPresence(state) {
  const peers = new Set()
  Object.entries(state).forEach(([key, entries]) => {
    if (Array.isArray(entries) && entries.length) {
      entries.forEach((entry) => peers.add(entry?.participantId || key))
    } else {
      peers.add(key)
    }
  })
  return { count: Math.max(1, peers.size), peers: [...peers] }
}

/** What the classroom concludes after filtering out its own entries. */
function seenByMe(presence, myId) {
  const others = presence.peers.filter((peer) => String(peer) !== myId)
  return Math.max(1, others.length + 1)
}

const TEACHER = 'T1::bk1'
const STUDENT = 'S1::bk1'

/* --- The reported case: teacher alone, double-mounted --- */
{
  const state = { [TEACHER]: [{ participantId: TEACHER }, { participantId: TEACHER }] }
  check('OLD: teacher alone counted as two people', oldCount(state) === 2)
  check('NEW: teacher alone counts as one', newPresence(state).count === 1)
  check('NEW: classroom does not think anyone joined', seenByMe(newPresence(state), TEACHER) === 1)
}

/* --- Genuinely both present --- */
{
  const state = {
    [TEACHER]: [{ participantId: TEACHER }],
    [STUDENT]: [{ participantId: STUDENT }],
  }
  check('both present counts as two', newPresence(state).count === 2)
  check('teacher sees the student', seenByMe(newPresence(state), TEACHER) === 2)
  check('student sees the teacher', seenByMe(newPresence(state), STUDENT) === 2)
}

/* --- Both present, and the student refreshed so has a stale entry --- */
{
  const state = {
    [TEACHER]: [{ participantId: TEACHER }],
    [STUDENT]: [{ participantId: STUDENT }, { participantId: STUDENT }],
  }
  check('duplicate student entries still count as two people', newPresence(state).count === 2)
  check('teacher is not told three people are present', seenByMe(newPresence(state), TEACHER) === 2)
}

/* --- Teacher with several stale entries, student genuinely absent --- */
{
  const state = {
    [TEACHER]: [{ participantId: TEACHER }, { participantId: TEACHER }, { participantId: TEACHER }],
  }
  check('OLD: three stale entries looked like a full room', oldCount(state) === 3)
  check('NEW: still just the teacher', seenByMe(newPresence(state), TEACHER) === 1)
}

/* --- Malformed or empty state must not crash --- */
{
  check('empty state is safe', newPresence({}).count === 1)
  check('empty entry arrays are safe', newPresence({ [TEACHER]: [] }).count === 1)
  check('entries without ids fall back to the key',
    newPresence({ [TEACHER]: [{}] }).peers[0] === TEACHER)
  check('non-array entries are safe', newPresence({ [TEACHER]: null }).count === 1)
}

/* --- Both sides must agree on the count --- */
{
  const state = {
    [TEACHER]: [{ participantId: TEACHER }],
    [STUDENT]: [{ participantId: STUDENT }],
  }
  const p = newPresence(state)
  check('both sides agree', seenByMe(p, TEACHER) === seenByMe(p, STUDENT))
}

/* --- Leaving drops the count back --- */
{
  const before = newPresence({
    [TEACHER]: [{ participantId: TEACHER }],
    [STUDENT]: [{ participantId: STUDENT }],
  })
  const after = newPresence({ [TEACHER]: [{ participantId: TEACHER }] })
  check('count falls when the student leaves',
    seenByMe(before, TEACHER) === 2 && seenByMe(after, TEACHER) === 1)
}

/* --- A third device (admin observing) is counted once --- */
{
  const ADMIN = 'A1::bk1'
  const state = {
    [TEACHER]: [{ participantId: TEACHER }],
    [STUDENT]: [{ participantId: STUDENT }],
    [ADMIN]: [{ participantId: ADMIN }, { participantId: ADMIN }],
  }
  check('three distinct people counted as three', newPresence(state).count === 3)
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
