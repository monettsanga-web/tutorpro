# What happens after 8 September?

**Short answer: almost certainly nothing.** Your current cycle is at 4% with
zero overage, and restrictions only apply to organisations that *keep*
exceeding the quota.

Everything below is from Supabase's own documentation, not guesswork.

---

## 1. Nothing is deleted. Ever.

This is the first thing to be clear about, because it is the scariest
possibility and it is simply not what happens.

> *"Your data stays put. A restriction blocks or narrows access. It does not
> delete rows, buckets, or the project."*

And from Supabase's own docs on the 402 status:

> *"You will still have access to your data through the Supabase dashboard
> when the Fair Use Policy is applied."*

**No data loss. No deleted project. No deleted accounts, bookings or
messages.** Worst case is a temporary block on access, not destruction.

---

## 2. Restrictions apply to *continued* overage — not a past one

Supabase's Fair Use Policy says restrictions may apply if:

> *"You **continually** exceed the Free Plan quota"*

You are not continually exceeding it. You are at **0.20 GB of 5 GB (4%)** with
**0 GB overage** in the current cycle. The 6.776 GB belonged to the previous
cycle, on the old code, and the cause (the uncached 5 MB video) has been moved
to Vercel.

**There is no ongoing overage for the policy to act on.**

---

## 3. The timing works strongly in your favour

Your egress chart begins around 10–11 August, which means your billing cycle
almost certainly runs **~10 August → ~9 September**.

| Date | Event |
|---|---|
| 8 Sep | Grace period ends |
| ~9–10 Sep | **Billing cycle resets — quota refills to a full 5 GB** |

The grace period ends **one or two days before your quota refills anyway**.
Even in the worst imaginable case, the exposure window is a day or two, and
Supabase confirms:

> *"Restrictions due to usage limits are lifted once your quota refills at the
> start of the next billing cycle."*

**Confirm your exact dates** on the billing page under *"Upcoming Invoice"* —
that tells you precisely when the quota refills.

---

## 4. What "restrictions" would actually mean, if they ever applied

For completeness, if an organisation *does* stay over quota, Supabase can:

- Pause projects
- Switch the database to **read-only**
- Block new project creation
- Return **HTTP 402** on API requests

For TutorPro that would look like: the website loads (it is served by Vercel),
but logging in, booking a lesson and opening a dashboard would fail, because
those need Supabase.

**This is not your situation.** It is written down here only so the words in
the warning email are not mysterious.

---

## 5. The one thing that genuinely changed — read this part

This is the real consequence of the warning, and it is easy to miss:

> *"This persistent warning means that if you exceed your plan limits **again**,
> you will not receive another grace period and your project **will be
> restricted**."*

**The grace period is one-time. You have now used it.**

So the notice staying on your dashboard is not a bug — it is a marker. If you
breach 5 GB again, restrictions apply **immediately, with no warning**.

Supabase also confirms it clears itself eventually:

> *"The notice and indicator will automatically clear if you continue to stay
> under plan limits for multiple billing cycles."*

Stay under for a few cycles and the warning disappears on its own.

### What this means in practice

The rule already in the usage panel is now the important one:

> **Never serve a large file from Supabase Storage.** Put videos, PDF packs and
> image galleries in `public/assets/` so Vercel serves them cached — Vercel's
> bandwidth does not count against the Supabase quota.

A single 5 MB uncached video is what consumed 6.776 GB. Avoiding that one
mistake is the whole job.

---

## 6. A safety net has been added

Because a 402 would previously have looked like a random, unexplained failure,
the app now recognises it specifically.

If Supabase ever does restrict the project, instead of a confusing error the
site shows a plain message explaining that the free-plan limit was reached,
that **no data has been lost**, and that access returns when the billing cycle
resets. See `src/serviceStatus.js`.

You should never see it. It exists so that if you do, you know immediately what
it is.

---

## Summary

| Question | Answer |
|---|---|
| Will my data be deleted? | **No. Never.** Not rows, not the project. |
| Will the site stop working on 9 Sep? | **Almost certainly not** — you are at 4% with zero overage. |
| Do I need to pay before the 8th? | **No.** |
| What if restrictions did apply? | Temporary. Lifted when the cycle resets ~9–10 Sep. |
| What actually changed? | **You have used your one grace period.** A second breach restricts you immediately. |
| What do I do? | Nothing urgent. Keep large files off Supabase Storage. Take a backup. |

---

## Recommended actions

1. **Take a backup now** — Admin → Business → Backup & usage → *Download
   backup*. Not because anything will go wrong, but because a copy of your data
   in your own hands is worth having regardless.
2. **Check your billing cycle dates** on the Supabase billing page so you know
   exactly when the quota refills.
3. **Re-check the usage page in early October.** One full clean cycle confirms
   it permanently, and after a few clean cycles the warning clears itself.
4. **Keep the rule:** large files go in `public/assets/`, never Supabase
   Storage.
