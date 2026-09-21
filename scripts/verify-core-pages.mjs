/**
 * The six core pages — real headless-browser verification.
 *
 * These are the pages a parent searches for by name (free trial, how it
 * works, FAQ, teachers, primary, secondary). The checks below prove each is
 * genuinely distinct rather than a thin keyword page, that the prices shown
 * match what the checkout charges, and that nothing is invented.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
import { STANDARD, PACKAGE } from './pricing.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const PAGES = [
  ['free-trial.html', 'Free Trial', /free trial/i],
  ['how-it-works.html', 'How.*Work', /how online english lessons work/i],
  ['faq.html', 'Frequently Asked', /frequently asked questions/i],
  ['teachers.html', 'Teachers', /teachers who will teach/i],
  ['primary-english.html', 'Primary English', /primary english classes/i],
  ['secondary-english.html', 'Secondary English', /secondary english classes/i],
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })

const titles = new Set()
const descriptions = new Set()
const h1s = new Set()

for (const [slug, titleWord, h1Pattern] of PAGES) {
  console.log(`\n--- /${slug} ---`)
  const response = await page.goto(`http://localhost:4173/${slug}`, { waitUntil: 'domcontentloaded' })
  ok(response.status() === 200, 'the page loads')

  /* --- metadata, unique per page --------------------------------- */
  const title = await page.title()
  ok(new RegExp(titleWord, 'i').test(title), `title targets the right query (${title.slice(0, 55)}…)`)
  ok(/TutorPro English PH/.test(title), 'title carries the brand')
  ok(title.length <= 75, `title is a sensible length (${title.length} chars)`)
  ok(!titles.has(title), 'title is unique across these pages')
  titles.add(title)

  const description = await page.getAttribute('meta[name="description"]', 'content')
  ok(description && description.length >= 100 && description.length <= 185,
    `meta description is a usable length (${description?.length})`)
  ok(!descriptions.has(description), 'meta description is unique')
  descriptions.add(description)

  const canonical = await page.getAttribute('link[rel="canonical"]', 'href')
  ok(canonical === `https://www.tutorpro.site/${slug}`, 'canonical is correct and absolute')

  /* --- headings --------------------------------------------------- */
  const h1Count = await page.locator('h1').count()
  ok(h1Count === 1, `exactly one H1 (${h1Count})`)
  const h1 = await page.locator('h1').textContent()
  ok(h1Pattern.test(h1), `H1 matches the page intent (${h1.slice(0, 50)}…)`)
  ok(!h1s.has(h1), 'H1 is unique')
  h1s.add(h1)
  ok(await page.locator('h2').count() >= 3, 'the page has a real H2 structure')

  /* --- substance, not a thin page --------------------------------- */
  const words = (await page.locator('main').textContent()).trim().split(/\s+/).length
  ok(words >= 400, `the page has substantial content (${words} words)`)

  /* --- structured data -------------------------------------------- */
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
  ok(blocks.length >= 1, 'structured data is present')
  const graph = blocks.flatMap((b) => JSON.parse(b)['@graph'] || [])
  const types = graph.map((n) => n['@type'])
  ok(types.includes('FAQPage'), 'FAQPage schema is present')
  ok(types.includes('BreadcrumbList'), 'BreadcrumbList schema is present')

  // Never claim ratings or reviews that do not exist.
  const raw = blocks.join(' ')
  ok(!/AggregateRating|"reviewCount"|"ratingValue"/.test(raw), 'no invented ratings or review counts')

  // Every FAQ in the schema must actually appear on the page.
  const faqNode = graph.find((n) => n['@type'] === 'FAQPage')
  const questions = (faqNode?.mainEntity || []).map((q) => q.name)
  ok(questions.length >= 5, `at least five FAQs (${questions.length})`)
  const body = await page.locator('main').textContent()
  const missing = questions.filter((q) => !body.includes(q))
  ok(missing.length === 0, `every schema FAQ is visible on the page (${missing[0] || 'all present'})`)

  /* --- prices match what the checkout charges ---------------------- */
  if (/\$\d/.test(body)) {
    ok(!/\$10 per|\$10 each/.test(body), 'no stale $10 price')
    const quoted = [...body.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]))
    const bad = quoted.filter((n) => n === 10 || n === 128)
    ok(bad.length === 0, `no superseded prices quoted (${bad.join(', ') || 'none'})`)
    ok(quoted.includes(STANDARD) || quoted.includes(PACKAGE), 'the current rates appear')
  }

  /* --- conversion and navigation ----------------------------------- */
  ok(await page.locator('a[href="/?book=1"]').count() >= 2, 'a booking CTA appears more than once')
  ok(await page.locator('nav.crumbs').count() === 1, 'breadcrumbs are present')
  ok(await page.locator('nav.pagenav a').count() >= 4, 'internal links to sibling pages')

  /* --- accessibility basics ---------------------------------------- */
  const imagesWithoutAlt = await page.locator('img:not([alt])').count()
  ok(imagesWithoutAlt === 0, `every image has alt text (${imagesWithoutAlt} missing)`)
}

/* ================================================================== */
console.log('\n--- mobile ---')
{
  const phone = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true })
  for (const [slug] of PAGES) {
    await phone.goto(`http://localhost:4173/${slug}`, { waitUntil: 'domcontentloaded' })
    const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ok(overflow <= 0, `/${slug} — no horizontal overflow at 375px (${overflow}px)`)
  }
  await phone.close()
}

/* ================================================================== */
console.log('\n--- sitemap ---')
{
  const xml = await (await fetch('http://localhost:4173/sitemap.xml')).text()
  for (const [slug] of PAGES) {
    ok(xml.includes(`https://www.tutorpro.site/${slug}`), `/${slug} is in the sitemap`)
  }
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
