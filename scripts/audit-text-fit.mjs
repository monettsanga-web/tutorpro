/**
 * Does the text fit — on EVERY page, in BOTH directions?
 *
 * The first version of this audit missed real faults twice over:
 *   - it only loaded 13 pages out of the 53 in the sitemap, so whole
 *     sections of the site were never looked at;
 *   - it only measured WIDTH. Text cut off at the bottom of a fixed-height
 *     box is just as broken and far more common, and it was invisible here.
 *
 * It now walks every page in the sitemap at phone, tablet and desktop
 * widths and reports:
 *   - the page scrolling sideways
 *   - text wider than the box holding it
 *   - text taller than the box holding it (clipped at the bottom)
 *   - text truncated with an ellipsis or a line clamp
 *   - anything past the right edge of the screen
 *   - text too small to read on a phone
 *
 * Exits non-zero on any finding, so it is both the survey and the check.
 */
import { readFileSync } from 'node:fs'
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

const BASE = 'http://localhost:4173'
const WIDTHS = [
  { label: 'phone 360', width: 360, height: 780 },
  { label: 'phone 390', width: 390, height: 844 },
  { label: 'tablet 768', width: 768, height: 1024 },
  { label: 'tablet 1024', width: 1024, height: 1366 },
  { label: 'desktop 1440', width: 1440, height: 900 },
]

/* Every page the sitemap publishes, plus the ones it deliberately leaves
   out (legal pages, the 404) — a visitor can still reach those. */
const sitemap = readFileSync(new URL('../dist/sitemap.xml', import.meta.url), 'utf8')
const PAGES = [...new Set([
  ...[...sitemap.matchAll(/<loc>https:\/\/www\.tutorpro\.site([^<]*)<\/loc>/g)].map((match) => match[1] || '/'),
  '/404.html',
])]

const MEASURE = `(() => {
  const viewport = document.documentElement.clientWidth
  const report = { overflowX: document.documentElement.scrollWidth - viewport, wide: [], tall: [], truncated: [], pastEdge: [], tiny: [] }
  const seen = new Set()
  const describe = (el) => {
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''
    return (el.tagName.toLowerCase() + cls).slice(0, 58)
  }
  const textOf = (el) => (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40)
  const add = (bucket, key, entry) => { if (!seen.has(key)) { seen.add(key); bucket.push(entry) } }

  /* Decoration, not content: buttons carry a rotated "sheen" pseudo-element
     far wider than the button and clipped by overflow:hidden. */
  const decoratedAndClipped = (el) => {
    const style = getComputedStyle(el)
    if (style.overflowX !== 'hidden' && style.overflowY !== 'hidden') return false
    return ['::before', '::after'].some((pseudo) => {
      const style = getComputedStyle(el, pseudo)
      return style.content !== 'none' && style.position === 'absolute'
    })
  }
  const insideScroller = (el) => {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      const overflow = getComputedStyle(node).overflowX
      if (overflow === 'auto' || overflow === 'scroll') return true
    }
    return false
  }

  document.querySelectorAll('body *').forEach((el) => {
    const style = getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return
    if (el.closest('[aria-hidden="true"]')) return
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const text = textOf(el)
    const hasOwnText = [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim())
    if (!hasOwnText || text.length < 2) return

    const scrollsX = ['auto', 'scroll'].includes(style.overflowX)
    const scrollsY = ['auto', 'scroll'].includes(style.overflowY)

    // Wider than its box.
    if (!scrollsX && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 4 && !insideScroller(el) && !decoratedAndClipped(el)) {
      add(report.wide, 'w:' + describe(el) + text, { el: describe(el), text, box: el.clientWidth, needs: el.scrollWidth })
    }

    // Taller than its box, and the overflow is HIDDEN — text cut off at the
    // bottom. This is what the first audit never looked for.
    if (!scrollsY && style.overflowY === 'hidden' && el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 4 && !decoratedAndClipped(el)) {
      add(report.tall, 't:' + describe(el) + text, { el: describe(el), text, box: el.clientHeight, needs: el.scrollHeight })
    }

    // Deliberately truncated: ellipsis or a line clamp that is actually biting.
    const clamped = style.webkitLineClamp && style.webkitLineClamp !== 'none'
    if (style.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) {
      add(report.truncated, 'e:' + describe(el) + text, { el: describe(el), text, how: 'ellipsis' })
    } else if (clamped && el.scrollHeight > el.clientHeight + 2) {
      add(report.truncated, 'c:' + describe(el) + text, { el: describe(el), text, how: 'line clamp ' + style.webkitLineClamp })
    }

    if (rect.right > viewport + 1 && rect.left < viewport && !insideScroller(el)) {
      add(report.pastEdge, 'p:' + describe(el) + text, { el: describe(el), text, over: Math.round(rect.right - viewport) })
    }

    const size = parseFloat(style.fontSize)
    if (size && size < 11.5) {
      add(report.tiny, 's:' + describe(el) + text, { el: describe(el), text, size: Math.round(size * 10) / 10 })
    }
  })
  return report
})()`

const browser = await chromium.launch()
let problems = 0
const summary = []

for (const viewport of WIDTHS) {
  console.log(`\n=============== ${viewport.label} ===============`)
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.width < 700, hasTouch: viewport.width < 700 })
  await page.route('**/paypal.com/**', (route) => route.abort())
  await page.route('**/*.{mp4,webm}', (route) => route.abort())
  for (const path of PAGES) {
    /* Wait for the page to SETTLE. Measuring 700ms after domcontentloaded
       caught the React homepage mid-hydration and reported a header
       overflow that does not exist once it has finished mounting. */
    await page.goto(BASE + path, { waitUntil: 'load' })
    await page.waitForFunction(() => document.readyState === 'complete').catch(() => {})
    await page.waitForTimeout(1200)
    const report = await page.evaluate(MEASURE)
    const issues = report.wide.length + report.tall.length + report.truncated.length + report.pastEdge.length + report.tiny.length + (report.overflowX > 1 ? 1 : 0)
    problems += issues
    if (!issues) continue
    summary.push(`${viewport.label} ${path}`)
    console.log(`  --   ${path}${report.overflowX > 1 ? `   PAGE SCROLLS SIDEWAYS by ${report.overflowX}px` : ''}`)
    report.pastEdge.slice(0, 4).forEach((i) => console.log(`         past edge +${i.over}px  ${i.el}  "${i.text}"`))
    report.wide.slice(0, 4).forEach((i) => console.log(`         too wide ${i.box}→${i.needs}px  ${i.el}  "${i.text}"`))
    report.tall.slice(0, 4).forEach((i) => console.log(`         CUT OFF BELOW ${i.box}→${i.needs}px  ${i.el}  "${i.text}"`))
    report.truncated.slice(0, 4).forEach((i) => console.log(`         truncated (${i.how})  ${i.el}  "${i.text}"`))
    report.tiny.slice(0, 4).forEach((i) => console.log(`         ${i.size}px text  ${i.el}  "${i.text}"`))
  }
  if (!summary.some((entry) => entry.startsWith(viewport.label))) console.log('  all pages ok')
  await page.close()
}

await browser.close()
console.log(`\n${PAGES.length} pages × ${WIDTHS.length} widths · ${problems} text-fitting problems found\n`)
process.exit(problems ? 1 : 0)
