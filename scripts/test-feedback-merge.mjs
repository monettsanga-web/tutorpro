/**
 * Teacher feedback must reach every device — including EDITS.
 *
 * THE REPORTED SYMPTOM
 * --------------------
 * "I add feedback to a booked lesson, but when I open another device it is not
 *  updated, and the parent cannot see it either."
 *
 * THE BUG THIS PINS DOWN
 * ----------------------
 * mergeCloudBookings compared whole-record `updatedAt` values. When the local
 * record was newer overall it kept the local copy and only "rescued" fields it
 * had NOTHING for. That silently lost every EDIT:
 *
 *   Laptop A: teacher corrects the feedback  -> new teacherFeedback.createdAt
 *   Laptop B: already has version 1, and has touched the record since for an
 *             unrelated reason (status change, comment, opening the classroom)
 *   Result:   B's record is "newer", B already has *a* feedback, so the
 *             correction is discarded. Permanently, on every device.
 *
 * THE FIX
 * -------
 * Compare each field on its own timestamp (`createdAt`), not the record's.
 * Two devices touch a booking for unrelated reasons, so the record timestamp
 * says nothing about who last edited a particular field.
 *
 * Run: node scripts/test-feedback-merge.mjs
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

/* ------------------------------------------------------------------ */
/* Mirrors of the two merge strategies, so old and new can be compared */
/* ------------------------------------------------------------------ */

function fieldIsNewer(incoming, existing) {
  if (!incoming) return false
  if (!existing) return true
  const incomingAt = new Date(incoming.createdAt || incoming.updatedAt || 0).getTime()
  const existingAt = new Date(existing.createdAt || existing.updatedAt || 0).getTime()
  if (!Number.isFinite(incomingAt) || !incomingAt) return false
  if (!Number.isFinite(existingAt) || !existingAt) return true
  return incomingAt > existingAt
}

/** What the code used to do: only fill in fields we had nothing for. */
function oldMerge(local, cloud) {
  const localTime = new Date(local.updatedAt || 0).getTime()
  const cloudTime = new Date(cloud.updatedAt || 0).getTime()
  if (cloudTime >= localTime) return { ...local, ...cloud }
  const rescue = {}
  if (!local.teacherFeedback?.summary?.trim() && cloud.teacherFeedback?.summary?.trim()) {
    rescue.teacherFeedback = cloud.teacherFeedback
  }
  if (!local.studentRating && cloud.studentRating) rescue.studentRating = cloud.studentRating
  if (cloud.status === 'completed' && ['confirmed', 'ongoing'].includes(local.status)) rescue.status = 'completed'
  return Object.keys(rescue).length ? { ...local, ...rescue } : local
}

/** What it does now: compare each field on its own timestamp. */
function newMerge(local, cloud) {
  const localTime = new Date(local.updatedAt || 0).getTime()
  const cloudTime = new Date(cloud.updatedAt || 0).getTime()
  if (cloudTime >= localTime) return { ...local, ...cloud }
  const rescue = {}
  if (cloud.teacherFeedback?.summary?.trim() && fieldIsNewer(cloud.teacherFeedback, local.teacherFeedback)) {
    rescue.teacherFeedback = cloud.teacherFeedback
  }
  if (cloud.studentRating && fieldIsNewer(cloud.studentRating, local.studentRating)) {
    rescue.studentRating = cloud.studentRating
  }
  if (cloud.sessionRecap && fieldIsNewer(cloud.sessionRecap, local.sessionRecap)) {
    rescue.sessionRecap = cloud.sessionRecap
  }
  if (cloud.status === 'completed' && ['confirmed', 'ongoing'].includes(local.status)) rescue.status = 'completed'
  return Object.keys(rescue).length ? { ...local, ...rescue } : local
}

const fb = (summary, createdAt) => ({ summary, createdAt })

/* --- 1. The reported failure: an EDIT never arrived --- */
{
  // Laptop B touched the record after laptop A wrote the correction.
  const local = {
    id: 'b1', status: 'completed', updatedAt: '2026-08-07T10:05:00Z',
    teacherFeedback: fb('first draft', '2026-08-07T09:00:00Z'),
  }
  const cloud = {
    id: 'b1', status: 'completed', updatedAt: '2026-08-07T10:00:00Z',
    teacherFeedback: fb('CORRECTED: she mastered long vowels', '2026-08-07T10:00:00Z'),
  }

  check('OLD: the corrected feedback was silently discarded',
    oldMerge(local, cloud).teacherFeedback.summary === 'first draft')
  check('NEW: the corrected feedback arrives',
    newMerge(local, cloud).teacherFeedback.summary === 'CORRECTED: she mastered long vowels')
}

/* --- 2. Brand-new feedback on a device that had none --- */
{
  const local = { id: 'b2', status: 'confirmed', updatedAt: '2026-08-07T10:05:00Z' }
  const cloud = {
    id: 'b2', status: 'completed', updatedAt: '2026-08-07T10:00:00Z',
    teacherFeedback: fb('Great work today', '2026-08-07T10:00:00Z'),
  }
  const merged = newMerge(local, cloud)
  check('New feedback reaches a device that had none', merged.teacherFeedback.summary === 'Great work today')
  check('The lesson also turns completed', merged.status === 'completed')
}

/* --- 3. Safety: a STALE copy must never overwrite newer work --- */
{
  const local = {
    id: 'b3', status: 'completed', updatedAt: '2026-08-07T12:00:00Z',
    teacherFeedback: fb('the newest edit, written here', '2026-08-07T12:00:00Z'),
  }
  const cloud = {
    id: 'b3', status: 'completed', updatedAt: '2026-08-07T11:00:00Z',
    teacherFeedback: fb('an old version', '2026-08-07T09:00:00Z'),
  }
  check('A stale cloud copy cannot clobber newer local feedback',
    newMerge(local, cloud).teacherFeedback.summary === 'the newest edit, written here')
}

/* --- 4. The parent's dashboard --- */
{
  // The parent rated the lesson, so their record is newer than the teacher's.
  const parentDevice = {
    id: 'b4', status: 'completed', updatedAt: '2026-08-07T11:00:00Z',
    studentRating: { score: 5, comment: 'Thank you!', createdAt: '2026-08-07T11:00:00Z' },
  }
  const teacherWrote = {
    id: 'b4', status: 'completed', updatedAt: '2026-08-07T10:00:00Z',
    teacherFeedback: fb('She read a full page unaided today.', '2026-08-07T10:00:00Z'),
  }
  const merged = newMerge(parentDevice, teacherWrote)
  check('The parent sees the teacher feedback', merged.teacherFeedback?.summary?.includes('full page'))
  check('The parent keeps their own rating', merged.studentRating?.score === 5)

  // And the teacher must see the rating come back the other way.
  const teacherDevice = {
    id: 'b4', status: 'completed', updatedAt: '2026-08-07T12:00:00Z',
    teacherFeedback: fb('She read a full page unaided today.', '2026-08-07T10:00:00Z'),
  }
  const parentRated = {
    id: 'b4', status: 'completed', updatedAt: '2026-08-07T11:00:00Z',
    studentRating: { score: 5, comment: 'Thank you!', createdAt: '2026-08-07T11:00:00Z' },
  }
  const back = newMerge(teacherDevice, parentRated)
  check('The teacher sees the parent rating', back.studentRating?.score === 5)
  check('The teacher keeps their own feedback', back.teacherFeedback?.summary?.includes('full page'))
}

/* --- 5. Edge cases that must not destroy a teacher's writing --- */
{
  const withText = { id: 'e1', status: 'completed', updatedAt: '2026-08-07T12:00:00Z', teacherFeedback: { summary: 'existing text, no timestamp' } }
  const incoming = { id: 'e1', status: 'completed', updatedAt: '2026-08-07T11:00:00Z', teacherFeedback: { summary: 'incoming, no timestamp' } }
  check('Untimestamped incoming never clobbers existing text',
    newMerge(withText, incoming).teacherFeedback.summary === 'existing text, no timestamp')

  const empty = { id: 'e2', status: 'completed', updatedAt: '2026-08-07T12:00:00Z' }
  check('Untimestamped incoming IS accepted when we have nothing',
    newMerge(empty, incoming).teacherFeedback.summary === 'incoming, no timestamp')

  const blank = { id: 'e3', status: 'completed', updatedAt: '2026-08-07T11:00:00Z', teacherFeedback: fb('   ', '2026-08-07T13:00:00Z') }
  const real = { id: 'e3', status: 'completed', updatedAt: '2026-08-07T12:00:00Z', teacherFeedback: fb('real feedback', '2026-08-07T10:00:00Z') }
  check('A whitespace-only summary is not published over real feedback',
    newMerge(real, blank).teacherFeedback.summary === 'real feedback')

  check('A malformed timestamp cannot overwrite existing feedback',
    newMerge(
      { id: 'e4', updatedAt: '2026-08-07T12:00:00Z', teacherFeedback: fb('good', '2026-08-07T10:00:00Z') },
      { id: 'e4', updatedAt: '2026-08-07T11:00:00Z', teacherFeedback: fb('bad', 'not-a-date') },
    ).teacherFeedback.summary === 'good')

  check('Identical timestamps do not flip-flop',
    newMerge(
      { id: 'e5', updatedAt: '2026-08-07T12:00:00Z', teacherFeedback: fb('mine', '2026-08-07T10:00:00Z') },
      { id: 'e5', updatedAt: '2026-08-07T11:00:00Z', teacherFeedback: fb('theirs', '2026-08-07T10:00:00Z') },
    ).teacherFeedback.summary === 'mine')
}

/* --- 6. Repeated syncs must settle, not oscillate --- */
{
  let device = { id: 's1', status: 'completed', updatedAt: '2026-08-07T10:05:00Z', teacherFeedback: fb('v1', '2026-08-07T09:00:00Z') }
  const cloud = { id: 's1', status: 'completed', updatedAt: '2026-08-07T10:00:00Z', teacherFeedback: fb('v2', '2026-08-07T10:00:00Z') }
  const seen = new Set()
  for (let i = 0; i < 10; i += 1) {
    device = newMerge(device, cloud)
    seen.add(device.teacherFeedback.summary)
  }
  check('Polling every 3s converges instead of flip-flopping', seen.size === 1 && device.teacherFeedback.summary === 'v2')
}

/* --- 7. The shipped source really does this --- */
{
  const source = readFileSync(resolve(repo, 'src/bookings.js'), 'utf8')
  check('fieldIsNewer exists', /function fieldIsNewer\(incoming, existing\)/.test(source))
  check('Feedback is compared per field, not per record',
    /fieldIsNewer\(\s*cloudBooking\.teacherFeedback/.test(source))
  check('The rating is compared per field too',
    /fieldIsNewer\(cloudBooking\.studentRating/.test(source))
  check('The recap is compared per field too',
    /fieldIsNewer\(cloudBooking\.sessionRecap/.test(source))
  check('An empty summary is still never published',
    /cloudBooking\.teacherFeedback\?\.summary\?\.trim\(\) && newerFeedback/.test(source))
  check('A completed lesson still cannot un-complete',
    /cloudBooking\.status === 'completed' && \['confirmed', 'ongoing'\]/.test(source))
  check('The reason for the change is recorded for future readers',
    /silently lost EDITS/i.test(source))

  // The write path must still confirm the upload before claiming success.
  const dash = readFileSync(resolve(repo, 'src/Dashboards.jsx'), 'utf8')
  check('Saving feedback still waits for the upload to be confirmed',
    /withTimeout\(syncBookingNow\(saved\), 12000/.test(dash))
  check('Both parent and teacher dashboards pull shared bookings',
    (dash.match(/mergeCloudBookings\(sharedBookings/g) || []).length >= 3)
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
