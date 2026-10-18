/**
 * Pins the day-shift / night-shift quick fill: the preset windows, the
 * across-midnight split and the stored preference. A teacher under review
 * opens their hours with one tap instead of painting forty cells.
 */
import { TEACHER_SHIFTS, buildShiftSlots, teacherShift } from '../src/teacherShifts.js'

let pass = 0
let fail = 0
const ok = (condition, label) => {
  if (condition) { pass += 1; console.log(`  ok  ${label}`) }
  else { fail += 1; console.log(`FAIL  ${label}`) }
}

ok(Object.keys(TEACHER_SHIFTS).join(',') === 'day,night', 'exactly two shifts are offered: day and night')
ok(TEACHER_SHIFTS.day.hours === '08:00 – 18:00' && TEACHER_SHIFTS.night.hours === '21:00 – 03:00', 'the shift windows are the owner\'s hours: day 08:00-18:00, night 21:00-03:00')

const day = buildShiftSlots('day')
ok(day.length === 7 * 20, 'day shift opens ten hours on each of the seven days')
ok(day.includes('0-08:00') && day.includes('0-17:30') && !day.includes('0-18:00'), 'day slots run 08:00 up to but not including 18:00')

const night = buildShiftSlots('night')
ok(night.length === 7 * 12, 'night shift opens six hours on each of the seven days')
ok(night.includes('0-21:00') && night.includes('0-23:30'), 'the evening half of the night shift starts at 21:00')
ok(night.includes('0-00:00') && night.includes('0-02:30') && !night.includes('0-03:00'), 'the after-midnight half stops at 03:00')
ok(buildShiftSlots('nope').length === 0, 'an unknown shift opens nothing')

ok(teacherShift({ teacher: { shift: 'night' } }) === 'night', 'a stored night shift reads back')
ok(teacherShift({ teacher: { shift: 'NIGHT' } }) === 'night', 'the stored shift is case-insensitive')
ok(teacherShift({ teacher: {} }) === '' && teacherShift(null) === '', 'a missing shift reads as empty, not undefined')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
