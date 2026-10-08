# Turning on WhatsApp reset codes

The password-reset code system is built and live. Right now it sends the
code **by email**. To send it on **WhatsApp** instead, Meta needs three
things from you. It is free, and takes about 30 minutes.

Until you do this, nothing is broken: parents who registered with an
email address get their code by email as normal. The families this
unlocks are the ones who **registered with a WhatsApp number and have no
email address on file at all** — today they cannot reset a password
without messaging you.

---

## Why a plain message will not work

Meta does not let a business send a WhatsApp message to someone out of
the blue. You may only start a conversation with a **pre-approved
template**, and a one-time passcode has to use the **Authentication**
category. That template is what gets approved — usually within minutes,
because the wording is Meta's own.

---

## Step 1 — Create the WhatsApp app (10 minutes)

1. Go to **https://developers.facebook.com/apps** and sign in with the
   Facebook account that manages the TutorPro page.
2. **Create app** → purpose **Other** → type **Business** → give it the
   name `TutorPro Messaging`.
3. On the app dashboard find **WhatsApp** and press **Set up**.
4. It will create a test number for you and show a **Phone number ID**.
   Copy that number somewhere — it is one of the three values I need.
5. For real use, press **Add phone number** and register the business
   number you want codes to come from. It must be a number that is **not
   currently on a normal WhatsApp or WhatsApp Business app**.

## Step 2 — Create the code template (5 minutes, plus approval)

1. Open **WhatsApp Manager** → **Account tools** → **Message templates**
   → **Create template**.
2. Category: **Authentication**.
3. Name: `tutorpro_reset_code` (lowercase, underscores — this is the
   third value I need).
4. Language: **English**.
5. Leave Meta's default authentication body. Tick **Copy code** for the
   button.
6. Submit. Authentication templates are usually approved in minutes.

## Step 3 — Create a permanent token (5 minutes)

A token from the app dashboard expires in 24 hours, which is no use.

1. **https://business.facebook.com/settings/system-users**
2. **Add** → name it `tutorpro-sender` → role **Admin** → Create.
3. **Add assets** → your app → turn on **Full control**.
4. **Generate new token** → pick your app → permissions
   **whatsapp_business_messaging** and **whatsapp_business_management**
   → **Generate**.
5. Copy the token. **Meta shows it once.**

## Step 4 — Give me the three values

Add them in **Vercel → your project → Settings → Environment Variables**,
for **Production**:

| Name | Value |
|---|---|
| `WHATSAPP_TOKEN` | the permanent token from step 3 |
| `WHATSAPP_PHONE_NUMBER_ID` | the Phone number ID from step 1 |
| `WHATSAPP_OTP_TEMPLATE` | `tutorpro_reset_code` |

Then **Deployments → ⋯ → Redeploy** so they take effect.

Or paste them to me and I will add them — but a token is a password, so
adding them yourself in Vercel is the safer habit.

---

## How to check it worked

1. Go to the site → **Student login** → **Forgot password?**
2. Type a WhatsApp number that is registered on an account.
3. The code should arrive on WhatsApp within seconds.

If it does not, the reason is recorded and the system falls back to
email. Nothing is ever silently dropped: if neither channel works, you
get an email telling you that a parent is locked out and needs help by
hand.

---

## What already works without any of this

- A six-digit code **by email**, valid 15 minutes, five attempts, stored
  hashed — never in plain text.
- The same reply whether or not the account exists, so the form cannot be
  used to discover which phone numbers are registered.
- One code per minute per account, so nobody can be spammed.
- **Payment alerts to you by email** the moment a parent pays — that
  needed no setup and is already running.
