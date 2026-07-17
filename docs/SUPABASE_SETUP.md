# TutorPro English — Supabase shared registration setup

This connection makes student and teacher registrations visible to the administrator across different browsers and devices. Browser storage remains as an offline fallback.

## 1. Create the free project

1. Open <https://supabase.com/dashboard> and create a project named **TutorPro English**.
2. Wait for the database to finish provisioning.
3. Open **Project Settings → Data API** and copy:
   - Project URL
   - Publishable or `anon` key
4. Never expose or paste the `service_role` key into the website or chat.

## 2. Create the secure profile tables

1. Open **SQL Editor → New query**.
2. Paste the complete contents of [`supabase/schema.sql`](../supabase/schema.sql).
3. Select **Run**.

The SQL creates:

- `profiles` — shared student, teacher and administrator dashboard profiles
- `admin_members` — the allow-list that grants access to all profiles
- Row Level Security policies
- A secure trigger that creates a profile after Supabase Auth registration
- Realtime updates for the Admin Dashboard

## 3. Configure email and phone authentication

In **Authentication → Providers**:

- Enable Email for Gmail, Yahoo and other email-address registrations.
- Enable Phone only if WhatsApp-number users should authenticate on multiple devices.
- Enable Anonymous Sign-Ins so WeChat-ID registrations can be mirrored into the Admin Dashboard.
- Configure an SMTP provider before production email confirmation.

WeChat ID registration can be mirrored to Admin through an anonymous Supabase profile, but true cross-device WeChat login requires an official WeChat OAuth application.

## 4. Create and authorize the administrator

1. Open **Authentication → Users → Add user**.
2. Create the TutorPro English administrator using the private administrator email and password.
3. Open **SQL Editor → New query**.
4. Paste and run the complete contents of [`supabase/admin_access_fix.sql`](../supabase/admin_access_fix.sql).

The repair script finds the authorized administrator without displaying the email publicly, creates or updates the Admin profile, and adds the correct UUID to `admin_members`. It is safe to run more than once.

## 5. Configure TutorPro English

Copy `.env.example` to `.env.local` and add the browser-safe values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Restart the app:

```bash
npm install
npm run dev
```

For Vercel, Netlify, Render or another host, add the same variables in the host's Environment Variables settings and redeploy.

## 6. Verify synchronization

Use separate tabs or devices:

1. Log into Admin Dashboard and leave it open.
2. Register a new student.
3. Confirm the student appears under **Admin → Students**.
4. Register a teacher.
5. Confirm the teacher appears under **Admin → Teachers** with `pending` status.
6. Approve the teacher.
7. Confirm the teacher dashboard updates to `approved`.
8. Suspend or restore the student profile.
9. Confirm the student dashboard updates automatically.

The Admin Dashboard badge should display **Supabase live sync**. If it displays **Cloud sync needs attention**, check the environment values, SQL schema and `admin_members` row.

## Production notes

- Keep Row Level Security enabled.
- Never put the Supabase `service_role` key in a `VITE_` variable.
- Use a server-side Edge Function for deleting Supabase Auth users completely.
- Move bookings, media and classroom files into shared Supabase tables/storage before production launch.
