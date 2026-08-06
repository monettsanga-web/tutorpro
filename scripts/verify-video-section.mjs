/**
 * Verify in a real browser that the class-video section renders where
 * visitors will actually see it, and that nothing about it is broken.
 *
 * Run against a served build:
 *   (cd dist && python3 -m http.server 4173) &
 *   node scripts/verify-video-section.mjs
 */

import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173'

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

const browser = await chromium.launch({ args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

const consoleErrors = []
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
page.on('pageerror', (err) => consoleErrors.push(String(err)))

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(1500)

/* --- The section exists and is reachable --- */
const section = page.locator('#see-a-class')
check('The See-a-class section is in the DOM', await section.count() > 0)
check('The section is visible', await section.first().isVisible())

const heading = await page.locator('#see-a-class h2').first().textContent().catch(() => '')
check('It has the class-video heading', /One minute inside a TutorPro lesson/.test(heading || ''), heading?.trim())

/* --- It is high on the page, not buried --- */
const box = await section.first().boundingBox()
const pageHeight = await page.evaluate(() => document.body.scrollHeight)
const positionRatio = box ? box.y / pageHeight : 1
check('It sits in the top third of the homepage', positionRatio < 0.34,
  `${Math.round(positionRatio * 100)}% down the page`)

/* --- A player is actually rendered --- */
const hasVideoTag = await page.locator('#see-a-class video').count()
const hasIframe = await page.locator('#see-a-class iframe').count()
const hasLinkCard = await page.locator('#see-a-class a.china-safe-video--link').count()
check('Exactly one player is rendered', (hasVideoTag + hasIframe + hasLinkCard) === 1,
  `video=${hasVideoTag} iframe=${hasIframe} link=${hasLinkCard}`)

/* --- The MP4 is missing, so it must have fallen back, NOT gone blank --- */
const mp4Response = await page.request.get(`${BASE}/assets/tutorpro-class.mp4`).catch(() => null)
const mp4Present = mp4Response ? mp4Response.status() === 200 : false
console.log(`INFO  tutorpro-class.mp4 ${mp4Present ? 'is present' : 'is NOT uploaded yet'}`)

if (!mp4Present) {
  check('With no MP4 it falls back instead of showing an empty box',
    hasIframe + hasLinkCard > 0, 'fallback rendered')
  check('The fallback is not a zero-size element',
    box ? box.width > 200 && box.height > 100 : false,
    box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'no box')
}

/* --- Never embed bilibili.tv: it has no player endpoint --- */
const frameSrcs = await page.locator('iframe').evaluateAll((els) => els.map((e) => e.src || ''))
check('No iframe points at bilibili.tv', !frameSrcs.some((s) => s.includes('bilibili.tv')),
  frameSrcs.filter((s) => s.includes('bilibili')).join(', ') || 'none')
check('No iframe points at a non-existent player host',
  !frameSrcs.some((s) => s.includes('player.bilibili.tv')))

/* --- The section must not break the page --- */
const realErrors = consoleErrors.filter((e) => !/favicon|manifest|service-worker|supabase|Failed to load resource/i.test(e))
check('No JavaScript errors from the new section', realErrors.length === 0,
  realErrors.slice(0, 2).join(' | ') || 'clean')

/* --- No horizontal overflow introduced --- */
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
check('No new horizontal overflow at 1280px', overflow <= 3, `${overflow}px`)

/* --- Mobile --- */
await page.setViewportSize({ width: 390, height: 844 })
await page.waitForTimeout(600)
const mobileVisible = await section.first().isVisible()
check('The section still shows on a phone', mobileVisible)
const mobileBox = await section.first().boundingBox()
check('It fits the phone width', mobileBox ? mobileBox.width <= 390 : false,
  mobileBox ? `${Math.round(mobileBox.width)}px` : 'no box')
const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
check('No new horizontal overflow at 390px', mobileOverflow <= 3, `${mobileOverflow}px`)

await page.screenshot({ path: '/home/user/tutorpro/see-a-class-mobile.png' })
await page.setViewportSize({ width: 1280, height: 900 })
await section.first().scrollIntoViewIfNeeded()
await page.waitForTimeout(400)
await page.screenshot({ path: '/home/user/tutorpro/see-a-class-desktop.png' })

/* --- Mirror links are present and clickable --- */
const mirrors = page.locator('#see-a-class .china-safe-video__mirrors a')
const mirrorCount = await mirrors.count()
check('Both mirror links are rendered', mirrorCount === 2, `${mirrorCount} found`)

const mirrorHrefs = await mirrors.evaluateAll((els) => els.map((e) => e.href))
check('The YouTube mirror is linked', mirrorHrefs.some((h) => h.includes('EQ12J6cxVZo')))
check('The Bilibili mirror is linked', mirrorHrefs.some((h) => h.includes('4800493496966144')))
check('Every mirror opens in a new tab',
  await mirrors.evaluateAll((els) => els.every((e) => e.target === '_blank' && e.rel.includes('noopener'))))
check('Every mirror is visible to a visitor',
  await mirrors.evaluateAll((els) => els.every((e) => e.offsetWidth > 0 && e.offsetHeight > 0)))

const mirrorText = await page.locator('#see-a-class .china-safe-video__mirrors').innerText()
check('The China limitation is stated next to the YouTube link',
  /not available in mainland china/i.test(mirrorText), mirrorText.replace(/\n/g, ' | '))

await browser.close()
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
