# Fix the Chinese text in notification emails

**You must do this by hand.** Email templates live in Supabase, not on the
website, so pushing to GitHub does not change them. Until you paste the new
version in, booking emails will keep going out in English **and** Chinese.

It takes about three minutes.

---

## What was wrong

Every booking email was written once, in English and Chinese together, and
that same email was sent to everybody. That is why you received Chinese text
when you booked a test class from the Philippines.

## What it does now

Each person gets **one** email in **their own language**, chosen from:

1. the language the website last showed them (set from their IP address), then
2. the country detected from their IP when they registered, then
3. English.

The lesson time is also shown on their own clock, not always Manila time.
A Korean parent now reads *"2026년 10월 7일 수요일 5:00 PM (현지 시간 · GMT+9)"*
for a lesson you see as 4:00 PM.

---

## Step 1 — open the function

Go to **https://supabase.com/dashboard/project/losmkvvwzijipqrlelyt/functions**

Click **booking-notification**.

## Step 2 — replace the code

Click **Edit function** (or the code tab). Select everything in the editor and
delete it.

Open this file in your project and copy **all** of it:

```
supabase/functions/booking-notification/index.ts
```

Paste it into the Supabase editor.

## Step 3 — deploy

Click **Deploy**. Wait for it to say deployed — about 30 seconds.

## Step 4 — check it

Book a test class on the website. The email should now be entirely in English,
with no Chinese anywhere.

---

## The same fix for direct messages

The "you have a new message" email had the same problem. When you are ready,
repeat the three steps above for the **message-notification** function, using:

```
supabase/functions/message-notification/index.ts
```

This one is less urgent — it only sends when you or a teacher writes a direct
message.

---

## If something goes wrong

The old version is still in your Git history, so nothing is lost. Tell me and
I can give you the previous file back.

If the Deploy button reports an error, copy the message and send it to me —
do not leave the function half-saved, because notification emails stop
sending while it is broken.

---

## Languages covered

English, Filipino, Korean, Simplified Chinese, Traditional Chinese, Japanese,
Spanish, Portuguese, French, German, Vietnamese, Thai, Polish and Arabic
(right-to-left).

Anyone whose language is not on that list receives English rather than a
half-translated message.
