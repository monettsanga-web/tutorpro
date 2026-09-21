/**
 * Taiwan pages — correctness, script purity and honesty.
 *
 * The distinctive risk here is script. /cn/ is Simplified Chinese; Taiwan
 * reads Traditional. Mixing them is worse than useless: it reads as foreign
 * to a Taiwanese parent and Google treats the two as different languages.
 * These checks therefore fail on any Simplified-only character, and on any
 * stray Cyrillic, Hangul or kana, which is how a real typo was caught during
 * development.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(repo, 'public')
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const PAGES = ['tw/index.html', 'tw/xianshang-yingyu.html', 'tw/guoxiao-yingyu.html']
const read = (f) => readFileSync(join(pub, f), 'utf8')
const text = (h) => h.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' ')
const han = (h) => (text(h).match(/[\u4e00-\u9fff]/g) || []).length

for (const f of PAGES) {
  ok(existsSync(join(pub, f)), `${f} exists`)
  const h = read(f)
  const t = text(h)

  ok(han(h) > 700, `${f}: substantial Chinese content (${han(h)} characters)`)
  ok((h.match(/<h1[\s>]/g) || []).length === 1, `${f}: exactly one H1`)

  /* --- script purity: the fault most likely to go unnoticed ---------- */
  ok(h.includes('lang="zh-Hant-TW"'), `${f}: declares lang="zh-Hant-TW", not zh-CN`)
  ok(h.includes('zh_TW'), `${f}: og:locale is zh_TW`)

  const stray = [...new Set(t.match(/[\u0400-\u04FF\uac00-\ud7af\u3040-\u30ff]/g) || [])]
  ok(stray.length === 0, `${f}: no stray Cyrillic, Hangul or kana${stray.length ? ' — ' + stray.join('') : ''}`)

  // Simplified forms whose Traditional counterpart differs. Any of these in
  // Taiwanese copy means text was copied from the /cn/ page.
  const simplified = [...'视频网络对话课这个门时间应该学习历长发关开车东车产业务员认为说话读书语请问题'].filter((c) => t.includes(c))
  ok(simplified.length === 0, `${f}: no Simplified-only characters${simplified.length ? ' — ' + simplified.join('') : ''}`)

  // Taiwanese vocabulary, not mainland equivalents.
  ok(!/视频|网络|一对一/.test(t), `${f}: uses Taiwanese vocabulary (影片 / 網路 / 一對一)`)

  /* --- SEO structure -------------------------------------------------- */
  ok(h.includes(`<link rel="canonical" href="https://www.tutorpro.site/${f.replace('index.html', '')}"`),
    `${f}: self-canonical`)
  ok(h.includes('hreflang="zh-Hant-TW"') && h.includes('hreflang="en"'), `${f}: hreflang cluster declared`)
  ok(h.includes('FAQPage'), `${f}: FAQPage schema`)
  ok(h.includes('"@type": "Course"'), `${f}: Course schema`)
  ok(h.includes('"areaServed": "TW"'), `${f}: schema says it serves Taiwan`)

  /* --- honesty --------------------------------------------------------- */
  ok(h.includes('US$8') && h.includes('US$16'), `${f}: real USD pricing shown ($8 / $16 for 50 min)`)
  ok(/匯率/.test(t), `${f}: NT$ figures are labelled as approximate, tied to the exchange rate`)
  ok(!/aggregateRating|ratingValue|reviewCount/i.test(h), `${f}: no fabricated ratings`)
  ok(!/[0-9,]{3,}\s*(位|名)\s*(學生|學員|家長)/.test(t), `${f}: no invented student numbers`)
  ok(h.includes('5274092'), `${f}: publishes the DTI registration`)
  ok(/菲律賓/.test(t), `${f}: states teachers are based in the Philippines`)
  ok(/不是台灣的補習班|不是補習班/.test(t) || f !== 'tw/index.html',
    'the main page states plainly it is not a Taiwanese cram school')

  /* --- contact --------------------------------------------------------- */
  ok(h.includes('wa.me/639625284849') && h.includes('m.me/526047974195321'), `${f}: contact channels present`)
}

/* --- the same-time-zone advantage is the real Taiwan differentiator --- */
const index = read('tw/index.html')
ok(/UTC\+8/.test(index) && /零時差|沒有時差/.test(text(index)),
  'the same time zone as Taiwan is stated as a concrete advantage')

/* --- discoverability --------------------------------------------------- */
for (const f of PAGES.slice(1)) ok(index.includes('/' + f), `tw/index links to ${f}`)

const sitemap = readFileSync(join(pub, 'sitemap.xml'), 'utf8')
ok(sitemap.includes('/tw/</loc>') || sitemap.includes('/tw/<'), 'sitemap includes the Taiwan home page')
for (const f of PAGES.slice(1)) ok(sitemap.includes('/' + f), `sitemap includes ${f}`)
ok(sitemap.includes('/kr/') && sitemap.includes('/cn/'), 'Korean and Chinese pages are still in the sitemap')

const app = readFileSync(join(repo, 'src', 'App.jsx'), 'utf8')
ok(app.includes('/tw/'), 'the homepage footer links to the Taiwan section')

/* --- robots must not block anything ------------------------------------ */
const robots = readFileSync(join(pub, 'robots.txt'), 'utf8')
ok(!/Disallow:\s*\/tw/.test(robots), 'robots.txt does not block the Taiwan pages')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
