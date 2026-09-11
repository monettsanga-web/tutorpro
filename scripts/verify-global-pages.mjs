/**
 * Global landing pages — structure, honesty and discoverability.
 *
 * These pages exist to rank internationally, so the checks focus on the
 * things that actually decide that: one H1, a self-canonical, real structured
 * data, genuine internal links, and enough distinct content to be worth
 * ranking. The honesty checks matter just as much — an invented rating or a
 * price that contradicts the rest of the site is both a trust problem and a
 * penalty risk.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(repo, 'public')
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const PAGES = [
  'online-english-classes-for-kids.html',
  'online-english-tutor-for-kids.html',
  'online-english-class-schedule-time-zones.html',
]

const read = (f) => readFileSync(join(pub, f), 'utf8')
const text = (h) => h.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' ')

for (const f of PAGES) {
  ok(existsSync(join(pub, f)), `${f} exists`)
  const h = read(f)
  const words = text(h).split(/\s+/).filter(Boolean).length

  ok(words >= 600, `${f}: enough content to rank (${words} words)`)
  ok((h.match(/<h1[\s>]/g) || []).length === 1, `${f}: exactly one H1`)
  ok(h.includes(`<link rel="canonical" href="https://www.tutorpro.site/${f}"`), `${f}: self-canonical`)
  ok(h.includes('hreflang="x-default"'), `${f}: declares x-default for international search`)
  ok(h.includes('"@type":"FAQPage"') || h.includes('"@type": "FAQPage"'), `${f}: FAQPage schema`)
  ok(h.includes('"@type":"Course"') || h.includes('"@type": "Course"'), `${f}: Course schema`)
  ok(h.includes('BreadcrumbList'), `${f}: BreadcrumbList schema`)
  ok(h.includes('"areaServed":"Worldwide"') || h.includes('"areaServed": "Worldwide"'), `${f}: schema says served worldwide`)
  ok(h.includes('name="description"'), `${f}: has a meta description`)
  ok(h.includes('og:title') && h.includes('twitter:card'), `${f}: social preview tags`)

  // Internal links: an orphan page does not rank.
  const links = (h.match(/href="\/[a-z0-9-]+\.html"/g) || []).length
  ok(links >= 5, `${f}: linked to the rest of the site (${links} internal links)`)

  /* --- honesty --------------------------------------------------- */
  ok(!/aggregateRating|ratingValue|reviewCount/i.test(h), `${f}: no fabricated rating schema`)
  ok(!/[0-9,]{4,}\s*(happy\s+)?(students|families|parents)/i.test(text(h)), `${f}: no invented student numbers`)
  ok(h.includes('$10') && h.includes('$8'), `${f}: real pricing ($10 weekly / $8 monthly)`)
  ok(!/\$[1-7]\b/.test(text(h).replace(/\$8|\$10/g, '')), `${f}: no cheaper price invented`)
  ok(h.includes('5274092'), `${f}: publishes the DTI registration`)
  ok(/Philippine|Philippines/.test(text(h)), `${f}: states where teachers are based`)
}

/* --- only the English page may claim Cambridge/Oxford alignment ------ */
const classes = read('online-english-classes-for-kids.html')
ok(/Cambridge/.test(classes) && /Oxford/.test(classes), 'the English classes page cites its real course books')

/* --- the tutor page must keep its honest limitation ------------------ */
const tutor = read('online-english-tutor-for-kids.html')
ok(/not identical|better match|suits you better/i.test(tutor),
  'the tutor page admits when a different provider suits the parent better')

/* --- the time-zone page must be honest about the Americas ------------ */
const tz = read('online-english-class-schedule-time-zones.html')
ok(/hardest fit/i.test(tz), 'the time-zone page states plainly that the Americas are the hardest fit')
ok(/UTC\+8/.test(tz), 'the time-zone page publishes the real teacher time zone')

/* --- discoverability -------------------------------------------------- */
const sitemap = readFileSync(join(pub, 'sitemap.xml'), 'utf8')
for (const f of PAGES) ok(sitemap.includes(`/${f}`), `sitemap includes ${f}`)

const app = readFileSync(join(repo, 'src', 'App.jsx'), 'utf8')
ok(app.includes('/online-english-classes-for-kids.html'), 'the homepage footer links to the classes page')
ok(app.includes('/online-english-tutor-for-kids.html'), 'the homepage footer links to the tutor page')
ok(app.includes('/online-english-class-schedule-time-zones.html'), 'the homepage footer links to the time-zone guide')

/* --- the teacher portal must not reappear in any generated page ------- */
for (const f of PAGES) ok(!/teacher portal/i.test(read(f)), `${f}: no teacher portal link`)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
