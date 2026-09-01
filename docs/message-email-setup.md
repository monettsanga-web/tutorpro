# Turning on email alerts for messages

Two one-off steps. About 5 minutes. Until you do them, messaging works inside
the site but **no email is sent**.

---

## Something you should know first

While building this I found that **direct messages were never reaching anyone.**

The chat was saving messages to your own browser only. Your copy appeared in
the thread straight away, so it looked like it worked — but the parent or
teacher never saw it, on any device, ever.

There was also **no Message button on lesson cards**, so there was no way to
start a chat from a booking in the first place.

Both are fixed. Messages now go through the shared database, appear on the
other person's screen instantly, and trigger an email.

> If you ever sent a message that got no reply, this is probably why. Those old
> messages are still on the device you typed them on — they were never sent,
> so you may want to resend the important ones.

---

## Step 1 — Create the messages table

1. Open the SQL editor:
   https://supabase.com/dashboard/project/losmkvvwzijipqrlelyt/sql/new
2. Open the file `supabase/direct_messages.sql` from your project.
3. Copy **everything** in it, paste into the box, and click **Run**.

You should see three rows listing policies named *read own conversations*,
*recipient marks read* and *send as self*. That means it worked.

This only **creates** a new table. It does not touch your students, teachers,
bookings, payments or anything else.

---

## Step 2 — Deploy the email function

The email is sent by a small piece of server code. You already have four of
these running (booking emails, support emails, follow-ups, the AI interview),
so this is the same process.

**If you have the Supabase CLI on your computer:**

```bash
supabase functions deploy message-notification
```

**If you don't**, do it in the browser:

1. Go to https://supabase.com/dashboard/project/losmkvvwzijipqrlelyt/functions
2. Click **Deploy a new function**, name it exactly:

   ```
   message-notification
   ```

3. Open `supabase/functions/message-notification/index.ts` in your project,
   copy all of it, paste it in, and deploy.

> The name must match exactly. The site calls `message-notification`; a typo
> means the message still sends but no email goes out.

---

## Step 3 — Check the email key is there

This reuses the same key your booking emails already use, so it is probably
set already.

1. Go to **Project Settings → Edge Functions → Secrets**
2. Confirm `RESEND_API_KEY` is listed.

If it is missing, your booking confirmation emails would also be failing —
tell me and I will help you sort it.

---

## How to test it

1. Open your admin or teacher dashboard.
2. Find any lesson and click **Message …** on the card.
3. Send a short message.

You should see one of two things under the message box:

| What it says | What it means |
| --- | --- |
| **Sent · [name] has been emailed.** | Everything is working. |
| **Sent.** followed by a reason | The message was delivered in the site, but the email did not go. The reason tells you why. |

The second case is deliberate. The message really is delivered — only the
email alert failed — and the site says exactly that rather than pretending.

Common reasons and what they mean:

- *Recipient has no email address* — that account has no email on file.
- *RESEND_API_KEY is not configured* — Step 3.
- *Failed to send a request to the Edge Function* — Step 2 not done, or the
  function name is misspelled.

---

## What the parent or teacher receives

An email from **TutorPro English** with:

- your name in the subject, so it does not look automated
- the message text, so they can read it without logging in
- a **Read and reply** button that opens the site

Replies happen inside TutorPro so the whole conversation stays in one place.

---

## Notes on how it is built

**It cannot be abused to send spam.** The site sends only a message *ID* to the
server, never the text. The server looks the message up itself and checks you
are the person who wrote it. If the text came from the browser, anyone could
use your domain to email anything to anyone.

**Nobody gets emailed twice** for the same message, even on a retry or a double
click.

**The message is saved before the email is attempted.** If the email provider
is down, the message is still delivered inside the site. The other way round
would mean emailing someone about a message that does not exist.
