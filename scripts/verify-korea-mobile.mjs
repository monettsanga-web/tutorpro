/**
 * Korean pages — mobile quality, measured on real viewports.
 *
 * These thresholds come from an audit that found genuine faults: the headline
 * started 423px down a 667px screen, seven to eight controls were under the
 * 44px Apple HIG minimum, and body text dropped to 13px. Locking them in a
 * test stops any of it creeping back.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const PAGES = ['/kr/', '/kr/hwasang-yeongeo.html', '/kr/choding-yeongeo.html', '/kr/philippine-hwasang-yeongeo.html']
const DEVICES = [['iPhone SE', 375, 667], ['iPhone 14', 390, 844]]

const browser = await chromium.launch()

for (const [device, width, height] of DEVICES) {
  for (const path of PAGES) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true })
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('http://localhost:4173' + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)

    const r = await page.evaluate(() => {
      const small = []
      document.querySelectorAll('a,button,summary,input,select').forEach((el) => {
        const b = el.getBoundingClientRect()
        if (b.width === 0 || b.height === 0) return
        if (b.height < 44) small.push((el.textContent || el.tagName).trim().slice(0, 24) + ' h=' + Math.round(b.height))
      })
      const tiny = []
      document.querySelectorAll('p,li,td,span,small').forEach((el) => {
        const fs = parseFloat(getComputedStyle(el).fontSize)
        if (fs && fs < 14 && el.textContent.trim()) tiny.push(Math.round(fs) + 'px')
      })
      // Anything wider than the screen that is NOT inside a scrollable wrapper
      const wide = []
      document.querySelectorAll('body *').forEach((el) => {
        if (el.closest('.table-wrap')) return
        if (el.getBoundingClientRect().width > window.innerWidth + 1) wide.push(el.tagName)
      })
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        small, tiny, wide,
        bodyFont: parseFloat(getComputedStyle(document.body).fontSize),
        wordBreak: getComputedStyle(document.body).wordBreak,
      }
    })

    const tag = `${device} ${path}`
    ok(r.overflow <= 1, `${tag}: no sideways scroll (${r.overflow}px)`)
    ok(r.small.length === 0, `${tag}: every tap target reaches 44px${r.small.length ? ' — ' + r.small.slice(0, 3).join(', ') : ''}`)
    ok(r.tiny.length === 0, `${tag}: no text under 14px${r.tiny.length ? ' — ' + [...new Set(r.tiny)].join(', ') : ''}`)
    ok(r.wide.length === 0, `${tag}: nothing wider than the screen outside a scroller`)
    ok(r.bodyFont >= 16, `${tag}: body text is at least 16px (${r.bodyFont}px, prevents iOS zoom)`)
    ok(r.wordBreak === 'keep-all', `${tag}: Korean line breaking is keep-all`)
    ok(errors.length === 0, `${tag}: no JavaScript errors`)
    await page.close()
  }
}

/* --- the fold: the offer must be visible without scrolling ------------ */
{
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true })
  await page.goto('http://localhost:4173/kr/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const f = await page.evaluate(() => {
    const top = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top : 99999 }
    return { h1: top('h1'), lede: top('.hero__lede'), cta: top('.hero__cta'), fold: window.innerHeight }
  })
  ok(f.h1 < 260, `the headline is high on the screen (${Math.round(f.h1)}px, was 423px)`)
  ok(f.lede < f.fold, `the explanation is visible without scrolling (${Math.round(f.lede)}px)`)
  ok(f.cta < f.fold, `the call to action is visible without scrolling (${Math.round(f.cta)}px)`)
  await page.close()
}

/* --- wide tables scroll inside themselves, never the page ------------- */
{
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true })
  await page.goto('http://localhost:4173/kr/hwasang-yeongeo.html', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const t = await page.evaluate(() => {
    const w = document.querySelector('.table-wrap')
    return { page: document.documentElement.scrollWidth - document.documentElement.clientWidth, inside: w.scrollWidth > w.clientWidth }
  })
  ok(t.inside, 'the comparison table scrolls inside its own container')
  ok(t.page <= 1, 'and the page itself still does not scroll sideways')
  await page.close()
}

/* --- sticky action bar ------------------------------------------------ */
{
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true })
  await page.goto('http://localhost:4173/kr/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const s = await page.evaluate(() => {
    const bar = document.querySelector('.sticky-cta')
    const cs = getComputedStyle(bar)
    const foot = getComputedStyle(document.querySelector('.site-foot'))
    return {
      shown: cs.display !== 'none',
      fixed: cs.position === 'fixed',
      buttons: bar.querySelectorAll('.btn').length,
      tall: [...bar.querySelectorAll('.btn')].every((b) => b.getBoundingClientRect().height >= 44),
      footClears: parseFloat(foot.paddingBottom) >= bar.getBoundingClientRect().height,
    }
  })
  ok(s.shown && s.fixed, 'a sticky action bar is fixed to the bottom on mobile')
  ok(s.buttons === 2, `it offers both booking and contact (${s.buttons} buttons)`)
  ok(s.tall, 'its buttons are comfortable tap targets')
  ok(s.footClears, 'the footer clears the bar, so no content hides behind it')

  // It must NOT appear on desktop, where the header button is present.
  const desk = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await desk.goto('http://localhost:4173/kr/', { waitUntil: 'networkidle' })
  const hidden = await desk.evaluate(() => getComputedStyle(document.querySelector('.sticky-cta')).display === 'none')
  ok(hidden, 'the sticky bar is hidden on desktop')
  await desk.close()
  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
