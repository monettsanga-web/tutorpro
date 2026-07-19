# TutorPro English booking email and phone-calendar notifications

TutorPro English includes a Supabase Edge Function that emails both the parent/student account and assigned teacher whenever a lesson is requested, confirmed, cancelled, or restored. Each email includes an `.ics` phone-calendar attachment with reminders 30 minutes and 10 minutes before class.

## 1. Create a Resend account

1. Create an account at <https://resend.com/>.
2. Add and verify `tutorpro.site` as a sending domain.
3. Add the SPF and DKIM DNS records shown by Resend in GoDaddy.
4. Create a Resend API key. Never put this key in a `VITE_` variable or browser code.

## 2. Configure Supabase Edge Function secrets

Using the Supabase CLI while linked to the TutorPro English project:

```bash
supabase secrets set RESEND_API_KEY=YOUR_RESEND_API_KEY
supabase secrets set BOOKING_FROM_EMAIL="TutorPro English <notifications@tutorpro.site>"
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are supplied automatically inside a deployed Supabase Edge Function. Never share the service-role key in chat or add it to the website repository.

## 3. Deploy the function

From the repository root:

```bash
supabase functions deploy booking-notification
```

The function source is located at:

```text
supabase/functions/booking-notification/index.ts
```

Keep JWT verification enabled. The function verifies that the caller is the booked student, assigned teacher, or an authorized TutorPro English administrator before reading participant emails.

## 4. Test

1. Create a future booking as a student.
2. Confirm it as the teacher or administrator.
3. Verify both participant inboxes receive the bilingual notification.
4. Open the `.ics` attachment on iPhone or Android and add it to the phone calendar.
5. Confirm the calendar event contains 30-minute and 10-minute reminders.

If email does not arrive, check **Supabase → Edge Functions → booking-notification → Logs** and the Resend delivery logs. QQ, 163, and 126 delivery can vary, so verify the sending domain and avoid the unconfigured Supabase default email sender.
