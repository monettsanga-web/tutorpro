# TutorPro English Philippines — platform audit & build plan

Audit of the existing codebase against the master build brief, followed by the
staged plan. Everything below names the file that proves it; nothing here is
aspirational.

## 1. What already exists (brief section → implementation)

| Brief | Existing implementation | State |
|---|---|---|
| 1 Design & branding | `src/styles.css`, `src/App.jsx`, 20+ static page builders in `scripts/build-*.mjs` | Live, responsive, brand-consistent |
| 2 Accounts & auth | Supabase auth + `src/AuthModal.jsx`, `src/auth.js`, `src/cloudProfiles.js`, `api/auth/register.js`, `api/auth/reset.js`, `src/teacherInvites.js`, `api/teachers/create.js` (admin-only), `supabase/schema.sql` (roles, RLS, trigger) | Live. Role integrity fixed in stage 1 below |
| 3 Student portal | `src/Dashboards.jsx` (student view), `src/StudentGames.jsx`, `src/EnglishAdventure.jsx`, `src/LetterBubbleAdventure.jsx`, `src/rewards.js`, `src/homework.js` | Live |
| 4 Live classroom | `src/OnlineClassroom.jsx` (2,716 lines: TRTC video, whiteboard, slides, flashcards, quiz, drag-drop, stars, summary), `src/classroomTransport.js` (Supabase Realtime sync), `server/classroom-signaling.mjs`, `src/iceServers.js` (Cloudflare TURN), `src/tencentClassroom.js` | Built & tested, **switched off in production** by `src/classroomFeature.js` (cost). Needs TRTC credentials to relight — stage 2 |
| 5 Teacher dashboard | `src/Dashboards.jsx` (teacher view): schedule, availability, assigned students, start class, lesson library, attendance, feedback, homework, reports | Live |
| 6 Parent dashboard | `src/Dashboards.jsx` (parent/student family view): profiles, bookings, feedback, packages, payment history, support chat | Live |
| 7 Booking & scheduling | `src/bookings.js`, `src/cloudBookings.js`, `src/schedule.js`, `src/bookingCalendar.js` (timezone-aware .ics), `src/timezone.js`, write-policy test `scripts/test-booking-write-policy.mjs` (double-booking), 25/50-min durations | Live |
| 8 Course management | `src/courseware.js`, `src/library.js`, `src/learningContent.js`, `src/CoursewareManager.jsx` (admin) | Live |
| 9 Database & backend | `supabase/schema.sql` + 30 migration SQL files: profiles/roles, parent-child, teachers, bookings, attendance, classroom state, homework, feedback, packages, transactions; RLS policies | Live |
| 10 Payments & credits | `api/paypal/create-order.js`, `capture-order.js`, `webhook.js` (server-side verification), `src/paymentRequests.js`, `src/paymentErrors.js`, billing tests | Live. No card data stored |
| 11 Admin dashboard | `src/Dashboards.jsx` (admin view) + `src/Admin*.jsx` panels, `api/_admin.js` authority checks, `scripts/test-admin-authority.mjs` | Live |
| 12 Child safety | guardian consent at registration, `src/classroomRecording.js` (recording off by default), RLS, no public student details (`api/teachers/public.js` exposes teachers only) | Live |
| 13 Staged development | this document + the test battery in `package.json` (70+ suites) | Ongoing |

## 2. Real gaps found by the audit

1. **Role integrity (fixed, stage 1).** `/api/auth/register` hard-coded
   `role: 'student'` while the teacher application posts to the same route:
   completed applications landed as ACTIVE STUDENTS — invisible to the
   approval queue, able to sign into family dashboards. The route now honours
   `student` and `teacher` (stored `pending`), refuses every other role
   before touching the database, and re-validates teacher profiles
   server-side. Guarded by `scripts/test-register-role.mjs`.
2. **Classroom dark in production (stage 2).** The full WebRTC classroom
   exists but `classroomFeature.js` keeps it unloaded to protect the Supabase
   free tier. Relighting it requires Tencent TRTC credentials
   (`VITE_TRTC_SDK_APP_ID` + the `trtc-usersig` Edge Function secret) and the
   Cloudflare TURN key. Plan: a setup/diagnostics screen that names each
   missing credential, plus this document as the configuration guide. No
   simulated video, ever.
3. **Price display mismatch (stage 3).** Marketing cards say $10/$20 while
   checkout, dashboards and the pricing page use the owner-confirmed $8/$7.
   Cards are hidden behind `SHOW_PRICE_CARDS` in `src/App.jsx` until the
   numbers agree, with the discount enquiry card standing in.
4. **Admin-configurable lesson durations (stage 4).** 25/50 minutes exist;
   the brief also asks administrators to add durations and prices from the
   dashboard. `src/siteSettings.js` is the natural home.
5. **Content breadth (stage 5).** Adult conversational and exam-preparation
   units are thinner than the children's curriculum in `learningContent.js`.

## 3. Staged plan (next increments, in order)

- **Stage 1 — role integrity (this change).** Done: route fix + suite.
- **Stage 2 — classroom relight path.** Diagnostics screen listing missing
  credentials; owner supplies TRTC/TURN keys; flip `classroomFeature.js`;
  run the 8 classroom suites (`test:handshake`, `:sharing`, `:signalling`,
  `:roles`, `:presence`, `:media`, `:reach`, `:ice`) against staging.
- **Stage 3 — pricing truth.** Correct card prices to $8/$7, restore
  `SHOW_PRICE_CARDS = true`, keep the discount card as the standalone
  `#class-discounts` section.
- **Stage 4 — scheduling config.** Admin-editable durations/prices in
  `siteSettings.js`, honoured by the booking form and billing maths
  (`api/_paypal.js` parseSessions/planTotal) with tests.
- **Stage 5 — curriculum breadth.** Adult conversation + exam prep units
  with slides, audio, quizzes and homework templates in `learningContent.js`.
- **Stage 6 — payments & reports hardening.** Webhook replay/duplicate audit,
  refund ledger review, progress-report exports for parents.

Each stage ships as its own branch → pull request → merge, with the test
battery and a live-site check, exactly as stage 1 did.
