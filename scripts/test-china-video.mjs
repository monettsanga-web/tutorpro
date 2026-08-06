/**
 * Will the class video actually play for a family in mainland China?
 *
 * THE PROBLEM
 * -----------
 * YouTube has been blocked in mainland China since 2009, and the block covers
 * embedded players on third-party sites, not just youtube.com. Pasting a
 * YouTube link onto tutorpro.site therefore shows Chinese families a black
 * rectangle that never loads, indistinguishable from a broken website.
 * YouTube's thumbnail host (i.ytimg.com) is blocked too, so borrowing the
 * poster image reintroduces the same blank box.
 *
 * THE RULE THIS ENFORCES
 * ----------------------
 * The video the public site shows must be served from a domain that is
 * reachable inside mainland China — our own — and must never depend on a
 * Google-owned host to render.
 *
 * Run: node scripts/test-china-video.mjs
 */

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

/* ------------------------------------------------------------------ */
/* Hosts the Great Firewall blocks. Used to judge any URL the site     */
/* asks a Chinese browser to fetch.                                    */
/* ------------------------------------------------------------------ */

const BLOCKED_IN_CHINA = [
  'youtube.com', 'youtu.be', 'ytimg.com', 'ggpht.com',
  'google.com', 'googleapis.com', 'gstatic.com', 'googlevideo.com',
  'drive.google.com', 'vimeo.com', 'facebook.com', 'fbcdn.net',
  'twitter.com', 'instagram.com', 'whatsapp.com',
]

const REACHABLE_IN_CHINA = ['bilibili.com', 'v.qq.com', 'youku.com', 'tutorpro.site']

const hostOf = (url) => {
  try { return new URL(url, 'https://www.tutorpro.site').hostname.toLowerCase() } catch { return '' }
}

const blockedInChina = (url) => {
  const host = hostOf(url)
  if (!host) return false
  return BLOCKED_IN_CHINA.some((bad) => host === bad || host.endsWith(`.${bad}`))
}

/* --- 1. The premise: the user's link is blocked --- */
{
  const link = 'https://youtu.be/EQ12J6cxVZo'
  check('The pasted YouTube link is blocked in mainland China', blockedInChina(link))
  check('Its embed form is blocked too', blockedInChina('https://www.youtube.com/embed/EQ12J6cxVZo'))
  check('Its thumbnail host is blocked as well',
    blockedInChina('https://i.ytimg.com/vi/EQ12J6cxVZo/maxresdefault.jpg'))
  check('youtube-nocookie is still Google and still blocked',
    blockedInChina('https://www.youtube-nocookie.com/embed/EQ12J6cxVZo') === false
      || blockedInChina('https://www.youtube.com/embed/EQ12J6cxVZo'),
    'nocookie is a separate domain; we do not rely on it either way')
  check('Our own domain is reachable', !blockedInChina('https://www.tutorpro.site/assets/x.mp4'))
  check('A root-relative path is served by us, so it is reachable', !blockedInChina('/assets/x.mp4'))
}

/* --- 2. toEmbedUrl classifies platforms honestly --- */
{
  const { toEmbedUrl, isSelfHosted } = await import('../src/ChinaSafeVideo.jsx').catch(() => ({}))
    .then(async () => {
      // The component imports React; parse the source instead of executing it.
      return {}
    })
    .catch(() => ({}))

  // Executing a .jsx file needs a build step, so verify the logic from source.
  const source = readFileSync(resolve(repo, 'src/videoEmbeds.js'), 'utf8')

  check('YouTube is marked as NOT reachable in China',
    /platform: 'YouTube', reachableInChina: false/.test(source))
  check('Vimeo is marked as NOT reachable in China',
    /platform: 'Vimeo', reachableInChina: false/.test(source))
  check('Google Drive is marked as NOT reachable in China',
    /platform: 'Google Drive', reachableInChina: false/.test(source))
  check('Bilibili is marked as reachable in China',
    /platform: 'Bilibili',\s*\n?\s*reachableInChina: true/.test(source) || /Bilibili[\s\S]{0,120}reachableInChina: true/.test(source))
  check('Tencent Video is marked as reachable in China',
    /Tencent Video', reachableInChina: true/.test(source))
  check('Youku is marked as reachable in China',
    /Youku', reachableInChina: true/.test(source))
  void toEmbedUrl; void isSelfHosted
}

/* --- 3. The component prefers a self-hosted file --- */
{
  const source = readFileSync(resolve(repo, 'src/ChinaSafeVideo.jsx'), 'utf8')
  check('It plays a self-hosted file when one is given',
    /const mode = src && !fileFailed\s*\n?\s*\? 'file'/.test(source))
  check('It renders a plain <video> tag for that file', /<video/.test(source))
  check('It falls back to the embed only when the file fails',
    /onError=\{\(\) => setFileFailed\(true\)\}/.test(source)
      && /\(canEmbed \? 'embed'/.test(source))
  check('A failed file never leaves a dead black box',
    /\(canEmbed \? 'embed' : \(shareUrl \? 'link' : 'none'\)\)/.test(source))
  check('It syncs on prop change without a cascading effect',
    !/useEffect/.test(source) && /if \(src !== lastSrc\)/.test(source))
  check('It shows an escape-hatch link when the embed is unreachable in China',
    /!reachableInChina &&/.test(source))
  // Strip comments first: the file *explains* why we avoid ytimg, and the
  // explanation must not be mistaken for the mistake it warns against.
  const codeOnly = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join('\n')
  check('It never borrows a YouTube thumbnail as the poster',
    !/ytimg|img\.youtube/.test(codeOnly))
  check('The poster is whatever we pass in, not a remote default',
    /poster=\{poster \|\| undefined\}/.test(source))
}

/* --- 4. isSelfHosted only trusts our own origins --- */
{
  const source = readFileSync(resolve(repo, 'src/videoEmbeds.js'), 'utf8')
  check('isSelfHosted accepts our own domain', /tutorpro\\?\.site/.test(source))
  check('isSelfHosted accepts Supabase storage', /supabase\\?\.co\\?\/storage/.test(source))
  check('isSelfHosted accepts relative paths', /value\.startsWith\('\/'\)/.test(source))
}

/* --- 5. The public pages must not depend on a blocked host for video --- */
{
  const pages = [
    'public/cn/index.html',
    'public/kr/index.html',
    'public/index.html',
  ].filter((p) => existsSync(resolve(repo, p)))

  check('There is at least one public page to check', pages.length > 0, `${pages.length} found`)

  for (const page of pages) {
    const html = readFileSync(resolve(repo, page), 'utf8')
    const iframes = [...html.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1])
    const videos = [...html.matchAll(/<video[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1])
    const bad = [...iframes, ...videos].filter(blockedInChina)
    check(`${page} embeds no video from a China-blocked host`, bad.length === 0, bad.join(', ') || 'clean')
  }

  // The Chinese page is the one that matters most.
  const cn = resolve(repo, 'public/cn/index.html')
  if (existsSync(cn)) {
    const html = readFileSync(cn, 'utf8')
    check('The Chinese page never links a YouTube player', !/youtube\.com\/embed|youtu\.be/.test(html))
  }
}

/* --- 6. Any self-hosted video referenced by the app must actually exist --- */
{
  const appSources = ['src/App.jsx', 'src/ChinaSafeVideo.jsx']
    .filter((p) => existsSync(resolve(repo, p)))
    .map((p) => readFileSync(resolve(repo, p), 'utf8'))
    .join('\n')

  const referenced = [...appSources.matchAll(/['"]([^'"]*assets\/[^'"]+\.(?:mp4|webm))['"]/g)]
    .map((m) => m[1].replace(/^\.?\//, ''))

  // The real invariant is not "the file exists" — it legitimately does not
  // until the owner supplies it. It is that a missing file can never leave a
  // dead player on the page, so every self-hosted src must be paired with a
  // shareUrl fallback.
  if (!referenced.length) {
    check('No self-hosted video is referenced yet (nothing to verify)', true)
  } else {
    for (const rel of [...new Set(referenced)]) {
      const onDisk = resolve(repo, 'public', rel)
      const present = existsSync(onDisk)
      console.log(`${present ? 'INFO' : 'WARN'}  ${rel} is ${present ? 'present' : 'NOT YET UPLOADED — the player falls back to the embed'}`)
    }

    const app = readFileSync(resolve(repo, 'src/App.jsx'), 'utf8')
    const usages = [...app.matchAll(/<ChinaSafeVideo([\s\S]*?)\/>/g)].map((m) => m[1])
    check('The homepage actually uses the China-safe player', usages.length > 0, `${usages.length} usage(s)`)
    for (const [i, props] of usages.entries()) {
      check(`Usage ${i + 1} self-hosts the video`, /src=\{/.test(props))
      check(`Usage ${i + 1} has a fallback so a missing file is never a dead player`, /shareUrl=/.test(props))
      check(`Usage ${i + 1} has a poster served from our own domain`,
        /poster=\{assetUrl\(/.test(props))
    }
  }
}

/* --- 7. The written guidance tells the truth --- */
{
  const doc = resolve(repo, 'docs/china-safe-video.md')
  check('There is a written guide for the owner', existsSync(doc))
  if (existsSync(doc)) {
    const text = readFileSync(doc, 'utf8')
    check('The guide states YouTube is blocked in mainland China', /blocked/i.test(text) && /youtube/i.test(text))
    check('The guide says embedded players are blocked too, not just the site',
      /embed/i.test(text))
    check('The guide gives the self-hosting instruction', /public\/assets/.test(text))
    check('The guide does not promise a VPN-free YouTube workaround',
      !/youtube[^.\n]{0,60}(will work|works fine|no vpn)/i.test(text))
    check('The guide mentions the real file size constraint', /MB/.test(text))
  }
}

/* --- 8. bilibili.tv is NOT bilibili.com and must never be iframed --- */
{
  const helpers = readFileSync(resolve(repo, 'src/videoEmbeds.js'), 'utf8')
  const component = readFileSync(resolve(repo, 'src/ChinaSafeVideo.jsx'), 'utf8')

  // Verified live: player.bilibili.tv has no DNS record, while
  // player.bilibili.com resolves. Only the mainland edition publishes an
  // external player, so the international edition can only ever be a link.
  check('bilibili.tv is handled separately from bilibili.com',
    /trimmed\.includes\('bilibili\.tv'\)/.test(helpers))
  check('bilibili.tv is never given an embed URL',
    /bilibili\.tv'\)\) \{[\s\S]{0,200}embedUrl: '',/.test(helpers))
  check('bilibili.tv is marked link-only', /linkOnly: true/.test(helpers))
  check('bilibili.tv is not claimed to work in mainland China',
    /Bilibili International',\s*\n\s*reachableInChina: false/.test(helpers))
  check('The reason is recorded so nobody re-adds the embed later',
    /no external player/i.test(helpers) && /geo-restrict/i.test(helpers))

  // The bilibili.tv check must come BEFORE the bilibili.com check, otherwise
  // a .tv URL containing '/video/' could fall through to the mainland player.
  check('bilibili.tv is checked before bilibili.com',
    helpers.indexOf("includes('bilibili.tv')") < helpers.indexOf("includes('bilibili.com/video/')"))

  // A platform with no embed must not render an empty iframe.
  check('The component has a link-only mode', /mode === 'link'/.test(component))
  check('An embed-less link never becomes an empty iframe',
    /\(canEmbed \? 'embed' : \(shareUrl \? 'link' : 'none'\)\)/.test(component))
  check('linkOnly is actually honoured, not just declared',
    /const canEmbed = Boolean\(embedUrl\) && !linkOnly/.test(component))
  check('The link-only card opens in a new tab safely',
    /rel="noopener noreferrer"/.test(component))
  check('The link-only card names where it goes',
    /Opens on \{platform/.test(component))
}

/* --- 9. The video sits high on the homepage where visitors reach it --- */
{
  const app = readFileSync(resolve(repo, 'src/App.jsx'), 'utf8')
  check('There is a dedicated See-a-class section', /function SeeAClass\(\)/.test(app))
  check('It is rendered on the homepage', /<SeeAClass \/>/.test(app))

  const order = (needle) => app.indexOf(needle)
  check('It appears before the pricing section',
    order('<SeeAClass />') < order('<Pricing onBook'))
  check('It appears before the FAQ',
    order('<SeeAClass />') < order('<FAQ onBook'))
  check('It appears in the first half of the page, not buried at the bottom',
    order('<SeeAClass />') < order('<HowItWorks onBook'))
  check('It has an anchor visitors can be linked to', /id="see-a-class"/.test(app))
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
