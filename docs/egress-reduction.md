# Supabase egress reduction — measured results

**Date:** 9 August 2026 · **Commits:** `78fd56e` (classroom off), `7b4ac29` (polling fixed)

All numbers below were measured in a real headless browser against the actual
production build, counting every byte returned from `supabase.co`. Reproduce
them yourself with `npm run measure:egress` and `npm run measure:egressdash`.

---

## What was wrong

Your site was paying for data nobody asked for.

| Scenario | Before |
|---|---|
| Anonymous visitor idle on the homepage | **23,241 bytes/min** |
| Student dashboard open, nobody touching it | **85,242 bytes/min** |

That second figure is the dangerous one. One teacher leaving a dashboard tab
open through a working day — 8 hours, 22 days — came to roughly **858 MB a
month from a single tab**, against a 5 GB free allowance.

### The four causes

1. **The teacher directory was re-downloaded every 10 seconds, forever.**
   `App.jsx` polled `get_public_teachers` on a timer: 7 calls and 22.9 KB per
   idle minute. That list changes when an admin approves a teacher — perhaps
   weekly.

2. **Logged-out visitors fetched bookings.** The same effect called
   `fetchCloudBookings()` for anonymous users, who can never see a booking.
   Row-level security correctly returned an empty array, so it was a pure
   round trip for nothing, repeated every 10 seconds.

3. **Dashboards polled every 3 seconds *and* held Realtime subscriptions.**
   Both mechanisms watched the same tables. Realtime already pushes changes
   instantly, so the polling added cost without adding freshness.

4. **The student dashboard refetched the teacher directory on every tick.**
   `get_public_teachers` is the largest response on the site: 85 KB across 26
   calls in one idle minute, duplicating what the homepage had already loaded.

---

## What changed

- **Teacher directory:** fetched once, kept live by the existing Realtime
  subscription, and re-checked only when a tab returns to the foreground after
  five or more minutes away. No timer.
- **Public site no longer requests bookings at all.**
- **New `src/cloudSyncPolicy.js`:** Realtime stays the live channel; the timer
  becomes a 3-minute backstop that never fires in a hidden tab and collapses
  bursts of refetches.
- **Student dashboard** loads the teacher directory once on open.

---

## Measured result

| Scenario | Before | After | Saved |
|---|---|---|---|
| Homepage, idle | 23,241 B/min | **3,577 B/min** | **85%** |
| Student dashboard, idle | 85,242 B/min | **0 B/min** | **100%** |

An idle dashboard is now completely silent. The homepage makes four requests
on load and then stops.

Combined with the classroom being switched off (`78fd56e`), which removed a
877 kB chunk and a 1,031 kB video SDK from the build along with all their
Realtime, Storage and Edge Function traffic.

---

## What was deliberately NOT changed

**Realtime subscriptions stay.** They are cheap, event-driven, and they are
what makes feedback and bookings appear on your other devices. That mechanism
was hard-won and I did not touch it. Everything still syncs exactly as before —
verified: profiles and bookings still load on open, the teacher directory still
loads so booking works, the booking list still renders, no JS errors.

**No data, table, bucket, function or policy was deleted.**

---

## Round 2 — video moved off Supabase (`daa8b3b`)

The homepage clip was served from Supabase Storage with
`cache-control: no-cache`, so **every view re-downloaded the whole 5.14 MB**
and a browser could not reuse even its own copy across a refresh.

It now ships with the site and is served by Vercel's CDN, which already hosts
everything else here at no extra cost. It was also re-encoded at the same 720p:
**5.14 MB -> 2.89 MB (44% smaller)** at SSIM 0.975 — frames compared side by
side, courseware text and faces unchanged. `vercel.json` now sends a one-year
immutable cache header for media under `/assets`, so a repeat visitor
downloads it once, ever.

The original file was **not** deleted from Supabase Storage.

## Round 3 — the booking sync can no longer grow forever (`8dbbb8f`)

**A correction first.** I had suggested trimming `select('*')` to named
columns. Having checked the schema, that would have saved almost nothing: the
`bookings` table has seven columns and `rowToBooking` reads all seven, because
the whole lesson — feedback, ratings, attendance, recordings, courseware state
— lives inside the `booking_data` JSON. Dropping a column would lose data, not
bandwidth. `profiles` is the same: eleven of twelve columns are read.

The real defect was that `fetchCloudBookings()` had **no limit at all** and
ordered oldest-first. Every sync fetched every booking that has ever existed.
Harmless at fifty lessons; ruinous at five thousand — the cost grows with your
accumulated history rather than with what anyone is actually looking at.

Now newest-first and capped at 400 rows for routine student and teacher syncs.

**A data-loss bug I introduced and caught before shipping.**
`mergeCloudBookings(rows, { reconcile: true })` deliberately *deletes* local
bookings absent from the list it is given — that is how the admin view
reflects a lesson someone else removed. Feeding it a truncated page would have
erased every booking past row 400 from the admin's browser. The admin path now
passes `{ complete: true }`. `npm run test:bookingpage` locks this down with 12
checks, including one that walks `Dashboards.jsx` and asserts every
reconciling merge is fed a complete fetch, so the combination cannot come back
by accident.

## Where you actually stand now

Measured per homepage visit: **3,577 bytes** (teachers 3,275 + reviews 246 +
settings 56). Idle costs nothing further, on either the homepage or a
dashboard, and the video is off Supabase entirely.

| Monthly traffic | Supabase egress |
|---|---|
| 1,000 visits | ~3.4 MB |
| 10,000 visits | ~34 MB |
| 100,000 visits | ~341 MB |

Free tier is 5,120 MB. **You are no longer anywhere near it** — that would now
take roughly 1.5 million homepage visits.

## One thing left, if you want it

**Anonymous visitors still open a Realtime socket.** `App.jsx` subscribes to
site-settings on every page load so an admin toggling teacher visibility sees
it live. Every visitor pays for an admin convenience. Subscribing only when an
admin is signed in would remove it. It is small — it does not transfer
meaningful data — so I have left it rather than risk the live-update
behaviour for a marginal gain. Say the word if you want it done.

---

## How to re-measure

```bash
npm run build
cd dist && python3 -m http.server 4173 &
npm run measure:egress       # homepage, 60s idle
npm run measure:egressdash   # dashboard, 60s idle
npm run verify:dashsync      # proves the dashboard still loads and syncs
```
