/**
 * Pins the compiled student registration register: ordering, month totals,
 * labels for broken stamps and the CSV shape the admin downloads.
 */
import {
  compileStudentRegistrations,
  monthLabel,
  registrationDateLabel,
  registrationsToCsv,
} from '../src/registrationReport.js'

let pass = 0
let fail = 0
const ok = (condition, label) => {
  if (condition) { pass += 1; console.log(`  ok  ${label}`) }
  else { fail += 1; console.log(`FAIL  ${label}`) }
}

const students = [
  { id: 'b', parentName: 'Family Cruz', email: 'cruz@example.com', createdAt: '2026-10-16T08:00:00Z' },
  { id: 'a', parentName: 'Family Reyes', email: 'reyes@example.com', createdAt: '2026-09-01T08:00:00Z' },
  { id: 'c', parentName: 'Family Dizon', email: 'dizon@example.com', createdAt: '2026-10-01T08:00:00Z' },
  { id: 'd', parentName: 'Family NoStamp', email: 'nostamp@example.com' },
]

const report = compileStudentRegistrations(students)
ok(report.total === 4, 'every family lands in the register')
ok(report.rows[0].name === 'Family NoStamp', 'a missing stamp sorts first instead of vanishing')
ok(report.rows[1].name === 'Family Reyes' && report.rows[3].name === 'Family Cruz', 'rows run oldest registration first')
ok(report.months.map((month) => month.label).join('|') === 'Unknown date|September 2026|October 2026', 'months compile in register order')
ok(report.months[2].count === 2, 'October counts both October families')
ok(report.days.length === 4, 'one compiled section per registration day')
ok(report.days[1].label.includes('September') && report.days[1].label.includes('2026') && report.days[1].rows.length === 1, 'each day section carries its families')
ok(report.days[3].rows.map((row) => row.name).join(',') === 'Family Cruz', 'the newest day section holds the newest family')
ok(report.latest === '2026-10-16T08:00:00Z', 'the newest registration is reported')

ok(monthLabel('2026-10-16T08:00:00Z') === 'October 2026', 'month labels read like a heading')
ok(monthLabel('nonsense') === 'Unknown date', 'a broken stamp becomes Unknown date, not Invalid Date')
ok(registrationDateLabel('2026-10-16T08:00:00Z').includes('October') && registrationDateLabel('2026-10-16T08:00:00Z').includes('2026'), 'row labels carry the full date')
ok(registrationDateLabel('') === '', 'a missing stamp renders as nothing on the row')

const csv = registrationsToCsv(report)
ok(csv.startsWith('Family,Email,Registered (ISO),Registered\n'), 'the CSV carries a header row')
ok(csv.split('\n').length === 6, 'one CSV line per family plus the header')
ok(csv.includes('Family Cruz,cruz@example.com,2026-10-16T08:00:00Z'), 'CSV rows keep name, email and ISO stamp')
ok(registrationsToCsv({ rows: [{ name: 'Comma, Family', email: 'x@y.z', registeredAt: '' }] }).includes('"Comma, Family"'), 'commas in a name are quoted, not column-split')
ok(compileStudentRegistrations([]).total === 0 && registrationsToCsv(compileStudentRegistrations([])).split('\n').length === 2, 'an empty register still produces a header-only CSV')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
