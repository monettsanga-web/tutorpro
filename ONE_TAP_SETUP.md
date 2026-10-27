# One-tap "Continue with Google / Apple" — owner setup (one time, ~15 minutes)

The site is fully wired: clicking the **Gmail** or **Apple** tile in a
registration (student or teacher) redirects to that provider's own website
to log in or register, then returns the family to TutorPro already signed
up. Until the steps below are done, the tiles say so honestly and fall back
to entering the email address — nothing is broken either way.

## Google (free, ~5 minutes) and Yahoo (free, ~5 minutes)

The redirect code for BOTH is already live in /api/auth/social. Each one
switches on the moment its two keys exist as Vercel environment variables.
Fastest path: create the client, paste the two values HERE in chat, and I
will set the environment variables and redeploy for you.

**Google**
1. console.cloud.google.com → create or pick a project.
2. APIs & Services → Credentials → Create credentials → **OAuth client ID**
   → type **Web application**.
3. Authorized redirect URI: `https://www.tutorpro.site/api/auth/social`
   (no JavaScript origin needed - the server does the whole flow).
4. Paste me the **Client ID** and **Client secret**.
   (If the consent screen asks: User type External, app name TutorPro
   Online English, your email; add your own Gmail as a test user while in
   Testing mode.)

**Yahoo**
1. developer.yahoo.com → sign in with any Yahoo account → **Create
   Project**.
2. Home Page URL `https://www.tutorpro.site`; Redirect URI
   `https://www.tutorpro.site/api/auth/social`.
3. Paste me the **Client ID** and **Client Secret**.

Doing it yourself instead: Vercel dashboard → tutorpro → Settings →
Environment Variables → add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET` (Production + Preview), then
Redeploy the latest deployment.

## Apple (optional, paid)

Apple stays on Supabase's native OAuth and needs an Apple Developer
Programme membership (US$99/year): App ID + Services ID with Sign In with
Apple, a key (.p8), then Supabase dashboard → Authentication → Providers →
Apple with Team ID, Key ID, the .p8 and the Services ID. Site URL
`https://www.tutorpro.site`, redirect allow `https://www.tutorpro.site/**`.

## QQ — why this tile can never redirect

QQ Connect requires a **Chinese business licence** to register an
application, which this site does not have. The QQ tile therefore collects
the family's QQ Mail address directly — still a real, reachable inbox, and
still one tap to start.
