/* Guard for owner request 2026-11-08: website messages must email
 * monettsanga@yahoo.com (plus the long-standing support mailbox).
 *   1. Admin notifications fan out to a recipient list, env-overridable.
 *   2. The contact gate emails the admins after a message lands.
 *   3. Support-chat to-admin direction mails the whole list.
 */
import { readFileSync } from 'node:fs'

const failures = []
const checks = { pass: 0, fail: 0 }
const test = (name, fn) => {
  try { fn(); checks.pass++; console.log(`  PASS  ${name}`) }
  catch (e) { checks.fail++; failures.push(`${name} -> ${e.message}`); console.log(`  FAIL  ${name} -> ${e.message}`) }
}
const must = (cond, msg) => { if (!cond) throw new Error(msg) }

console.log('--- Admin email recipients (2026-11-08) ---')

const notify = readFileSync('api/_notifyAdmin.js', 'utf8')
test('recipient list includes the owner mailbox', () => must(notify.includes("['sejongenglish@yahoo.com', 'monettsanga@yahoo.com']"), 'owner address missing from defaults'))
test('env var adds recipients, never replaces', () => must(notify.includes('process.env.SUPPORT_ADMIN_EMAIL') && notify.includes('[...new Set([...DEFAULT_ADMIN_RECIPIENTS, ...extra])]'), 'env must be additive'))
test('emailAdmin sends to the whole list', () => must(notify.includes('to: adminRecipients()'), 'emailAdmin must fan out'))

const support = readFileSync('api/notify/_support.js', 'utf8')
test('support to-admin mails the list', () => must(support.includes('to = adminRecipients()'), 'support direction must use the list'))
test('support imports the helper', () => must(support.includes("import { adminRecipients } from '../_notifyAdmin.js'"), 'import missing'))

const contact = readFileSync('api/contact.js', 'utf8')
test('contact gate emails admins', () => must(contact.includes('emailAdmin({') && contact.includes("subject: `New website message from ${name}`"), 'contact notification missing'))
test('contact notification cannot fail the form', () => must(!/await emailAdmin/.test(contact), 'notification must be fire-and-forget'))

const reset = readFileSync('api/auth/reset.js', 'utf8')
test('reset reply-to uses the helper', () => must(reset.includes('reply_to: adminRecipients()[0]'), 'reset reply_to must use helper'))

if (checks.fail) {
  console.log(`\nFAILURES (${checks.fail}):`)
  failures.forEach((f) => console.log(' - ' + f))
  process.exit(1)
}
console.log(`\nAll ${checks.pass} checks passed.`)
