/**
 * Korean discovery pages — correctness and honesty checks.
 *
 * Korea does not run on Google. These checks confirm the pages are actually
 * findable by Naver and Daum, that the Korean-language SEO signals are
 * present, and above all that nothing claims more than is true: the pricing
 * must match the real rates and the Philippine base must be stated, not
 * obscured.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(repo, 'public')

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const PAGES = [
  'kr/index.html',
  'kr/hwasang-yeongeo.html',
  'kr/choding-yeongeo.html',
  'kr/philippine-hwasang-yeongeo.html',
]

const read = (p) => readFileSync(join(pub, p), 'utf8')
const textOf = (h) => h.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' ')
const koreanChars = (h) => (textOf(h).match(/[가-힣]/g) || []).length

/* --- every page exists and is substantial --------------------------- */
for (const p of PAGES) {
  ok(existsSync(join(pub, p)), `${p} exists`)
}

for (const p of PAGES) {
  const h = read(p)
  const ko = koreanChars(h)
  ok(ko > 600, `${p}: substantial Korean content (${ko} Hangul characters)`)
  ok((h.match(/<h1[\s>]/g) || []).length === 1, `${p}: exactly one H1`)
  ok(h.includes('lang="ko"'), `${p}: declares lang="ko"`)
  ok(h.includes('og:locale') && h.includes('ko_KR'), `${p}: sets og:locale ko_KR`)
  ok(h.includes('rel="canonical"'), `${p}: has a canonical URL`)
  ok(h.includes('hreflang="ko"') && h.includes('hreflang="en"'), `${p}: hreflang links both languages`)
  ok(h.includes('application/ld+json'), `${p}: carries structured data`)
}

/* --- HONESTY: pricing must match the real rates --------------------- */
// $10 per 25-minute lesson and $20 per 50-minute lesson, expressed in won.
for (const p of PAGES) {
  const h = read(p)
  ok(h.includes('₩15,000'), `${p}: shows the real 25-minute price (₩15,000)`)
  ok(h.includes('₩30,000'), `${p}: shows the real 50-minute price (₩30,000)`)
  ok(!/₩\s?9,000|₩\s?5,000|무제한/.test(h), `${p}: no invented cheaper price or "unlimited" claim`)
}

/* --- HONESTY: no fabricated social proof ---------------------------- */
for (const p of PAGES) {
  const h = read(p)
  ok(!/aggregateRating|ratingValue|reviewCount/i.test(h), `${p}: no fake rating schema`)
  ok(!/[0-9,]{3,}\s*명\s*(의)?\s*(학생|수강생|회원)/.test(textOf(h)),
    `${p}: no invented student numbers`)
}

/* --- HONESTY: the Philippine base is stated, not hidden -------------- */
for (const p of PAGES) {
  const h = read(p)
  ok(h.includes('필리핀'), `${p}: states that teaching is Philippine-based`)
  ok(h.includes('5274092'), `${p}: publishes the DTI registration number`)
  ok(!/한국\s*학원|국내\s*학원/.test(textOf(h).replace(/한국 학원이 아니라|한국의 학원이 아니고|한국 학원과/g, '')),
    `${p}: never implies it is a Korean hagwon`)
}

/* --- discoverability: pages link to each other ----------------------- */
const index = read('kr/index.html')
ok(index.includes('/kr/hwasang-yeongeo.html'), 'kr/index links to the 화상영어 page')
ok(index.includes('/kr/choding-yeongeo.html'), 'kr/index links to the 초등영어 page')
ok(index.includes('/kr/philippine-hwasang-yeongeo.html'), 'kr/index links to the 필리핀 화상영어 page')

for (const p of PAGES.slice(1)) {
  const h = read(p)
  ok(h.includes('href="/kr/"'), `${p}: links back to the Korean home page`)
  const others = PAGES.slice(1).filter((o) => o !== p)
  ok(others.every((o) => h.includes('/' + o)), `${p}: links to the other Korean pages`)
}

/* --- contact channels Korean parents can actually use ---------------- */
for (const p of PAGES) {
  const h = read(p)
  ok(h.includes('wa.me/639625284849'), `${p}: WhatsApp contact present`)
  ok(h.includes('m.me/526047974195321'), `${p}: Messenger contact present`)
  ok(h.includes('facebook.com/tutorproenglish'), `${p}: Facebook page linked`)
  ok(h.includes('sejongenglish@yahoo.com'), `${p}: email contact present`)
}

/* --- robots.txt must welcome the Korean crawlers --------------------- */
const robots = readFileSync(join(pub, 'robots.txt'), 'utf8')
ok(/User-agent:\s*Yeti/i.test(robots), 'robots.txt names Naver\u2019s crawler (Yeti)')
ok(/User-agent:\s*Daum/i.test(robots), 'robots.txt names Daum')
ok(robots.includes('sitemap.xml'), 'robots.txt still points at the sitemap')

/* --- sitemap must carry every Korean page ---------------------------- */
const sitemap = readFileSync(join(pub, 'sitemap.xml'), 'utf8')
ok(sitemap.includes('/kr/</loc>') || sitemap.includes('/kr/<'), 'sitemap includes the Korean home page')
for (const p of PAGES.slice(1)) {
  ok(sitemap.includes('/' + p), `sitemap includes ${p}`)
}
ok(sitemap.includes('/cn/'), 'sitemap still includes the Chinese page (not regressed)')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
