# Email is working — 7 September 2026

After weeks blocked, **email now sends to real parents.**

## The proof

The Resend sending log shows messages delivered to genuine parent addresses:

```
1376196392@qq.com        Delivered
ruitongpcwow@icloud.com  Delivered
762433747@qq.com         Delivered
1252231616@qq.com        Delivered
470383@qq.com            Delivered
418478981@qq.com         Delivered
69231264@qq.com          Delivered
```

These are **not** the Resend account owner's address. That is what makes it
conclusive: before the domain was verified, Resend would only deliver to
`monettsanga@gmail.com` and returned a 403 for everybody else.

## What was actually wrong

The domain `tutorpro.site` was unverified in Resend, because the three DNS
records were missing. Resend listed the provider as GoDaddy, but GoDaddy is
only the registrar — the nameservers are `ns1/ns2.vercel-dns.com`, so the
records had to be added in **Vercel**, not GoDaddy. That mismatch is why
"Auto configure" never worked.

Once the records were in Vercel, the domain verified in about 8 minutes:

```
Sep 04, 7:03 PM   Domain added
Sep 04, 7:04 PM   DNS verified
Sep 04, 7:11 PM   Domain verified
```

### This also explains "it worked last month but now it isn't"

It very likely never worked for anyone except the account owner. An
unverified Resend domain silently 403s every other recipient, so the owner
saw their own test emails arrive and reasonably concluded the system worked.

## Current DNS state (verified against Cloudflare and Google DNS)

| Record | Status |
|---|---|
| `resend._domainkey` TXT (DKIM) | ✅ Present, 218 chars, ends `QIDAQAB` — complete |
| `send` TXT (SPF) | ✅ `v=spf1 include:amazonses.com ~all` |
| `send` MX | ✅ `10 feedback-smtp.ap-northeast-1.amazonses.com` |
| `_dmarc` TXT | ⚠️ **MISSING** — see below |

## Every email feature is now live

All four functions are deployed with `RESEND_API_KEY` present:

- `booking-notification` — booking confirmations
- `message-notification` — direct messages to parents and teachers
- `follow-up-email` — follow-ups and referral invitations
- `mass-announcement` — announcements to everyone

---

## ⚠️ One thing still worth adding: DMARC

There is no `_dmarc` record. Email works without it, but since February 2024
**Gmail and Yahoo require DMARC from bulk senders**, and QQ Mail treats its
absence as a spam signal. Given that most of your parents are on QQ, this
matters more for you than for most sites.

Adding it improves inbox placement and protects the brand from spoofing.

### Add this in Vercel

Vercel → Settings → Domains → tutorpro.site → DNS Records:

| Field | Value |
|---|---|
| **Name** | `_dmarc` |
| **Type** | `TXT` |
| **Value** | `v=DMARC1; p=none; rua=mailto:monettsanga@gmail.com` |
| **TTL** | `60` |

`p=none` is monitor-only: it changes nothing about delivery, it just asks
receiving servers to report what they see. That is the correct, safe first
step — never start at `p=reject`.

The `rua=` address receives weekly aggregate reports. Use any address you
actually read.

---

## Notes

- `tutorpro.site` has **no MX record**, so it is send-only. Replies to
  `notifications@tutorpro.site` go nowhere. If a real inbox is wanted at
  `hello@tutorpro.site`, Zoho Mail's free tier provides one.
- Setting the Supabase secret `BOOKING_FROM_EMAIL` to
  `TutorPro English <notifications@tutorpro.site>` makes every function use
  one consistent address, changeable in a single place. Optional — the
  built-in defaults already work.
- Monitor deliverability at https://resend.com/emails. Watch for `Bounced`
  or `Complained` rather than `Delivered`.
