# Supabase "grace period started — Egress Exceeded"

**Date:** 5 September 2026 · **Grace ends:** 8 September 2026

You received this from Supabase:

> Your organization went over its quota in the previous billing cycle (Egress
> Exceeded). You can continue with your projects until your grace period ends
> on 08 Sep, 2026. After that, the Fair Use Policy will apply. If restrictions
> are applied, requests to your projects will return a 402 status code.

**I need to correct something I told you.** I said the free plan was plenty
based on measurements of your *current* code. Supabase is reporting the
*previous* billing cycle. Both are true, and the gap between them is the whole
story.

---

## What happened

The four egress fixes landed on **9 August 2026**. A Supabase billing cycle is
about 30 days. So the cycle that went over quota was **mostly the old code**.

### The smoking gun: the class video

Before 9 August, `tutorpro-class.mp4` was:

- **5.14 MB**, served from **Supabase Storage**
- sent with **`cache-control: no-cache`** — so it was re-downloaded **on every
  single view**, by every visitor, every time

| Video views in a month | Supabase egress |
|---|---|
| 500 | 2.51 GB |
| **997** | **5.00 GB — the entire free allowance** |
| 1,500 | 7.53 GB |

**Roughly 1,000 video views was the whole month's quota.** That alone explains
the overage.

### The second cause: idle polling

| | Old cost |
|---|---|
| One dashboard tab, 8h/day × 22 days | 858 MB |
| Three such tabs | 2.52 GB |

The dashboard polled every 3 seconds *and* held a Realtime subscription, and
the teacher directory was re-fetched every 10 seconds forever — even for
logged-out visitors who can never see a booking.

Add the two together and 5 GB disappears easily.

---

## What your code costs today — measured this morning

I re-ran both measurement scripts against the current production build:

```
npm run measure:egress       -> 3,577 bytes/min   (3 requests)
npm run measure:egressdash   -> 0 bytes/min       (0 requests)
```

| Scenario | Before 9 Aug | **Now** |
|---|---|---|
| Homepage, idle visitor | 23,241 B/min | **3,577 B/min** |
| Dashboard, idle | 85,242 B/min | **0** |
| Class video, per view | 5.14 MB from Supabase | **0 from Supabase** |

The video now lives at `public/assets/tutorpro-class.mp4`, served by **Vercel**
with `max-age=31536000, immutable`. Vercel's bandwidth is separate from
Supabase's, and the file is cached permanently after the first load.

**At 3,577 bytes per visit you would need about 1.5 million homepage visits a
month to reach 5 GB.**

---

## So: do you need to pay?

**Probably not — but this must be checked, not assumed.**

The warning is about a cycle that ran mostly on the old code. The question
that actually decides it is:

> **What does the CURRENT billing cycle show?**

### Check this — it takes one minute

Go to:

**https://supabase.com/dashboard/project/losmkvvwzijipqrlelyt/settings/billing/usage**

Look at the **Egress** graph and read two things:

1. **The usage for the current cycle** (the one running now)
2. **The shape of the line** — where does it flatten out?

### How to read what you see

| Current-cycle egress | What it means | What to do |
|---|---|---|
| **Under ~1 GB** | The fixes worked. The breach was the old code. | **Do not pay.** Stay free. |
| **1–4 GB and climbing** | Something is still consuming data. | Tell me — I will find it. |
| **Already over 5 GB** | A live leak the measurements did not catch. | Tell me immediately. |

You should also see the **daily** egress line drop sharply around **9 August**.
That drop is the fixes landing. If it is there, the problem is already solved
and the warning is about history.

---

## What happens on 8 September if you do nothing

- The Fair Use Policy applies
- **If** restrictions are applied, requests return **HTTP 402**
- In practice that means the site cannot read the database: logins, bookings
  and dashboards would fail

Restrictions are applied to *ongoing* overage. If your current cycle is well
under 5 GB — which the measurements say it should be — there is nothing
ongoing to restrict.

**This is why checking the current cycle before the 8th matters.** Do not just
wait and hope.

---

## If the current cycle IS still high

Things I have not been able to rule out from code alone, in order of
likelihood:

1. **Someone leaving an old browser tab open.** A tab loaded *before* 9 August
   is still running the old polling code until it is refreshed. Ask everyone
   to fully close and reopen the site once.
2. **Storage buckets.** `classroom-recordings`, `classroom-files`,
   `support-attachments`, `teacher-interview-recordings`. If anyone downloads
   large recordings repeatedly, that is Supabase egress.
3. **The Realtime socket** anonymous visitors open for admin-only site
   settings. Small, but it is a persistent connection.

All three are fixable for free. None require the $25 plan.

---

## Revised recommendation

**Unchanged, but now conditional and with a deadline.**

1. **Before 8 September**, open the usage page and read the current cycle.
2. If it is under ~1 GB — **stay free**. The breach is history.
3. If it is high — **tell me the number** and I will find the cause.
4. Either way: **press the backup button** in Admin → Business → Backup &
   usage. If restrictions ever do land, you want a copy of your data already
   downloaded, not to be scrambling behind a 402.

The one thing that changed: **do not ignore this and find out on the 9th.**
