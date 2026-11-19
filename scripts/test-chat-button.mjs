/* Guard for the dead "Chat on Website" button (owner 2026-11-09): the chat
 * key helper must live at module scope so the profile views can call it,
 * and both buttons must route through it into launchSupportChat. */
import { readFileSync } from 'node:fs'

const failures = []
const checks = { pass: 0, fail: 0 }
const test = (name, fn) => {
  try { fn(); checks.pass++; console.log(`  PASS  ${name}`) }
  catch (e) { checks.fail++; failures.push(`${name} -> ${e.message}`); console.log(`  FAIL  ${name} -> ${e.message}`) }
}
const must = (cond, msg) => { if (!cond) throw new Error(msg) }

console.log('--- Chat on Website button (2026-11-09) ---')

const dash = readFileSync('src/Dashboards.jsx', 'utf8')
const helperIndex = dash.indexOf('function chatKeyForAccount(account)')
const teacherProfile = dash.indexOf('export function AdminTeacherProfile(')
const studentProfile = dash.indexOf('export function AdminStudentProfile(')
const adminDashboard = dash.indexOf('export function AdminDashboard(')

test('helper declared at module scope, before both profile views', () => {
  must(helperIndex > -1, 'helper missing')
  must(helperIndex < teacherProfile && helperIndex < studentProfile, 'helper must precede the profile components')
})
test('no out-of-scope chatKeyFor calls remain', () => {
  const aliasAt = dash.indexOf('const chatKeyFor = chatKeyForAccount')
  must(aliasAt > -1, 'alias missing')
  const before = dash.slice(0, aliasAt).match(/chatKeyFor\(/g) || []
  must(before.length === 0, `bare chatKeyFor( calls before the alias: ${before.length}`)
})
test('teacher button routes through the helper', () => must(dash.includes('onOpenChat?.(chatKeyForAccount(teacher), teacher?.fullName)'), 'teacher button not wired'))
test('student button routes through the helper', () => must(dash.includes('onOpenChat?.(chatKeyForAccount(account), account.parentName)'), 'student button not wired'))
test('admin dashboard keeps the same key logic', () => must(dash.includes('const chatKeyFor = chatKeyForAccount'), 'dashboard alias missing'))
test('both profiles receive launchSupportChat', () => {
  const t = dash.indexOf('<AdminTeacherProfile ')
  const s2 = dash.indexOf('<AdminStudentProfile ')
  must(dash.slice(t, t + 700).includes('onOpenChat={launchSupportChat}'), 'teacher instance unwired')
  must(dash.slice(s2, s2 + 900).includes('onOpenChat={launchSupportChat}'), 'student instance unwired')
})
test('dock still opens over the current view', () => must(dash.includes('{supportChatPerson && active !== \'support\' && ('), 'dock gate changed'))
void adminDashboard

if (checks.fail) {
  console.log(`\nFAILURES (${checks.fail}):`)
  failures.forEach((f) => console.log(' - ' + f))
  process.exit(1)
}
console.log(`\nAll ${checks.pass} checks passed.`)
