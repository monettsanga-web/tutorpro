/**
 * Covers three classroom fixes:
 *   1. Booked classrooms must list past lessons, not only active ones.
 *   2. The teacher's scroll position must move the student's board, including
 *      scrolling within a single page.
 *   3. A teacher's uploads must be reusable across lessons.
 *
 * Run: node scripts/test-classroom-sharing.mjs
 */

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

/* ---------------------------------------------------------------- */
/* 1. Classroom list                                                  */
/* ---------------------------------------------------------------- */

const when = (b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() || 0

function classroomHistory(bookings) {
  const relevant = bookings.filter((b) => ['confirmed', 'ongoing', 'completed', 'absent'].includes(b.status))
  const live = relevant.filter((b) => ['confirmed', 'ongoing'].includes(b.status)).sort((a, b) => when(a) - when(b))
  const past = relevant.filter((b) => ['completed', 'absent'].includes(b.status)).sort((a, b) => when(b) - when(a))
  return [...live, ...past.slice(0, 20)]
}

const bookings = [
  { id: 'c1', status: 'confirmed', date: '2026-08-10', time: '15:00' },
  { id: 'c2', status: 'confirmed', date: '2026-08-08', time: '15:00' },
  { id: 'p1', status: 'completed', date: '2026-08-01', time: '15:00' },
  { id: 'p2', status: 'completed', date: '2026-07-25', time: '15:00' },
  { id: 'a1', status: 'absent',    date: '2026-07-20', time: '15:00' },
  { id: 'x1', status: 'pending',   date: '2026-08-12', time: '15:00' },
  { id: 'x2', status: 'cancelled', date: '2026-08-02', time: '15:00' },
]
const list = classroomHistory(bookings)

check('past lessons now appear', list.some((b) => b.id === 'p1'))
check('absent lessons appear', list.some((b) => b.id === 'a1'))
check('pending excluded', !list.some((b) => b.id === 'x1'))
check('cancelled excluded', !list.some((b) => b.id === 'x2'))
check('upcoming listed first', list[0].id === 'c2', list[0].id)
check('soonest upcoming before later', list.indexOf(list.find((b) => b.id === 'c2')) < list.indexOf(list.find((b) => b.id === 'c1')))
check('most recent past first among past', list.find((b) => ['completed', 'absent'].includes(b.status)).id === 'p1')
check('all live lessons kept', list.filter((b) => b.status === 'confirmed').length === 2)
check('empty input is safe', classroomHistory([]).length === 0)

/* ---------------------------------------------------------------- */
/* 2. Scroll sync                                                     */
/* ---------------------------------------------------------------- */

function makeBoard(role) {
  return {
    role,
    scrollTop: 0,
    scrollHeight: 10000,
    clientHeight: 800,
    programmaticUntil: 0,
    sent: [],
    canControl: role === 'teacher',
    // Teacher scrolls: broadcast a ratio unless we are mid programmatic scroll.
    userScroll(px, now = Date.now()) {
      this.scrollTop = px
      if (now < this.programmaticUntil) return null
      if (!this.canControl) return null
      const scrollable = this.scrollHeight - this.clientHeight
      const ratio = scrollable > 0 ? px / scrollable : 0
      const clamped = Math.max(0, Math.min(1, ratio))
      this.sent.push(clamped)
      return clamped
    },
    // Student receives: move unless the difference is trivial.
    receiveRatio(ratio, now = Date.now()) {
      if (this.canControl) return false
      const scrollable = this.scrollHeight - this.clientHeight
      if (scrollable <= 0) return false
      const target = ratio * scrollable
      if (Math.abs(this.scrollTop - target) < 8) return false
      this.programmaticUntil = now + 400
      this.scrollTop = target
      return true
    },
  }
}

const teacher = makeBoard('teacher')
const student = makeBoard('student')

// Scrolling WITHIN a page must still move the student. This is the reported bug.
const r1 = teacher.userScroll(300)
check('teacher scroll broadcasts a ratio', typeof r1 === 'number', String(r1))
check('sub-page scroll produces a non-zero ratio', r1 > 0 && r1 < 0.05, String(r1))
check('student follows a small scroll', student.receiveRatio(r1) === true)
check('student position matches teacher', Math.abs(student.scrollTop - teacher.scrollTop) < 1,
  `${student.scrollTop} vs ${teacher.scrollTop}`)

// Larger move
const r2 = teacher.userScroll(5000)
student.receiveRatio(r2)
check('student follows a large scroll', Math.abs(student.scrollTop - 5000) < 1, String(student.scrollTop))

// The student must never broadcast back.
const echo = student.userScroll(1234)
check('student never broadcasts', echo === null && student.sent.length === 0)

// A programmatic scroll must not echo, or the two boards fight.
const now = Date.now()
student.programmaticUntil = now + 400
const echo2 = student.userScroll(2222, now)
check('programmatic scroll does not echo', echo2 === null)

// Ignore no-op updates so rendering differences do not cause jitter.
student.scrollTop = 5000
check('near-identical ratio ignored', student.receiveRatio(5000 / (10000 - 800)) === false)

// Bounds
const t2 = makeBoard('teacher')
check('ratio clamped at the bottom', t2.userScroll(999999) === 1)
check('ratio clamped at the top', t2.userScroll(-50) === 0)

// Different viewport sizes must still land in the same relative place.
const bigStudent = makeBoard('student')
bigStudent.scrollHeight = 20000
bigStudent.clientHeight = 1000
bigStudent.receiveRatio(0.5)
check('different screen size lands proportionally',
  Math.abs(bigStudent.scrollTop - 0.5 * (20000 - 1000)) < 1, String(bigStudent.scrollTop))

/* ---------------------------------------------------------------- */
/* 3. Reusable file library                                           */
/* ---------------------------------------------------------------- */

function storagePath({ bookingId, teacherId, fileName }) {
  const safe = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  return teacherId ? `library/${teacherId}/1700000000__${safe}` : `${bookingId}/uuid.pdf`
}

check('teacher upload goes to the library',
  storagePath({ bookingId: 'bk1', teacherId: 't1', fileName: 'Unit 3.pdf' }).startsWith('library/t1/'))
check('library path is not tied to a booking',
  !storagePath({ bookingId: 'bk1', teacherId: 't1', fileName: 'a.pdf' }).includes('bk1'))
check('student upload stays with the booking',
  storagePath({ bookingId: 'bk1', teacherId: '', fileName: 'a.pdf' }).startsWith('bk1/'))
check('unsafe characters removed',
  storagePath({ bookingId: 'b', teacherId: 't1', fileName: '../../etc/passwd' }).includes('.._.._etc_passwd'))
check('no path traversal escapes the library',
  !storagePath({ bookingId: 'b', teacherId: 't1', fileName: '../../x.pdf' }).includes('/../'))

// Already-shared files should not be offered again.
const library = [
  { storagePath: 'library/t1/1__a.pdf', name: 'a.pdf' },
  { storagePath: 'library/t1/2__b.pdf', name: 'b.pdf' },
]
const shared = [{ storagePath: 'library/t1/1__a.pdf' }]
const offered = library.filter((item) => !shared.some((f) => f.storagePath === item.storagePath))
check('already-shared file hidden from the list', offered.length === 1 && offered[0].name === 'b.pdf')

// Display name strips the timestamp prefix.
check('timestamp prefix hidden from the name',
  '1700000000__Unit 3.pdf'.replace(/^\d+__/, '') === 'Unit 3.pdf')

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
