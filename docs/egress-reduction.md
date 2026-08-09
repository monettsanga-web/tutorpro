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

## Still available if you need more

These are real savings I have **not** made, because each changes behaviour and
I would rather you choose:

1. **`select('*')` on `bookings` and `profiles`**
   (`cloudBookings.js:150`, `cloudProfiles.js:114`). Every sync downloads every
   column of every row, including large JSON blobs — feedback, recording
   lists, courseware state. Selecting only the needed columns and paginating
   would cut this substantially. It is the biggest remaining item, and it grows
   as you take more bookings.

2. **Anonymous visitors open a Realtime socket.** `App.jsx` subscribes to
   site-settings on every page load so an admin toggling teacher visibility
   sees it live. Every visitor pays for an admin convenience. Subscribing only
   when an admin is signed in would remove it.

3. **The homepage video** (`TutorPro Class.mp4`, 5.4 MB) is served from
   Supabase Storage. If it is watched often it will dominate everything else
   here. Moving it to a free host — YouTube unlisted, Cloudflare R2, or
   Vercel's own static hosting — would take it off your Supabase bill entirely.
   Vercel already serves your site, so putting the file in `public/` costs
   nothing extra.

Say the word on any of these and I will do it.

---

## How to re-measure

```bash
npm run build
cd dist && python3 -m http.server 4173 &
npm run measure:egress       # homepage, 60s idle
npm run measure:egressdash   # dashboard, 60s idle
npm run verify:dashsync      # proves the dashboard still loads and syncs
```
