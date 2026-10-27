# One-tap "Continue with Google / Apple" — owner setup (one time, ~15 minutes)

The site is fully wired: clicking the **Gmail** or **Apple** tile in a
registration (student or teacher) redirects to that provider's own website
to log in or register, then returns the family to TutorPro already signed
up. Until the steps below are done, the tiles say so honestly and fall back
to entering the email address — nothing is broken either way.

## Google (free)

1. **Google Cloud Console** → console.cloud.google.com → create (or pick) a
   project, e.g. "TutorPro".
2. **APIs & Services → OAuth consent screen**: User type *External*; app
   name *TutorPro Online English*; your support email; scopes: *openid,
   .../auth/userinfo.email, .../auth/userinfo.profile*; add your own Gmail
   under *Test users* while unpublished.
3. **Credentials → Create credentials → OAuth client ID**: type *Web
   application*.
   - Authorized JavaScript origins: `https://www.tutorpro.site`
   - Authorized redirect URI: `https://losmkvvwzijipqrlelyt.supabase.co/auth/v1/callback`
4. **Supabase dashboard** → your project → *Authentication → Providers →
   Google*: paste the **Client ID** and **Client secret**, enable, save.
5. **Supabase dashboard** → *Authentication → URL Configuration*:
   - Site URL: `https://www.tutorpro.site`
   - Redirect URLs: add `https://www.tutorpro.site/**`

Done — the Gmail tiles now redirect for real. No code change or redeploy
needed; it starts working immediately.

## Apple (requires an Apple Developer Program membership, US$99/year)

Only worth it if families ask for it. Steps: developer.apple.com →
Certificates, Identifiers & Profiles → create an **App ID** and a
**Services ID** (this is the client id) with *Sign In with Apple* enabled →
create a **Key** (download the .p8 once; note Team ID and Key ID) →
Supabase dashboard → *Authentication → Providers → Apple*: enter Team ID,
Key ID, the .p8 contents, and the Services ID as client id → same URL
Configuration as Google. The Apple tiles light up afterwards.

## Yahoo (free, ~5 minutes)

The redirect code is already live; it only needs two keys.

1. **developer.yahoo.com** → sign in with any Yahoo account → **Create
   Project** (or an app inside one).
2. Home Page URL: `https://www.tutorpro.site`
   **Redirect URI(s):** `https://www.tutorpro.site/api/auth/yahoo`
   (API permissions: none needed beyond the default OpenID scopes.)
3. Copy the **Client ID** and **Client Secret** from the app page.
4. **Vercel dashboard** → tutorpro project → Settings → Environment
   Variables → add two, for Production + Preview:
   `YAHOO_CLIENT_ID` and `YAHOO_CLIENT_SECRET`.
5. Redeploy once (Dashboard → Deployments → latest → Redeploy is fine NOW,
   because the current code is healthy) or wait for the next merge.

The Yahoo tile redirects for real from that moment.

## QQ — why this tile can never redirect

QQ Connect requires a **Chinese business licence** to register an
application, which this site does not have. The QQ tile therefore collects
the family's QQ Mail address directly — still a real, reachable inbox, and
still one tap to start.
