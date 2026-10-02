/**
 * In a real browser: the page a search engine downloads stays English, and
 * stays English after the IP lookup comes back saying "Korea".
 *
 * Pairs with scripts/test-no-auto-translate.mjs, which reads the source.
 * This one runs the app, answers the geo-IP lookup with a country whose
 * language is not English, and checks that nothing on the page moved.
 */
const SANDBOX_PLAYWRIGHT = '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const { chromium } = await import('playwright-core').catch(() => import(SANDBOX_PLAYWRIGHT))

const BASE = process.env.BASE || 'http://127.0.0.1:4173'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

async function visit(country, label) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()

  /* Pretend the visitor is in `country`. */
  await page.route('**/api.country.is/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ country }) }))
  await page.route('**/ipwho.is/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, country_code: country }) }))

  /* Fail loudly if anything still reaches for the translation widget. */
  const translateHits = []
  await page.route('**/translate.google.com/**', (route) => { translateHits.push(route.request().url()); route.abort() })

  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 })
  await page.waitForTimeout(2500)

  const state = await page.evaluate(`({
    title: document.title,
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    h1: (document.querySelector('h1')?.textContent || '').replace(/\\s+/g, ' ').trim(),
    googtrans: document.cookie.includes('googtrans='),
    widget: Boolean(document.getElementById('google_translate_element')),
    picker: Boolean(document.querySelector('.language-control')),
    storedCountry: sessionStorage.getItem('tutorpro_visitor_country'),
    storedLanguage: sessionStorage.getItem('tutorpro_visitor_language'),
    fontTags: document.querySelectorAll('font').length,
  })`)

  await ctx.close()
  return { state, translateHits, label }
}

const EXPECTED_TITLE = 'Online English Classes for Kids & Teens | TutorPro'

for (const [country, language, label] of [
  ['PH', 'en', 'a visitor in the Philippines'],
  ['KR', 'ko', 'a visitor in Korea'],
  ['CN', 'zh-CN', 'a visitor in China'],
]) {
  const { state, translateHits } = await visit(country, label)
  console.log(`\n${label} (IP country ${country})`)
  ok(state.title === EXPECTED_TITLE, `the title is still the one written for search — "${state.title}"`)
  ok(state.lang === 'en', `the page still declares itself English (lang="${state.lang}")`)
  ok(state.dir !== 'rtl', 'the text direction is untouched')
  ok(state.h1.startsWith('Online English Classes'), `the headline is still English — "${state.h1.slice(0, 48)}"`)
  ok(translateHits.length === 0, `nothing was requested from translate.google.com (${translateHits.length} requests)`)
  ok(!state.widget, 'no Google Translate widget was mounted')
  ok(state.fontTags === 0, 'no <font> tags were injected into the copy (that is what the widget leaves behind)')
  ok(!state.googtrans, 'no googtrans cookie is set')
  ok(!state.picker, 'the floating language picker is gone')
  /* The detection itself must survive — pricing and emails depend on it. */
  ok(state.storedCountry === country, `the country was still detected (${state.storedCountry})`)
  ok(state.storedLanguage === language, `and the reader's language recorded for emails (${state.storedLanguage})`)
}

/* A visitor who was translated before still carries the cookie. */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addCookies([{ name: 'googtrans', value: '/en/ko', url: BASE }])
  const page = await ctx.newPage()
  await page.route('**/api.country.is/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ country: 'KR' }) }))
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 })
  await page.waitForTimeout(2000)
  const stillThere = await page.evaluate("document.cookie.includes('googtrans=/en/')")
  console.log('\nsomeone who was auto-translated before today')
  ok(!stillThere, 'their leftover googtrans cookie is cleared, so they stop seeing a machine translation')
  await ctx.close()
}

await browser.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
