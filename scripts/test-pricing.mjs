/**
 * Pricing is defined in TWO places and they must never disagree.
 *
 *   api/_paypal.js     — what the server actually CHARGES
 *   src/Dashboards.jsx — what the parent is SHOWN before paying
 *
 * If those drift, a parent sees one number and their card is debited another.
 * That is the single most damaging bug this codebase could ship, so it is
 * checked mechanically rather than by memory.
 *
 * Published rate (owner, 2026-10-29): FLAT US$7 per 25-minute lesson on
 * every plan; a 50-minute lesson is exactly double (US$14). The Monthly
 * Package keeps its non-price benefits (priority scheduling, dedicated
 * tutor) at the same per-class price.
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const server = await import('../api/_paypal.js')

/* --- the published flat rate ---------------------------------------- */
ok(server.SESSION_RATE_STANDARD === 7, 'standard rate is $7 per 25-minute lesson')
ok(server.SESSION_RATE_PACKAGE === 7, 'the package rate is the same flat $7')
ok(server.PACKAGE_MIN_SESSIONS === 4, 'the package threshold stays at 4 lessons a week')
ok(server.LONG_LESSON_MULTIPLIER === 2, 'a 50-minute lesson costs double a 25-minute one')
ok(server.SESSION_RATE_STANDARD * server.LONG_LESSON_MULTIPLIER === 14, '50 minutes is $14')

/* --- every volume now resolves to the one rate ----------------------- */
for (const n of [1, 2, 3, 4, 5, 7, 12]) ok(server.weeklySessionRate(n) === 7, `${n} lesson(s) a week is $7 each`)

/* --- totals a parent would be charged -------------------------------- */
ok(server.planTotal('weekly', 2) === 14, 'weekly plan, 2 lessons = $14')
ok(server.planTotal('weekly', 4) === 28, 'weekly plan, 4 lessons = $28')
ok(server.planTotal('monthly', 4) === 112, 'monthly package, 4/week = 16 lessons x $7 = $112')
ok(server.planTotal('monthly', 5) === 140, 'monthly package, 5/week = 20 lessons x $7 = $140')
ok(server.planTotal('monthly', 3) === 84, 'monthly package, 3/week = 12 lessons x $7 = $84')
ok(server.planCreditCount('monthly', 4) === 16, 'a monthly package grants 4 weeks of credits')
ok(server.planCreditCount('weekly', 4) === 4, 'a weekly plan grants one week of credits')

/* --- the client must agree with the server --------------------------- */
const client = readFileSync(new URL('../src/Dashboards.jsx', import.meta.url), 'utf8')
const num = (name) => {
  const hit = client.match(new RegExp(`const ${name} = (\\d+)`))
  return hit ? Number(hit[1]) : null
}
ok(num('SESSION_RATE_STANDARD') === server.SESSION_RATE_STANDARD, `client standard rate matches the server ($${num('SESSION_RATE_STANDARD')})`)
ok(num('SESSION_RATE_PACKAGE') === server.SESSION_RATE_PACKAGE, `client package rate matches the server ($${num('SESSION_RATE_PACKAGE')})`)
ok(num('PACKAGE_MIN_SESSIONS') === server.PACKAGE_MIN_SESSIONS, 'client package threshold matches the server')
ok(num('LONG_LESSON_MULTIPLIER') === server.LONG_LESSON_MULTIPLIER, 'client long-lesson multiplier matches the server')

/* --- no stale prices left in the shipped copy ------------------------ */
const priceCopy = readFileSync(new URL('../public/pricing.html', import.meta.url), 'utf8')
ok(!/\$10 per (25-minute|class|lesson)/.test(priceCopy), 'the pricing page no longer advertises the old $10 rate')
ok(!/\$10\.00/.test(priceCopy), 'the pricing table contains no $10.00 rows')
ok(!/\$8\b/.test(priceCopy), 'the pricing page carries no standalone $8 rate (flat rate shipped)')
ok(!/\$128\.00|\$160\.00|\$192\.00|\$224\.00/.test(priceCopy), 'no monthly totals computed from an old rate')
ok(/\$7\.00/.test(priceCopy), 'the table shows the $7.00 rate')
ok(/\$14/.test(priceCopy), 'and the $14 fifty-minute rate')

/* --- every built page, home and all countries, quotes only the flat rate */
const dist = new URL('../dist/', import.meta.url).pathname
let pages = 0
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full)
    else if (entry.endsWith('.html')) {
      pages += 1
      const html = readFileSync(full, 'utf8')
      if (/US\$8|US\$6|US\$16/.test(html)) ok(false, `${entry} still quotes an old USD rate`)
    }
  }
}
if (existsSync(dist)) { walk(dist); ok(pages > 60, `the rate sweep covered every built page (${pages})`) } else { ok(true, 'dist not built yet - page sweep skipped') }

/* --- the amount charged is the amount quoted -------------------------- */
for (const [plan, sessions] of [['weekly', 1], ['weekly', 3], ['weekly', 4], ['monthly', 4], ['monthly', 5]]) {
  const rate = server.planSessionRate(plan, sessions)
  const credits = server.planCreditCount(plan, sessions)
  assert.equal(server.planTotal(plan, sessions), rate * credits)
}
ok(true, 'total always equals rate x credits, with no rounding drift')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
