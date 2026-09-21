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
 * Published rates (confirmed by the owner):
 *   $8 per 25-minute lesson, 1-3 lessons per week
 *   $7 per 25-minute lesson, 4 or more per week (package rate)
 *   A 50-minute lesson is exactly double the 25-minute rate.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const server = await import('../api/_paypal.js')

/* --- the published rates ------------------------------------------- */
ok(server.SESSION_RATE_STANDARD === 8, 'standard rate is $8 per 25-minute lesson')
ok(server.SESSION_RATE_PACKAGE === 7, 'package rate is $7 per 25-minute lesson')
ok(server.PACKAGE_MIN_SESSIONS === 4, 'the package rate starts at 4 lessons a week')
ok(server.LONG_LESSON_MULTIPLIER === 2, 'a 50-minute lesson costs double a 25-minute one')
ok(server.SESSION_RATE_STANDARD * server.LONG_LESSON_MULTIPLIER === 16, '50 minutes at the standard rate is $16')

/* --- the boundary, which is where pricing bugs live ----------------- */
ok(server.weeklySessionRate(1) === 8, '1 lesson a week is $8 each')
ok(server.weeklySessionRate(2) === 8, '2 lessons a week is $8 each')
ok(server.weeklySessionRate(3) === 8, '3 lessons a week is still $8 each')
ok(server.weeklySessionRate(4) === 7, '4 lessons a week drops to $7 each')
ok(server.weeklySessionRate(5) === 7, '5 lessons a week is $7 each')
ok(server.weeklySessionRate(12) === 7, 'the maximum weekly count is $7 each')

/* --- totals a parent would be charged -------------------------------- */
ok(server.planTotal('weekly', 2) === 16, 'weekly plan, 2 lessons = $16')
ok(server.planTotal('weekly', 4) === 28, 'weekly plan, 4 lessons = $28 at the package rate')
// A monthly package bills 4 weeks up front.
ok(server.planTotal('monthly', 4) === 112, 'monthly package, 4/week = 16 lessons x $7 = $112')
ok(server.planTotal('monthly', 5) === 140, 'monthly package, 5/week = 20 lessons x $7 = $140')
ok(server.planTotal('monthly', 3) === 96, 'monthly package, 3/week = 12 lessons x $8 = $96')
ok(server.planCreditCount('monthly', 4) === 16, 'a monthly package grants 4 weeks of credits')
ok(server.planCreditCount('weekly', 4) === 4, 'a weekly plan grants one week of credits')

/* --- the client must agree with the server --------------------------- */
// Read the source rather than importing it: Dashboards.jsx pulls in the whole
// React app, which cannot load under plain Node.
const client = readFileSync(new URL('../src/Dashboards.jsx', import.meta.url), 'utf8')
const num = (name) => {
  const hit = client.match(new RegExp(`const ${name} = (\\d+)`))
  return hit ? Number(hit[1]) : null
}
ok(num('SESSION_RATE_STANDARD') === server.SESSION_RATE_STANDARD,
  `client standard rate matches the server ($${num('SESSION_RATE_STANDARD')})`)
ok(num('SESSION_RATE_PACKAGE') === server.SESSION_RATE_PACKAGE,
  `client package rate matches the server ($${num('SESSION_RATE_PACKAGE')})`)
ok(num('PACKAGE_MIN_SESSIONS') === server.PACKAGE_MIN_SESSIONS,
  'client package threshold matches the server')
ok(num('LONG_LESSON_MULTIPLIER') === server.LONG_LESSON_MULTIPLIER,
  'client long-lesson multiplier matches the server')

/* --- no stale prices left in the shipped copy ------------------------ */
// The old rates were $10 and $8. A leftover "$10 per class" would be a
// published price the checkout no longer honours.
const priceCopy = readFileSync(new URL('../public/pricing.html', import.meta.url), 'utf8')
ok(!/\$10 per (25-minute|class|lesson)/.test(priceCopy), 'the pricing page no longer advertises the old $10 rate')
// The comparison TABLE is computed, so a prose-only check missed it once:
// the page read "$8 per class" in the copy while the table below still said
// "$10.00" in every row. Assert on the rendered figures too.
ok(!/\$10\.00/.test(priceCopy), 'the pricing table contains no $10.00 rows')
ok(!/\$128\.00|\$160\.00|\$192\.00|\$224\.00/.test(priceCopy), 'no monthly totals computed from the old rate')
ok(/\$8\.00/.test(priceCopy) && /\$7\.00/.test(priceCopy), 'the table shows the current $8 and $7 rates')
ok(/\$8/.test(priceCopy), 'the pricing page shows the new $8 rate')
ok(/\$7/.test(priceCopy), 'the pricing page shows the new $7 package rate')

/* --- the amount charged is the amount quoted -------------------------- */
for (const [plan, sessions] of [['weekly', 1], ['weekly', 3], ['weekly', 4], ['monthly', 4], ['monthly', 5]]) {
  const rate = server.planSessionRate(plan, sessions)
  const credits = server.planCreditCount(plan, sessions)
  assert.equal(server.planTotal(plan, sessions), rate * credits)
}
ok(true, 'total always equals rate x credits, with no rounding drift')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
