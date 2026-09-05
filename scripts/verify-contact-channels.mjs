/**
 * Contact section — real headless-browser verification.
 *
 * The three channels are not equivalent: Facebook and WhatsApp are links,
 * WeChat is an ID that must be copied. The checks below prove each one uses
 * the right element and the right target, that the exact handles the owner
 * gave are present, and that the layout holds on a phone.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  permissions: ['clipboard-read', 'clipboard-write'],
})
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await page.waitForSelector('.contact-channels', { timeout: 20000 })

/* --- the section exists and is reachable ----------------------------- */
ok(await page.locator('#contact').count() === 1, 'the contact section exists with id="contact"')
ok(await page.locator('.contact-channels h2').textContent() === 'Contact us', 'the heading reads "Contact us"')
ok(await page.locator('.contact-card').count() === 3, 'exactly three channels are shown')

const navLink = page.locator('.nav a[href="#contact"]')
ok(await navLink.count() === 1, 'a Contact link exists in the main navigation')

/* --- Facebook --------------------------------------------------------- */
const fb = page.locator('.contact-card--facebook')
ok(await fb.count() === 1, 'the Facebook card is present')
ok(await fb.evaluate((n) => n.tagName) === 'A', 'Facebook is a real link element')
const fbHref = await fb.getAttribute('href')
ok(fbHref === 'https://www.facebook.com/tutorproenglish', `Facebook points at the right page (${fbHref})`)
ok(await fb.getAttribute('target') === '_blank', 'Facebook opens in a new tab')
ok((await fb.getAttribute('rel') || '').includes('noreferrer'), 'Facebook link is rel=noreferrer')
ok((await fb.textContent()).includes('@tutorproenglish'), 'the Facebook handle is shown')

/* --- WhatsApp --------------------------------------------------------- */
const wa = page.locator('.contact-card--whatsapp')
ok(await wa.count() === 1, 'the WhatsApp card is present')
ok(await wa.evaluate((n) => n.tagName) === 'A', 'WhatsApp is a real link element')
const waHref = await wa.getAttribute('href')
ok(waHref === 'https://wa.me/639625284849', `WhatsApp uses the correct number (${waHref})`)
ok((await wa.textContent()).includes('+63 962 528 4849'), 'the WhatsApp number is shown in readable form')

/* --- WeChat ----------------------------------------------------------- */
const wc = page.locator('.contact-card--wechat')
ok(await wc.count() === 1, 'the WeChat card is present')
ok(await wc.evaluate((n) => n.tagName) === 'BUTTON', 'WeChat is a button, not a link that would go nowhere')
ok(await wc.getAttribute('href') === null, 'WeChat has no href')
ok((await wc.textContent()).includes('t_cora'), 'the WeChat ID t_cora is shown')

// The copy action must actually place the ID on the clipboard.
await wc.click()
await page.waitForTimeout(400)
const clip = await page.evaluate(() => navigator.clipboard.readText())
ok(clip === 't_cora', `clicking WeChat copies the exact ID (got "${clip}")`)
ok((await wc.textContent()).includes('Copied'), 'the button confirms it copied')

// And the confirmation must revert, so the card is reusable.
await page.waitForTimeout(2400)
ok(!(await wc.textContent()).includes('Copied'), 'the copied confirmation reverts after a moment')

/* --- accessibility ----------------------------------------------------- */
const labels = await page.locator('.contact-card').evaluateAll(
  (nodes) => nodes.map((n) => n.getAttribute('aria-label') || ''))
ok(labels.every((l) => l.length > 10), 'every card has a descriptive aria-label')
ok(labels.some((l) => /copy/i.test(l)), 'the WeChat card announces that it copies')

// Keyboard focus must be possible on all three.
const focusable = await page.locator('.contact-card').evaluateAll(
  (nodes) => nodes.filter((n) => n.tagName === 'A' ? n.hasAttribute('href') : !n.disabled).length)
ok(focusable === 3, 'all three cards are keyboard reachable')

/* --- layout ------------------------------------------------------------ */
const desktop = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.contact-card')].map((c) => c.getBoundingClientRect())
  return {
    sameRow: Math.abs(cards[0].top - cards[2].top) < 2,
    equalHeight: Math.abs(cards[0].height - cards[2].height) < 2,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }
})
ok(desktop.sameRow, 'desktop: the three cards sit on one row')
ok(desktop.equalHeight, 'desktop: the cards are equal height')
ok(desktop.overflow <= 2, `desktop: no sideways page scroll (${desktop.overflow}px)`)

ok(errors.length === 0, `no JavaScript errors (${errors.slice(0, 2).join(' | ') || 'none'})`)
await page.close()

/* --- mobile ------------------------------------------------------------- */
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
await mobile.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await mobile.waitForSelector('.contact-channels', { timeout: 20000 })
const m = await mobile.evaluate(() => {
  const cards = [...document.querySelectorAll('.contact-card')].map((c) => c.getBoundingClientRect())
  return {
    stacked: cards[0].top < cards[1].top && cards[1].top < cards[2].top,
    inViewport: cards.every((c) => c.left >= -1 && c.right <= window.innerWidth + 1),
    tallEnough: cards.every((c) => c.height >= 44),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }
})
ok(m.stacked, 'mobile: the cards stack vertically')
ok(m.inViewport, 'mobile: no card spills outside the screen')
ok(m.tallEnough, 'mobile: every card is a comfortable tap target')
ok(m.overflow <= 2, `mobile: no sideways scroll (${m.overflow}px)`)
await mobile.close()

await context.close()
await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
