export function isAllowlistedTutorProUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const parsed = urlStr.startsWith('/') ? new URL(urlStr, origin || 'https://tutorpro.app') : new URL(urlStr)
    if (origin && parsed.origin !== origin) return false
    const allowlistPaths = ['/games', '/assets', '/curriculum', '/preview', '/docs']
    const pathname = parsed.pathname.toLowerCase()
    return allowlistPaths.some((prefix) => pathname.startsWith(prefix))
  } catch {
    return false
  }
}

export function validateAndFormatHttpsUrl(inputUrl) {
  let url = (inputUrl || '').trim()
  if (!url) return { valid: false, error: 'Please enter a website URL.' }
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url
  } else if (/^http:\/\//i.test(url)) {
    url = 'https://' + url.slice(7)
  }
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Website Presenter requires a valid HTTPS URL (e.g. https://example.com).' }
    }
    return { valid: true, url: parsed.href }
  } catch {
    return { valid: false, error: 'Please enter a valid HTTPS website URL.' }
  }
}
