/**
 * What is actually wrong with this site's SEO, measured rather than assumed.
 *
 * Reads every URL in the sitemap and reports only defects: duplicate or
 * missing titles and descriptions, title/description lengths that Google
 * will truncate, missing or wrong canonicals, H1 problems, heading order,
 * images with no alt text, internal links that 404, and invalid structured
 * data. It writes a report; it changes nothing.
 */
import { writeFileSync } from 'node:fs'

const BASE = process.env.BASE || 'https://www.tutorpro.site'

const text = async (url) => {
  const res = await fetch(url, { redirect: 'manual' })
  return { status: res.status, location: res.headers.get('location'), body: res.status < 400 ? await res.text() : '' }
}

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text()
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
console.log(`sitemap: ${urls.length} URLs\n`)

const pick = (html, re) => { const m = html.match(re); return m ? m[1].trim() : '' }
const all = (html, re) => [...html.matchAll(re)].map((m) => m[1].trim())

const pages = []
for (const url of urls) {
  const { status, body } = await text(url)
  if (status !== 200) { pages.push({ url, status }); continue }
  const headings = [...body.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => ({ level: Number(m[1]), text: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }))
    .filter((h) => h.text)
  const imgs = [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0])
  const jsonld = [...body.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1])
  pages.push({
    url,
    status,
    title: pick(body, /<title>([\s\S]*?)<\/title>/i),
    description: pick(body, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i),
    canonical: pick(body, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i),
    robots: pick(body, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i),
    og: pick(body, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i),
    headings,
    h1: headings.filter((h) => h.level === 1),
    imgsNoAlt: imgs.filter((tag) => !/\balt=/.test(tag)),
    imgsEmptyAlt: imgs.filter((tag) => /\balt=["']\s*["']/.test(tag)),
    imgCount: imgs.length,
    lazy: imgs.filter((tag) => /loading=["']lazy["']/.test(tag)).length,
    jsonldTypes: jsonld.flatMap((raw) => { try { const j = JSON.parse(raw); return (Array.isArray(j) ? j : [j]).map((n) => n['@type']) } catch { return ['INVALID-JSON'] } }),
    links: [...new Set(all(body, /<a\b[^>]+href=["']([^"'#?]+)["']/gi))]
      .filter((href) => href.startsWith('/') || href.startsWith(BASE))
      .map((href) => (href.startsWith('/') ? BASE + href : href)),
    words: body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ').split(/\s+/).filter((w) => w.length > 1).length,
  })
}

const report = []
const add = (severity, page, message) => report.push({ severity, page: page.replace(BASE, '') || '/', message })

/* ---- duplicates ---- */
const byTitle = new Map(); const byDesc = new Map()
pages.filter((p) => p.status === 200).forEach((p) => {
  byTitle.set(p.title, [...(byTitle.get(p.title) || []), p.url])
  byDesc.set(p.description, [...(byDesc.get(p.description) || []), p.url])
})
for (const [title, list] of byTitle) if (list.length > 1) add('HIGH', list.join(' , '), `${list.length} pages share the title "${title.slice(0, 70)}"`)
for (const [desc, list] of byDesc) if (list.length > 1 && desc) add('HIGH', list.join(' , '), `${list.length} pages share the meta description "${desc.slice(0, 60)}…"`)

/* ---- per page ---- */
for (const p of pages) {
  if (p.status !== 200) { add('HIGH', p.url, `returns HTTP ${p.status} but is in the sitemap`); continue }
  if (!p.title) add('HIGH', p.url, 'no <title>')
  else if (p.title.length > 62) add('MED', p.url, `title is ${p.title.length} chars, Google will cut it: "${p.title}"`)
  else if (p.title.length < 25) add('MED', p.url, `title is only ${p.title.length} chars: "${p.title}"`)
  if (!p.description) add('HIGH', p.url, 'no meta description')
  else if (p.description.length > 165) add('MED', p.url, `description is ${p.description.length} chars, will be cut`)
  else if (p.description.length < 70) add('LOW', p.url, `description is only ${p.description.length} chars`)
  if (!p.canonical) add('HIGH', p.url, 'no canonical')
  else if (p.canonical.replace(/\/$/, '') !== p.url.replace(/\/$/, '')) add('HIGH', p.url, `canonical points elsewhere: ${p.canonical}`)
  if (/noindex/i.test(p.robots)) add('HIGH', p.url, 'is noindex but is in the sitemap')
  if (p.h1.length === 0) add('HIGH', p.url, 'no H1')
  if (p.h1.length > 1) add('MED', p.url, `${p.h1.length} H1s: ${p.h1.map((h) => h.text.slice(0, 30)).join(' | ')}`)
  if (p.imgsNoAlt.length) add('MED', p.url, `${p.imgsNoAlt.length} of ${p.imgCount} images have no alt attribute`)
  if (!p.og) add('LOW', p.url, 'no og:image, so shared links show no picture')
  if (p.words < 300) add('MED', p.url, `only ~${p.words} words of text`)
  if (p.jsonldTypes.includes('INVALID-JSON')) add('HIGH', p.url, 'structured data is not valid JSON')
  /* heading order */
  let previous = 1
  for (const h of p.headings) {
    if (h.level > previous + 1) { add('LOW', p.url, `heading jumps from H${previous} to H${h.level} ("${h.text.slice(0, 40)}")`); break }
    previous = h.level
  }
}

/* ---- internal links ---- */
const known = new Set(pages.map((p) => p.url.replace(/\/$/, '')))
const checked = new Map()
for (const p of pages.filter((x) => x.status === 200)) {
  for (const href of p.links) {
    const clean = href.replace(/\/$/, '')
    if (known.has(clean)) continue
    if (!checked.has(clean)) {
      const res = await fetch(clean, { redirect: 'manual' }).catch(() => null)
      checked.set(clean, res ? { status: res.status, to: res.headers.get('location') } : { status: 0 })
    }
    const result = checked.get(clean)
    if (result.status >= 400 || result.status === 0) add('HIGH', p.url, `links to ${clean.replace(BASE, '')} which returns ${result.status || 'no response'}`)
    else if (result.status >= 300) add('LOW', p.url, `links to ${clean.replace(BASE, '')} which redirects to ${result.to}`)
  }
}

/* ---- orphan check: which pages nothing links to ---- */
const linkedTo = new Set()
pages.forEach((p) => p.links.forEach((l) => linkedTo.add(l.replace(/\/$/, ''))))
pages.filter((p) => p.status === 200).forEach((p) => {
  const self = p.url.replace(/\/$/, '')
  if (self !== BASE.replace(/\/$/, '') && !linkedTo.has(self)) add('HIGH', p.url, 'no other page links to it — Google may never find it')
})

const order = { HIGH: 0, MED: 1, LOW: 2 }
report.sort((a, b) => order[a.severity] - order[b.severity] || a.page.localeCompare(b.page))
const counts = report.reduce((acc, r) => ({ ...acc, [r.severity]: (acc[r.severity] || 0) + 1 }), {})
console.log(`HIGH ${counts.HIGH || 0} · MED ${counts.MED || 0} · LOW ${counts.LOW || 0}\n`)
for (const r of report) console.log(`${r.severity.padEnd(5)} ${r.page.slice(0, 60).padEnd(62)} ${r.message}`)

writeFileSync('/home/user/tutorpro/seo-audit.json', JSON.stringify({ pages: pages.map(({ links, headings, ...rest }) => rest), report }, null, 2))
console.log('\nwrote seo-audit.json')
