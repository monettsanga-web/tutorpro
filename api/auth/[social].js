import { randomUUID } from 'node:crypto'
import { getSupabaseAdmin, sendError, sendJson } from '../_paypal.js'

/**
 * One-click Google and Yahoo sign-up / sign-in, hosted by this repository.
 *
 * WHY THIS ROUTE EXISTS
 * ---------------------
 * The owner's standing ask: clicking a provider tile or button takes the
 * family to that provider's own website to log in or register, then brings
 * them back signed up. Supabase hosts Apple natively, but its Google
 * provider would need dashboard work on the owner's side and it has no
 * Yahoo provider at all - so Google and Yahoo are handled here instead:
 *
 *   1. the tile/button sends the browser to /api/auth/social?p=google (or
 *      ?p=yahoo); a ?check= preflight first asks whether the keys exist,
 *      so an unconfigured provider never navigates away;
 *   2. this route bounces the browser to the provider's OWN consent screen
 *      (accounts.google.com / api.login.yahoo.com) with a CSRF state
 *      cookie;
 *   3. the provider bounces back with a code; this route exchanges it and
 *      reads the verified email + name from the provider's userinfo
 *      endpoint;
 *   4. Supabase mints a magic link for that exact email and the browser is
 *      redirected through it - signing an existing family in, or creating
 *      their auth user on the spot if they are new;
 *   5. the normal one-tap return handler (src/oneTapAuth.js) finishes the
 *      job: profiles row, resume at step 2, portal routing.
 *
 * NEEDS, per provider, two environment variables in the Vercel project
 * (both developer programmes are FREE; redirect URI for both is
 * https://www.tutorpro.site/api/auth/social):
 *   GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
 *   YAHOO_CLIENT_ID  + YAHOO_CLIENT_SECRET
 * Until a provider's keys exist, its preflight answers not-configured and
 * the tile/button falls back to entering the address - no dead buttons.
 *
 * QQ can never work this way: QQ Connect requires a Chinese business
 * licence to register an application, so the QQ tile keeps collecting the
 * QQ Mail address directly. Apple stays on Supabase's native OAuth because
 * it requires a paid Apple Developer membership either way.
 */

const PROVIDERS = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    auth: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    userinfo: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
    extra: { prompt: 'select_account' },
  },
  yahoo: {
    clientId: process.env.YAHOO_CLIENT_ID || '',
    clientSecret: process.env.YAHOO_CLIENT_SECRET || '',
    auth: 'https://api.login.yahoo.com/oauth2/request_auth',
    token: 'https://api.login.yahoo.com/oauth2/get_token',
    userinfo: 'https://api.login.yahoo.com/openid/v1/userinfo',
    scope: 'openid profile email',
    extra: { language: 'en-us' },
  },
}

const STATE_COOKIE = 'tutorpro_social_state'
const configured = (name) => Boolean(PROVIDERS[name]?.clientId && PROVIDERS[name]?.clientSecret)

const cookieValue = (header, name) =>
  String(header || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || ''

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || 'www.tutorpro.site'}`)
  const redirectUri = `${url.origin}/api/auth/social`

  const check = url.searchParams.get('check')
  if (check) return sendJson(res, 200, { ok: configured(check) })

  const name = PROVIDERS[url.searchParams.get('p')] ? url.searchParams.get('p') : ''
  const provider = PROVIDERS[name]
  if (!provider) return sendError(res, 404, 'Unknown provider.')
  if (!configured(name)) return sendError(res, 503, 'One-tap sign-in with this provider is not configured yet.')

  const code = url.searchParams.get('code')

  /* STEP 1-2: start. Send them to the provider's own login/registration. */
  if (!code) {
    const state = randomUUID()
    const payload = Buffer.from(JSON.stringify({ s: state, p: name })).toString('base64url')
    res.setHeader('Set-Cookie', `${STATE_COOKIE}=${payload}; Path=/api/auth/social; HttpOnly; Secure; SameSite=Lax; Max-Age=600`)
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: provider.scope,
      state,
      ...provider.extra,
    })
    return res.redirect(302, `${provider.auth}?${params}`)
  }

  /* STEP 3-4: provider returned. Verify state, exchange the code, read the
     verified email, hand it to Supabase as a magic link. */
  const backToSite = () => res.redirect(302, `${url.origin}/?yt=err`)
  let stored = null
  try { stored = JSON.parse(Buffer.from(cookieValue(req.headers.cookie, STATE_COOKIE), 'base64url').toString('utf8')) } catch { stored = null }
  const state = url.searchParams.get('state') || ''
  if (!stored || !state || stored.s !== state) return backToSite()
  const returnedName = PROVIDERS[stored.p] ? stored.p : name
  const returned = PROVIDERS[returnedName]
  res.setHeader('Set-Cookie', `${STATE_COOKIE}=; Path=/api/auth/social; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)

  try {
    const tokenResponse = await fetch(returned.token, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(`${returned.clientId}:${returned.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    })
    const tokens = await tokenResponse.json().catch(() => null)
    if (!tokenResponse.ok || !tokens?.access_token) return backToSite()

    const info = await fetch(returned.userinfo, { headers: { authorization: `Bearer ${tokens.access_token}` } })
      .then((response) => response.json()).catch(() => null)
    const email = String(info?.email || '').toLowerCase()
    if (!/.+@.+\..+/.test(email)) return backToSite()
    if (returnedName === 'google' && info?.verified_email === false) return backToSite()

    const supabase = getSupabaseAdmin()
    const link = await supabase.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: `${url.origin}/` } })
    const actionLink = link.data?.properties?.action_link
    if (link.error || !actionLink) return backToSite()
    return res.redirect(302, actionLink)
  } catch {
    return backToSite()
  }
}
