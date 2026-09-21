/**
 * KakaoTalk contact — real headless-browser verification.
 *
 * WHY IT IS A COPY BUTTON, NOT A LINK
 * -----------------------------------
 * This is a personal KakaoTalk account reached by phone number, not a
 * KakaoTalk Channel. KakaoTalk publishes no web URL that reliably opens a
 * chat with a given number, and the recipient must also have "allow friend
 * requests by phone number" switched on. A link would therefore fail
 * silently for most parents, which is worse than no link at all — so the
 * number goes on the clipboard instead, exactly like the WeChat ID.
 *
 * These checks prove the number is correct everywhere, that copying really
 * works, and that the tile is readable — KakaoTalk yellow is light enough
 * that a white glyph on it measures 1.28:1 and disappears.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const NUMBER = '+639625284849'
const DISPLAY = '+63 962 528 4849'

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1280, height: 1000 },
  permissions: ['clipboard-read', 'clipboard-write'],
})

/* ================================================================== */
console.log('\n--- main site Contact section ---')
{
  const page = await context.newPage()
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.waitForSelector('.contact-channels', { timeout: 20000 })

  const card = page.locator('.contact-card--kakao')
  ok(await card.count() === 1, 'a KakaoTalk card is present')
  ok(await card.evaluate((n) => n.tagName) === 'BUTTON', 'it is a button, not a link that would go nowhere')
  ok(await card.getAttribute('href') === null, 'it has no href')

  const text = await card.textContent()
  ok(text.includes(DISPLAY), `the number is shown in readable form (${DISPLAY})`)
  ok(/KakaoTalk/i.test(text), 'the channel is named KakaoTalk')
  ok(/Korea/i.test(text), 'it tells Korean families this is for them')

  // The copy must place the DIALLABLE number on the clipboard.
  await card.click()
  await page.waitForTimeout(400)
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  ok(clip === NUMBER, `clicking copies the exact number (got "${clip}")`)
  ok((await card.textContent()).includes('Copied'), 'the button confirms it copied')

  await page.waitForTimeout(2400)
  ok(!(await card.textContent()).includes('Copied'), 'the confirmation reverts so the card is reusable')

  // Readability: a white glyph on KakaoTalk yellow is invisible.
  const colours = await page.locator('.contact-card--kakao .contact-card__icon').evaluate((n) => {
    const s = getComputedStyle(n)
    return { bg: s.backgroundColor, fg: s.color }
  })
  const rgb = (v) => (v.match(/\d+/g) || []).slice(0, 3).map(Number)
  const lum = (c) => {
    const f = (x) => { const v = x / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    const [r, g, b] = c
    return (0.2126 * f(r)) + (0.7152 * f(g)) + (0.0722 * f(b))
  }
  const la = lum(rgb(colours.bg)), lb = lum(rgb(colours.fg))
  const contrast = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
  ok(contrast >= 4.5, `the KakaoTalk icon meets 4.5:1 contrast (${contrast.toFixed(2)}:1)`)

  // The other channels must be untouched.
  ok(await page.locator('.contact-card').count() === 4, 'there are now four channels')
  ok(await page.locator('.contact-card--whatsapp').count() === 1, 'WhatsApp is still present')
  ok(await page.locator('.contact-card--wechat').count() === 1, 'WeChat is still present')
  ok(await page.locator('.contact-card--facebook').count() === 1, 'Facebook is still present')
  await page.close()
}

/* ================================================================== */
console.log('\n--- Korean landing pages ---')
for (const path of ['/kr/', '/kr/hwasang-yeongeo.html', '/kr/choding-yeongeo.html', '/kr/philippine-hwasang-yeongeo.html']) {
  const page = await context.newPage()
  await page.goto(`http://localhost:4173${path}`, { waitUntil: 'networkidle' })

  const tile = page.locator('.channel--copy')
  ok(await tile.count() === 1, `${path} — the KakaoTalk tile is present`)
  ok((await tile.textContent()).includes(DISPLAY), `${path} — shows ${DISPLAY}`)
  ok(await tile.getAttribute('data-copy') === NUMBER, `${path} — copies the exact number`)
  ok(/카카오톡/.test(await tile.textContent()), `${path} — labelled in Korean`)

  await tile.click()
  await page.waitForTimeout(400)
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  ok(clip === NUMBER, `${path} — clicking really copies it`)
  ok(/복사 완료/.test(await tile.textContent()), `${path} — confirms in Korean`)

  await page.close()
}

/* ================================================================== */
console.log('\n--- mobile ---')
{
  const phone = await browser.newContext({
    viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true,
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  const page = await phone.newPage()
  await page.goto('http://localhost:4173/kr/', { waitUntil: 'networkidle' })

  const tile = page.locator('.channel--copy')
  ok(await tile.count() === 1, 'the tile renders on a phone')
  const box = await tile.boundingBox()
  ok(box && box.height >= 44, `it meets the 44px tap target (${Math.round(box?.height || 0)}px)`)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  ok(overflow <= 0, `no horizontal overflow at 375px (${overflow}px)`)
  await phone.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
