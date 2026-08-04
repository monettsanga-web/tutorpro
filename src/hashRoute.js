/**
 * Lightweight hash routing.
 *
 * The app has never had a router: every dashboard tab was React state only, so
 * the address bar never changed. That meant the browser Back button left the
 * site entirely, refreshing threw you back to Overview, and no view could be
 * bookmarked or shared.
 *
 * Hash routing is used rather than the History API on purpose:
 *   - it needs no Vercel rewrite rules
 *   - it cannot collide with the real static pages (/pricing.html, /kr/, ...)
 *   - a stale link can never 404, it just lands on the dashboard home
 *
 * Route shape:  #/admin/funnel  ->  { role: 'admin', section: 'funnel' }
 *               #teachers       ->  legacy public route, still supported
 */

/** Only allow simple slugs, so a crafted URL can never inject anything. */
const SLUG = /^[a-z0-9-]{1,40}$/i

export function readHashRoute() {
  if (typeof window === 'undefined') return null
  const raw = String(window.location.hash || '').replace(/^#/, '')
  if (!raw.startsWith('/')) return null
  const [role, section] = raw.slice(1).split('/')
  if (!SLUG.test(role || '')) return null
  return {
    role: role.toLowerCase(),
    section: SLUG.test(section || '') ? section.toLowerCase() : '',
  }
}

/**
 * Point the address bar at a dashboard section.
 * `replace` avoids stacking a history entry for the very first render, so the
 * Back button still returns to wherever the visitor came from.
 */
export function writeHashRoute(role, section, { replace = false } = {}) {
  if (typeof window === 'undefined' || !role) return
  const target = `#/${role}${section ? `/${section}` : ''}`
  if (window.location.hash === target) return
  if (replace) {
    const url = `${window.location.pathname}${window.location.search}${target}`
    window.history.replaceState(null, '', url)
  } else {
    window.location.hash = target
  }
}

/** Remove a dashboard route from the URL, e.g. on logout or returning home. */
export function clearHashRoute() {
  if (typeof window === 'undefined') return
  if (!window.location.hash.startsWith('#/')) return
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
}

/** Subscribe to Back/Forward navigation. Returns an unsubscribe function. */
export function onHashRouteChange(listener) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => listener(readHashRoute())
  window.addEventListener('hashchange', handler)
  return () => window.removeEventListener('hashchange', handler)
}

/**
 * Section for a role, validated against that dashboard's real nav items so a
 * hand-edited URL cannot select a tab that does not exist.
 */
export function resolveSection(route, role, validSections, fallback) {
  if (!route || route.role !== role) return fallback
  return validSections.includes(route.section) ? route.section : fallback
}
