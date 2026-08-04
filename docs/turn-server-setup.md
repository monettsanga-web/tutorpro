# Fixing video connection failures (TURN relay setup)

**Time needed: about 20 minutes. No coding.**

---

## What this fixes

When a lesson starts, the two browsers try to talk **directly** to each other.
On ordinary home broadband that usually works.

It fails when either side is on:

- mobile data (very common — carrier networks block direct connections)
- office, school or university wifi
- a hotel or cafe network
- some ISPs that use "carrier-grade NAT"

When the direct path fails, the call needs a **relay server** to forward the
video. Your classroom had none, so the lesson silently never connected. That is
almost certainly what you have been seeing as "the video is not working" or
lessons that sit forever on *retrying the secure video handshake*.

**This affects every country, not just China.**

---

## Step 1 — Get a free relay server

I recommend **Metered** — free tier, no credit card, works worldwide.

1. Go to **https://www.metered.ca/stun-turn**
2. Click **Sign up free** and create an account
3. Open the **TURN Server** section of the dashboard
4. Choose region **Global** (routes each user to their nearest server)
5. Copy the three values it shows you:
   - the **TURN URLs** (there will be several)
   - your **username**
   - your **credential** (password)

The free tier includes enough relay traffic for a small school. Only lessons
that *cannot* connect directly use the relay, so most classes cost you nothing.

**Alternatives** if you prefer:
- **Cloudflare Calls** — generous free allowance, `dash.cloudflare.com` → Calls
- **Twilio Network Traversal** — pay per GB, extremely reliable
- **Self-hosted coturn** on a small VPS — cheapest at scale. Put it in
  **Singapore** for the best latency to both Manila and your Asian students.

---

## Step 2 — Add the values to Vercel

1. Go to **https://vercel.com** and open your **tutorpro** project
2. Click **Settings** → **Environment Variables**
3. Add these three, one at a time. Tick **Production**, **Preview** and
   **Development** for each:

| Name | Value |
|---|---|
| `VITE_CLASSROOM_TURN_URL` | your TURN URLs, separated by commas |
| `VITE_CLASSROOM_TURN_USERNAME` | your username |
| `VITE_CLASSROOM_TURN_CREDENTIAL` | your password |

For the URL, paste **all** the addresses Metered gives you, separated by commas
and no spaces. A typical value looks like:

```
turn:global.relay.metered.ca:80,turn:global.relay.metered.ca:80?transport=tcp,turn:global.relay.metered.ca:443,turns:global.relay.metered.ca:443?transport=tcp
```

Why several? Each is a different way through a firewall. The browser tries them
in order, and the `turns:` one on port 443 looks like ordinary HTTPS traffic, so
it gets through almost anything — including most of what blocks video in China.

---

## Step 3 — Redeploy

Environment variables only apply to new builds.

1. In Vercel, open the **Deployments** tab
2. On the most recent deployment, click the **⋯** menu → **Redeploy**
3. Wait about a minute

---

## Step 4 — Check it worked

1. Open a lesson as the teacher on one device
2. Join as a student on **a different network** — phone on mobile data is the
   perfect test, since that is exactly the case that used to fail
3. The video should connect within a few seconds

If it still fails, the classroom now tells you why instead of spinning forever.
An administrator or teacher will see the specific reason in the help banner.

You can also verify the credentials independently at
**https://www.metered.ca/turn-server-testing** — paste them in and launch the
test. It should list at least one `relay` candidate.

---

## What changed in the code

You do not need to do anything here; this is for the record.

- `src/iceServers.js` builds the connection config, accepts several TURN URLs,
  and **ignores malformed values** rather than passing them to the browser
  (a bad entry would otherwise break every call).
- The classroom now performs an **ICE restart** when a connection drops
  mid-lesson — for example when someone moves from wifi to mobile data. Before,
  it stayed dead until somebody left and rejoined.
- Connection failures now explain the actual cause instead of showing
  *retrying the secure video handshake* indefinitely.
- 22 automated tests cover this: `npm run test:ice`.

---

## Cost expectations

Relay traffic is only used when a direct connection is impossible — in practice
a minority of lessons. Rough figures for a 25-minute one-to-one class:

| | Approx. relay data |
|---|---|
| One 25-minute lesson via relay | ~150–250 MB |
| Metered free tier | enough for roughly 2–4 relayed lessons per month |
| Metered paid entry plan | 150 GB, around 600+ relayed lessons |

Most lessons will not touch the relay at all. Start free, and only upgrade if
the dashboard shows you are actually running out.
