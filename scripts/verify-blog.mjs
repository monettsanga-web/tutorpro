/**
 * The learning-resources hub and its articles — browser verification.
 *
 * Articles are the one page type other sites ever link to, so they have to be
 * genuinely useful rather than keyword vehicles. These checks enforce the
 * things that separate the two: real length, Article schema with a date, a
 * category, cross-links, and no invented statistics.
 */
import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const ARTICLES = [
  'help-child-speak-english-at-home',
  'english-reading-activities-primary',
  'common-english-grammar-mistakes-children',
  'build-english-vocabulary-children',
  'online-english-classes-what-parents-should-know',
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })

/* ================================================================== */
console.log('\n--- the hub ---')
{
  const res = await page.goto('http://localhost:4173/blog/', { waitUntil: 'domcontentloaded' })
  ok(res.status() === 200, '/blog/ loads')
  ok(await page.locator('h1').count() === 1, 'exactly one H1')
  const title = await page.title()
  ok(/Learning Resources/i.test(title), `title targets the hub (${title.slice(0, 50)}…)`)
  ok(await page.locator('nav.crumbs').count() === 1, 'breadcrumbs present')

  // Every article must be reachable from the hub, or the hub is decorative.
  for (const slug of ARTICLES) {
    ok(await page.locator(`a[href="/blog/${slug}.html"]`).count() >= 1, `hub links to ${slug}`)
  }

  const graph = (await page.locator('script[type="application/ld+json"]').allTextContents())
    .flatMap((b) => JSON.parse(b)['@graph'] || [])
  const types = graph.map((n) => n['@type'])
  ok(types.includes('CollectionPage'), 'CollectionPage schema')
  ok(types.includes('ItemList'), 'ItemList schema lists the articles')
  ok(types.includes('BreadcrumbList'), 'BreadcrumbList schema')
  const list = graph.find((n) => n['@type'] === 'ItemList')
  ok((list?.itemListElement || []).length === ARTICLES.length, `ItemList covers all ${ARTICLES.length} articles`)
}

/* ================================================================== */
const titles = new Set()
for (const slug of ARTICLES) {
  console.log(`\n--- /blog/${slug} ---`)
  const res = await page.goto(`http://localhost:4173/blog/${slug}.html`, { waitUntil: 'domcontentloaded' })
  ok(res.status() === 200, 'loads')

  const title = await page.title()
  ok(!titles.has(title), 'title is unique')
  titles.add(title)
  ok(/TutorPro English PH/.test(title), 'title carries the brand')

  const description = await page.getAttribute('meta[name="description"]', 'content')
  ok(description && description.length >= 90 && description.length <= 185, `meta description length (${description?.length})`)

  const canonical = await page.getAttribute('link[rel="canonical"]', 'href')
  ok(canonical === `https://www.tutorpro.site/blog/${slug}.html`, 'canonical is correct')

  ok(await page.locator('h1').count() === 1, 'exactly one H1')
  ok(await page.locator('h2').count() >= 4, 'real H2 structure')

  // Substance. A short article is worse than no article.
  const words = (await page.locator('main').textContent()).trim().split(/\s+/).length
  ok(words >= 550, `substantial content (${words} words)`)

  /* --- schema ------------------------------------------------------ */
  const graph = (await page.locator('script[type="application/ld+json"]').allTextContents())
    .flatMap((b) => JSON.parse(b)['@graph'] || [])
  const article = graph.find((n) => n['@type'] === 'Article')
  ok(Boolean(article), 'Article schema present')
  ok(Boolean(article?.datePublished), 'Article declares a publication date')
  ok(Boolean(article?.author?.name), 'Article declares an author')
  ok(Boolean(article?.articleSection), `Article declares a category (${article?.articleSection})`)
  ok(graph.some((n) => n['@type'] === 'FAQPage'), 'FAQPage schema present')
  ok(graph.some((n) => n['@type'] === 'BreadcrumbList'), 'BreadcrumbList present')

  const faqNode = graph.find((n) => n['@type'] === 'FAQPage')
  const questions = (faqNode?.mainEntity || []).map((q) => q.name)
  const body = await page.locator('main').textContent()
  ok(questions.length >= 4, `at least four FAQs (${questions.length})`)
  ok(questions.every((q) => body.includes(q)), 'every schema FAQ appears on the page')

  /* --- honesty ------------------------------------------------------ */
  const raw = await page.content()
  ok(!/aggregateRating|"ratingValue"|"reviewCount"/i.test(raw), 'no fabricated ratings')
  // Invented research statistics are the classic filler in parenting articles.
  ok(!/\b\d{1,3}% of (children|parents|students)\b/i.test(body), 'no invented statistics')
  ok(!/\$10 per|\$10\.00/.test(body), 'no stale pricing')

  /* --- linking ------------------------------------------------------- */
  ok(await page.locator('a[href="/blog/"]').count() >= 1, 'links back to the hub')
  ok(await page.locator('nav.pagenav a').count() >= 2, 'links to related articles')
  ok(await page.locator('a[href="/?book=1"]').count() >= 1, 'has a booking CTA')
  ok(await page.locator('nav.crumbs').count() === 1, 'breadcrumbs present')
}

/* ================================================================== */
console.log('\n--- mobile ---')
{
  const phone = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true })
  for (const path of ['/blog/', ...ARTICLES.map((s) => `/blog/${s}.html`)]) {
    await phone.goto(`http://localhost:4173${path}`, { waitUntil: 'domcontentloaded' })
    const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    ok(overflow <= 0, `${path} — no horizontal overflow at 375px (${overflow}px)`)
  }
  await phone.close()
}

/* ================================================================== */
console.log('\n--- discoverability ---')
{
  const xml = await (await fetch('http://localhost:4173/sitemap.xml')).text()
  ok(xml.includes('https://www.tutorpro.site/blog/'), 'the hub is in the sitemap')
  for (const slug of ARTICLES) {
    ok(xml.includes(`https://www.tutorpro.site/blog/${slug}.html`), `${slug} is in the sitemap`)
  }
  const home = await (await fetch('http://localhost:4173/')).text()
  ok(home.includes('/blog/'), 'the homepage links to the resources hub')
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
