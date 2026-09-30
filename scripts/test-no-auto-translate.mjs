/**
 * The website is not machine-translated, and each language has its own URL.
 *
 * THE FAULT THIS LOCKS OUT
 * ------------------------
 * `AutoTranslate.jsx` looked up the visitor's country from their IP and then
 * ran the whole site through the Google Translate widget, at the same URL.
 * For search engines that is three separate problems:
 *
 *   1. https://www.tutorpro.site/ returned different content depending on
 *      where the request came from. Google crawls from a small number of
 *      locations and explicitly advises against varying content by IP; it
 *      may never see the version you meant it to index.
 *   2. `document.title = pageTitles[language]` replaced the title written
 *      for search with a tagline. Google renders JavaScript, so that is the
 *      title that could end up in the results.
 *   3. It produced machine Korean and Chinese at the English URL, competing
 *      with the real /kr/, /cn/ and /tw/ pages, which already carry hreflang.
 *
 * The site keeps one language per URL. The support chat still translates
 * messages; notification emails still follow the IP country. Neither of
 * those changes a word of the page a crawler downloads.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const read = (file) => readFileSync(join(root, file), 'utf8')

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

/* These files EXPLAIN the bug in their comments, quoting the very lines that
   are banned. Scanning the raw text flagged the explanation as the offence.
   Strip comments and string literals before looking for real code. */
const code = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')

/* ================================================================== */
/* 1. The translation widget is gone from the whole project            */
/* ================================================================== */
const sources = []
const walk = (dir) => {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(jsx?|css|html|ts)$/.test(entry.name)) sources.push(full)
  }
}
walk(join(root, 'src'))
walk(join(root, 'public'))
sources.push(join(root, 'index.html'))

const offenders = sources.filter((file) => {
  const text = readFileSync(file, 'utf8')
  /* VisitorCountry.jsx is allowed to mention them: it exists to clean up
     the cookie and widget left behind on returning visitors' browsers. */
  if (file.endsWith('VisitorCountry.jsx')) return false
  return /translate\.google\.com|googleTranslateElement|googtrans/.test(code(text))
})
ok(offenders.length === 0, `nothing loads Google Translate (${offenders.map((f) => f.replace(root + '/', '')).join(', ') || 'none'})`)
ok(!existsSync(join(root, 'src/AutoTranslate.jsx')), 'the auto-translating component is deleted')
ok(existsSync(join(root, 'src/VisitorCountry.jsx')), 'and replaced by one that only detects the country')

/* ================================================================== */
/* 2. Nothing rewrites the title or the declared language              */
/* ================================================================== */
const rewriters = sources.filter((file) => {
  if (!/\.jsx?$/.test(file)) return false
  const text = code(readFileSync(file, 'utf8'))
  return /document\.title\s*=/.test(text) || /documentElement\.lang\s*=/.test(text)
})
ok(
  rewriters.length === 0,
  `no script overwrites <title> or the page language (${rewriters.map((f) => f.replace(root + '/', '')).join(', ') || 'none'})`,
)

const detector = read('src/VisitorCountry.jsx')
ok(!/document\.title/.test(code(detector)), 'the detector leaves the search-targeted title alone')
ok(/clearOldTranslationState/.test(detector), 'it clears the googtrans cookie left on returning visitors')
ok(/api\.country\.is|ipwho\.is/.test(detector), 'it still resolves the IP country')
ok(/tutorpro:language-change/.test(detector), 'and still announces it, so pricing and emails keep working')

/* ================================================================== */
/* 3. What the country is still allowed to change                      */
/* ================================================================== */
const locale = read('src/visitorLocale.js')
ok(/isKoreanVisitor/.test(locale), 'Korean pricing still keys off the detected country')
ok(/isChineseVisitor/.test(locale), 'so do the China sign-in options')
ok(!/documentElement\.lang/.test(code(locale)), 'the language hint no longer pretends to be the page language')
ok(/readVisitorLanguage/.test(locale), 'it is kept in session storage instead')

const app = read('src/App.jsx')
ok(
  /language: currentVisitorLocale\(\)\.language/.test(app),
  'the profile still records the reader language, so notification emails stay in their own language',
)

/* ================================================================== */
/* 4. One language per URL, declared properly                          */
/* ================================================================== */
const index = read('index.html')
ok(/<html lang="en"/.test(index), 'the homepage declares itself English and stays English')
for (const [code, path] of [['ko', '/kr/'], ['zh-Hans', '/cn/'], ['zh-Hant-TW', '/tw/']]) {
  ok(
    index.includes(`hreflang="${code}"`) && index.includes(path),
    `${path} is declared as the ${code} version, which is how a search engine is meant to find it`,
  )
}
ok(index.includes('hreflang="x-default"'), 'and there is an x-default for everyone else')

for (const page of ['kr/index.html', 'cn/index.html', 'tw/index.html']) {
  const file = join(root, 'public', page)
  if (!existsSync(file)) { console.log(`  --   public/${page} not present, skipped`); continue }
  const html = readFileSync(file, 'utf8')
  ok(/<html lang="(ko|zh)/.test(html), `public/${page} is written in its own language, not translated on the fly`)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
