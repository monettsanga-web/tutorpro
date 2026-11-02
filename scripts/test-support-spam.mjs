/* Guard for the support-inbox spam fix (owner, 2026-11-02: bot fuzzers
 * filled the inbox with random-token names through the public RPC).
 *   1. Public forms post to /api/contact; the RPC URL and key are gone
 *      from every built page.
 *   2. The gate route validates: honeypot, human speed, real names,
 *      emails, message length, hourly per-IP limit.
 *   3. The inbox hides suspected bot rows behind a toggle.
 *   4. Vercel function count stays within the plan guard.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { execSync } from 'node:child_process'

const failures = []
const checks = { pass: 0, fail: 0 }
const test = (name, fn) => {
  try { fn(); checks.pass++; console.log(`  PASS  ${name}`) }
  catch (e) { checks.fail++; failures.push(`${name} -> ${e.message}`); console.log(`  FAIL  ${name} -> ${e.message}`) }
}
const must = (cond, msg) => { if (!cond) throw new Error(msg) }

console.log('--- Support inbox spam gate (2026-11-02) ---')

const api = existsSync('api/contact.js') ? readFileSync('api/contact.js', 'utf8') : ''
test('gate route exists', () => must(existsSync('api/contact.js'), 'api/contact.js missing'))
test('gate checks honeypot', () => must(api.includes("body.website || ''"), 'honeypot check missing'))
test('gate enforces human speed', () => must(api.includes('MIN_MILLIS') && api.includes('body.ts'), 'time trap missing'))
test('gate rejects token names', () => must(api.includes('HUMAN_NAME') && api.includes('CONSONANT_RUN'), 'name validation missing'))
test('gate validates email', () => must(api.includes('@\\S+\\.\\S+'), 'email validation missing'))
test('gate throttles per IP', () => must(api.includes('HOURLY_LIMIT') && api.includes('429'), 'throttle missing'))
test('gate writes through the RPC server-side', () => must(api.includes('rpc/create_support_conversation'), 'RPC call missing'))

const contact = readFileSync('public/contact.html', 'utf8')
test('contact form posts to the gate', () => must(contact.includes("fetch('/api/contact'"), 'contact.html must post to /api/contact'))
test('contact form carries honeypot + timestamp', () => must(contact.includes('name="website"') && contact.includes('id="ct-ts"'), 'honeypot/ts fields missing'))

const gen = readFileSync('scripts/build-country-pages.mjs', 'utf8')
test('country generator posts to the gate', () => must(gen.includes("fetch('/api/contact'") && !gen.includes('rpc/create_support_conversation'), 'generator must post to /api/contact only'))
test('country generator carries honeypot + timestamp', () => must(gen.includes('name="website"') && gen.includes("id=\"ct-ts\""), 'honeypot/ts fields missing'))

let leak = []
for (const file of readdirSync('dist')) {
  if (!file.endsWith('.html')) continue
  const html = readFileSync(`dist/${file}`, 'utf8')
  if (html.includes('create_support_conversation')) leak.push(file)
}
test('no built page exposes the support RPC', () => must(leak.length === 0, `RPC still in: ${leak.join(', ')}`))

const dash = readFileSync('src/Dashboards.jsx', 'utf8')
test('inbox flags token-like names', () => must(dash.includes('looksLikeBotName'), 'bot-name filter missing'))
test('inbox hides spam behind a toggle', () => must(dash.includes('support-spam-toggle') && dash.includes('setShowSpam'), 'spam toggle missing'))
test('inbox still lists real conversations', () => must(dash.includes('visible.length ? visible.map'), 'row renderer must use the filtered list'))

const funcs = execSync('find api -name "*.js" ! -name "_*" | wc -l').toString().trim()
test(`Vercel function count (${funcs}) within guard`, () => must(Number(funcs) <= 12, `function count ${funcs} exceeds 12`))

if (checks.fail) {
  console.log(`\nFAILURES (${checks.fail}):`)
  failures.forEach((f) => console.log(' - ' + f))
  process.exit(1)
}
console.log(`\nAll ${checks.pass} checks passed.`)
