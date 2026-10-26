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

## Yahoo and QQ — why these tiles do not redirect

- **Yahoo**: no OAuth provider exists on this backend (Supabase does not
  offer Yahoo), so there is no redirect to make.
- **QQ**: QQ Connect requires a Chinese business licence to register an
  application — not available to this site.

Both tiles therefore collect the family's Yahoo Mail / QQ Mail address
directly, which still ends in a real, reachable inbox. If you ever want
Yahoo redirect sign-in badly enough, it needs custom server work with a
Yahoo developer app (free) — ask and I will scope it.
