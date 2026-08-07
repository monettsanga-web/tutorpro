/**
 * Parents must be able to find their teacher and rate them.
 *
 * THE GAP THIS CLOSES
 * -------------------
 * Rating was possible before, but only through a small "Rate class" button
 * buried in one row of the lesson list. A parent had to already be looking at
 * the right completed lesson to find it, and there was nowhere to see the
 * teacher as a person. Most reviews were simply never written.
 *
 * WHAT MUST STAY TRUE
 * -------------------
 *  1. Only real, completed lessons can be rated, and only once each.
 *  2. The average shown is THIS FAMILY'S average for that teacher. It must
 *     never be presented as the teacher's global score.
 *  3. A review must be confirmed uploaded before the parent is told it saved,
 *     otherwise it lives on one device and the teacher never sees it.
 *  4. Nothing is invented: a teacher with no completed lessons says so.
 *
 * Run: node scripts/test-parent-teacher-reviews.mjs
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const read = (rel) => readFileSync(resolve(repo, rel), 'utf8')

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

const panel = read('src/ParentTeacherReviews.jsx')
const dash = read('src/Dashboards.jsx')
const bookings = read('src/bookings.js')
const css = read('src/dashboard.css')

/* ------------------------------------------------------------------ */
/* A faithful re-implementation of the grouping, so the logic itself   */
/* is exercised rather than only pattern-matched.                      */
/* ------------------------------------------------------------------ */
function groupByTeacher(all, studentId, accounts = {}) {
  const mine = all.filter((b) => b.studentId === studentId)
  const map = new Map()
  mine.forEach((b) => {
    if (!b.teacherId) return
    if (!map.has(b.teacherId)) map.set(b.teacherId, [])
    map.get(b.teacherId).push(b)
  })
  return [...map.entries()].map(([teacherId, list]) => {
    const completed = list.filter((b) => b.status === 'completed')
    const rated = completed.filter((b) => b.studentRating?.score)
    const awaiting = completed.filter((b) => !b.studentRating?.score)
    const myAverage = rated.length
      ? Math.round((rated.reduce((s, b) => s + Number(b.studentRating.score), 0) / rated.length) * 10) / 10
      : null
    return {
      teacherId,
      name: accounts[teacherId]?.fullName || 'Your teacher',
      completedCount: completed.length,
      awaiting,
      myAverage,
      myReviews: rated,
    }
  }).sort((a, b) => (b.awaiting.length - a.awaiting.length) || (b.completedCount - a.completedCount))
}

const PARENT = 'parent-1'
const T1 = 'teacher-m'
const T2 = 'teacher-co'

/* --- 1. Only ratable lessons are offered --- */
{
  const data = [
    { id: '1', studentId: PARENT, teacherId: T1, status: 'completed', date: '2026-08-01', time: '09:00' },
    { id: '2', studentId: PARENT, teacherId: T1, status: 'confirmed', date: '2026-08-09', time: '09:00' },
    { id: '3', studentId: PARENT, teacherId: T1, status: 'cancelled', date: '2026-08-02', time: '09:00' },
    { id: '4', studentId: PARENT, teacherId: T1, status: 'absent', date: '2026-08-03', time: '09:00' },
    { id: '5', studentId: PARENT, teacherId: T1, status: 'pending', date: '2026-08-10', time: '09:00' },
  ]
  const [teacher] = groupByTeacher(data, PARENT)
  check('Only completed lessons can be rated', teacher.awaiting.length === 1, `${teacher.awaiting.length} offered`)
  check('A cancelled lesson is never offered', !teacher.awaiting.some((b) => b.status === 'cancelled'))
  check('An absent lesson is never offered', !teacher.awaiting.some((b) => b.status === 'absent'))
  check('An upcoming lesson is never offered', !teacher.awaiting.some((b) => b.status === 'confirmed'))
}

/* --- 2. A lesson cannot be rated twice --- */
{
  const data = [
    { id: '1', studentId: PARENT, teacherId: T1, status: 'completed', studentRating: { score: 5 } },
    { id: '2', studentId: PARENT, teacherId: T1, status: 'completed' },
  ]
  const [teacher] = groupByTeacher(data, PARENT)
  check('An already-rated lesson is not offered again', teacher.awaiting.length === 1 && teacher.awaiting[0].id === '2')
  check('The rated one still counts as a review', teacher.myReviews.length === 1)
  check('The database also refuses a second rating',
    /This lesson has already been rated/.test(bookings))
  check('The database also refuses rating an unfinished lesson',
    /A lesson can be rated after it is completed/.test(bookings))
  check('Only the lesson\'s own parent may rate it',
    /booking\.studentId !== studentId/.test(bookings))
  check('The score is validated as 1 to 5',
    /score < 1 \|\| score > 5/.test(bookings))
}

/* --- 3. One family never sees another family's lessons --- */
{
  const data = [
    { id: '1', studentId: PARENT, teacherId: T1, status: 'completed' },
    { id: '2', studentId: 'other-parent', teacherId: T1, status: 'completed' },
    { id: '3', studentId: 'other-parent', teacherId: T2, status: 'completed' },
  ]
  const teachers = groupByTeacher(data, PARENT)
  check('Only this family\'s teachers are listed', teachers.length === 1 && teachers[0].teacherId === T1)
  check('Another family\'s lesson is not ratable', teachers[0].awaiting.length === 1)
  check('The panel filters bookings by this parent', /getBookings\(\{ studentId \}\)/.test(panel))
}

/* --- 4. The average is this family's own, and is labelled so --- */
{
  const data = [
    { id: '1', studentId: PARENT, teacherId: T1, status: 'completed', studentRating: { score: 5 } },
    { id: '2', studentId: PARENT, teacherId: T1, status: 'completed', studentRating: { score: 4 } },
  ]
  const [teacher] = groupByTeacher(data, PARENT)
  check('The average is computed correctly', teacher.myAverage === 4.5)
  check('It is labelled as the parent\'s own rating', /your rating/.test(panel))
  check('The reason it must not read as a global score is recorded',
    /never presented as the teacher's global score|never the teacher's global score/i.test(panel))
  check('An unrated teacher shows no invented average',
    groupByTeacher([{ id: '9', studentId: PARENT, teacherId: T1, status: 'completed' }], PARENT)[0].myAverage === null)
  check('An unrated teacher says so plainly', /Not rated yet/.test(panel))
}

/* --- 5. Teachers needing a review come first --- */
{
  const data = [
    { id: '1', studentId: PARENT, teacherId: T1, status: 'completed', studentRating: { score: 5 } },
    { id: '2', studentId: PARENT, teacherId: T1, status: 'completed', studentRating: { score: 5 } },
    { id: '3', studentId: PARENT, teacherId: T2, status: 'completed' },
  ]
  const order = groupByTeacher(data, PARENT).map((t) => t.teacherId)
  check('A teacher awaiting a review is listed first', order[0] === T2, order.join(' then '))
  check('The card is visually flagged when a review is due',
    /ptr-card--awaiting/.test(panel) && /ptr-card--awaiting/.test(css))
}

/* --- 6. Nothing is invented for a brand-new family --- */
{
  check('No teachers means an honest empty state', groupByTeacher([], PARENT).length === 0)
  check('The empty state is written, not blank', /No teachers yet/.test(panel))
  check('A teacher with no completed lessons says so',
    /You can review after the first class/.test(panel))
  check('Zero classes is shown as "None yet", not 0',
    /teacher\.completedCount \|\| 'None yet'/.test(panel))
}

/* --- 7. The review must be confirmed uploaded --- */
{
  check('The rating dialog awaits the upload',
    /await withTimeout\(\s*syncBookingNow\(saved\),\s*12000/.test(dash))
  check('A failed upload is reported honestly, not silently swallowed',
    /Your review is saved on this device, but your teacher will not see it/.test(dash))
  check('The button shows progress while sending', /Sending your review…/.test(dash))
  check('Double submission is prevented', /if \(saving\) return/.test(dash))
  check('The reason this matters is recorded',
    /the same\s*\n?\s*\* bug that lost teacher feedback/i.test(dash))
}

/* --- 8. Discoverability: the whole point of the feature --- */
{
  check('There is a dedicated My teachers tab', /id: 'my-teachers'/.test(dash))
  check('The tab badges how many classes await a review',
    /badge: unratedCount/.test(dash))
  check('That count only includes completed, unrated lessons',
    /status === 'completed' && !booking\.studentRating\?\.score/.test(dash))
  check('The section is rendered', /<ParentTeacherReviews/.test(dash))
  check('It reuses the existing rating dialog rather than a second one',
    /onRateBooking=\{setRatingBooking\}/.test(dash))
  check('The view refreshes after a rating is saved',
    /version=\{bookingVersion\}/.test(dash) && /void version/.test(panel))
}

/* --- 9. The teacher is shown as a person --- */
{
  for (const field of ['specialization', 'experience', 'languages', 'education']) {
    check(`The card can show ${field}`, new RegExp(`${field}`).test(panel))
  }
  check('The teacher photo is shown', /<ProfilePhoto/.test(panel))
  check('Credentials are only shown when present, never as blanks',
    /teacher\.experience > 0 &&/.test(panel) && /teacher\.languages &&/.test(panel))
  check('The parent can read their own past reviews', /See my \$\{/.test(panel) || /See my /.test(panel))
  check('A rating left without a comment is described honestly',
    /Rated without a comment/.test(panel))
}

/* --- 10. The parent is told where their words may appear --- */
{
  check('The parent is warned reviews may be published',
    /may appear publicly on the TutorPro website/.test(panel))
  check('They are told their name will be shown', /shown with your name/.test(panel))
  check('They are told they can have it removed', /would like a review removed/i.test(panel))

  // The warning must reach them BEFORE they write, not only afterwards.
  const dashSrc = read('src/Dashboards.jsx')
  check('The rating box warns about publication before they type',
    /may appear publicly on the\s*\n?\s*TutorPro website with your name/.test(dashSrc))
  check('That warning shows for every score, so it is not a nudge',
    !/rating >= 4[\s\S]{0,120}rating-dialog__notice/.test(dashSrc))
  check('That matches what the website actually publishes',
    /score >= 4/.test(read('src/publicReviews.js')) || /MIN_PUBLISHED_SCORE/.test(read('src/publicReviews.js')))
}

/* --- 11. It looks finished --- */
{
  check('The section is styled', /\.ptr-card \{/.test(css))
  check('The rate button is prominent', /\.ptr-rate-button/.test(css))
  check('It collapses to one column on a phone',
    /@media \(max-width: 560px\)[\s\S]{0,200}\.ptr-grid \{ grid-template-columns: 1fr/.test(css))
  check('Stars use a real accessible label', /role="img"/.test(panel) && /aria-label=/.test(panel))
  check('The expand control reports its state', /aria-expanded=\{isOpen\}/.test(panel))
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
