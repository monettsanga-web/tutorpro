# Finish setup — the 3 things only you can do

Everything in the code is deployed and live. These three steps need your
Supabase and Cloudflare accounts, so I cannot do them for you.

**Total time: about 20 minutes.** No coding.

Checked against your live project on 5 August 2026.

---

## Why each one matters

| # | Step | What breaks without it | Urgency |
|---|---|---|---|
| 1 | Deploy `turn-credentials` | Video fails to connect on mobile data, office and school wifi | 🔴 **Costing you lessons now** |
| 2 | Run the SQL | Website-controls switch only works on one browser; the site shows placeholder teachers instead of your real ones | 🟡 Two minutes |
| 3 | Deploy `follow-up-email` | The Send button in Follow-ups stays disabled | 🟢 Only matters once trials start |

---

## The quick way

From the project folder:

```bash
bash scripts/finish-setup.sh
```

It installs the Supabase CLI if needed, signs you in, links the project,
deploys both functions, and then re-checks everything and tells you what is
still outstanding. Safe to run repeatedly.

Then do the two manual bits below: the **SQL** and the **Cloudflare secrets**.

---

## Step 1 — Video relay (the important one)

### 1a. Get free Cloudflare credentials

1. Sign up at **https://dash.cloudflare.com** — free, no credit card
2. Sidebar → **Realtime** (previously called *Calls*)
3. **Create** → **TURN** → name it `tutorpro-classroom`
4. Copy the **TURN Key ID** and the **API Token**

Free allowance is 1,000 GB a month, roughly **3,000 relayed lessons**. Only
lessons that cannot connect directly use the relay at all, so in practice this
stays free.

### 1b. Store them in Supabase

**Supabase Dashboard → Edge Functions → Secrets → Add new secret**

| Name | Value |
|---|---|
| `CLOUDFLARE_TURN_KEY_ID` | your TURN Key ID |
| `CLOUDFLARE_TURN_API_TOKEN` | your API Token |

### 1c. Deploy the function

Handled by `finish-setup.sh`, or manually:

```bash
supabase functions deploy turn-credentials
```

---

## Step 2 — The database (2 minutes)

1. Open **https://supabase.com/dashboard/project/losmkvvwzijipqrlelyt/sql/new**
2. Open the file **`supabase/RUN_THIS_SETUP.sql`** in this project
3. Copy **all** of it, paste into the editor, press **Run**

You should see `TutorPro site settings table is ready` and
`TutorPro English approved teacher directory is ready`.

Safe to run more than once — nothing is deleted.

---

## Step 3 — Follow-up emails

Handled by `finish-setup.sh`, or manually:

```bash
supabase functions deploy follow-up-email
```

It reuses the `RESEND_API_KEY` secret you already have for booking
notifications. If that secret is missing, add it under Edge Functions → Secrets.

---

## Checking it worked

**Video** — open a lesson as the teacher, join as a student **on a different
network**. A phone on mobile data is the ideal test, because that is exactly
the case that used to fail.

**Website controls** — Admin → Website controls, change the setting, then open
the site in a different browser. The change should be visible there too.

**Follow-ups** — Admin → Follow-ups. The **Send email** button should no longer
be greyed out.

**Or just re-run the script** — it reports the live status of both functions:

```bash
bash scripts/finish-setup.sh
```

---

## If something goes wrong

**`supabase: command not found`** — install it with `npm install -g supabase`,
or see https://supabase.com/docs/guides/cli

**Link asks for a database password** — Supabase → Settings → Database →
Reset database password.

**A function still shows 404 after deploying** — run it directly to see the
error:

```bash
supabase functions deploy turn-credentials --project-ref losmkvvwzijipqrlelyt
```

**Video still fails** — confirm both Cloudflare secrets are saved in Supabase
(not in Vercel: this pair belongs to Supabase). The classroom now reports the
specific reason in the help banner rather than retrying silently.
