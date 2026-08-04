/**
 * WebRTC offer/answer role assignment.
 *
 * A call needs exactly one side to create the offer and one to answer it. That
 * was decided by `account.role === 'teacher'`, which quietly breaks whenever
 * the person on the teaching side is not a teacher account. The clearest case
 * is an administrator opening the classroom from the admin dashboard: the admin
 * account is passed straight through, `role` is 'admin', so BOTH ends took the
 * answering branch, no offer was ever created, and the pair sat forever on
 * "Both of you are in the room. Re-establishing the video link".
 *
 * The role is now derived from the booking: whoever is not the booked student
 * hosts the call.
 *
 * Run: node scripts/test-classroom-roles.mjs
 */

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

/** The old rule. */
const oldIsHost = (account) => account.role === 'teacher'

/** The new rule. */
function newIsHost(account, booking) {
  const isBookedStudent = String(booking.studentId || '') === String(account.id)
  return booking.teacherId || booking.studentId ? !isBookedStudent : account.role === 'teacher'
}

/** A call only works when exactly one participant hosts. */
const exactlyOneHost = (a, b) => (a ? 1 : 0) + (b ? 1 : 0) === 1

const booking = { id: 'bk1', teacherId: 'T1', studentId: 'S1' }
const teacher = { id: 'T1', role: 'teacher' }
const student = { id: 'S1', role: 'student' }
const admin = { id: 'A1', role: 'admin' }

/* --- Normal lesson: works under both rules --- */
check('OLD: teacher + student negotiates', exactlyOneHost(oldIsHost(teacher), oldIsHost(student)))
check('NEW: teacher + student negotiates',
  exactlyOneHost(newIsHost(teacher, booking), newIsHost(student, booking)))
check('NEW: the teacher is the host', newIsHost(teacher, booking) === true)
check('NEW: the student answers', newIsHost(student, booking) === false)

/* --- Admin joins in place of the teacher: the reported failure --- */
check('OLD: admin + student produces NO host (the bug)',
  oldIsHost(admin) === false && oldIsHost(student) === false)
check('OLD: admin + student cannot negotiate',
  exactlyOneHost(oldIsHost(admin), oldIsHost(student)) === false)
check('NEW: admin hosts in the teacher slot', newIsHost(admin, booking) === true)
check('NEW: admin + student negotiates',
  exactlyOneHost(newIsHost(admin, booking), newIsHost(student, booking)))

/* --- Admin observing a lesson the teacher is already hosting --- */
check('NEW: teacher still hosts against a student',
  exactlyOneHost(newIsHost(teacher, booking), newIsHost(student, booking)))

/* --- A parent account acting as the student --- */
const parent = { id: 'S1', role: 'parent' }
check('NEW: parent on the student side answers', newIsHost(parent, booking) === false)
check('NEW: parent + teacher negotiates',
  exactlyOneHost(newIsHost(teacher, booking), newIsHost(parent, booking)))

/* --- A teacher account that is not the booked teacher (a substitute) --- */
const substitute = { id: 'T2', role: 'teacher' }
check('NEW: substitute teacher hosts', newIsHost(substitute, booking) === true)
check('NEW: substitute + student negotiates',
  exactlyOneHost(newIsHost(substitute, booking), newIsHost(student, booking)))

/* --- Degenerate bookings must not crash or deadlock --- */
const noIds = { id: 'bk2' }
check('missing ids fall back to the account role',
  newIsHost(teacher, noIds) === true && newIsHost(student, noIds) === false)
check('missing ids still negotiate',
  exactlyOneHost(newIsHost(teacher, noIds), newIsHost(student, noIds)))

/* --- Numeric vs string ids must still match --- */
const numeric = { id: 'bk3', teacherId: 1, studentId: 2 }
check('numeric student id matches',
  newIsHost({ id: 2, role: 'student' }, numeric) === false)
check('numeric teacher id hosts',
  newIsHost({ id: 1, role: 'teacher' }, numeric) === true)

/* --- The student must never be the host, whatever their account role --- */
for (const role of ['student', 'parent', 'admin', 'teacher']) {
  check(`booked student with role '${role}' never hosts`,
    newIsHost({ id: 'S1', role }, booking) === false)
}

/* --- Two students in one room cannot both host --- */
const otherStudent = { id: 'S9', role: 'student' }
check('a non-booked student would host (documented, not a lesson case)',
  newIsHost(otherStudent, booking) === true)

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
