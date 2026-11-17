/* Guard for the NovaKid-style schedule rebuild (owner screenshot
 * 2026-11-09): header, legend, clean grid - and every interaction kept. */
import { readFileSync } from 'node:fs'

const failures = []
const checks = { pass: 0, fail: 0 }
const test = (name, fn) => {
  try { fn(); checks.pass++; console.log(`  PASS  ${name}`) }
  catch (e) { checks.fail++; failures.push(`${name} -> ${e.message}`); console.log(`  FAIL  ${name} -> ${e.message}`) }
}
const must = (cond, msg) => { if (!cond) throw new Error(msg) }

console.log('--- NovaKid-style schedule (2026-11-09) ---')

const dash = readFileSync('src/Dashboards.jsx', 'utf8')
test('round week arrows + bold range + Today', () => must(dash.includes('schedule-toolbar__arrows') && dash.includes('schedule-range') && dash.includes('schedule-today'), 'toolbar missing'))
test('booked-this-week counter', () => must(dash.includes('Booked lesson{bookedThisWeek === 1') && dash.includes('const bookedThisWeek ='), 'counter missing'))
test('student search dims other classes', () => must(dash.includes('schedule-student-search') && dash.includes("'dimmed'"), 'search dimming missing'))
test('status legend present', () => must(dash.includes('schedule-legend') && dash.includes('lg-cancelled'), 'legend missing'))
test('day headings: bold date + month, small weekday', () => must(dash.includes("{ day: 'numeric', month: 'long' }"), 'day heading format changed wrongly'))
test('time column labelled Time + zone', () => must(dash.includes('<strong>Time</strong><span>{timezoneLabel(viewerZone)}</span>'), 'time heading missing'))
test('interactions untouched: paint, select, menu, open', () => must(dash.includes('startPaint(event, slotKey') && dash.includes('openNameMenu(event, bookingCell.booking') && dash.includes('onBookingOpen(bookingCell.booking)'), 'cell handlers changed'))
test('delete/unbook still wired from admin', () => must(dash.includes('onBookingDelete={availabilityMode ? undefined : deleteCalendarClass}'), 'admin delete wiring lost'))

const css = readFileSync('src/dashboard.css', 'utf8')
test('clean 46px thin-lined rows', () => must(css.includes('.schedule-row { height: 46px; }') && css.includes('.schedule-cell { border-color: #eceaf3; }'), 'grid style missing'))
test('legend swatches match cell colours', () => must(css.includes('.lg-booked { background: #ffe4e6') && css.includes('.lg-open { background: #e9f7ef'), 'legend colours drifted'))

if (checks.fail) {
  console.log(`\nFAILURES (${checks.fail}):`)
  failures.forEach((f) => console.log(' - ' + f))
  process.exit(1)
}
console.log(`\nAll ${checks.pass} checks passed.`)
