/**
 * Generate sitemap.xml with real <lastmod> dates.
 *
 * WHY THIS EXISTS
 * ---------------
 * The sitemap was hand-written and carried no <lastmod> at all. Google uses
 * that date to decide whether a page is worth re-crawling; without it there is
 * no signal that anything changed, so re-crawls are deprioritised. On a new
 * domain with a small crawl budget that matters.
 *
 * WHY IT IS GENERATED RATHER THAN EDITED
 * --------------------------------------
 * A hand-maintained sitemap drifts: pages get added and forgotten, deleted
 * pages linger as soft 404s, and dates go stale the moment anyone edits a
 * file. This reads the built output instead, so the sitemap can only ever
 * describe pages that genuinely exist.
 *
 * HONESTY RULE
 * ------------
 * <lastmod> must reflect when the page's CONTENT actually changed. Stamping
 * every URL with today's date on every build is a well-known way to get a
 * sitemap ignored, because Google learns the dates are meaningless.
 *
 * The first version of this used file mtime and produced exactly that failure:
 * all 23 URLs came out as today, because `npm ci` and fresh checkouts rewrite
 * every file's timestamp. mtime records when the machine last touched a file,
 * not when a human last changed its content.
 *
 * So the date comes from git: the last commit that actually modified the file.
 * mtime is only a fallback for files git does not know about yet.
 *
 * Run: node scripts/build-sitemap.mjs   (wired into npm run build)
 */

import { readdirSync, statSync, existsSync, writeFileSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..')
const publicDir = join(repo, 'public')

const ORIGIN = 'https://www.tutorpro.site'

/**
 * Crawl priority and expected update frequency per page.
 *
 * These are hints, not commands: Google has said it largely ignores priority.
 * They are kept because they cost nothing and other crawlers still read them.
 */
const RULES = [
  { match: /^index\.html$/, loc: '/', changefreq: 'weekly', priority: '1.0' },
  { match: /^pricing\.html$/, changefreq: 'monthly', priority: '0.9' },
  { match: /^english-for-/, changefreq: 'monthly', priority: '0.9' },
  { match: /^(kr|cn)\/$/, changefreq: 'monthly', priority: '0.8' },
  { match: /^english-tutor-/, changefreq: 'monthly', priority: '0.7' },
  { match: /^(free-english-class|online-english-for-filipino-families|is-tutorpro-legitimate)\.html$/, changefreq: 'monthly', priority: '0.8' },
  { match: /^(about|contact)\.html$/, changefreq: 'monthly', priority: '0.8' },
  { match: /^online-english-alternatives\.html$/, changefreq: 'monthly', priority: '0.7' },
  { match: /^refund-policy\.html$/, changefreq: 'monthly', priority: '0.7' },
  { match: /^(terms|privacy-policy)\.html$/, changefreq: 'yearly', priority: '0.5' },
]

/** Pages that must never be advertised to search engines. */
const EXCLUDE = [
  /^google[0-9a-f]+\.html$/i,   // Search Console verification file
  /^404\.html$/,
  /^index\.html$/,              // handled explicitly as '/'
]

function rulesFor(name) {
  const rule = RULES.find((entry) => entry.match.test(name))
  return {
    changefreq: rule?.changefreq || 'monthly',
    priority: rule?.priority || '0.6',
  }
}

/** YYYY-MM-DD, which is what the sitemap spec calls for. */
function isoDate(value) {
  return new Date(value).toISOString().slice(0, 10)
}

/**
 * The date of the last commit that touched this file.
 *
 * Returns null when git cannot answer, which happens for a brand-new file or
 * a deployment that builds from a tarball rather than a clone. The caller
 * falls back to mtime in that case.
 */
function gitDate(absolutePath) {
  try {
    const out = execFileSync(
      'git',
      ['log', '-1', '--format=%cs', '--', relative(repo, absolutePath)],
      { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim()
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null
  } catch {
    return null
  }
}

/** Prefer real edit history; fall back to the filesystem only if needed. */
function lastModified(absolutePath) {
  return gitDate(absolutePath) || isoDate(statSync(absolutePath).mtimeMs)
}

function collect() {
  const pages = []

  // Root-level HTML pages.
  for (const file of readdirSync(publicDir)) {
    if (!file.endsWith('.html')) continue
    if (EXCLUDE.some((pattern) => pattern.test(file))) continue
    const full = join(publicDir, file)
    pages.push({ path: `/${file}`, name: file, lastmod: lastModified(full) })
  }

  // The homepage is built by Vite, so its source is the template plus App.jsx.
  // Use whichever changed most recently; that is when the page really changed.
  const homeSources = [
    join(repo, 'index.html'),
    join(repo, 'src', 'App.jsx'),
  ].filter(existsSync)
  if (homeSources.length) {
    // Newest of the homepage's sources: whichever changed last is when the
    // rendered page actually changed.
    const dates = homeSources.map(lastModified).sort()
    pages.push({ path: '/', name: 'index.html', lastmod: dates[dates.length - 1] })
  }

  // Language sub-sites.
  for (const dir of ['kr', 'cn']) {
    const index = join(publicDir, dir, 'index.html')
    if (existsSync(index)) {
      pages.push({ path: `/${dir}/`, name: `${dir}/`, lastmod: lastModified(index) })
    }
  }

  return pages.sort((a, b) => {
    const pa = Number(rulesFor(a.name).priority)
    const pb = Number(rulesFor(b.name).priority)
    return pb - pa || a.path.localeCompare(b.path)
  })
}

function build() {
  const pages = collect()
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]

  for (const page of pages) {
    const { changefreq, priority } = rulesFor(page.name)
    lines.push('  <url>')
    lines.push(`    <loc>${ORIGIN}${page.path}</loc>`)
    lines.push(`    <lastmod>${page.lastmod}</lastmod>`)
    lines.push(`    <changefreq>${changefreq}</changefreq>`)
    lines.push(`    <priority>${priority}</priority>`)
    lines.push('  </url>')
  }

  lines.push('</urlset>')
  lines.push('')

  const xml = lines.join('\n')
  const target = join(publicDir, 'sitemap.xml')

  // Only rewrite when something actually changed, so untouched pages keep
  // their existing dates instead of being restamped on every build.
  if (existsSync(target) && readFileSync(target, 'utf8') === xml) {
    console.log(`[sitemap] unchanged (${pages.length} URLs).`)
    return
  }

  writeFileSync(target, xml)
  console.log(`[sitemap] wrote ${pages.length} URLs with lastmod dates.`)
}

build()
