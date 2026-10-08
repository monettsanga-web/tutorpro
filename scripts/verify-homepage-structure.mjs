/**
 * The homepage a PERSON sees, and the one Google renders.
 *
 * WHY THIS EXISTS, AND WHY IT CHECKS THE RENDERED DOM
 * ---------------------------------------------------
 * scripts/prerender-home.mjs writes crawlable markup into
 * `<div id="root">`, and React replaces that markup the moment it mounts.
 * So `curl https://www.tutorpro.site/ | grep "<h2>"` shows one set of
 * headings and an actual browser shows a completely different set.
 *
 * An entire homepage restructure was once verified with curl and shipped
 * while the live page, in a browser, still carried the old headings -
 * "Everything here is something you can check", "One minute inside a
 * TutorPro lesson". Measured afterwards with a real browser: the
 * prerendered headings were present in the file and absent from the
 * rendered DOM, every time.
 *
 * Googlebot renders JavaScript. The rendered DOM is what gets indexed.
 * The prerendered copy still earns its keep - social scrapers, AI
 * crawlers and the first pass of some engines never run JS - but it is
 * the floor, not the page. So this test opens a browser.
 *
 * Run: node scripts/verify-homepage-structure.mjs   (server on :4173)
 */
const SANDBOX = '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const { chromium } = await import('playwright-core').catch(() => import(SANDBOX))

const BASE = process.env.BASE || 'http://127.0.0.1:4173'
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

/* The structure the brief asks an international parent to be shown. */
const REQUIRED_H2 = [
  'Live Online English Classes for Children',
  'English Programs for Primary and Secondary Students',
  'Personalized One-on-One English Lessons',
  'Experienced English Teachers',
  'What Your Child Will Learn',
  'Cambridge and Oxford English Learning Materials',
  'How TutorPro Online English Classes Work',
  'Why Parents Choose TutorPro',
  'Frequently Asked Questions',
]

/* Seven skills, named on the page rather than implied. */
const SKILLS = ['Speaking', 'Listening', 'Reading', 'Pronunciation', 'Grammar', 'Vocabulary', 'Communication']

/* Questions a parent abroad asks before anything else. */
const INTERNATIONAL_FAQ = [
  'another country',
  'countries do you accept',
  'live or recorded',
  'one-on-one',
  'ages do you teach',
  'beginners',
]

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

for (const width of [1440, 390]) {
  const label = `@${width}px`
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 950 }, isMobile: width < 700, hasTouch: width < 700 })
  await page.route('**/*.{mp4,webm}', (r) => r.abort())
  await page.goto(BASE + '/', { waitUntil: 'load' })
  /* Measuring mid-hydration reports headings that are about to be
     replaced - the exact mistake this file exists to prevent. */
  await page.waitForFunction('document.readyState === "complete"')
  await page.waitForTimeout(2500)

  const dom = await page.evaluate(`(() => ({
    h1: [...document.querySelectorAll('h1')].map((e) => e.textContent.trim()),
    h2: [...document.querySelectorAll('h2')].map((e) => e.textContent.trim()),
    tagline: document.querySelector('.hero__tagline')?.textContent?.trim() || '',
    heroButtons: [...document.querySelectorAll('.hero__actions button, .hero__actions a')].map((e) => e.textContent.trim()),
    text: document.body.innerText,
    sideScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    words: document.body.innerText.split(/\\s+/).filter(Boolean).length,
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || '',
    canonical: document.querySelector('link[rel="canonical"]')?.href || '',
    faqSchema: [...document.querySelectorAll('script[type="application/ld+json"]')].some((s) => /FAQPage/.test(s.textContent)),
    orgSchema: [...document.querySelectorAll('script[type="application/ld+json"]')].some((s) => /EducationalOrganization|Organization/.test(s.textContent)),
    siteSchema: [...document.querySelectorAll('script[type="application/ld+json"]')].some((s) => /\\"WebSite\\"/.test(s.textContent)),
    imagesWithoutAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
    lazyImages: [...document.querySelectorAll('img')].filter((i) => i.loading === 'lazy').length,
    images: document.querySelectorAll('img').length,
  }))()`)

  /* ---- the hero promise ---- */
  ok(dom.h1.length === 1, `${label}: exactly one H1 (${dom.h1.length})`)
  ok(dom.h1[0] === 'Online English Classes for Kids', `${label}: H1 is the search term, rendered (${dom.h1[0]})`)
  ok(/Live, personalized English lessons for primary and secondary students with experienced teachers/i.test(dom.tagline),
    `${label}: the subheading states live, personalised, primary and secondary, experienced teachers`)
  ok(dom.heroButtons.some((b) => /book a free trial/i.test(b)), `${label}: primary CTA is Book a free trial`)
  /* The brief specifies American spelling throughout, and the audience it
   names is led by the US and Canada. */
  ok(dom.heroButtons.some((b) => /explore our programs/i.test(b)), `${label}: secondary CTA is Explore our programs`)
  ok(!/personalised|programmes/i.test(dom.text), `${label}: no British spellings left on the international homepage`)

  /* ---- the structure, in the rendered DOM ---- */
  for (const heading of REQUIRED_H2) {
    ok(dom.h2.includes(heading), `${label}: H2 "${heading}" is on the page a browser draws`)
  }

  /* ---- what the brief says a parent must understand immediately ---- */
  ok(/online/i.test(dom.text) && /live/i.test(dom.text), `${label}: says the lessons are live and online`)
  ok(SKILLS.every((skill) => dom.text.includes(skill)), `${label}: all seven skills are named`)
  ok(/US\$|US dollars/.test(dom.text), `${label}: prices are labelled as US dollars, not a bare dollar sign`)
  ok(/time zone|timezone/i.test(dom.text), `${label}: scheduling explains time zones`)
  ok(/no restriction on which country|from another country|around the world|worldwide/i.test(dom.text),
    `${label}: makes clear a child can join from any country`)

  const missingFaq = INTERNATIONAL_FAQ.filter((q) => !dom.text.toLowerCase().includes(q))
  ok(missingFaq.length === 0, `${label}: the international FAQs are present${missingFaq.length ? ` (missing: ${missingFaq.join(', ')})` : ''}`)

  /* ---- technical ---- */
  ok(dom.title === 'Online English Classes for Kids | TutorPro English', `${label}: title tag (${dom.title})`)
  ok(dom.description.length > 0 && dom.description.length <= 160, `${label}: description fits Google (${dom.description.length} chars)`)
  ok(/^https:\/\/www\.tutorpro\.site\/$/.test(dom.canonical), `${label}: canonical names the production homepage`)
  ok(dom.faqSchema, `${label}: FAQPage schema survives hydration`)
  ok(dom.orgSchema, `${label}: Organization schema present`)
  ok(dom.siteSchema, `${label}: WebSite schema present`)
  ok(dom.imagesWithoutAlt === 0, `${label}: every image has an alt attribute (${dom.imagesWithoutAlt} missing)`)
  ok(dom.lazyImages > 0, `${label}: images below the fold are lazy-loaded (${dom.lazyImages} of ${dom.images})`)
  ok(dom.sideScroll <= 1, `${label}: no sideways scrolling (${dom.sideScroll}px)`)
  ok(dom.words > 1200, `${label}: enough rendered content to rank (${dom.words} words)`)

  /* ---- the homepage is not a local Philippine page ---- */
  const rizal = (dom.text.match(/Rizal/gi) || []).length
  ok(rizal === 0, `${label}: "Rizal" does not appear on the international homepage (${rizal})`)

  await page.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
