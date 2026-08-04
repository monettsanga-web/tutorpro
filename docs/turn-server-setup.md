# Fixing video connection failures (relay setup)

**Time needed: about 20 minutes. No coding. Free for a school your size.**

---

## What this fixes

When a lesson starts, the two browsers try to talk **directly** to each other.
On ordinary home broadband that usually works.

It fails when either side is on:

- mobile data (very common — carriers block direct connections)
- office, school or university wifi
- a hotel or cafe network
- an ISP using "carrier-grade NAT"

When the direct path fails, the call needs a **relay server** to forward the
video. Your classroom had none, so the lesson silently never connected. That is
almost certainly behind the reports of *"the video is not working"* and lessons
stuck on **retrying the secure video handshake**.

**This affects every country, not only China.**

---

## Which provider — and why Cloudflare

| Provider | Free allowance | Roughly how many relayed lessons |
|---|---|---|
| **Cloudflare Realtime** | **1,000 GB / month** | **~3,000 lessons** |
| Metered | 20 GB / month | ~56 lessons |
| Twilio | none | pay per GB |

Cloudflare's free tier is about **50× larger**, and after it runs out the rate
is $0.05/GB — roughly **half a US cent per relayed lesson**.

Remember: only lessons that *cannot* connect directly use the relay at all, so
in practice most classes cost nothing.

**One caveat:** Cloudflare's network deliberately excludes mainland China. For
students inside China the direct connection and STUN still apply, and the
practical answer there remains Tencent (see `docs/classroom-china-readiness.md`).
For the Philippines and the rest of Asia-Pacific, Cloudflare is the right choice.

---

## Step 1 — Create the Cloudflare TURN key

1. Sign up free at **https://dash.cloudflare.com** (no credit card for the free tier)
2. In the sidebar open **Realtime** (previously called *Calls*)
3. Click **Create** → choose **TURN**
4. Give it a name such as `tutorpro-classroom`
5. Copy the two values it shows you:
   - **TURN Key ID**
   - **API Token**

Keep these private. They are the master key that mints session credentials —
anyone holding them could use up your allowance.

---

## Step 2 — Store them in Supabase

The key must stay on the server, so the classroom asks Supabase for a
short-lived credential each lesson rather than embedding the key in the browser.

1. Go to **https://supabase.com/dashboard** and open your project
2. **Edge Functions** → **Secrets** (sometimes under *Settings*)
3. Add these two:

| Name | Value |
|---|---|
| `CLOUDFLARE_TURN_KEY_ID` | your TURN Key ID |
| `CLOUDFLARE_TURN_API_TOKEN` | your API Token |

---

## Step 3 — Deploy the function

In your project folder:

```bash
supabase functions deploy turn-credentials
```

If you have not used the Supabase CLI before:

```bash
npm install -g supabase
supabase login
supabase link --project-ref losmkvvwzijipqrlelyt
supabase functions deploy turn-credentials
```

Nothing to add in Vercel for this route, and no redeploy needed — the classroom
requests credentials at lesson time.

---

## Step 4 — Check it worked

1. Open a lesson as the teacher on one device
2. Join as a student **on a different network** — a phone on mobile data is the
   ideal test, because that is exactly the case that used to fail
3. Video should connect within a few seconds

If it still fails, the classroom now states the actual reason instead of
spinning forever, and staff see the specific setting that needs attention.

---

## Alternative: a provider with fixed credentials

If you would rather use Metered, Twilio or your own coturn server, the classroom
also accepts a static relay. Add these in **Vercel → Settings → Environment
Variables** and redeploy:

| Name | Value |
|---|---|
| `VITE_CLASSROOM_TURN_URL` | comma-separated TURN URLs |
| `VITE_CLASSROOM_TURN_USERNAME` | username |
| `VITE_CLASSROOM_TURN_CREDENTIAL` | password |

Include a `turns:` entry on port 443 — it looks like ordinary HTTPS and gets
through the most restrictive firewalls:

```
turn:host:3478,turn:host:80?transport=tcp,turns:host:443?transport=tcp
```

Both methods can be configured at once; the browser simply tries all of them.

---

## What changed in the code

For the record — nothing here needs action from you.

- `src/iceServers.js` builds the connection config, supports both Cloudflare's
  short-lived credentials and static providers, and **discards malformed values**
  rather than passing them to the browser, where one bad entry breaks every call.
- `supabase/functions/turn-credentials` mints the short-lived credentials so the
  master key never reaches a browser. It requires a signed-in user, so the
  bandwidth allowance cannot be drained anonymously.
- Credentials are fetched **before** the first connection attempt, so the very
  first offer already carries relay candidates.
- The classroom performs an **ICE restart** when a connection drops mid-lesson,
  for example moving from wifi to mobile data. It previously stayed dead until
  someone left and rejoined.
- If anything fails, the lesson still attempts a direct connection — the relay
  never becomes a new single point of failure.
- 27 automated tests: `npm run test:ice`.

---

## Cost in practice

| | Approximate relay data |
|---|---|
| One 25-minute lesson at 480p | ~0.15 GB |
| One 50-minute lesson at 480p | ~0.30 GB |
| Cloudflare free tier (1,000 GB) | ~3,000 relayed 25-minute lessons |
| Beyond that | $0.05/GB — under one US cent per lesson |

Only failed-direct connections consume any of this, so realistically you will
not approach the free tier for a long time.
