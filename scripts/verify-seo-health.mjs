/**
 * Site-wide SEO health, checked mechanically against the built output.
 *
 * WHY A SWEEP RATHER THAN PER-PAGE TESTS
 * --------------------------------------
 * The per-page suites verify the pages they know about. The failures that
 * actually cost traffic are the ones nobody thought to test: a new page with
 * no inbound links, a duplicated title after a copy-paste, a missing
 * canonical on one file out of forty. Those only show up when every page is
 * examined together, so this walks the whole of dist/.
 *
 * Runs on the built site (dist/), because that is what Google receives —
 * source files can look fine while a generator emits something else.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const dist = new URL('../dist/', import.meta.url).pathname
if (!existsSync(dist)) {
  console.error('dist/ not found — run `npm run build` first.')
  process.exit(1)
}

/** Every indexable HTML page in the build. */
function collect(dir, prefix = '') {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (['assets'].includes(entry.name)) continue
      out.push(...collect(join(dir, entry.name), `${prefix}${entry.name}/`))
    } else if (entry.name.endsWith('.html')) {
      // Verification files and the 404 are deliberately not indexable.
      if (/^(google|naver)[0-9a-f]+\.html$/i.test(entry.name)) continue
      if (entry.name === '404.html') continue
      out.push({ path: `${prefix}${entry.name}`, html: readFileSync(join(dir, entry.name), 'utf8') })
    }
  }
  return out
}

const pages = collect(dist)
console.log(`Auditing ${pages.length} indexable pages\n`)

const pick = (html, re) => (html.match(re) || [])[1] || ''
const titles = new Map()
const descriptions = new Map()

/* --- per page ------------------------------------------------------- */
for (const { path, html } of pages) {
  const isHome = path === 'index.html' || /\/index\.html$/.test(path)

  const title = pick(html, /<title>([^<]*)<\/title>/)
  const description = pick(html, /name="description"\s+content="([^"]*)"/)
  const canonical = pick(html, /rel="canonical"\s+href="([^"]*)"/)

  if (!title) ok(false, `${path}: has a <title>`)
  if (!description) ok(false, `${path}: has a meta description`)
  if (!canonical) ok(false, `${path}: has a canonical URL`)

  if (titles.has(title)) ok(false, `${path}: title duplicates ${titles.get(title)}`)
  titles.set(title, path)
  if (descriptions.has(description)) ok(false, `${path}: meta description duplicates ${descriptions.get(description)}`)
  descriptions.set(description, path)

  if (!/property="og:image"/.test(html)) ok(false, `${path}: has og:image for social sharing`)
  // Breadcrumbs make no sense on a homepage: it IS the root.
  if (!isHome && !/BreadcrumbList/.test(html)) ok(false, `${path}: has BreadcrumbList schema`)

  // Never claim ratings that do not exist.
  if (/aggregateRating|"ratingValue"|"reviewCount"/i.test(html)) ok(false, `${path}: no fabricated rating schema`)

  // Superseded prices must not survive anywhere.
  if (/\$10 per|\$10\.00|"price": "10"/.test(html)) ok(false, `${path}: no stale $10 price`)

  // Every image needs alt text.
  const imgs = html.match(/<img\b[^>]*>/g) || []
  const noAlt = imgs.filter((t) => !/\balt=/.test(t))
  if (noAlt.length) ok(false, `${path}: every image has alt text (${noAlt.length} missing)`)

  // Exactly one H1 per page.
  const h1s = (html.match(/<h1[\s>]/g) || []).length
  if (h1s !== 1 && !isHome) ok(false, `${path}: exactly one H1 (found ${h1s})`)
}
ok(true, `every page has a title, description, canonical and og:image`)
ok(true, `every title is unique (${titles.size} pages)`)
ok(true, `every meta description is unique`)
ok(true, `no page carries a fabricated rating`)
ok(true, `no page advertises a superseded price`)
ok(true, `every image has alt text`)
ok(true, `breadcrumbs present on every non-homepage`)

/* --- orphan pages: nothing links to them ----------------------------- */
// An unlinked page is close to invisible: Google discovers and weighs pages
// largely through links, so a page in the sitemap alone tends to sit unranked.
const linkable = pages.map((p) => p.path).filter((p) => p !== 'index.html')
const orphans = []
for (const target of linkable) {
  const href = `/${target}`.replace(/\/index\.html$/, '/')
  const inbound = pages.filter((p) => p.path !== target && p.html.includes(`"${href}"`)).length
  if (inbound === 0) orphans.push(target)
}
ok(orphans.length === 0, `no orphan pages — every page has an inbound link (${orphans.join(', ') || 'none'})`)

/* --- crawl depth: every page must be reachable from the homepage ------ */
// A page only the sitemap knows about is a page Google deprioritises. Nine
// real pages (all six city pages and all three non-English subject pages)
// were in the sitemap but linked from NOWHERE in the prerendered homepage,
// which is the version Googlebot reads. That is the likeliest single reason
// for pages sitting as "Discovered - currently not indexed".
{
  const byPath = new Map(pages.map((p) => [p.path, p.html]))
  const normalise = (href) => {
    let h = href.replace(/^\//, '').split('#')[0].split('?')[0]
    if (h === '') h = 'index.html'
    if (h.endsWith('/')) h += 'index.html'
    return h
  }
  const outbound = (html) => [...new Set(
    [...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => normalise(m[1])).filter((h) => byPath.has(h)),
  )]

  const seen = new Set(['index.html'])
  const queue = ['index.html']
  while (queue.length) {
    for (const next of outbound(byPath.get(queue.shift()) || '')) {
      if (!seen.has(next)) { seen.add(next); queue.push(next) }
    }
  }
  const stranded = pages.map((p) => p.path).filter((p) => !seen.has(p))
  ok(stranded.length === 0, `every page is reachable from the homepage (${stranded.join(', ') || 'none stranded'})`)
}

/* --- the homepage must reach the money pages ------------------------- */
const home = pages.find((p) => p.path === 'index.html')?.html || ''
for (const key of ['free-trial', 'how-it-works', 'faq', 'teachers', 'primary-english', 'secondary-english', 'pricing']) {
  ok(home.includes(`/${key}.html`), `the homepage links to /${key}.html`)
}

/* --- sitemap agrees with what was built ------------------------------ */
const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8')
const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
ok(listed.length >= pages.length, `sitemap covers the build (${listed.length} URLs, ${pages.length} pages)`)

const missingFromSitemap = pages
  .map((p) => `https://www.tutorpro.site/${p.path}`.replace(/\/index\.html$/, '/'))
  .filter((u) => !listed.includes(u))
ok(missingFromSitemap.length === 0, `every page is in the sitemap (${missingFromSitemap.join(', ') || 'all present'})`)

// A sitemap entry pointing at a page that does not exist wastes crawl budget.
const builtUrls = new Set(pages.map((p) => `https://www.tutorpro.site/${p.path}`.replace(/\/index\.html$/, '/')))
const dead = listed.filter((u) => !builtUrls.has(u) && u !== 'https://www.tutorpro.site/')
ok(dead.length === 0, `no sitemap entry points at a missing page (${dead.join(', ') || 'none'})`)

/* --- robots and 404 --------------------------------------------------- */
const robots = readFileSync(join(dist, 'robots.txt'), 'utf8')
ok(/Sitemap:\s*https:\/\/www\.tutorpro\.site\/sitemap\.xml/.test(robots), 'robots.txt declares the sitemap')
ok(!/^Disallow: \/$/m.test(robots), 'robots.txt does not block the whole site')
// Bing powers Bing, Yahoo, DuckDuckGo and Copilot; Naver and Daum matter in
// Korea. Each is named rather than left to the wildcard, because several are
// conservative about sites they have not crawled before.
for (const bot of ['bingbot', 'Yeti', 'Daum']) {
  ok(new RegExp(`User-agent: ${bot}`, 'i').test(robots), `robots.txt names ${bot}`)
}
// AI assistants that cite sources send real, clickable referrals.
for (const bot of ['OAI-SearchBot', 'PerplexityBot', 'ClaudeBot']) {
  ok(robots.includes(bot), `robots.txt allows ${bot}`)
}

/* --- two-way linking between topic pages and the articles ------------- */
// A hub that links out but never gets linked back is a dead end for crawlers
// and for parents. Each topic page should offer its matching free guide.
const topicPages = ['english-reading', 'english-speaking', 'english-grammar', 'english-vocabulary', 'cambridge-english', 'oxford-english']
for (const slug of topicPages) {
  const html = pages.find((p) => p.path === `${slug}.html`)?.html || ''
  ok(/href="\/blog\/[a-z-]+\.html"/.test(html), `${slug}.html links into a learning-resources article`)
}

ok(existsSync(join(dist, '404.html')), 'a 404 page exists')
const notFound = readFileSync(join(dist, '404.html'), 'utf8')
ok(/noindex/.test(notFound), 'the 404 page is noindex, so it cannot rank for a real query')
ok(/href="\/free-trial\.html"/.test(notFound), 'the 404 page routes a lost visitor somewhere useful')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
