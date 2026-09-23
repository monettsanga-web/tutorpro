# Turning on the welcome email — about 5 minutes

The welcome email is written and wired into registration. It needs one
deployment step from you, because only you can log in to Supabase.

**Nothing is broken until you do this.** New parents already see the welcome
card on their dashboard. The email is the addition.

---

## Deploy it

1. Open **https://supabase.com/dashboard/project/losmkvvwzijipqrlelyt/functions**
2. Click **Deploy a new function** → **Via Editor**
3. Name it exactly:

   ```
   welcome-email
   ```

   The name must match — the website calls it by this name.

4. Delete the sample code in the editor.
5. Open `supabase/functions/welcome-email/index.ts` from your repository,
   copy **everything**, and paste it in.
6. Click **Deploy**.

That is it. The secrets it needs — `RESEND_API_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` — are already set for your other functions and are
shared across all of them.

---

## Check it worked

Register a test parent account on the site with an email address you can open,
then look for **"Welcome to TutorPro English — your free first class"**.

If it does not arrive, open **https://resend.com/emails**. Every attempt is
listed there with its status, which tells you whether the problem is sending
or delivery.

---

## Why this should reach the inbox, not spam

Your domain already authenticates properly. I verified all three live:

| Record | Status |
|---|---|
| SPF | ✅ `v=spf1 include:amazonses.com ~all` |
| DKIM | ✅ present, 218 characters |
| DMARC | ✅ `v=DMARC1; p=none` |

That is the foundation, and most senders who land in spam fail it. On top of
that, the email itself is built to pass filtering:

- **Plain text is sent alongside the HTML.** An HTML-only email is one of the
  strongest spam signals there is. Every legitimate newsletter sends both.
- **One-click unsubscribe headers.** Gmail and Yahoo's bulk sender rules
  effectively require these now, and mail without them is filtered harder even
  at low volume.
- **Reply-To points at `sejongenglish@yahoo.com`.** This matters more than it
  sounds — see the warning below.
- **No spam-trigger language.** No capitals, no stacked exclamation marks, no
  "FREE!!!", no countdown, no link shorteners, no tracking pixel.
- **A plain subject** describing the contents rather than baiting a click.
- **Clear identification**: who is writing, why they received it, and your DTI
  registration number.

---

## ⚠️ One thing you should fix separately

**`tutorpro.site` has no MX record**, which means it can send mail but cannot
receive any. If a parent replies to `notifications@tutorpro.site`, their reply
**disappears silently** — they think they have contacted you and hear nothing.

I have worked around it by setting Reply-To to your Yahoo address, so replies
do reach you. But a sending domain that cannot receive mail is also a mild
spam signal in itself.

**The proper fix is free:** create a Zoho Mail account for `tutorpro.site` and
add its MX records. You would get a real `hello@tutorpro.site` inbox, replies
would work directly, and deliverability would improve. Roughly 20 minutes.
Say the word and I will write the steps.

---

## What the email says

Greets the parent by name, then:

- **Your first class is free** — 25 minutes, one-to-one, no card needed, no
  obligation, with a button to book
- **Questions before you book?** — WhatsApp, Messenger, WeChat, KakaoTalk, and
  a note that they can simply reply to the email
- **Useful pages** — how lessons work, common questions, pricing

Every claim matches the real policy. Nothing is exaggerated.

---

## Safeguards already built in

- **One email per account, ever.** The profile is stamped after a successful
  send, so nobody is welcomed twice.
- **The stamp is written only after the send succeeds**, so a temporary Resend
  outage can retry rather than marking someone as welcomed who never received
  anything.
- **Registration never fails because of email.** The call is not awaited and
  every error is swallowed. If this function is not deployed, sign-up works
  exactly as it does today.
- **It cannot be used to send mail to strangers.** The recipient comes from
  the signed-in parent's own profile, never from the request.
- **Families who registered with a phone number or WeChat ID are skipped**
  quietly — they have no email address, and that is normal rather than an
  error. They still get the dashboard welcome card.
