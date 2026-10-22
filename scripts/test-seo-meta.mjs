/**
 * Every page's title and description must survive Google's search result.
 *
 * THE FAULT THIS LOCKS OUT
 * ------------------------
 * 34 of 53 titles and 29 of 53 descriptions were long enough that Google cut
 * them off mid-sentence in the results. The cause was a long brand suffix
 * repeated on every page — "| TutorPro English PH" is 21 characters of a
 * ~60-character budget, and on several pages it pushed the keyword itself
 * out of view. The homepage read:
 *
 *   "Online English Classes for Kids & Students | TutorPro English PH"  (68)
 *
 * A truncated title is a weaker result to click on, and the click is the
 * whole point of ranking.
 *
 * Limits used here: 60 characters for a title and 160 for a description.
 * Google measures pixels, not characters, so these are the usual safe
 * proxies rather than hard rules.
 *
 * This reads the BUILT pages, so it covers the generators and the
 * hand-maintained files equally. Run `npm run build` first.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const dist = join(root, 'dist')

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

if (!existsSync(dist)) {
  console.error('dist/ is missing — run `npm run build` first.')
  process.exit(1)
}

const TITLE_MAX = 60
const DESC_MAX = 160
const DESC_MIN = 70

/* Not pages: search-engine verification files, and the Chinese page whose
   copy is maintained by hand in Chinese. */
const SKIP = /google[0-9a-f]+\.html|naver[0-9a-f]+\.html|404\.html/

const files = []
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (entry.name.endsWith('.html') && !SKIP.test(full)) files.push(full)
  }
}
walk(dist)

const decode = (value) => value
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')

const pick = (html, re) => { const m = html.match(re); return m ? decode(m[1]).trim() : '' }

const titles = new Map()
const descriptions = new Map()
const longTitles = []
const longDescriptions = []
const shortDescriptions = []
const missing = []

for (const file of files) {
  const name = file.replace(dist, '') || '/'
  const html = readFileSync(file, 'utf8')
  const title = pick(html, /<title>([\s\S]*?)<\/title>/i)
  const description = pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)

  if (!title) missing.push(`${name} has no <title>`)
  if (!description) missing.push(`${name} has no meta description`)
  if (title.length > TITLE_MAX) longTitles.push(`${name} — ${title.length} chars: "${title}"`)
  if (description.length > DESC_MAX) longDescriptions.push(`${name} — ${description.length} chars`)
  if (description && description.length < DESC_MIN) shortDescriptions.push(`${name} — only ${description.length} chars`)

  if (title) titles.set(title, [...(titles.get(title) || []), name])
  if (description) descriptions.set(description, [...(descriptions.get(description) || []), name])
}

console.log(`${files.length} built pages\n`)
ok(missing.length === 0, `every page has a title and a description (${missing.join('; ') || 'all present'})`)
ok(longTitles.length === 0, `no title is over ${TITLE_MAX} characters${longTitles.length ? ':\n        ' + longTitles.join('\n        ') : ''}`)
ok(longDescriptions.length === 0, `no description is over ${DESC_MAX} characters${longDescriptions.length ? ':\n        ' + longDescriptions.join('\n        ') : ''}`)

/* Two pages with the same title are two pages competing for the same result,
   and Google picks one and ignores the other. */
const duplicateTitles = [...titles.entries()].filter(([, list]) => list.length > 1)
ok(duplicateTitles.length === 0, `no two pages share a title${duplicateTitles.length ? ': ' + duplicateTitles.map(([t, l]) => `"${t}" on ${l.join(', ')}`).join(' | ') : ''}`)
const duplicateDescriptions = [...descriptions.entries()].filter(([, list]) => list.length > 1)
ok(duplicateDescriptions.length === 0, `no two pages share a description${duplicateDescriptions.length ? ': ' + duplicateDescriptions.map(([, l]) => l.join(', ')).join(' | ') : ''}`)

/* The homepage is the page most parents land on, so it is checked by name. */
const home = readFileSync(join(dist, 'index.html'), 'utf8')
const homeTitle = pick(home, /<title>([\s\S]*?)<\/title>/i)
ok(/online english classes for kids/i.test(homeTitle), `the homepage title leads with the main search term: "${homeTitle}"`)
ok(homeTitle.length <= TITLE_MAX, `and fits (${homeTitle.length} chars)`)
const h1 = pick(home, /<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, '')
ok(/online english classes for kids/i.test(h1), `the prerendered H1 matches the title: "${h1.trim()}"`)

/* Short descriptions are a missed opportunity rather than a fault, so they
   are reported but do not fail the run. */
if (shortDescriptions.length) console.log(`\n  --   ${shortDescriptions.length} descriptions are shorter than ${DESC_MIN} chars (not a failure):\n        ${shortDescriptions.join('\n        ')}`)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
