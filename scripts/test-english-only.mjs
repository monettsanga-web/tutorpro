/* Owner 2026-10-29: "remove the other subjects, only english, include all
   countries." Locks the English-only offer everywhere: the bookable
   catalogue, the programmes grid, the booking select, teacher
   specialisations, every generated and static page, the sitemap, and
   301s for the three retired subject URLs. Legacy records still resolve
   their old subject labels, so nothing in the database is orphaned. */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
let pass = 0; let fail = 0
const ok = (cond, label) => { if (cond) { pass += 1 } else { fail += 1; console.log(`FAIL  ${label}`) } }

const subjects = read('src/subjects.js')
const app = read('src/App.jsx')
const dash = read('src/Dashboards.jsx')
const vercel = JSON.parse(read('vercel.json'))
const sitemap = read('public/sitemap.xml')

/* catalogue: legacy labels kept, offer filtered */
ok((subjects.match(/offered: false/g) || []).length === 3, 'Maths, Science and ICT are flagged offered:false')
ok(/export const OFFERED_SUBJECTS = SUBJECTS\.filter\(\(subject\) => subject\.offered !== false\)/.test(subjects), 'OFFERED_SUBJECTS is the single bookable list')
ok(!/Maths|\bICT\b|Science/.test(subjects.slice(subjects.indexOf('TEACHER_SPECIALIZATIONS'))), 'teacher specialisations name courseware only, no other subject')

/* app surfaces */
ok(app.includes('English · Ages 4–16'), 'hero eyebrow is English only')
ok(!/Maths · Science/.test(app), 'no subject list left in the hero')
ok(/OFFERED_SUBJECTS\.map\(\(subject\) => \{/.test(app), 'the programmes grid renders the offered list only')
ok(/English only — taught one-to-one/.test(app), 'the programmes intro says English only')
ok(!/online-maths-tutor-for-kids|online-science-tutor|online-ict-computing/.test(app), 'no link to a retired subject page remains in the app')
ok(/OFFERED_SUBJECTS\.map\(\(subject\) => <option/.test(dash), 'new bookings can only choose English')

/* static + generated copy */
ok(!/We also teach Maths/.test(read('public/faq.html')), 'faq.html no longer offers other subjects')
ok(!/We also teach Maths/.test(read('scripts/build-core-pages.mjs')), 'generated core/country pages no longer offer other subjects')
ok(/from 4 to 16, in English\./.test(read('public/contact.html')), 'contact FAQ is English only')
ok(!/online-maths-tutor-for-kids/.test(read('scripts/prerender-home.mjs')), 'prerender links English sub-skills, not retired pages')

/* retired pages: gone, redirected, unsitemapped */
for (const slug of ['online-maths-tutor-for-kids.html', 'online-science-tutor-for-kids.html', 'online-ict-computing-classes-for-kids.html']) {
  ok(!existsSync(new URL(`../public/${slug}`, import.meta.url)), `${slug} removed from the site`)
  ok((vercel.redirects || []).some((r) => r.source === `/${slug}` && r.destination === '/online-english-classes-for-kids'), `${slug} 301s to the English classes page`)
  ok(!sitemap.includes(slug), `${slug} left the sitemap`)
}

/* every built page, home and all countries included, is free of the offer */
const dist = new URL('../dist/', import.meta.url).pathname
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full)
    else if (entry.endsWith('.html')) {
      const html = readFileSync(full, 'utf8')
      if (/online-maths-tutor-for-kids|We also teach Maths/.test(html)) { ok(false, `${entry} still offers another subject`) }
    }
  }
}
let distPages = 0
const count = (dir) => { for (const e of readdirSync(dir)) { const f = join(dir, e); if (statSync(f).isDirectory()) count(f); else if (e.endsWith('.html')) distPages += 1 } }
count(dist)
walk(dist)
ok(distPages > 60, `the sweep covered every built page (${distPages})`)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
