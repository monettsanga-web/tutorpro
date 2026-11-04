/* Guard for the admin "remove booked class" feature (owner, 2026-11-04).
 *   1. bookings.js can permanently delete one booking (local + cloud).
 *   2. The calendar name menu offers "Delete permanently" behind a confirm,
 *      only where an onBookingDelete handler is passed.
 *   3. The admin calendar and admin list view wire real delete handlers.
 *   4. Teacher-facing calendars do NOT get the delete prop (admin-only).
 */
import { readFileSync } from 'node:fs'

const failures = []
const checks = { pass: 0, fail: 0 }
const test = (name, fn) => {
  try { fn(); checks.pass++; console.log(`  PASS  ${name}`) }
  catch (e) { checks.fail++; failures.push(`${name} -> ${e.message}`); console.log(`  FAIL  ${name} -> ${e.message}`) }
}
const must = (cond, msg) => { if (!cond) throw new Error(msg) }

console.log('--- Admin booking delete (2026-11-04) ---')

const bookings = readFileSync('src/bookings.js', 'utf8')
test('deleteBooking exported', () => must(/export async function deleteBooking\(bookingId\)/.test(bookings), 'missing export'))
test('deleteBooking removes local record', () => must(bookings.includes('writeBookings(remaining)'), 'local removal missing'))
test('deleteBooking deletes cloud record', () => must(/await deleteCloudBooking\(bookingId\)/.test(bookings), 'cloud deletion missing'))
test('deleteBooking reports missing id', () => must(bookings.includes('if (remaining.length === bookings.length) return false'), 'no-op guard missing'))

const dash = readFileSync('src/Dashboards.jsx', 'utf8')
test('calendar accepts onBookingDelete prop', () => must(dash.includes('  onBookingDelete,\n'), 'ScheduleCalendar prop missing'))
test('delete needs its own confirm step', () => must(dash.includes('confirmDelete') && dash.includes('Yes, delete'), 'confirm flow missing'))
test('menu shows Delete permanently button', () => must(dash.includes('Delete permanently</button>'), 'menu button missing'))
test('menu resets delete confirm on close', () => must(dash.includes('setConfirmUnbook(false); setConfirmDelete(false)'), 'closeNameMenu must reset confirmDelete'))
test('admin calendar wires deleteCalendarClass', () => must(dash.includes('onBookingDelete={availabilityMode ? undefined : deleteCalendarClass}'), 'admin calendar wiring missing'))
test('deleteCalendarClass uses deleteBooking + refresh', () => must(/const deleteCalendarClass = async \(booking\) => \{\n    const removed = await deleteBooking\(booking\.id\)\n    refresh\(\)/.test(dash), 'handler body wrong'))
test('admin list view can delete rows', () => must(dash.includes('onRemoveBooking={async (booking) => { const removed = await deleteBooking(booking.id); refresh();'), 'list wiring missing'))
test('list delete asks for confirmation', () => must(dash.includes("window.confirm('Delete this class permanently?"), 'list confirm missing'))
test('deleteBooking imported in Dashboards', () => must(dash.includes('import { createBooking, deleteBooking, getBookings,'), 'import missing'))

const teacherCal = dash.indexOf('onBookingCancel={calendarEditing ? undefined : unbookCalendarClass}')
test('teacher calendar does NOT pass delete', () => {
  must(teacherCal > -1, 'teacher calendar anchor moved - re-check it has no onBookingDelete')
  const around = dash.slice(teacherCal - 400, teacherCal + 400)
  must(!around.includes('onBookingDelete'), 'teacher calendar must stay delete-free (admin-only feature)')
})

if (checks.fail) {
  console.log(`\nFAILURES (${checks.fail}):`)
  failures.forEach((f) => console.log(' - ' + f))
  process.exit(1)
}
console.log(`\nAll ${checks.pass} checks passed.`)
