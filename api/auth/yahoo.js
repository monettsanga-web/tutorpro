import { randomUUID } from 'node:crypto'
import { getSupabaseAdmin, sendError, sendJson } from '../_paypal.js'

/**
 * One-click Yahoo sign-up / sign-in, without a Supabase provider.
 *
 * WHY THIS ROUTE EXISTS
 * ---------------------
 * The owner asked that clicking a provider tile takes the family to that
 * provider's own website to log in or register, then brings them back
 * signed up. Supabase hosts Google and Apple natively, but it has no Yahoo
 * provider - and Yahoo's developer programme is free and open, so Yahoo is
 * handled here instead:
 *
 *   1. the tile sends the browser to this route;
 *   2. this route bounces it to Yahoo's own consent screen
 *      (api.login.yahoo.com) with a CSRF state cookie;
 *   3. Yahoo bounces back with a code; this route exchanges it, reads the
 *      verified email + name from Yahoo's userinfo endpoint;
 *   4. Supabase mints a magic link for that exact email and the browser is
 *      redirected through it - which signs an existing family in, or
 *      creates their auth user on the spot if they are new;
 *   5. the normal one-tap return handler (src/oneTapAuth.js) finishes the
 *      job: profiles row, resume at step 2, portal routing.
 *
 * NEEDS TWO ENVIRONMENT VARIABLES in the Vercel project (free to create at
 * developer.yahoo.com, redirect URI https://www.tutorpro.site/api/auth/yahoo):
 *   YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET.
 * Until they exist the route answers "not configured" and the tile falls
 * back to entering the Yahoo address, exactly like the other providers.
 *
 * QQ can never work this way: QQ Connect requires a Chinese business
 * licence to register an application, so the QQ tile keeps collecting the
 * QQ Mail address directly.
 */

const CLIENT_ID = process.env.YAHOO_CLIENT_ID || ''
const CLIENT_SECRET = process.env.YAHOO_CLIENT_SECRET || ''
const configured = Boolean(CLIENT_ID && CLIENT_SECRET)

const AUTH_URL = 'https://api.login.yahoo.com/oauth2/request_auth'
const TOKEN_URL = 'https://api.login.yahoo.com/oauth2/get_token'
const USERINFO_URL = 'https://api.login.yahoo.com/openid/v1/userinfo'
const STATE_COOKIE = 'tutorpro_yahoo_state'

const cookieValue = (header, name) =>
  String(header || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || ''

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || 'www.tutorpro.site'}`)
  const redirectUri = `${url.origin}/api/auth/yahoo`

  // The tile asks first, so an unconfigured Yahoo never navigates away.
  if (url.searchParams.get('check') === '1') return sendJson(res, 200, { ok: configured })
  if (!configured) return sendError(res, 503, 'Yahoo one-tap sign-in is not configured yet.')

  const code = url.searchParams.get('code')

  /* STEP 1-2: start. Send them to Yahoo's own login/registration screen. */
  if (!code) {
    const state = randomUUID()
    res.setHeader('Set-Cookie', `${STATE_COOKIE}=${state}; Path=/api/auth/yahoo; HttpOnly; Secure; SameSite=Lax; Max-Age=600`)
    const target = `${AUTH_URL}?client_id=${encodeURIComponent(CLIENT_ID)}`
      + `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`
      + `&scope=${encodeURIComponent('openid profile email')}&language=en-us&state=${state}`
    return res.redirect(302, target)
  }

  /* STEP 3-4: Yahoo returned. Verify the state, exchange the code, and hand
     the verified email to Supabase as a magic link. */
  const backToSite = (ok) => res.redirect(302, `${url.origin}/?yt=${ok ? 'ok' : 'err'}`)
  const state = url.searchParams.get('state') || ''
  if (!state || state !== cookieValue(req.headers.cookie, STATE_COOKIE)) return backToSite(false)
  res.setHeader('Set-Cookie', `${STATE_COOKIE}=; Path=/api/auth/yahoo; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)

  try {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    })
    const tokens = await tokenResponse.json().catch(() => null)
    if (!tokenResponse.ok || !tokens?.access_token) return backToSite(false)

    const info = await fetch(USERINFO_URL, { headers: { authorization: `Bearer ${tokens.access_token}` } })
      .then((response) => response.json()).catch(() => null)
    const email = String(info?.email || '').toLowerCase()
    if (!/.+@.+\..+/.test(email)) return backToSite(false)

    const supabase = getSupabaseAdmin()
    const link = await supabase.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: `${url.origin}/` } })
    const actionLink = link.data?.properties?.action_link
    if (link.error || !actionLink) return backToSite(false)
    return res.redirect(302, actionLink)
  } catch {
    return backToSite(false)
  }
}
