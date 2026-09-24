# The Google email report — what it says

**Short answer: it is a perfect score. Nothing is wrong.**

---

## What Google sent you

That XML file is a **DMARC report**. Google sends one every day your domain
sends email. It answers a single question:

> When Gmail received messages claiming to be from `tutorpro.site`,
> could it verify they genuinely came from you?

## Your report, 22 September 2026

| | |
|---|---|
| Messages Gmail received from your domain | **3** |
| Verified as genuinely yours | **3 (100%)** |
| Failed verification | **0** |
| Sent to spam or rejected | **0** |

Every message passed **both** checks — DKIM and SPF. The sending servers were
Amazon SES in Tokyo (`e234-50.smtp-out.ap-northeast-1.amazonses.com`), which is
exactly what Resend uses to send your mail. Nothing unexpected appeared.

**This is what a healthy report looks like.** Most small businesses cannot
produce one, because their email is not set up properly. Yours is.

Only 3 messages because your site simply did not send many that day. The
percentage is what matters, not the volume.

---

## Reading future reports without asking me

You will get one of these most days. Rather than opening XML:

```
node scripts/read-dmarc-report.mjs ~/uploads
```

Point it at a single file or a whole folder. It prints a plain summary and
tells you outright whether anything needs attention. If Google sends a `.gz`
or `.zip`, unzip it first.

It will say **✅ HEALTHY** or **⚠️ SOME MESSAGES FAILED VERIFICATION** with the
offending addresses listed.

---

## Worth considering: turn on protection

Your current setting is:

```
v=DMARC1; p=none; rua=mailto:monettsanga@gmail.com
```

`p=none` means **monitor only**. Google tells you what happened but takes no
action. Right now, if somebody forged `notifications@tutorpro.site` to phish
your families — *"your payment failed, click here"* — Gmail would still deliver
it to their inbox.

Since your own mail passes 100%, you can safely switch that on:

```
v=DMARC1; p=quarantine; pct=100; rua=mailto:monettsanga@gmail.com; fo=1
```

`p=quarantine` tells every mailbox provider: *if a message claiming to be from
tutorpro.site cannot be verified, put it in spam.* Forged mail stops reaching
parents, and your genuine mail is unaffected because it already passes.

### How to change it

1. Go to **Vercel → your project → Settings → Domains → tutorpro.site → DNS Records**
2. Find the **TXT** record named `_dmarc`
3. Replace its value with the line above
4. Save

*(It must be changed in Vercel, not GoDaddy — your nameservers are
`ns1/ns2.vercel-dns.com`. This is the same thing that made the original email
setup confusing.)*

### After changing it

Watch reports for about a week. If anything starts failing, changing
`p=quarantine` back to `p=none` takes thirty seconds and undoes it completely.

**One thing to watch:** password reset emails. Those are sent by Supabase, not
by us, and by default they come from Supabase's own address — so they are not
affected. But if you ever switch Supabase to send from `@tutorpro.site`, tell
me first, because that would need setting up properly before it would pass.

---

## Is this urgent?

No. Your email works and is landing properly. `p=quarantine` is protection
against somebody impersonating you — worth having for a business that takes
payments from families, but not something to rush.

The reports are the important part, and those are already arriving.
