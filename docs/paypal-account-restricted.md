# The payment button: what was wrong and what you must do

**There were TWO separate problems.** I have fixed one of them; the other one
only you can fix.

| # | Problem | Who fixes it | Status |
|---|---|---|---|
| 1 | The dashboard crashed, so the button never appeared | Me | ✅ **Fixed and live** |
| 2 | PayPal has restricted your account | **You** | ⏳ **Waiting on you** |

## Problem 1 — the dashboard was crashing (fixed)

This is the one I missed the first time, and it is probably what you were
actually seeing. For any account without a parent name saved, the dashboard
hit an error while drawing the page:

```
account.parentName.split(' ')[0]
TypeError: Cannot read properties of undefined (reading 'split')
```

The whole page was then replaced by *"Something didn't load correctly."* The
payment box lives on that same page, so **the PayPal button was never drawn at
all.** Nothing was wrong with the button — the page it sits on had already
died before it got a chance to appear.

I reproduced this on the live site with a real logged-in account, fixed it,
and added a test that covers four variations so it cannot come back. **The
buttons now render correctly.**

## Problem 2 — PayPal has restricted your account (needs you)

Even with the page fixed, PayPal itself still refuses the payment. I checked
again just now, from inside a real logged-in session on your live site:

```
POST /api/paypal/create-order
400  {"error":"PAYEE_ACCOUNT_RESTRICTED: The merchant account is restricted."}
```

Only you can lift this — see the steps below.

---

## What "payee restricted" means

"Payee" means the account **receiving** the money — yours. PayPal is saying:
this account is not allowed to take payments right now.

Everything else was verified working, so we can rule it out:

| Checked | Result |
|---|---|
| Your live PayPal Client ID on the site | ✅ correct and loading |
| PayPal's SDK script | ✅ loads (200, 100 KB) |
| `/api/paypal/create-order` deployed | ✅ responding |
| `/api/paypal/capture-order` deployed | ✅ responding |
| Login/security checks | ✅ working |
| Dashboard renders the button | ✅ **fixed — was crashing** |
| **PayPal accepting an order** | ❌ **blocked — account restricted** |

## Why nobody saw an error

Two reasons stacked on top of each other. The dashboard crash replaced the
page before the button existed. And when the button *did* appear, PayPal's
own sealed window quietly swallowed the failure, so a parent saw a spinner
and then nothing. Both of those are fixed: the page no longer crashes, and a
failed payment now explains itself.

---

## 🔴 What YOU need to do (only you can do this)

This cannot be fixed with code. Roughly 10 minutes:

1. Go to **https://www.paypal.com** and sign in to the **business** account
   that receives your class payments.
2. Look for a **red or yellow banner** at the top of the dashboard.
3. Open the **Resolution Center** (top menu), or go directly to
   **https://www.paypal.com/restore/dashboard**
4. Complete **every open item** it lists. The usual ones are:
   - Confirm your identity (photo ID)
   - Confirm your address
   - Confirm your bank account or card
   - Answer questions about what your business sells
5. Submit and wait. PayPal usually clears it in **1–3 business days**.

**Checkout starts working again by itself the moment the restriction lifts.**
Nothing needs to be redeployed.

### If the Resolution Center looks empty
Contact PayPal directly and use the exact words:

> My business account is returning PAYEE_ACCOUNT_RESTRICTED when customers try
> to pay on my website. Please tell me what restriction is on my account and
> how to remove it.

Message them on Facebook or X — people usually get a faster reply there than
by phone.

---

## What the website does now (already live)

Parents no longer hit a dead end. When card payment cannot work they see:

> **Card payment is temporarily unavailable**
> Our payment provider has put a hold on our account, so online card payment
> cannot be completed right now. This is a problem on our side — nothing is
> wrong with your card and you have not been charged.

…followed by **WhatsApp, Messenger, WeChat and Email** buttons, with the
parent's and child's names already filled into the message. **So you can still
take the booking and the payment by hand while PayPal is sorted out.** You do
not lose the sale.

Three deliberate decisions:

- **No "try again" button** for this error. Retrying can never succeed, and
  telling a parent to keep trying would waste their time and their trust.
- **The parent never sees `PAYEE_ACCOUNT_RESTRICTED`.** Jargon in front of
  someone holding a card is how you lose them.
- **If a payment ever succeeds but credits fail to appear**, the message says
  *"Do not pay again"* and routes them to you. That is the only failure that
  can cost a parent real money twice.

## Other failures now handled properly

| What happens | What the parent sees | Retry offered? |
|---|---|---|
| Your account restricted | We explain it is our side, offer contact | No |
| Card declined by their bank | Try another card or call your bank | Yes |
| They closed the PayPal window | Nothing charged, start again anytime | Yes |
| Ad-blocker blocked PayPal | Turn off the blocker and refresh | Yes |
| Sign-in expired | Sign in again and retry | Yes |
| Paid but credits missing | **Do not pay again** — contact us | No |

## Tests

- `npm run test:paymenterrors` — 47 checks
- `npm run verify:paymentfailure` — 38 browser checks, driving the exact live
  error through a real headless browser
- `npm run verify:nocrash` — 22 checks that the dashboard survives accounts
  with a missing, empty or null name (the crash in Problem 1)

## How to confirm it is fixed later

Once PayPal clears the restriction, run this and look for `orderId`:

```bash
curl -s -X POST https://www.tutorpro.site/api/paypal/create-order \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{"accountId":"YOUR_ID","billingPlan":"weekly","weeklySessions":2}'
```

Or just ask me and I will check it for you.
