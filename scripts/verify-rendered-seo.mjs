/**
 * The rendered page must match the prerendered page.
 *
 * WHY THIS EXISTS
 * ---------------
 * Google renders JavaScript. Whatever React puts on the page a second after
 * load is what finally gets indexed — not the HTML the server sent.
 *
 * That caught us out. The prerendered homepage carried a carefully chosen H1
 * ("Online English Classes for Primary and Secondary Students") and React
 * then replaced it with a tagline, and overwrote the <title> from
 * AutoTranslate.jsx as well. Every check that read the raw HTML passed, the
 * live site looked fine, and the homepage optimisation was being undone
 * silently on every visit.
 *
 * So this loads the page twice: once with JavaScript blocked (what a simple
 * crawler sees) and once fully rendered (what Googlebot actually indexes),
 * and fails if the two disagree.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const BASE = 'http://localhost:4173'
const browser = await chromium.launch()

/* --- 1. what a crawler sees with no JavaScript ---------------------- */
const noJs = await browser.newPage()
await noJs.route('**/assets/*.js', (r) => r.abort())
await noJs.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
const staticH1 = (await noJs.locator('h1').first().textContent() || '').trim()
const staticTitle = await noJs.title()
await noJs.close()

/* --- 2. what Googlebot sees after rendering ------------------------- */
const rendered = await browser.newPage()
await rendered.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await rendered.waitForTimeout(3500)
const renderedH1s = (await rendered.locator('h1').allTextContents()).map((t) => t.trim())
const renderedTitle = await rendered.title()

console.log('\n--- prerendered vs rendered ---')
ok(renderedH1s.length === 1, `exactly one H1 after rendering (${renderedH1s.length})`)
ok(renderedH1s[0] === staticH1,
  `the rendered H1 matches the prerendered one\n        prerendered: "${staticH1}"\n        rendered:    "${renderedH1s[0]}"`)
ok(renderedTitle === staticTitle,
  `the rendered title matches the prerendered one\n        prerendered: "${staticTitle}"\n        rendered:    "${renderedTitle}"`)

console.log('\n--- the H1 carries the search phrase ---')
// A homepage H1 is the most valuable line of on-page text on the site.
// Spending it on a slogan nobody searches for is the costliest easy mistake.
ok(/online english classes/i.test(renderedH1s[0]), 'the H1 contains "Online English Classes"')
ok(/primary|secondary|kids|children|students/i.test(renderedH1s[0]), 'the H1 names the audience')
ok(!/^real confidence|^english confidence/i.test(renderedH1s[0]), 'the H1 is not just the brand tagline')

console.log('\n--- the title is usable in a result ---')
ok(/online english classes/i.test(renderedTitle), 'the title leads with the search phrase')
ok(/TutorPro/i.test(renderedTitle), 'the title carries the brand')
ok(renderedTitle.length <= 70, `the title fits a search result (${renderedTitle.length} chars)`)

console.log('\n--- nothing was lost in the change ---')
ok(await rendered.locator('.hero__tagline').isVisible(), 'the brand tagline is still shown to visitors')
ok(await rendered.locator('.hero__lede').isVisible(), 'the hero lede is still shown')
ok(await rendered.locator('button:has-text("Book a free first class")').first().isVisible(),
  'the primary booking CTA is still visible')

console.log('\n--- mobile ---')
const phone = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true })
await phone.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await phone.waitForTimeout(3000)
ok((await phone.locator('h1').first().textContent() || '').trim() === staticH1, 'the same H1 on mobile')
const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
ok(overflow <= 0, `no horizontal overflow at 375px (${overflow}px)`)
await phone.close()

await rendered.close()
await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
