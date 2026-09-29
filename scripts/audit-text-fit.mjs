/**
 * Does the text fit?
 *
 * Finds, at real phone and tablet widths:
 *   - the page scrolling sideways (the clearest sign something is too wide)
 *   - text wider than the box holding it, so it is cut off or spills out
 *   - anything sticking out past the right edge of the screen
 *   - text too small to read comfortably on a phone
 *
 * Exits non-zero if it finds anything, so it is both the survey that found
 * the original faults and the check that stops them coming back.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

const BASE = 'http://localhost:4173'
const WIDTHS = [
  { label: 'phone 360', width: 360, height: 780 },
  { label: 'phone 390', width: 390, height: 844 },
  { label: 'tablet 768', width: 768, height: 1024 },
  { label: 'tablet 1024', width: 1024, height: 1366 },
  { label: 'laptop 1280', width: 1280, height: 900 },
  { label: 'desktop 1440', width: 1440, height: 900 },
]

const PAGES = [
  ['home', '/'],
  ['pricing', '/pricing.html'],
  ['contact', '/contact.html'],
  ['about', '/about.html'],
  ['free trial', '/free-trial.html'],
  ['how it works', '/how-it-works.html'],
  ['faq', '/faq.html'],
  ['teachers', '/teachers.html'],
  ['primary', '/primary-english.html'],
  ['cambridge', '/cambridge-english.html'],
  ['blog', '/blog/'],
  ['korea', '/kr/'],
  ['taiwan', '/tw/'],
]

const MEASURE = `(() => {
  const viewport = document.documentElement.clientWidth
  const report = { overflowX: document.documentElement.scrollWidth - viewport, clipped: [], pastEdge: [], tiny: [] }
  const seen = new Set()
  const describe = (el) => {
    const id = el.id ? '#' + el.id : ''
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''
    return (el.tagName.toLowerCase() + id + cls).slice(0, 70)
  }
  const textOf = (el) => (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 45)
  // Content inside a deliberately scrollable box (a wide table, a carousel)
  // is allowed to be wider than the screen: that is what the scroll is for.
  /* Buttons carry a rotated "sheen" pseudo-element that is far wider than
     the button and clipped by overflow:hidden. It is invisible decoration,
     not text that does not fit, so it must not be reported. */
  const decoratedAndClipped = (el) => {
    if (getComputedStyle(el).overflowX !== 'hidden') return false
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
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    // Text wider than its own box, and the box is not scrollable on purpose.
    const scrollable = ['auto', 'scroll'].includes(style.overflowX)
    const hasOwnText = [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim())
    if (hasOwnText && !scrollable && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 4 && !insideScroller(el) && !decoratedAndClipped(el)) {
      const key = 'clip:' + describe(el)
      if (!seen.has(key)) { seen.add(key); report.clipped.push({ el: describe(el), text: textOf(el), box: el.clientWidth, needs: el.scrollWidth }) }
    }

    // Sticking out past the right edge of the screen.
    if (hasOwnText && rect.right > viewport + 1 && rect.left < viewport && !insideScroller(el)) {
      const key = 'edge:' + describe(el)
      if (!seen.has(key)) { seen.add(key); report.pastEdge.push({ el: describe(el), text: textOf(el), over: Math.round(rect.right - viewport) }) }
    }

    // Too small to read on a phone.
    const size = parseFloat(style.fontSize)
    if (hasOwnText && size && size < 11.5 && textOf(el).length > 2) {
      const key = 'tiny:' + describe(el)
      if (!seen.has(key)) { seen.add(key); report.tiny.push({ el: describe(el), text: textOf(el), size: Math.round(size * 10) / 10 }) }
    }
  })
  return report
})()`

const browser = await chromium.launch()
let problems = 0

for (const viewport of WIDTHS) {
  console.log(`\n=============== ${viewport.label} ===============`)
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.width < 700, hasTouch: viewport.width < 700 })
  await page.route('**/paypal.com/**', (route) => route.abort())
  await page.route('**/*.{mp4,webm}', (route) => route.abort())
  for (const [name, path] of PAGES) {
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(900)
    const report = await page.evaluate(MEASURE)
    const issues = report.clipped.length + report.pastEdge.length + report.tiny.length + (report.overflowX > 1 ? 1 : 0)
    problems += issues
    if (!issues) { console.log(`  ok   ${name}`); continue }
    console.log(`  --   ${name}${report.overflowX > 1 ? `   PAGE SCROLLS SIDEWAYS by ${report.overflowX}px` : ''}`)
    report.pastEdge.slice(0, 6).forEach((item) => console.log(`         past edge +${item.over}px  ${item.el}  "${item.text}"`))
    report.clipped.slice(0, 6).forEach((item) => console.log(`         cut off ${item.box}→${item.needs}px  ${item.el}  "${item.text}"`))
    report.tiny.slice(0, 6).forEach((item) => console.log(`         ${item.size}px text  ${item.el}  "${item.text}"`))
  }
  await page.close()
}

await browser.close()
console.log(`\n${problems} text-fitting problems found\n`)
// Doubles as a regression check: both are at zero, and must stay there.
process.exit(problems ? 1 : 0)
