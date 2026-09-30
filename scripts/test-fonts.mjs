/**
 * The typefaces the site asks for must actually exist.
 *
 * THE FAULT THIS LOCKS OUT
 * ------------------------
 * The stylesheets asked for DM Sans, Manrope, Nunito and Inter. Not one of
 * them was ever loaded: no font link, no @font-face, no font file anywhere
 * in the project. Every visitor saw whatever their device substituted.
 *
 * It was invisible to every check we had, because nothing was technically
 * broken — the boxes were the right size, the CSS was valid, the pages
 * scored clean. The type was simply the wrong type, set with letter
 * spacing and line heights chosen for fonts that were not there, which is
 * why the site looked cramped on phones and tablets and no measurement
 * could explain it.
 *
 * These checks are deliberately blunt: a family may not be named in CSS
 * unless it is either loaded by us or a system font.
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const read = (file) => readFileSync(join(root, file), 'utf8')

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

/* ================================================================== */
/* 1. The font files are really in the project                         */
/* ================================================================== */
const FONT_FILES = [
  'dmsans-latin.woff2', 'dmsans-latin-ext.woff2',
  'manrope-latin.woff2', 'manrope-latin-ext.woff2',
  'nunito-latin.woff2', 'nunito-latin-ext.woff2',
]
FONT_FILES.forEach((name) => {
  const path = join(root, 'public/assets/fonts', name)
  const there = existsSync(path)
  ok(there, `${name} is in the project`)
  if (there) ok(statSync(path).size > 8000, `${name} is a real font file (${Math.round(statSync(path).size / 1024)} KB)`)
})
const total = FONT_FILES.reduce((sum, name) => sum + (existsSync(join(root, 'public/assets/fonts', name)) ? statSync(join(root, 'public/assets/fonts', name)).size : 0), 0)
ok(total < 400 * 1024, `all six weigh under 400 KB together (${Math.round(total / 1024)} KB)`)

/* ================================================================== */
/* 2. They are declared once, and served by us                         */
/* ================================================================== */
const fontsCss = read('public/assets/fonts.css')
ok((fontsCss.match(/@font-face/g) || []).length === 6, 'every file has an @font-face rule')
ok(/font-family: 'DM Sans'/.test(fontsCss), 'DM Sans is declared')
ok(/font-family: 'Manrope'/.test(fontsCss), 'Manrope is declared')
ok(/font-family: 'Nunito'/.test(fontsCss), 'Nunito is declared')
ok(!/fonts\.googleapis|fonts\.gstatic/.test(fontsCss), 'nothing is fetched from Google — it is blocked in mainland China')
ok((fontsCss.match(/font-display: swap/g) || []).length === 6, 'text stays readable while the fonts arrive')
ok(/unicode-range/.test(fontsCss), 'only Latin is downloaded; other scripts use the system font')
ok(/font-weight: 100 1000/.test(fontsCss), 'DM Sans is the variable version, so every weight works')

const appCss = read('src/styles.css')
ok(!/@font-face/.test(appCss), 'the app stylesheet does not repeat the declarations')
ok(/fonts\.css/.test(appCss), 'it points at the one file that has them')

/* ================================================================== */
/* 3. Every page links them                                            */
/* ================================================================== */
const index = read('index.html')
ok(index.includes('href="/assets/fonts.css"'), 'index.html links the fonts')
ok(index.includes('rel="preload" href="/assets/fonts/dmsans-latin.woff2"'), 'the body face is preloaded for first paint')
ok(index.includes('rel="preload" href="/assets/fonts/nunito-latin.woff2"'), 'and the headline face')
ok(index.includes('crossorigin'), 'the preloads carry crossorigin, without which the browser downloads them twice')

/* Built pages, if a build has been run. */
const distDir = join(root, 'dist')
if (existsSync(distDir)) {
  const pages = []
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (entry.name.endsWith('.html')) pages.push(full)
  })
  walk(distDir)
  /* The Chinese page uses PingFang / Microsoft YaHei, which every Chinese
     device already has — correct, and the right call where Google is
     blocked. The two search-engine verification files are not pages. */
  const exempt = /cn\/index\.html|google[0-9a-f]+\.html|naver[0-9a-f]+\.html/
  const missing = pages.filter((file) => !exempt.test(file) && !readFileSync(file, 'utf8').includes('/assets/fonts.css'))
  ok(pages.length > 40, `the build produced the whole site (${pages.length} pages)`)
  ok(missing.length === 0, `every page links the fonts (missing: ${missing.map((f) => f.replace(distDir, '')).join(', ') || 'none'})`)
} else {
  console.log('  --   dist/ not built, skipping the per-page check')
}

/* ================================================================== */
/* 4. No stylesheet asks for a font nobody loads                       */
/* ================================================================== */
const LOADED = ['DM Sans', 'Manrope', 'Nunito']
/* Fonts that ship with the operating system, or are a generic family. */
const SYSTEM = [
  'system-ui', 'ui-sans-serif', 'sans-serif', 'serif', 'monospace', '-apple-system',
  'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Helvetica',
  'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans', 'Noto Sans', 'Apple SD Gothic Neo',
  'Malgun Gothic', 'Courier New', 'inherit', 'initial', 'unset',
  /* 'Trebuchet MS' is deliberately NOT on this list. It ships with Windows
     and macOS but with neither iOS nor Android, so naming it is exactly the
     bug this file exists to stop: the phone silently draws something else. */
  /* Pretendard is named first on the Korean pages and is NOT bundled: Hangul
     falls through to the reader's own Korean system font, which is correct
     and avoids shipping a multi-megabyte CJK file. */
  'Pretendard Variable', 'Pretendard',
  /* Ships with Android and ChromeOS, and is only ever a fallback in the
     Korean chain — never the face a layout is measured against. */
  'Noto Sans KR', 'Noto Sans SC', 'Noto Sans TC',
]
/* This list used to be four filenames typed by hand, and that is precisely
   how `src/support-chat.css` kept asking for Inter after every other file had
   been cleaned: the check never opened it. Sweep every stylesheet in the
   project instead, so a new one is covered the moment it is added. */
function collectStylesheets() {
  const found = []
  const walk = (dir) => {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.css')) found.push(full.replace(root + '/', ''))
    }
  }
  walk(join(root, 'src'))
  walk(join(root, 'public/assets'))
  return found.sort()
}
const stylesheets = collectStylesheets()
ok(stylesheets.length >= 6, `the sweep found every stylesheet (${stylesheets.length})`)
ok(stylesheets.includes('src/support-chat.css'), 'including src/support-chat.css, which the old hand-typed list missed')
stylesheets.forEach((file) => {
  if (!existsSync(join(root, file))) return
  const css = read(file)
  const families = new Set()
  for (const match of css.matchAll(/font-family:\s*([^;}]+)[;}]/g)) {
    match[1].split(',').forEach((part) => {
      const name = part.trim().replace(/^['"]|['"]$/g, '')
      if (name && !name.startsWith('var(')) families.add(name)
    })
  }
  const unknown = [...families].filter((name) => !LOADED.includes(name) && !SYSTEM.includes(name))
  ok(unknown.length === 0, `${file} names no font that is never loaded (${unknown.join(', ') || 'none'})`)
})

const alternatives = read('public/online-english-alternatives.html')
ok(!/font-family:\s*Inter/.test(alternatives), 'the comparison page no longer asks for Inter, which was never loaded')
ok(alternatives.includes('/assets/fonts.css'), 'and it links the fonts it does use')
ok(!/font-family:\s*Inter[,;]/.test(read('public/assets/pages.css')), 'the page stylesheet no longer asks for Inter either')

/* ================================================================== */
/* 5. Cached hard, so a repeat visit pays nothing                      */
/* ================================================================== */
const vercel = read('vercel.json')
ok(/woff2/.test(vercel), 'vercel.json caches the font files')
ok(/max-age=31536000, immutable/.test(vercel), 'for a year, immutably')

/* ================================================================== */
/* 6. A deploy actually reaches a phone that has been here before      */
/* ================================================================== */
/* The font fix was live on the server for a whole day while returning
   visitors carried on seeing the old type. The service worker cached
   EVERYTHING under /assets/ cache-first and never revalidated, and three of
   the stylesheets live at stable paths (pages.css, kr.css, fonts.css), so
   the browser kept the pre-deploy copy for ever. No amount of fixing CSS
   can show up on a device while that is true, which is why the same report
   kept coming back. */
const sw = read('public/service-worker.js')
const cacheName = (sw.match(/const CACHE_NAME = '([^']+)'/) || [])[1]
ok(Boolean(cacheName), `the service worker names its cache (${cacheName || 'none'})`)
ok(cacheName !== 'tutorpro-classroom-shell-v2', 'and it is not the version that went stale')
ok(/isImmutable/.test(sw), 'it tells immutable files apart from stable ones')
ok(
  /HASHED\s*=\s*\/-\[A-Za-z0-9_-\]\{8,\}/.test(sw),
  'it recognises a Vite content hash, which is what makes a file safe to keep',
)
/* The decisive one: the stable stylesheets must go to the network first. */
ok(
  /revalidating\(request\)[\s\S]{0,500}\.catch\(\(\) => caches\.match\(request\)\)/.test(sw),
  'stable paths are fetched from the network with the cache only as a fallback',
)
ok(
  /cache: 'no-cache'/.test(sw),
  "and with cache: 'no-cache', so the browser's own HTTP cache cannot answer with a stale copy",
)
ok(
  !/woff2/.test(sw) || /IMMUTABLE_TYPE[\s\S]{0,120}woff2/.test(sw),
  'fonts stay cache-first, so a repeat visit still costs nothing',
)
ok(
  /caches\s*\.?\s*[\s\S]{0,40}keys\(\)[\s\S]{0,400}caches\.delete/.test(sw),
  'activating the new worker deletes the old cache outright',
)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
