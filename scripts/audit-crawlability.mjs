/**
 * Why Google says "Discovered - currently not indexed".
 *
 * That status does not mean a page is bad. It means Google knows the URL
 * exists, has queued it, and has decided it is not worth spending a crawl
 * on yet. Two things drive that decision on a small site:
 *
 *   1. ORPHANS. A page that no other page links to looks like something
 *      nobody cares about. Being in the sitemap is a hint, not a vote.
 *      Internal links are the vote.
 *   2. NEAR-DUPLICATES. Pages generated from one template, differing by a
 *      city or a subject name, look to a crawler like the same page again.
 *      Crawling the fifth one has little expected value.
 *
 * This measures both against the LIVE site, and prints the pages that are
 * invisible from the rest of the site and the pairs that read as copies.
 *
 * Run: node scripts/audit-crawlability.mjs
 */
const BASE = process.env.BASE || 'https://www.tutorpro.site'

const sitemapXml = await (await fetch(`${BASE}/sitemap.xml`)).text()
const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
console.log(`sitemap: ${urls.length} URLs\n`)

const norm = (u) => u.replace(/^https?:\/\/[^/]+/, '').replace(/#.*$/, '').replace(/\?.*$/, '') || '/'
const pages = new Map()

for (const url of urls) {
  const response = await fetch(url).catch(() => null)
  const html = response && response.ok ? await response.text() : ''
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, ' ')
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
  const links = [...body.matchAll(/<a\b[^>]+href="([^"]+)"/gi)]
    .map((m) => m[1])
    .filter((href) => href.startsWith('/') || href.startsWith(BASE))
    .map(norm)
  pages.set(norm(url), {
    url,
    status: response?.status || 0,
    text,
    links: [...new Set(links)],
    title: (html.match(/<title>([\s\S]*?)<\/title>/i) || [, ''])[1].trim(),
  })
}

/* ---------- inbound links ---------- */
const inbound = new Map([...pages.keys()].map((key) => [key, new Set()]))
for (const [from, page] of pages) {
  for (const to of page.links) if (inbound.has(to) && to !== from) inbound.get(to).add(from)
}

const orphans = [...inbound.entries()].filter(([, from]) => from.size === 0).map(([key]) => key)
const weak = [...inbound.entries()].filter(([, from]) => from.size > 0 && from.size <= 1).map(([key, from]) => `${key}  (1 link, from ${[...from][0]})`)

console.log(`ORPHANS - nothing on the site links to these (${orphans.length})`)
orphans.forEach((key) => console.log('  ' + key))
console.log(`\nONE INBOUND LINK ONLY (${weak.length})`)
weak.slice(0, 20).forEach((line) => console.log('  ' + line))

/* ---------- near-duplicate text ---------- */
function shingles(text) {
  const words = text.split(' ').filter(Boolean)
  const out = new Set()
  for (let i = 0; i + 4 < words.length; i += 1) out.add(words.slice(i, i + 5).join(' '))
  return out
}
const fingerprints = new Map([...pages].map(([key, page]) => [key, shingles(page.text)]))

const pairs = []
const keys = [...pages.keys()]
for (let i = 0; i < keys.length; i += 1) {
  for (let j = i + 1; j < keys.length; j += 1) {
    const a = fingerprints.get(keys[i]); const b = fingerprints.get(keys[j])
    if (a.size < 40 || b.size < 40) continue
    let shared = 0
    for (const shingle of a) if (b.has(shingle)) shared += 1
    const similarity = shared / Math.min(a.size, b.size)
    if (similarity >= 0.6) pairs.push({ a: keys[i], b: keys[j], similarity })
  }
}
pairs.sort((x, y) => y.similarity - x.similarity)
console.log(`\nNEAR-DUPLICATE PAIRS, 60%+ of the smaller page's phrasing shared (${pairs.length})`)
pairs.slice(0, 25).forEach((p) => console.log(`  ${(p.similarity * 100).toFixed(0)}%  ${p.a}  ==  ${p.b}`))

const counts = new Map()
pairs.forEach((p) => { counts.set(p.a, (counts.get(p.a) || 0) + 1); counts.set(p.b, (counts.get(p.b) || 0) + 1) })
console.log(`\nMOST TEMPLATED PAGES`)
;[...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([key, n]) => console.log(`  ${n} twins  ${key}`))
