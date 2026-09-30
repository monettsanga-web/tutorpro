/**
 * Proves that a CSS change reaches a browser that has visited before.
 *
 * THE FAULT THIS LOCKS OUT
 * ------------------------
 * The service worker used to answer every request under /assets/ from the
 * cache and never revalidate. Three stylesheets live at stable paths —
 * pages.css, kr.css and fonts.css — so once a visitor had them, they had
 * them for ever. A deploy changed nothing on their device. Font and layout
 * fixes were live on the server for a day while the same phone kept showing
 * the old page, which is why the same bug report kept coming back.
 *
 * HOW THIS TEST WORKS
 *   1. open the site so the worker installs and caches fonts.css
 *   2. edit fonts.css on disk — this is the "deploy"
 *   3. open it again and read what the browser actually received
 *
 * Against the old worker step 3 returned the stale bytes. It must now
 * return the new ones, while a hashed bundle and a .woff2 still come from
 * the cache (that is what keeps a repeat visit fast).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const SANDBOX_PLAYWRIGHT = '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const { chromium } = await import('playwright-core').catch(() => import(SANDBOX_PLAYWRIGHT))

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const dist = join(root, 'dist')
const cssPath = join(dist, 'assets/fonts.css')

if (!existsSync(cssPath)) {
  console.error('dist/assets/fonts.css is missing — run `npm run build` first.')
  process.exit(1)
}

let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }

const PORT = Number(process.env.PORT || 4199)
const original = readFileSync(cssPath, 'utf8')
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
  cwd: dist, stdio: 'ignore',
})
const cleanup = () => { writeFileSync(cssPath, original); try { server.kill() } catch { /* already gone */ } }
process.on('exit', cleanup)

await new Promise((r) => setTimeout(r, 900))

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
/* One persistent context, so the worker and its cache survive the reload —
   exactly like a returning visitor. */
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()
const base = `http://127.0.0.1:${PORT}`

await page.goto(base + '/', { waitUntil: 'load' })
const registered = await page.evaluate(
  "navigator.serviceWorker.ready.then((r) => Boolean(r.active)).catch(() => false)"
)
ok(registered, 'the service worker installs and activates')

const cacheName = await page.evaluate('caches.keys().then((k) => k.join(","))')
ok(cacheName.includes('tutorpro-shell-v3'), `it opened the current cache (${cacheName || 'none'})`)
ok(!cacheName.includes('classroom-shell-v2'), 'and the cache that went stale is gone')

/* Warm the cache with the three kinds of file. */
await page.evaluate(
  "Promise.all(['/assets/fonts.css', '/assets/fonts/dmsans-latin.woff2'].map((u) => fetch(u)))"
)
await page.waitForTimeout(500)

const beforeText = await page.evaluate("fetch('/assets/fonts.css').then((r) => r.text())")
ok(beforeText.includes('@font-face'), 'fonts.css is served')

/* ---- the deploy ---- */
const MARKER = '/* deployed-at-' + Date.now() + ' */'
writeFileSync(cssPath, MARKER + '\n' + original)

await page.goto(base + '/?second-visit', { waitUntil: 'load' })
await page.waitForTimeout(400)
const afterText = await page.evaluate("fetch('/assets/fonts.css').then((r) => r.text())")
ok(
  afterText.includes(MARKER),
  'a returning visitor receives the NEW fonts.css — this is the bug that hid every font fix',
)

/* The Korean and marketing stylesheets take the same path. */
const pagesCss = join(dist, 'assets/pages.css')
if (existsSync(pagesCss)) {
  const originalPages = readFileSync(pagesCss, 'utf8')
  const pagesMarker = '/* pages-' + Date.now() + ' */'
  await page.evaluate("fetch('/assets/pages.css')")
  await page.waitForTimeout(300)
  writeFileSync(pagesCss, pagesMarker + '\n' + originalPages)
  const got = await page.evaluate("fetch('/assets/pages.css').then((r) => r.text())")
  writeFileSync(pagesCss, originalPages)
  ok(got.includes(pagesMarker), 'and the NEW pages.css, which every marketing page uses')
}

/* A font file must still come straight from the cache: its URL cannot change
   meaning, and this is what makes a repeat visit cost nothing. */
const fontCached = await page.evaluate(
  "caches.open('tutorpro-shell-v3').then((c) => c.match('/assets/fonts/dmsans-latin.woff2')).then(Boolean)"
)
ok(fontCached, 'the font file is kept in the cache')

const hashedCached = await page.evaluate(`
  caches.open('tutorpro-shell-v3')
    .then((c) => c.keys())
    .then((keys) => keys.some((r) => /\\/assets\\/index-[A-Za-z0-9_-]{8,}\\.(js|css)$/.test(new URL(r.url).pathname)))
`)
ok(hashedCached, 'so is the hashed app bundle')

await browser.close()
cleanup()

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
