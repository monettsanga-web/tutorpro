/**
 * Teacher feedback must survive the cross-device merge.
 *
 * Reported symptom: feedback written on one device did not appear in the
 * calendar on another, and the lesson did not consistently show as finished.
 *
 * Cause: mergeCloudBookings used whole-record last-write-wins. When the local
 * copy carried a newer updatedAt for ANY reason — a status change, a comment,
 * a stale clock — the entire incoming record was discarded, taking with it
 * fields this device had never seen. Feedback written elsewhere was lost
 * permanently rather than late.
 *
 * Run: node scripts/test-feedback-sync.mjs
 */

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

/** The old whole-record merge. */
function oldMerge(local, cloud) {
  const out = [...local]
  cloud.forEach((cb) => {
    const i = out.findIndex((b) => b.id === cb.id)
    if (i < 0) { out.push(cb); return }
    const lt = new Date(out[i].updatedAt || out[i].createdAt || 0).getTime()
    const ct = new Date(cb.updatedAt || cb.createdAt || 0).getTime()
    if (!Number.isFinite(lt) || ct >= lt) out[i] = { ...out[i], ...cb }
  })
  return out
}

/** The field-aware merge now in bookings.js. */
function newMerge(local, cloud) {
  const out = [...local]
  cloud.forEach((cb) => {
    const i = out.findIndex((b) => b.id === cb.id)
    if (i < 0) { out.push(cb); return }
    const lt = new Date(out[i].updatedAt || out[i].createdAt || 0).getTime()
    const ct = new Date(cb.updatedAt || cb.createdAt || 0).getTime()
    if (!Number.isFinite(lt) || ct >= lt) {
      out[i] = { ...out[i], ...cb }
    } else {
      const rescue = {}
      if (!out[i].teacherFeedback?.summary?.trim() && cb.teacherFeedback?.summary?.trim()) rescue.teacherFeedback = cb.teacherFeedback
      if (!out[i].studentRating && cb.studentRating) rescue.studentRating = cb.studentRating
      if (!out[i].sessionRecap && cb.sessionRecap) rescue.sessionRecap = cb.sessionRecap
      if (cb.status === 'completed' && ['confirmed', 'ongoing'].includes(out[i].status)) rescue.status = 'completed'
      if (Object.keys(rescue).length) out[i] = { ...out[i], ...rescue }
    }
  })
  return out
}

const cloud = [{
  id: 'b1',
  status: 'completed',
  teacherFeedback: { summary: 'Ana spoke in full sentences today.' },
  updatedAt: '2026-08-05T10:00:00Z',
}]

/* --- The reported failure --- */
{
  const localNewer = [{ id: 'b1', status: 'confirmed', updatedAt: '2026-08-05T11:00:00Z' }]
  const before = oldMerge(localNewer, cloud)
  check('OLD: newer local silently discards remote feedback', before[0].teacherFeedback === undefined)
  check('OLD: lesson also stays un-finished', before[0].status === 'confirmed')

  const after = newMerge(localNewer, cloud)
  check('NEW: remote feedback is rescued', after[0].teacherFeedback?.summary?.includes('full sentences'))
  check('NEW: completed status wins', after[0].status === 'completed')
}

/* --- The normal case must be unaffected --- */
{
  const localOlder = [{ id: 'b1', status: 'confirmed', updatedAt: '2026-08-05T09:00:00Z' }]
  const out = newMerge(localOlder, cloud)
  check('older local still takes the whole record', out[0].teacherFeedback?.summary && out[0].status === 'completed')
}

/* --- Local feedback must never be clobbered by an older remote copy --- */
{
  const localWithBetter = [{
    id: 'b1',
    status: 'completed',
    teacherFeedback: { summary: 'A longer, newer write-up from this device.' },
    updatedAt: '2026-08-05T12:00:00Z',
  }]
  const out = newMerge(localWithBetter, cloud)
  check('local feedback is preserved', out[0].teacherFeedback.summary.includes('newer write-up'))
}

/* --- Other fields that were being lost --- */
{
  const local = [{ id: 'b1', status: 'confirmed', updatedAt: '2026-08-05T11:00:00Z' }]
  const remote = [{
    id: 'b1',
    status: 'completed',
    studentRating: { score: 5 },
    sessionRecap: { notes: 'covered unit 3' },
    updatedAt: '2026-08-05T10:00:00Z',
  }]
  const out = newMerge(local, remote)
  check('student rating rescued', out[0].studentRating?.score === 5)
  check('session recap rescued', out[0].sessionRecap?.notes === 'covered unit 3')
}

/* --- A finished lesson must never revert --- */
{
  const localCompleted = [{ id: 'b1', status: 'completed', updatedAt: '2026-08-05T11:00:00Z' }]
  const remoteConfirmed = [{ id: 'b1', status: 'confirmed', updatedAt: '2026-08-05T10:00:00Z' }]
  check('completed does not revert to confirmed', newMerge(localCompleted, remoteConfirmed)[0].status === 'completed')
}
{
  const localCancelled = [{ id: 'b1', status: 'cancelled', updatedAt: '2026-08-05T11:00:00Z' }]
  check('cancelled is not force-completed', newMerge(localCancelled, cloud)[0].status === 'cancelled')
}

/* --- Empty or whitespace feedback must not count as real --- */
{
  const local = [{ id: 'b1', status: 'confirmed', teacherFeedback: { summary: '   ' }, updatedAt: '2026-08-05T11:00:00Z' }]
  check('blank local feedback is replaced', newMerge(local, cloud)[0].teacherFeedback.summary.includes('full sentences'))
}

/* --- New bookings from another device still arrive --- */
{
  const out = newMerge([], cloud)
  check('unseen booking is added', out.length === 1 && out[0].teacherFeedback?.summary)
}

/* --- The calendar indicator --- */
{
  const hasFeedback = (b) => Boolean(b?.teacherFeedback?.summary?.trim())
  const needsFeedback = (b) => Boolean(b && b.status === 'completed' && !hasFeedback(b))
  check('indicator: written up', hasFeedback({ teacherFeedback: { summary: 'done' } }))
  check('indicator: blank does not count', hasFeedback({ teacherFeedback: { summary: '  ' } }) === false)
  check('indicator: completed without feedback is flagged', needsFeedback({ status: 'completed' }))
  check('indicator: confirmed is not flagged', needsFeedback({ status: 'confirmed' }) === false)
  check('indicator: completed with feedback is not flagged',
    needsFeedback({ status: 'completed', teacherFeedback: { summary: 'x' } }) === false)
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
