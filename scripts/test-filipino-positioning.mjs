/* The owner's positioning: the teachers are Filipino English speakers at a
 * near-native level, and the site must say so everywhere a searching parent
 * can land - the homepage meta and hero, the prerendered copy Google reads
 * first, the money pages and the country pages. This pins each surface, so
 * a future copy edit cannot silently drop the positioning from one of them.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const read = (relative) => readFileSync(resolve(here, '..', relative), 'utf8')

let failures = 0
const ok = (condition, label) => {
  console.log(`${condition ? 'ok  ' : 'FAIL'} ${label}`)
  if (!condition) failures += 1
}

const home = read('index.html')
const app = read('src/App.jsx')
const prerender = read('scripts/prerender-home.mjs')

const description = home.match(/<meta name="description" content="([^"]*)"/)?.[1] || ''
ok(/Filipino English teachers/i.test(description), 'homepage meta description carries the Filipino positioning')
ok(description.length > 0 && description.length <= 160, `homepage description survives Google's cut (${description.length} chars)`)

const appTagline = app.match(/hero__tagline">([^<]*)</)?.[1] || ''
const prerenderTagline = prerender.match(/tagline: '([^']*)',/)?.[1] || ''
ok(appTagline.length > 0 && appTagline === prerenderTagline, 'hero tagline matches between React and the prerender')
ok(/near-native Filipino English teachers/i.test(appTagline), 'hero tagline states near-native Filipino teachers')

ok(app.includes('function FilipinoTeachers'), 'the homepage renders a Filipino teachers section')
ok(app.includes('teacher-near-native'), 'public teacher cards carry the near-native badge')
ok(prerender.includes('Near-Native Filipino English Teachers'), 'the prerendered copy Google reads first includes the section')

for (const page of [
  'public/teachers.html',
  'public/online-english-classes-for-kids.html',
  'public/online-english-classes-italy.html',
  'public/online-english-classes-korea.html',
  'public/how-it-works.html',
]) {
  ok(read(page).includes('Near-native Filipino English teachers'), `${page} carries the Filipino teachers band`)
}

console.log(failures ? `${failures} failed` : 'all filipino positioning checks passed')
process.exit(failures ? 1 : 0)
