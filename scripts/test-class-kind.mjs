/**
 * Trial or regular, decided by the administrator.
 *
 * The rule used to be automatic and unarguable: a learner's first booking
 * was the free trial, everything after it was paid. That is right for a
 * parent booking for themselves and wrong for an administrator, who is the
 * only one who knows a class was agreed as a trial — or agreed as paid from
 * the very first lesson.
 *
 * These checks prove the admin's choice wins, that a parent's booking is
 * untouched by the change, and that the teacher is actually shown which is
 * which rather than having to guess.
 */
import { readFileSync } from 'node:fs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

/* A localStorage stand-in, so the real booking code can run in Node. */
const store = new Map()
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
}
globalThis.sessionStorage = globalThis.localStorage
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  queueMicrotask: (fn) => fn(), setTimeout, clearTimeout, setInterval, clearInterval,
}
globalThis.Event = class { constructor(type) { this.type = type } }
globalThis.WebSocket = class { constructor() { throw new Error('sockets unused') } }

const STUDENT = 'student-1'
const LEARNER = { id: 'learner-1', name: 'Ana', accessStatus: 'active' }
const TEACHER = 'teacher-1'

const accounts = [
  { id: STUDENT, role: 'student', status: 'active', parentName: 'Maria', children: [LEARNER], child: LEARNER },
  {
    id: TEACHER,
    role: 'teacher',
    status: 'approved',
    fullName: 'Teacher M',
    // Free 16:00-17:00 every day, so the dates below are all bookable.
    teacher: {
      availabilitySlots: Array.from({ length: 7 }, (_, day) => [`${day}-16:00`, `${day}-16:30`]).flat(),
      classroom: {},
    },
  },
]
store.set('tutorpro_accounts_v2', JSON.stringify(accounts))
store.set('tutorpro_bookings_v1', '[]')

const bookings = await import('../src/bookings.js')

const base = (date, time, extra = {}) => ({
  teacherId: TEACHER, teacherName: 'Teacher M', studentId: STUDENT, learnerId: LEARNER.id,
  learnerName: LEARNER.name, learnerProfile: LEARNER, date, time, duration: 25,
  focus: 'Speaking with confidence', ...extra,
})

/* ================================================================== */
/* 1. A parent booking: the old automatic rule, unchanged              */
/* ================================================================== */
const first = bookings.createBooking(base('2027-01-04', '16:00'))
ok(first.isTrialClass === true, 'a learner\'s first lesson is still the free trial')
ok(first.classKindSetBy === 'automatic', 'and it is recorded as the automatic rule, not a decision')

const second = bookings.createBooking(base('2027-01-05', '16:00'))
ok(second.isTrialClass === false, 'their second lesson is a regular class')
ok(second.classKindSetBy === 'automatic', 'also automatic')

/* ================================================================== */
/* 2. An administrator overriding it                                    */
/* ================================================================== */
const forcedRegular = bookings.createBooking(base('2027-01-06', '16:00', { classKind: 'regular' }))
ok(forcedRegular.isTrialClass === false, 'an admin can book a regular class')
ok(forcedRegular.classKindSetBy === 'admin', 'and it is recorded as their decision')

const forcedTrial = bookings.createBooking(base('2027-01-07', '16:00', { classKind: 'trial' }))
ok(forcedTrial.isTrialClass === true, 'an admin can give a second free trial when they choose to')
ok(forcedTrial.classKindSetBy === 'admin', 'recorded as their decision too')

/* A brand-new learner an admin marks as regular must NOT become a trial. */
store.set('tutorpro_bookings_v1', '[]')
const firstButPaid = bookings.createBooking(base('2027-02-01', '16:00', { classKind: 'regular' }))
ok(firstButPaid.isTrialClass === false, 'a first lesson can be booked as a paid class when the admin says so')
ok(firstButPaid.classKindSetBy === 'admin', 'the override is recorded')

/* Junk in the field must not silently flip anything. */
store.set('tutorpro_bookings_v1', '[]')
const junk = bookings.createBooking(base('2027-03-01', '16:00', { classKind: 'whatever' }))
ok(junk.isTrialClass === true, 'an unrecognised class type falls back to the automatic rule')
ok(junk.classKindSetBy === 'automatic', 'and is not recorded as a decision')

/* ================================================================== */
/* 3. Warning the admin before a second free trial                      */
/* ================================================================== */
store.set('tutorpro_bookings_v1', '[]')
ok(bookings.learnerHasUsedTrial(STUDENT, LEARNER.id) === false, 'a new learner has not used a trial')
const usedTrial = bookings.createBooking(base('2027-04-01', '16:00'))
ok(bookings.learnerHasUsedTrial(STUDENT, LEARNER.id) === true, 'after a trial is booked, we know')
bookings.updateBooking(usedTrial.id, { status: 'cancelled' })
ok(bookings.learnerHasUsedTrial(STUDENT, LEARNER.id) === false, 'a cancelled trial frees it up again')
ok(bookings.learnerHasUsedTrial(STUDENT, 'someone-else') === false, 'another child in the family is judged separately')
ok(bookings.learnerHasUsedTrial('', LEARNER.id) === false, 'a missing account is not reported as having used one')

/* ================================================================== */
/* 4. Mechanical: the choice reaches the teacher                        */
/* ================================================================== */
const dashboards = read('src/Dashboards.jsx')
const css = read('src/dashboard.css')
const bookingSource = read('src/bookings.js')

ok(/const requestedKind = details\.classKind/.test(bookingSource), 'the booking code reads the administrator\'s choice')
ok(bookingSource.includes("classKindSetBy: requestedKind ? 'admin' : 'automatic'"), 'and records who decided')

ok(dashboards.includes("classKind: adminBooking ? form.classKind : undefined"), 'only an administrator\'s booking carries a class type')
ok(dashboards.includes('classKind: adminReserveKind'), 'reserving a slot on a teacher calendar carries it too')
ok(/adminBooking && \(\s*\n\s*<fieldset className="compact-duration class-kind-choice"/.test(dashboards), 'the choice is only shown to an administrator')
ok(dashboards.includes('learnerHasUsedTrial(account.id, learner.id)'), 'a second free trial is flagged before it is booked')
ok(dashboards.includes('class-kind-chip--${booking.isTrialClass ? \'trial\' : \'regular\'}'), 'every lesson card states which kind it is')
ok(dashboards.includes('schedule-kind-tag--trial'), 'and the calendar cell is tagged for trials')
ok(dashboards.includes('teacher-day__trial'), 'the teacher\'s day list marks trials as well')
ok(!dashboards.includes('Free Trial Class\n'), 'the old emoji trial badge is gone — it rendered as an empty box')
ok(!/>\s*🎁 Free Trial Class/.test(dashboards) && !/>\s*🏆 Enrolled/.test(dashboards), 'no emoji is rendered on a lesson card badge')

// Two rules set this colour and the LATER one wins, so both must be red —
// changing only the first would look correct in the file and wrong on screen.
const bookedRules = css.match(/\.schedule-cell\.booked \{[^}]*\}/g) || []
ok(bookedRules.length >= 2, `every rule that colours a booked cell was found (${bookedRules.length})`)
ok(bookedRules.every((rule) => /#ffe4e6/.test(rule)), 'a booked class row is red in every one of them')
ok(bookedRules.every((rule) => /#e11d48/.test(rule)), 'with a red bar down its edge')
const trialRules = css.match(/\.schedule-cell\.booked\.booking-status-trial \{[^}]*\}/g) || []
ok(trialRules.length >= 2 && trialRules.every((rule) => /#f59e0b/.test(rule)), 'and a trial keeps its amber bar in every rule')
ok(/\.legend-dot--booked \{ background: #e11d48; \}/.test(css), 'and the legend matches what is on the grid')
ok(trialRules.some((rule) => /background: #fff3d6/.test(rule)), 'a trial stays amber, so it is not mistaken for a normal booking')
ok(css.includes('.class-kind-chip--trial'), 'the trial chip is styled')
ok(css.includes('.class-kind-chip--regular'), 'and so is the regular one')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
