/* Guard for the deleted-family undo feature (owner, 2026-11-07: she
 * accidentally deleted a student account).
 *   1. Deletions snapshot the family first; the trash TTLs at 30 days.
 *   2. Restore re-inserts account + bookings and re-creates the cloud row
 *      through a server route that whitelists family roles only.
 *   3. The admin Students page exposes Restore / Discard.
 *   4. Vercel function count stays within the plan cap.
 */
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const failures = []
const checks = { pass: 0, fail: 0 }
const test = (name, fn) => {
  try { fn(); checks.pass++; console.log(`  PASS  ${name}`) }
  catch (e) { checks.fail++; failures.push(`${name} -> ${e.message}`); console.log(`  FAIL  ${name} -> ${e.message}`) }
}
const must = (cond, msg) => { if (!cond) throw new Error(msg) }

console.log('--- Deleted-family undo (2026-11-07) ---')

const trash = readFileSync('src/accountTrash.js', 'utf8')
test('trash module captures account + bookings', () => must(trash.includes('getBookings({ studentId: accountId })') && trash.includes('insertAccount(entry.account)'), 'capture/restore wiring missing'))
test('trash TTL is 30 days', () => must(trash.includes('30 * 24 * 60 * 60 * 1000'), 'TTL missing'))
test('trash is pruned and capped', () => must(trash.includes('TRASH_MAX') && trash.includes('function prune'), 'prune missing'))

const auth = readFileSync('src/auth.js', 'utf8')
test('insertAccount refuses duplicates', () => must(auth.includes('That account already exists - nothing to restore.'), 'duplicate guard missing'))
test('insertAccount refuses privileged roles', () => must(auth.includes("if (!['student', 'parent'].includes(account.role || 'student'))"), 'role guard missing'))

const bookings = readFileSync('src/bookings.js', 'utf8')
test('restoreBookings skips existing ids', () => must(bookings.includes('const existing = new Set(bookings.map((booking) => booking.id))'), 'dedupe missing'))
test('restoreBookings re-syncs to cloud', () => must(bookings.includes('syncCloudBooking(booking).catch'), 'cloud re-sync missing'))

const cloud = readFileSync('src/cloudProfiles.js', 'utf8')
test('restoreCloudProfile never sends secrets', () => must(cloud.includes('const { passwordHash: _hash, salt: _salt, ...profileData } = account'), 'secret strip missing'))
test('restoreCloudProfile posts to the server route', () => must(cloud.includes("fetch('/api/auth/restore-profile'"), 'route call missing'))

const route = readFileSync('api/auth/restore-profile.js', 'utf8')
test('route whitelists family roles server-side', () => must(route.includes("const role = body.role === 'parent' ? 'parent' : 'student'"), 'server role whitelist missing'))
test('route inserts the profiles row', () => must(route.includes(".from('profiles').insert(payload)"), 'insert missing'))

const dash = readFileSync('src/Dashboards.jsx', 'utf8')
test('deletion snapshots before removing', () => must(/if \(isFinalStudent\) \{\n      try \{ captureFamily\(profile\.account\.id\) \} catch/.test(dash), 'capture call missing'))
test('students page lists the trash with Restore', () => must(dash.includes('Recently deleted families') && dash.includes('restoreDeletedFamily(entry.id)'), 'trash UI missing'))
test('restore re-creates the cloud profile', () => must(dash.includes('if (cloudSyncEnabled()) await restoreCloudProfile(account)'), 'cloud restore missing'))

const funcs = Number(execSync('find api -name "*.js" ! -name "_*" | wc -l').toString().trim())
test(`Vercel function count (${funcs}) within cap`, () => must(funcs <= 12, `function count ${funcs} exceeds 12`))

if (checks.fail) {
  console.log(`\nFAILURES (${checks.fail}):`)
  failures.forEach((f) => console.log(' - ' + f))
  process.exit(1)
}
console.log(`\nAll ${checks.pass} checks passed.`)
