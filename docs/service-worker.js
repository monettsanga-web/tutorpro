/* TutorPro service worker.

   HISTORY / WHY THIS FILE CHANGED
   -------------------------------
   The previous version cached EVERYTHING under /assets/ cache-first and never
   revalidated:

       caches.match(request).then(cached => cached || fetch(request))

   That is correct for files whose name changes when their contents change
   (Vite writes index-TAi-9XU3.css, the fonts are immutable, images never
   change). It is badly wrong for the hand-written stylesheets, which live at
   stable paths:

       /assets/pages.css   ~40 marketing pages
       /assets/kr.css      the Korean pages
       /assets/fonts.css   the @font-face declarations

   Anyone who had visited the site before kept the OLD pages.css for ever, on
   every later visit, because the cache was only ever cleared when CACHE_NAME
   changed — and it had not changed in a long time. So type fixes shipped to
   production simply never reached returning visitors: the site looked exactly
   as it had before the deploy. That is why the same "the fonts don't fit"
   report kept coming back after each fix.

   The rule now:
     - content-addressed / immutable things (hashed filenames, fonts, images,
       video) stay cache-first, which is what makes repeat visits fast;
     - everything else served from /assets/ is network-first with the cache as
       an offline fallback, so a deploy is picked up on the very next load.

   Bumping CACHE_NAME also wipes the stale v2 cache on activate. */

const CACHE_NAME = 'tutorpro-shell-v3'
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/assets/tutorpro-panda-logo.webp',
  '/assets/pwa-icon-192.png',
  '/assets/pwa-icon-512.png',
  '/favicon.ico',
  '/favicon.png'
]

/* Vite writes `name-A1b2C3d4.ext`; such a URL can never mean two different
   things, so it is safe to keep for ever. */
const HASHED = /-[A-Za-z0-9_-]{8,}\.(?:js|css|mjs)$/
const IMMUTABLE_TYPE = /\.(?:woff2?|ttf|otf|png|jpe?g|webp|avif|gif|svg|ico|mp4|webm)$/

function isImmutable(pathname) {
  return HASHED.test(pathname) || IMMUTABLE_TYPE.test(pathname)
}

// Ask the network and do not accept the browser's own cached answer.
function revalidating(request) {
  try {
    return fetch(request, { cache: 'no-cache' })
  } catch {
    // Some engines refuse the init override on an existing Request.
    return fetch(request)
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // A single missing file used to abort the whole install, leaving the
      // previous worker in charge. Add them one at a time instead.
      .then((cache) => Promise.all(APP_SHELL.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')))
    return
  }

  const cacheable = url.pathname.startsWith('/assets/') || url.pathname === '/manifest.webmanifest'
  if (!cacheable) return

  if (isImmutable(url.pathname)) {
    // Cache-first: the URL changes whenever the bytes change.
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response && response.ok) {
              const copy = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
            }
            return response
          })
      )
    )
    return
  }

  // Stable path (pages.css, kr.css, fonts.css, the manifest): always ask the
  // network first so a deploy lands immediately, and fall back to the cached
  // copy only when the network is unavailable.
  //
  // `cache: 'no-cache'` forces a conditional request rather than letting the
  // browser's own HTTP cache answer. Vercel already sends
  // `max-age=0, must-revalidate` for these files so it would usually happen
  // anyway, but a server that forgets the header (or a proxy that rewrites
  // it) would otherwise reintroduce exactly the staleness this is here to
  // prevent. The cost is a 304, which is a few hundred bytes.
  event.respondWith(
    revalidating(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})
