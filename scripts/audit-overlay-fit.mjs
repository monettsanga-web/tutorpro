/**
 * Does anything sit ON TOP of the text, and is the type the type we shipped?
 *
 * WHY THIS EXISTS, SEPARATELY FROM verify:textfit
 * -----------------------------------------------
 * `audit-text-fit.mjs` measures whether a block of text fits inside its own
 * box. It reported zero problems across 54 pages while a phone screen still
 * looked wrong, because it skips `position: fixed` — and the three things
 * pinned to the bottom of a phone screen were piled on top of one another:
 *
 *   .mobile-guest-action-bar   z-index 120   12-378 x 762-832
 *   .support-widget            z-index 105  308-372 x 760-826
 *   .language-control          z-index  95   12-184 x 789-832
 *
 * The chat button and the language picker were completely buried. Nothing
 * that measures a single element could ever see that.
 *
 * It also checks that every family the CSS names is really available, in the
 * browser, on the built page — the file-level check in test-fonts.mjs reads
 * source, this one reads `document.fonts`.
 *
 * FALSE POSITIVES THIS DELIBERATELY IGNORES (each one cost real time)
 *   - screen-reader-only text: 1px boxes, `clip-path: inset(50%)`
 *   - decorative absolutely-positioned children and ::before/::after sheens,
 *     which inflate scrollWidth/scrollHeight without any text being cut
 *   - collapsed accordion answers: the panel is 0px tall on purpose
 *   - `text-overflow: ellipsis` and `-webkit-line-clamp`: trimming is intended
 *   - `pointer-events: none` overlays: ambient orbs and the motion layer are
 *     drawn through, they do not hide anything
 */
/* playwright-core is not a dependency of this project — it is fetched with
   npx when an audit is run. Take it from wherever it happens to be. */
const SANDBOX_PLAYWRIGHT = '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const { chromium } = await import('playwright-core').catch(() => import(SANDBOX_PLAYWRIGHT))

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
const PAGES = (process.env.PAGES || [
  '/',
  '/about.html',
  '/free-trial.html',
  '/how-it-works.html',
  '/pricing.html',
  '/faq.html',
  '/contact.html',
  '/english-for-kids-ages-4-7.html',
  '/online-english-alternatives.html',
  '/english-tutor-kuala-lumpur.html',
  '/kr/',
  '/blog/',
].join(',')).split(',')

const SIZES = [
  { w: 360, h: 740, name: 'phone 360' },
  { w: 390, h: 844, name: 'phone 390' },
  { w: 414, h: 896, name: 'phone 414' },
  { w: 768, h: 1024, name: 'tablet 768' },
  { w: 820, h: 1180, name: 'tablet 820' },
  { w: 1024, h: 768, name: 'tablet landscape 1024' },
]

const AUDIT = String.raw`(() => {
  const out = { fonts: [], overflow: [], clipped: [], covered: [], docScroll: 0 }
  out.docScroll = document.documentElement.scrollWidth - document.documentElement.clientWidth
  const vw = document.documentElement.clientWidth

  const SYSTEM = new Set(['-apple-system','BlinkMacSystemFont','Segoe UI','Roboto','Helvetica Neue','Arial',
    'sans-serif','serif','monospace','system-ui','ui-sans-serif','Helvetica','Times New Roman','Courier New',
    'PingFang SC','Microsoft YaHei','Hiragino Sans','Hiragino Sans GB','Apple SD Gothic Neo','Malgun Gothic',
    'Noto Sans','Noto Sans KR','Noto Sans SC','Noto Sans TC','Pretendard','Pretendard Variable',
    'Noto Color Emoji','Apple Color Emoji','Segoe UI Emoji','emoji'])

  const desc = (el) => {
    const id = el.id ? '#' + el.id : ''
    const cls = typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''
    return el.tagName.toLowerCase() + id + cls
  }
  const textOf = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)

  /* Screen-reader-only: a 1px box, or clipped away entirely. */
  const srOnly = (el, cs, r) =>
    (r.width <= 2 && r.height <= 2) || cs.clipPath === 'inset(50%)' || cs.clip === 'rect(0px, 0px, 0px, 0px)'

  /* Only text in normal flow can be "cut off" by a clipping ancestor. A
     decorative child that is absolutely positioned, or a ::before sheen, is
     meant to be clipped — that is the whole point of overflow: hidden. */
  const overflowIsDecorative = (el) => {
    for (const pseudo of ['::before', '::after']) {
      const s = getComputedStyle(el, pseudo)
      if (s && s.content && s.content !== 'none' && (s.position === 'absolute' || s.position === 'fixed')) return true
    }
    const box = el.getBoundingClientRect()
    let flowOverflow = false
    for (const kid of el.children) {
      const ks = getComputedStyle(kid)
      if (ks.position === 'absolute' || ks.position === 'fixed') continue
      if (ks.display === 'none') continue
      const kr = kid.getBoundingClientRect()
      if (kr.right > box.right + 1 || kr.bottom > box.bottom + 1) flowOverflow = true
    }
    /* A leaf with its own text and no element children still counts. */
    if (!el.children.length && (el.textContent || '').trim()) flowOverflow = true
    return !flowOverflow
  }

  /* A wide data table inside an overflow-x:auto box is the correct way to show a
     12-column framework on a phone: it is swipeable, nothing is lost. The
     curriculum table is 1100px wide on purpose and carries its own "swipe
     across" hint, so it must not be reported as text that does not fit. */
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX
      if (ox === 'auto' || ox === 'scroll') return true
    }
    return false
  }

  const fixed = []
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    if (srOnly(el, cs, r)) continue

    const family = (cs.fontFamily || '').split(',')[0].trim().replace(/^["']|["']$/g, '')
    if (family && !SYSTEM.has(family) && !document.fonts.check('1em "' + family + '"')) out.fonts.push(family)

    if (r.right > vw + 1 && cs.position !== 'fixed' && cs.position !== 'absolute' && !inScroller(el)) {
      out.overflow.push({ sel: desc(el), text: textOf(el), by: Math.round(r.right - vw) })
    }

    const clipsX = cs.overflowX === 'hidden' || cs.overflowX === 'clip'
    const clipsY = cs.overflowY === 'hidden' || cs.overflowY === 'clip'
    if ((clipsX || clipsY) && el.clientHeight > 4 && !overflowIsDecorative(el)) {
      const dx = el.scrollWidth - el.clientWidth
      const dy = el.scrollHeight - el.clientHeight
      if (clipsX && dx > 1 && cs.textOverflow !== 'ellipsis') out.clipped.push({ sel: desc(el), text: textOf(el), axis: 'across', by: dx })
      if (clipsY && dy > 1 && (!cs.webkitLineClamp || cs.webkitLineClamp === 'none')) out.clipped.push({ sel: desc(el), text: textOf(el), axis: 'down', by: dy })
    }

    if (cs.position === 'fixed' && cs.pointerEvents !== 'none' && r.width > 20 && r.height > 20) {
      fixed.push({ el, r, sel: desc(el), z: Number(cs.zIndex) || 0 })
    }
  }
  out.fonts = [...new Set(out.fonts)]

  /* Widgets pinned to the viewport, ignoring ones nested inside another. */
  const widgets = fixed.filter((f) => !fixed.some((g) => g !== f && g.el.contains(f.el)))

  /* (a) Two widgets covering each other — the bug that hid the chat button. */
  for (let i = 0; i < widgets.length; i++) {
    for (let j = i + 1; j < widgets.length; j++) {
      const a = widgets[i], b = widgets[j]
      const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)
      const iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
      if (ix <= 2 || iy <= 2) continue
      const overlap = ix * iy
      const smaller = Math.min(a.r.width * a.r.height, b.r.width * b.r.height)
      /* Only complain when the one underneath is largely swallowed. */
      if (overlap / smaller > 0.5) {
        const under = a.z <= b.z ? a : b
        const over = a.z <= b.z ? b : a
        out.covered.push({ kind: 'widget', widget: over.sel, sel: under.sel, text: textOf(under.el), pct: Math.round((overlap / smaller) * 100) })
      }
    }
  }

  /* (b) A widget covering the very end of the page, which no amount of
         scrolling can reveal. Measured at the bottom of the document. */
  const atBottom = Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2
  if (atBottom) {
    for (const w of widgets) {
      for (const el of document.querySelectorAll('p, h1, h2, h3, h4, li, a, small, td, label, strong')) {
        if (w.el.contains(el) || el.contains(w.el)) continue
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden') continue
        if (!(el.textContent || '').trim()) continue
        if (el.querySelector('p, h1, h2, h3, h4, li, button')) continue
        const r = el.getBoundingClientRect()
        if (r.width < 1 || r.height < 1) continue
        if (srOnly(el, cs, r)) continue
        const ix = Math.min(r.right, w.r.right) - Math.max(r.left, w.r.left)
        const iy = Math.min(r.bottom, w.r.bottom) - Math.max(r.top, w.r.top)
        if (ix > 4 && iy > 4) {
          out.covered.push({ kind: 'end of page', widget: w.sel, sel: desc(el), text: textOf(el), pct: Math.round(((ix * iy) / (r.width * r.height)) * 100) })
        }
      }
    }
  }
  return out
})()`

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
let problems = 0
let checks = 0

for (const size of SIZES) {
  const ctx = await browser.newContext({
    viewport: { width: size.w, height: size.h },
    deviceScaleFactor: 2,
    isMobile: size.w < 900,
    hasTouch: size.w < 1100,
    userAgent:
      size.w < 900
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        : undefined,
  })
  const page = await ctx.newPage()
  for (const path of PAGES) {
    let res
    try {
      res = await page.goto(BASE + path, { waitUntil: 'load', timeout: 45000 })
    } catch (err) {
      problems++
      console.log(`FAIL  ${size.name} ${path} — ${err.message.split('\n')[0]}`)
      continue
    }
    if (!res || res.status() >= 400) {
      problems++
      console.log(`FAIL  ${size.name} ${path} — HTTP ${res ? res.status() : '??'}`)
      continue
    }
    await page.waitForFunction("document.readyState === 'complete'").catch(() => {})
    await page.waitForTimeout(1300)
    await page.evaluate('document.fonts.ready').catch(() => {})

    const lines = []
    for (const where of ['top', 'bottom']) {
      if (where === 'bottom') {
        await page.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)')
        await page.waitForTimeout(700)
      }
      const r = await page.evaluate(AUDIT)
      checks++
      if (where === 'top') {
        if (r.docScroll > 1) lines.push(`the page scrolls sideways by ${r.docScroll}px`)
        for (const f of r.fonts) lines.push(`the CSS asks for "${f}" but nothing loads it`)
        for (const o of r.overflow.slice(0, 5)) lines.push(`${o.sel} reaches ${o.by}px past the right edge — "${o.text}"`)
        for (const c of r.clipped.slice(0, 5)) lines.push(`${c.sel} is cut off ${c.axis} by ${c.by}px — "${c.text}"`)
      }
      for (const c of r.covered.slice(0, 5)) {
        lines.push(`${c.widget} covers ${c.pct}% of ${c.sel} (${c.kind}) — "${c.text}"`)
      }
    }
    if (lines.length) {
      problems += lines.length
      console.log(`\nFAIL  ${size.name} · ${path}`)
      for (const line of lines) console.log(`        ${line}`)
    } else {
      console.log(`  ok  ${size.name} · ${path}`)
    }
  }
  await ctx.close()
}
await browser.close()

console.log(`\n${SIZES.length} widths x ${PAGES.length} pages, measured at the top and the bottom of each (${checks} passes).`)
console.log(problems === 0 ? 'Nothing is hidden and every font is loaded.' : `${problems} problems.`)
process.exit(problems ? 1 : 0)
