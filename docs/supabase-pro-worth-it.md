# Is the Supabase $25 plan worth it for TutorPro?

**Date:** 5 September 2026 · **Short answer: no — not now, and not soon.**

You said $25 is expensive right now. Based on your real numbers, you should
not pay it. Here is the evidence, and what I built so you are still protected
for free.

---

## What $25/month actually buys you

Supabase Pro is $25/month. Here is every difference, next to what you
actually use.

| What Pro gives you | Free plan | Pro plan | Do you need it? |
|---|---|---|---|
| Database size | 500 MB | 8 GB | **No** — you are using well under 1 MB |
| Egress (data out) | 5 GB/month | 250 GB | **No** — you use ~3.5 KB per visit |
| File storage | 1 GB | 100 GB | **No** — video moved to Vercel already |
| Monthly active users | 50,000 | 100,000 | **No** — you have a handful |
| Edge function calls | 500,000/mo | 2,000,000 | **No** — nowhere near |
| Realtime connections | 200 | 500 | **No** |
| Projects | 2 | Unlimited | **No** — you have 1 |
| **Daily automatic backups** | **None** | **Daily, 7-day** | **This is the only real one** |
| No pausing after 7 days idle | Pauses | Never | Only if the site goes quiet |
| Email support | No | Yes | Nice, not essential |

**Nine of the ten upgrades are irrelevant to you.** You would be paying $25 a
month, $300 a year, almost entirely for the tenth one: automatic backups.

---

## The numbers, measured — not guessed

These come from the egress work already done on your site (`docs/egress-reduction.md`),
plus the new usage meter in your admin dashboard.

### Database size
Your whole database — every parent, teacher, booking, message and setting —
is currently **under 1 MB against a 500 MB allowance**. You can see the live
figure yourself: **Admin dashboard → Business → Backup & usage.**

To fill 500 MB you would need roughly **500,000 times your current data.**

### Egress (the limit people actually hit)
| | Before the fixes | Now |
|---|---|---|
| Homepage, visitor idle | 23,241 bytes/min | **3,577 bytes/min** |
| Dashboard, idle | 85,242 bytes/min | **0** |
| Class video | 5.14 MB **every single view** | **0 from Supabase** (served by Vercel) |

At ~3.5 KB per homepage visit, the 5 GB free allowance covers roughly
**1.5 million visits a month.** You are not close.

The video move matters most: before, just **1,000 video views** would have
burned 5 GB — your entire monthly allowance — in one go. That is gone now.

### Why it feels tight but isn't
The classroom feature is currently switched off, which also removed the
single biggest bandwidth consumer. If you turn video classes back on later,
egress becomes a real conversation again. Until then, it is not.

---

## The one genuine risk — and it is now fixed for $0

**The free plan takes no backups. None.** If the project were ever deleted,
corrupted, or locked out, there would be no copy of your parents, teachers or
booking history anywhere.

That is a bigger risk to your business than the $25, and it is the honest
reason to consider Pro.

**So I built the backup instead.**

### Admin dashboard → Business → Backup & usage

- **One button: "Download backup".** It produces a single dated file,
  `tutorpro-backup-2026-09-05.json`, holding every row your account can read —
  profiles, bookings, direct messages, site settings, support conversations —
  plus everything saved in your browser.
- **A reminder** telling you how long since your last backup. It shows an
  amber warning once 30 days have passed.
- **A usage gauge** measuring your database against the 500 MB free limit, with
  a plain verdict: *"The free plan is plenty"*, *"Worth keeping an eye on"*, or
  *"Close to the free limit"*.
- **A per-table breakdown** so you can see exactly what you have.

The estimate is deliberately **pessimistic** — it measures data as the API
returns it and adds 60% for indexes — so it can warn you early but will never
falsely reassure you.

**Your job: press that button once a month.** Save the file to Google Drive or
email it to yourself. That is the entire thing Pro would be selling you.

---

## The pausing catch — worth knowing

Free projects **pause after 7 days with no activity.** Data is not lost, but
the site stops working until you manually restore it from the Supabase
dashboard.

**This will not affect you while the site has real visitors** — any page load
counts as activity. It only bites a project nobody is using. If your traffic
ever went silent for a full week you would need to click "Restore" once.

---

## What I would spend money on instead

If you have a small budget, none of it should go to Supabase yet:

1. **£0 — Get the Resend DNS records into Vercel.** Still the single biggest
   problem you have. **No email of any kind is sending right now** —
   announcements, messages, booking confirmations. That costs you real
   students. It is free to fix and it is blocking everything.
2. **£0 — Backlinks.** Facebook page About section, Trustpilot profile,
   Filipino homeschool groups. Zero external links is your real SEO ceiling.
3. **£0 — Submit your new Maths/Science/ICT pages** to Search Console.
4. **~$1/month later — a proper email address** (`hello@tutorpro.site` via
   Zoho, free tier). More trustworthy than a Yahoo address on invoices.

Every one of those brings in students. $25 to Supabase brings in none.

---

## When you SHOULD upgrade

Revisit this when any of these happen — the usage panel will tell you:

- The gauge crosses **40%** ("Worth keeping an eye on")
- You **turn video classes back on** and they get regular use
- You pass roughly **100 active families**
- Monthly revenue makes $25 trivial — at that point, buy it for the
  backups and the peace of mind, not because you were forced to

---

## Bottom line

> Stay free. Press the backup button once a month. Spend the $25 on getting
> your email working and getting found — those bring students, Supabase Pro
> does not.
