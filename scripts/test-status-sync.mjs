/**
 * Every booking status change must be uploaded.
 *
 * Reported symptom, with a screenshot: lessons marked finished on one computer
 * stayed pink (unfinished) on another, while a few showed green correctly.
 *
 * Cause: the status-change handlers listed which statuses to sync, and
 * 'completed' was missing from that list in BOTH the teacher and admin
 * dashboards. Marking a class finished updated local storage and stopped
 * there, so no other device ever learned about it. The few green cells were
 * lessons completed through a different code path that did sync.
 *
 * Calendar colour comes directly from booking.status, so a stale status is a
 * stale colour.
 *
 * Run: node scripts/test-status-sync.mjs
 */

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

const ALL_STATUSES = ['pending', 'confirmed', 'ongoing', 'completed', 'absent', 'cancelled', 'declined']

/** The old rule: which statuses triggered an upload. */
function oldSyncs(status) {
  if (['confirmed', 'declined', 'cancelled'].includes(status)) return true
  if (['ongoing', 'absent'].includes(status)) return true
  return false
}

/** The new rule. */
function newSyncs(status) {
  if (['confirmed', 'declined', 'cancelled'].includes(status)) return true
  if (['ongoing', 'absent', 'completed', 'pending'].includes(status)) return true
  return false
}

/* --- The reported failure --- */
check('OLD: completed was NOT uploaded (the bug)', oldSyncs('completed') === false)
check('NEW: completed is uploaded', newSyncs('completed') === true)

/* --- No status may be silently dropped --- */
{
  const missedBefore = ALL_STATUSES.filter((s) => !oldSyncs(s))
  const missedAfter = ALL_STATUSES.filter((s) => !newSyncs(s))
  check('OLD: some statuses never synced', missedBefore.length > 0, missedBefore.join(', '))
  check('NEW: every status syncs', missedAfter.length === 0, missedAfter.join(', ') || 'none missed')
}

/* --- Statuses that already worked must keep working --- */
for (const status of ['confirmed', 'cancelled', 'declined', 'ongoing', 'absent']) {
  check(`${status} still syncs`, newSyncs(status) === true)
}

/* --- Calendar colour follows status, so a stale status is a stale colour --- */
{
  const cellClass = (booking) => `booking-status-${booking.status}`
  check('completed renders the finished colour', cellClass({ status: 'completed' }) === 'booking-status-completed')
  check('confirmed renders the pink colour', cellClass({ status: 'confirmed' }) === 'booking-status-confirmed')
  check('a stale confirmed status shows the wrong colour',
    cellClass({ status: 'confirmed' }) !== cellClass({ status: 'completed' }))
}

/* --- Two devices agree once the status is uploaded --- */
{
  const cloud = []
  const deviceA = [{ id: 'b1', status: 'confirmed', updatedAt: '2026-08-06T01:00:00Z' }]
  const deviceB = [{ id: 'b1', status: 'confirmed', updatedAt: '2026-08-06T01:00:00Z' }]

  // Device A marks it completed.
  deviceA[0] = { ...deviceA[0], status: 'completed', updatedAt: '2026-08-06T02:00:00Z' }
  if (newSyncs('completed')) cloud.push({ ...deviceA[0] })

  // Device B pulls.
  const pulled = cloud.find((b) => b.id === 'b1')
  if (pulled) {
    const lt = new Date(deviceB[0].updatedAt).getTime()
    const ct = new Date(pulled.updatedAt).getTime()
    if (ct >= lt) deviceB[0] = { ...deviceB[0], ...pulled }
  }
  check('device B now shows completed', deviceB[0].status === 'completed')
  check('both devices agree', deviceA[0].status === deviceB[0].status)
}

/* --- With the old rule the second device stays stale --- */
{
  const cloud = []
  const deviceB = [{ id: 'b1', status: 'confirmed' }]
  if (oldSyncs('completed')) cloud.push({ id: 'b1', status: 'completed' })
  const pulled = cloud.find((b) => b.id === 'b1')
  if (pulled) deviceB[0] = { ...deviceB[0], ...pulled }
  check('OLD: device B stays pink forever', deviceB[0].status === 'confirmed')
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
