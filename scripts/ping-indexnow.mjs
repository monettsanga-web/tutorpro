/**
 * Tell Bing, Yandex, Seznam and Naver that these pages exist - today.
 *
 * WHY
 * ---
 * Search Console says 33 pages are "Discovered - currently not indexed":
 * Google knows the URLs and has not spent a crawl on them. There is no
 * Google API to hurry that along for an ordinary site; the only levers are
 * links from other websites and the ten-a-day "Request indexing" button.
 *
 * IndexNow is the other half of the search world, and it IS automatable.
 * One POST tells every participating engine that a list of URLs is new or
 * changed, and they fetch within hours rather than weeks. Bing feeds Bing,
 * Yahoo, DuckDuckGo and Microsoft Copilot, so this is not a rounding
 * error - and those engines are far less crowded than Google for a site
 * with no backlinks yet.
 *
 * HOW IT PROVES OWNERSHIP
 * -----------------------
 * A key file at the root of the site. public/<key>.txt contains the key
 * and nothing else; the POST names it, the engine fetches it, and if the
 * contents match the submission is trusted. No account, no sign-up, no
 * dashboard.
 *
 * Run: npm run seo:indexnow
 */
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const KEY = '5203542288a5510c81b59462c56a6489'
const HOST = 'www.tutorpro.site'
const SITE = `https://${HOST}`

/* The key file has to be reachable, or every submission is rejected. */
const keyUrl = `${SITE}/${KEY}.txt`
const keyCheck = await fetch(keyUrl).catch(() => null)
const keyBody = keyCheck && keyCheck.ok ? (await keyCheck.text()).trim() : ''
if (keyBody !== KEY) {
  console.error(`The key file is not live yet: ${keyUrl}`)
  console.error(keyCheck ? `  HTTP ${keyCheck.status}, body "${keyBody.slice(0, 40)}"` : '  no response')
  console.error('  Deploy first, then run this again.')
  process.exit(1)
}
console.log(`key file verified: ${keyUrl}`)

/* Prefer the live sitemap; fall back to the built one. */
let xml = ''
const live = await fetch(`${SITE}/sitemap.xml`).catch(() => null)
if (live?.ok) xml = await live.text()
else xml = await readFile(resolve(here, '..', 'public', 'sitemap.xml'), 'utf8')

const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
if (!urlList.length) { console.error('No URLs found in the sitemap.'); process.exit(1) }
console.log(`submitting ${urlList.length} URLs`)

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: keyUrl, urlList }),
})

const text = await response.text().catch(() => '')
/* 200 and 202 both mean accepted; 202 means "accepted, key being checked". */
if (response.status === 200 || response.status === 202) {
  console.log(`accepted (HTTP ${response.status}) - Bing, Yandex and the other IndexNow engines have the list.`)
  process.exit(0)
}
console.error(`rejected (HTTP ${response.status}) ${text.slice(0, 300)}`)
process.exit(1)
