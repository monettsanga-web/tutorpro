/**
 * Timezone conversion is now automatic and IP-based: a family never chooses
 * a timezone and never sees Manila time unless that is where they are.
 * These checks lock down the maths, the calendar-cell mapping and the .ics
 * export, plus mechanical checks that the old "switch to Manila" control is
 * really gone.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const read = (file) => readFileSync(resolve(root, file), 'utf8')

/* A tiny sessionStorage stub so the module's IP cache is testable in Node. */
const store = new Map()
globalThis.sessionStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
}
globalThis.localStorage = { ...globalThis.sessionStorage }

const tz = await import('../src/timezone.js')
const ics = await import('../src/bookingCalendar.js')

let passed = 0
const failures = []
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) passed += 1
  else failures.push(`${label}\n    expected ${JSON.stringify(expected)}\n    received ${JSON.stringify(actual)}`)
}
function truthy(label, value) { check(label, Boolean(value), true) }

/* ------------------------------------------------------------------ */
/* 1. Zone validation and resolution                                    */
/* ------------------------------------------------------------------ */
truthy('Asia/Seoul is a valid zone', tz.isValidTimeZone('Asia/Seoul'))
truthy('Europe/Warsaw is a valid zone', tz.isValidTimeZone('Europe/Warsaw'))
check('empty string is not a zone', tz.isValidTimeZone(''), false)
check('nonsense is not a zone', tz.isValidTimeZone('Moon/Base'), false)
check('bare UTC is rejected (no region)', tz.isValidTimeZone('UTC'), false)
check('non-string is rejected', tz.isValidTimeZone(null), false)

check('no IP zone cached yet', tz.readIpTimeZone(), '')
truthy('device zone is never empty', tz.deviceTimeZone().length > 0)
check('visitorTimeZone falls back to the device clock', tz.visitorTimeZone(), tz.deviceTimeZone())

check('an invalid zone is never saved', tz.saveIpTimeZone('Moon/Base'), '')
check('still nothing cached after a bad save', tz.readIpTimeZone(), '')
check('a valid IP zone is saved', tz.saveIpTimeZone('Europe/Warsaw'), 'Europe/Warsaw')
check('the IP zone now wins over the device clock', tz.visitorTimeZone(), 'Europe/Warsaw')
check('the legacy Manila-mode preference is cleared', store.has('tutorpro_timezone_mode'), false)
store.delete('tutorpro_ip_timezone')
check('cache cleared for the remaining checks', tz.readIpTimeZone(), '')

/* ------------------------------------------------------------------ */
/* 2. Manila -> viewer conversion                                       */
/* ------------------------------------------------------------------ */
check('Manila 16:00 is 17:00 in Seoul', tz.toViewerTime('16:00', '2026-03-02', 'Asia/Seoul'), { time: '17:00', dayOffset: 0 })
check('Manila 16:00 is 09:00 in Warsaw (winter)', tz.toViewerTime('16:00', '2026-01-15', 'Europe/Warsaw'), { time: '09:00', dayOffset: 0 })
check('Manila 16:00 is 10:00 in Warsaw (summer DST)', tz.toViewerTime('16:00', '2026-07-15', 'Europe/Warsaw'), { time: '10:00', dayOffset: 0 })
check('Manila 09:00 is 20:00 the previous day in New York', tz.toViewerTime('09:00', '2026-01-15', 'America/New_York'), { time: '20:00', dayOffset: -1 })
check('Manila 23:30 is 01:30 the next day in Sydney', tz.toViewerTime('23:30', '2026-07-15', 'Australia/Sydney'), { time: '01:30', dayOffset: 1 })
check('Manila 20:00 is 17:30 in Delhi (half-hour zone)', tz.toViewerTime('20:00', '2026-07-15', 'Asia/Kolkata'), { time: '17:30', dayOffset: 0 })
check('Manila time is unchanged for a Manila viewer', tz.toViewerTime('16:00', '2026-07-15', 'Asia/Manila'), { time: '16:00', dayOffset: 0 })
check('Kuala Lumpur shares our clock', tz.toViewerTime('16:00', '2026-07-15', 'Asia/Kuala_Lumpur'), { time: '16:00', dayOffset: 0 })
check('a malformed time is passed through untouched', tz.toViewerTime('not-a-time', '2026-07-15', 'Asia/Seoul'), { time: 'not-a-time', dayOffset: 0 })

/* ------------------------------------------------------------------ */
/* 3. Viewer -> Manila (what a clicked calendar cell really books)      */
/* ------------------------------------------------------------------ */
check('Seoul 17:00 books Manila 16:00', tz.toSchoolTime('17:00', '2026-03-02', 'Asia/Seoul'), { time: '16:00', dayOffset: 0 })
check('Warsaw 09:00 books Manila 16:00 in winter', tz.toSchoolTime('09:00', '2026-01-15', 'Europe/Warsaw'), { time: '16:00', dayOffset: 0 })
check('Sydney 01:30 books Manila 23:30 the previous day', tz.toSchoolTime('01:30', '2026-07-16', 'Australia/Sydney'), { time: '23:30', dayOffset: -1 })
check('New York 20:00 books Manila 09:00 the next day', tz.toSchoolTime('20:00', '2026-01-14', 'America/New_York'), { time: '09:00', dayOffset: 1 })

const zones = ['Asia/Seoul', 'Europe/Warsaw', 'America/New_York', 'Australia/Sydney', 'Asia/Kolkata', 'Asia/Manila', 'Europe/London']
let roundTripped = 0
for (const zone of zones) {
  for (const time of ['00:00', '06:30', '12:00', '16:00', '19:30', '23:30']) {
    const back = tz.toViewerTime(tz.toSchoolTime(time, '2026-05-11', zone).time, '2026-05-11', zone)
    if (back.time === time) roundTripped += 1
  }
}
check('every viewer time survives a round trip to Manila and back', roundTripped, zones.length * 6)

/* ------------------------------------------------------------------ */
/* 4. Calendar cells map to the right Manila slot                       */
/* ------------------------------------------------------------------ */
check('a Sydney Thursday 01:30 cell is a Manila Wednesday 23:30 slot',
  tz.schoolSlotForViewerCell('2026-07-16', '01:30', 'Australia/Sydney'), { date: '2026-07-15', time: '23:30' })
check('a New York Wednesday 20:00 cell is a Manila Thursday 09:00 slot',
  tz.schoolSlotForViewerCell('2026-01-14', '20:00', 'America/New_York'), { date: '2026-01-15', time: '09:00' })
check('a Manila viewer sees the slot unchanged',
  tz.schoolSlotForViewerCell('2026-01-14', '20:00', 'Asia/Manila'), { date: '2026-01-14', time: '20:00' })
check('month boundaries roll over correctly',
  tz.schoolSlotForViewerCell('2026-01-31', '23:00', 'America/New_York'), { date: '2026-02-01', time: '12:00' })
check('year boundaries roll over correctly',
  tz.schoolSlotForViewerCell('2025-12-31', '22:00', 'America/New_York'), { date: '2026-01-01', time: '11:00' })

check('shiftDateKey moves forward across a month end', tz.shiftDateKey('2026-01-31', 1), '2026-02-01')
check('shiftDateKey moves back across a month start', tz.shiftDateKey('2026-03-01', -1), '2026-02-28')
check('shiftDateKey handles a leap day', tz.shiftDateKey('2028-02-28', 1), '2028-02-29')
check('shiftDateKey with zero is a no-op', tz.shiftDateKey('2026-05-05', 0), '2026-05-05')
check('shiftDateKey ignores junk', tz.shiftDateKey('tomorrow', 1), 'tomorrow')

/* No two calendar cells may collapse onto the same Manila slot, or a lesson
   would be drawn twice and another slot would vanish. */
const seen = new Set()
let collisions = 0
for (let day = 0; day < 7; day += 1) {
  const dateKey = tz.shiftDateKey('2026-06-01', day)
  for (let minutes = 0; minutes < 1440; minutes += 30) {
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    const slot = tz.schoolSlotForViewerCell(dateKey, time, 'America/New_York')
    const key = `${slot.date} ${slot.time}`
    if (seen.has(key)) collisions += 1
    seen.add(key)
  }
}
check('a full week of cells maps to 336 distinct Manila slots', seen.size, 336)
check('no calendar cell collides with another', collisions, 0)

/* ------------------------------------------------------------------ */
/* 5. Dates and labels shown to the family                              */
/* ------------------------------------------------------------------ */
check('a late Manila lesson shows on the previous day in New York', tz.viewerDateKey('2026-01-15', '09:00', 'America/New_York'), '2026-01-14')
check('an early Manila lesson shows on the next day in Sydney', tz.viewerDateKey('2026-07-15', '23:30', 'Australia/Sydney'), '2026-07-16')
check('the date is unchanged for a Manila family', tz.viewerDateKey('2026-07-15', '23:30', 'Asia/Manila'), '2026-07-15')

check('Manila 16:00 reads as 5:00 PM in Seoul', tz.formatViewerTime('16:00', '2026-03-02', 'Asia/Seoul'), '5:00 PM')
check('Manila 09:00 reads as 8:00 PM in New York', tz.formatViewerTime('09:00', '2026-01-15', 'America/New_York'), '8:00 PM')
check('midnight reads as 12:00 AM', tz.formatViewerTime('00:00', '2026-01-15', 'Asia/Manila'), '12:00 AM')
check('noon reads as 12:00 PM', tz.formatViewerTime('12:00', '2026-01-15', 'Asia/Manila'), '12:00 PM')
check('an empty time renders as an empty string', tz.formatViewerTime('', '2026-01-15', 'Asia/Manila'), '')
truthy('no "(next day)" suffix leaks into a time label — the date carries it',
  !tz.formatViewerTime('23:30', '2026-07-15', 'Australia/Sydney').includes('day'))

check('Seoul is labelled UTC+9', tz.timezoneLabel('Asia/Seoul', '2026-03-02'), 'UTC+9')
check('Warsaw is labelled UTC+1 in winter', tz.timezoneLabel('Europe/Warsaw', '2026-01-15'), 'UTC+1')
check('Warsaw is labelled UTC+2 in summer', tz.timezoneLabel('Europe/Warsaw', '2026-07-15'), 'UTC+2')
check('Delhi keeps its half hour', tz.timezoneLabel('Asia/Kolkata', '2026-07-15'), 'UTC+5:30')
check('New York is labelled UTC-5 in winter', tz.timezoneLabel('America/New_York', '2026-01-15'), 'UTC-5')
check('the city name is readable', tz.timezoneCity('Asia/Kuala_Lumpur'), 'Kuala Lumpur')
check('the badge reads city and offset', tz.timezoneDescription('Asia/Seoul', '2026-03-02'), 'Seoul (UTC+9)')

check('a Seoul family needs conversion', tz.viewerNeedsConversion('Asia/Seoul'), true)
check('a Manila family needs no conversion', tz.viewerNeedsConversion('Asia/Manila'), false)
check('Kuala Lumpur needs no conversion either', tz.viewerNeedsConversion('Asia/Kuala_Lumpur'), false)

/* ------------------------------------------------------------------ */
/* 6. Past lessons are judged in Manila time, not on the device clock   */
/* ------------------------------------------------------------------ */
const noon = new Date('2026-05-11T12:00:00+08:00')
check('a lesson an hour ago has passed', tz.lessonHasPassed('2026-05-11', '11:00', noon), true)
check('a lesson an hour from now has not', tz.lessonHasPassed('2026-05-11', '13:00', noon), false)
check('the exact start counts as passed', tz.lessonHasPassed('2026-05-11', '12:00', noon), true)
check('yesterday has passed', tz.lessonHasPassed('2026-05-10', '23:30', noon), true)
check('tomorrow has not', tz.lessonHasPassed('2026-05-12', '00:00', noon), false)
check('the lesson instant is pinned to UTC+8', tz.lessonInstant('2026-05-11', '16:00').toISOString(), '2026-05-11T08:00:00.000Z')

/* ------------------------------------------------------------------ */
/* 7. The "Add to calendar" file                                        */
/* ------------------------------------------------------------------ */
const booking = {
  id: 'bk-1', date: '2026-07-15', time: '23:30', duration: 25,
  status: 'confirmed', focus: 'Reading', createdAt: '2026-07-01T00:00:00.000Z',
}
const sydney = ics.createBookingCalendar(booking, { teacherName: 'Teacher M', learnerName: 'Ana', timeZone: 'Australia/Sydney' })
truthy('the event starts at the correct absolute instant', sydney.includes('DTSTART:20260715T153000Z'))
truthy('the event ends 25 minutes later', sydney.includes('DTEND:20260715T155500Z'))
truthy('the description states the time in the family\'s own zone', sydney.includes('1:30 AM'))
truthy('the description names the family\'s zone', sydney.includes('Sydney (UTC+10)'))
truthy('the description shows the correct local day', sydney.includes('Thursday'))
truthy('Manila time is still stated for reference', sydney.includes('Manila time (our teaching base): 2026-07-15 23:30'))
truthy('the calendar file is still valid iCalendar', sydney.startsWith('BEGIN:VCALENDAR') && sydney.trimEnd().endsWith('END:VCALENDAR'))
truthy('reminders survived the change', sydney.includes('TRIGGER:-PT30M') && sydney.includes('TRIGGER:-PT10M'))

const manila = ics.createBookingCalendar(booking, { timeZone: 'Asia/Manila' })
truthy('a Manila family sees 11:30 PM', manila.includes('11:30 PM'))
truthy('the same absolute instant is used for everyone', manila.includes('DTSTART:20260715T153000Z'))

/* ------------------------------------------------------------------ */
/* 8. The Manila-time switch is really gone                             */
/* ------------------------------------------------------------------ */
const timezoneSource = read('src/timezone.js')
const dashboards = read('src/Dashboards.jsx')
const css = read('src/dashboard.css')
const main = read('src/main.jsx')

check('readTimezoneMode no longer exists', /export function readTimezoneMode/.test(timezoneSource), false)
check('saveTimezoneMode no longer exists', /export function saveTimezoneMode/.test(timezoneSource), false)
check('the dashboard does not import a timezone mode', /TimezoneMode/.test(dashboards), false)
check('the "Manila (UTC+8)" button is gone', dashboards.includes('Manila (UTC+8)'), false)
check('the timezone switch markup is gone', dashboards.includes('schedule-timezone-switch'), false)
check('the switch styles are gone', css.includes('.schedule-timezone-switch'), false)
truthy('a read-only timezone badge replaced it', dashboards.includes('schedule-timezone-note'))
truthy('the badge is styled', css.includes('.schedule-timezone-note'))
truthy('the badge stays visible on phones', /max-width: 900px\)[^}]*\{[\s\S]{0,400}?schedule-timezone-note \{ margin-left: 0/.test(css))
truthy('the grid maps cells back to Manila slots', dashboards.includes('schoolSlotForViewerCell'))
truthy('past slots are judged in Manila time', dashboards.includes('lessonHasPassed'))
check('no cell parses a lesson with the device clock', /new Date\(`\$\{dateKey\}T\$\{time\}:00`\)/.test(dashboards), false)
truthy('IP detection runs at start-up', main.includes('detectVisitorTimeZone()'))
truthy('the classroom opens on Manila time', read('src/bookings.js').includes('T${booking.time}:00+08:00'))
truthy('attendance is measured against Manila time', read('src/classroomAttendance.js').includes(':00+08:00'))
truthy('the IP lookup has a fallback chain', (timezoneSource.match(/https:\/\//g) || []).length >= 3)
truthy('the IP answer is cached for the session', timezoneSource.includes('sessionStorage'))

/* ------------------------------------------------------------------ */
console.log(`\nTimezone checks: ${passed} passed, ${failures.length} failed`)
if (failures.length) {
  console.log('\nFailures:')
  failures.forEach((line) => console.log(`  ✗ ${line}`))
  process.exit(1)
}
console.log('All timezone checks passed.\n')
