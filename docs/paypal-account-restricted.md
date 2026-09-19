# Why the payment button still does not work

**I have now proved this is not a website problem.** PayPal is refusing to let
your account receive money. Your website, your keys and your setup are all
correct — PayPal itself is saying no.

Your PayPal dashboard looks perfectly normal, which is exactly what makes this
confusing. **A restriction can be active even when no warning banner is
shown.** That is why I tested it directly instead of trusting the dashboard.

---

## The proof

I asked PayPal's own servers to create a simple $10 order using your live keys.
PayPal replied:

```
HTTP 422
issue:       PAYEE_ACCOUNT_RESTRICTED
description: The merchant account is restricted.
debug id:    77a4a0e7a1400
```

I then ruled out every other possible cause:

| Possible cause | Ruled out how | Result |
|---|---|---|
| Wrong/expired keys | PayPal accepted the login | ✅ keys valid |
| Sandbox vs live mix-up | Confirmed mode = **live** | ✅ correct |
| Browser key ≠ server key | Both end `…F5ZhT1` | ✅ same account |
| Our order format was wrong | Retried a bare $10 order, no extras | ❌ still blocked |
| The website crashing | Fixed earlier; buttons now render | ✅ fixed |
| **PayPal blocking the account** | PayPal's own reply | ❌ **this is it** |

That fourth row is the important one. A **completely plain $10 order with no
items, no description and no custom fields was still refused.** Nothing about
how the website asks for money is the problem.

---

## 🔴 What you need to do

### 1. Check the right account
Your keys end in **`…F5ZhT1`**. In PayPal go to
**Settings (⚙️) → Account Settings → API access**, and confirm a live REST app
exists whose Client ID ends in those characters. If it does not, the keys in
the website belong to a *different* PayPal account and that is the restricted
one.

### 2. Look where the banner does not show
The homepage can look fine while a restriction is active. Check all of these:

- **https://www.paypal.com/restore/dashboard** ← the direct restriction page
- **Resolution Center** (top menu) → look at **Your open cases**
- **Notifications** — the bell icon (yours shows **4 unread**)
- **Settings → Account Settings → Account limitations**

Complete every open item. Usually photo ID, proof of address, bank
confirmation, or questions about what your business sells.

### 3. If you find nothing, contact PayPal
This is the most likely outcome, since your dashboard looks clean. Send them
exactly this:

> My business account cannot accept payments on my website. The PayPal API
> returns `PAYEE_ACCOUNT_RESTRICTED — The merchant account is restricted` for
> every order, including a plain $10 order with no line items.
>
> PayPal debug ID: **77a4a0e7a1400**
> My REST Client ID ends in: **F5ZhT1**
>
> There is no banner or open case in my dashboard. Please tell me what
> restriction is on my account and exactly how to remove it.

**Message them on Facebook or X — replies are much faster than by phone.**

Typical causes for a new business account: the account is new and selling
services, identity or bank details were never fully confirmed, or the account
was auto-flagged during review. It is usually cleared in **1–3 business days.**

---

## Check it yourself anytime — no developer needed

I built this into your dashboard so you never have to wait for me:

> **Admin → Payments → "Is PayPal accepting payments?" → Run check**

It tells you in plain words whether PayPal is accepting orders, which PayPal
account your keys belong to, and the debug ID to quote to support. Nothing is
charged when you run it.

**Run it after PayPal tells you the restriction is lifted.** When it turns
green, real parents can pay.

---

## Meanwhile, you are not losing bookings

When card payment fails, parents now see a clear explanation plus
**WhatsApp, Messenger, WeChat and Email buttons** with their name and their
child's name already filled in. They message you, and you take the booking and
payment directly. Nobody hits a dead end.

---

## What I fixed along the way

**1. The dashboard was crashing (fixed).** For accounts with no parent name
saved, `account.parentName.split(...)` threw and the error boundary replaced
the whole page with *"Something didn't load correctly."* The payment box lives
on that page, so the button was never drawn. Fixed, with 22 tests covering
missing, empty and null names.

**2. Failures were silent (fixed).** PayPal's button hid the error inside its
own window. Now every failure is explained, and only failures a parent can
actually fix offer a "try again".

**3. No way to check (fixed).** Hence the Run check button above.

### Tests
- `npm run test:paymenterrors` — 47 checks
- `npm run verify:paymentfailure` — 38 browser checks
- `npm run verify:nocrash` — 22 checks
