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
| `_dmarc` TXT | ✅ `v=DMARC1; p=none; rua=mailto:monettsanga@gmail.com` |

**All four records pass**, confirmed against both Cloudflare and Google DNS
on 7 September 2026. The email authentication set is complete.

## Every email feature is now live

All four functions are deployed with `RESEND_API_KEY` present:

- `booking-notification` — booking confirmations
- `message-notification` — direct messages to parents and teachers
- `follow-up-email` — follow-ups and referral invitations
- `mass-announcement` — announcements to everyone

---

## DMARC — done

Added 7 September 2026 and confirmed live on both Cloudflare and Google DNS:

```
_dmarc.tutorpro.site  TXT  v=DMARC1; p=none; rua=mailto:monettsanga@gmail.com
```

`p=none` is monitor-only: it does not affect delivery, it only asks receiving
servers to report what they observe. That is the correct first step — starting
at `p=reject` risks silently binning legitimate mail.

This matters most for the QQ Mail parents, who make up the bulk of the
recipients seen in the send log. Gmail and Yahoo have required DMARC from bulk
senders since February 2024, and QQ treats its absence as a spam signal.

### What to do with the reports

Aggregate reports now arrive weekly at `monettsanga@gmail.com` as XML
attachments. They are not meant to be read by hand — paste one into a free
viewer such as dmarcian's XML-to-human tool if a delivery problem ever needs
investigating. Otherwise they can be ignored.

### Tightening later (optional, not now)

After a few months of clean reports the policy can move to `p=quarantine` and
eventually `p=reject`, which stops others spoofing the domain. There is no
hurry, and no benefit until the reports confirm every legitimate sender is
passing.

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
