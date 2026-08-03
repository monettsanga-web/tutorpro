# TutorPro Online English PH — World-Class Platform Upgrade Audit & Roadmap

**Audit date:** 2026-07-30  
**Repository:** `monettsanga-web/tutorpro`  
**Current stack:** Vite + React 19 + Supabase + Electron desktop wrapper + Vercel API routes

> This document is Phase 1 only: audit, risk analysis, and implementation roadmap. No user, booking, payment, database, authentication, dashboard, or route should be removed during future phases.

---

## 1. Executive Summary

TutorPro Online English PH is already a broad online English learning platform with:

- Public marketing website
- Parent/student dashboard
- Teacher dashboard
- Admin dashboard
- Booking calendar and scheduling
- PayPal server-side payment verification
- Referral/ambassador Phase 1
- Support inbox/chat
- Classroom with WebRTC/Tencent/VooV fallback concepts
- Teacher AI interview flow
- PWA and Electron desktop wrapper
- China mobile landing page
- SEO automation draft tooling

The platform has strong feature coverage but has accumulated technical debt because many major features live inside very large files, especially:

- `src/Dashboards.jsx` — ~4,678 lines
- `src/dashboard.css` — ~8,073 lines
- `src/App.jsx` — ~1,487 lines
- `src/OnlineClassroom.jsx` — ~1,864 lines
- `src/styles.css` — ~5,448 lines

The next stage should **not** rebuild the app. It should modularize carefully while preserving behavior and data.

---

## 2. Folder Structure Overview

### Top-level

| Path | Purpose |
|---|---|
| `src/` | Main React application source |
| `src/components/` | Some reusable classroom/cloud components |
| `api/` | Vercel serverless API routes, currently PayPal |
| `supabase/` | SQL schema and setup scripts |
| `public/` | Public static pages/assets, sitemap, PWA manifest, China page |
| `docs/` | Setup and system documentation |
| `electron/` | Desktop app wrapper for TutorPro Online English Classroom |
| `.github/workflows/` | GitHub Actions desktop build workflow |
| `scripts/` | Test scripts, SEO automation, image sync |
| `server/` | Optional WebSocket classroom signaling server |

### Core source files

| File | Role |
|---|---|
| `src/App.jsx` | Public website, homepage, teacher showcase, auth entry points |
| `src/Dashboards.jsx` | Student, teacher, admin dashboards, booking panels, feedback dialogs, admin management |
| `src/OnlineClassroom.jsx` | Live classroom, WebRTC/Tencent, chat, whiteboard, screen share, file presentation |
| `src/auth.js` | Local/cloud account model, register/login/update accounts |
| `src/bookings.js` | Booking creation, status changes, feedback, ratings, classroom access |
| `src/cloudProfiles.js` | Supabase profile sync |
| `src/cloudBookings.js` | Supabase booking sync |
| `src/supportChat.js` | Support conversation client functions |
| `src/referrals.js` | Referral/ambassador helper logic |
| `src/AutoTranslate.jsx` | Locale detection and translation controls |
| `src/ProfileMedia.jsx`, `src/media.js` | Profile photo/video handling |
| `src/tencentClassroom.js` | Tencent RTC credential helper |

---

## 3. Current Feature Inventory

### Public website

- Hero, curriculum, pricing, FAQ, teacher showcase
- SEO landing page: `/online-english-alternatives.html`
- China mobile page: `/cn/`
- PWA manifest/service worker
- Facebook Messenger link fallback
- Automatic country/language detection
- SEO automation script

### Parent/student dashboard

- Learner switcher
- Overview
- Payment/package checkout with PayPal server verification
- China QR/AUB/WeChat payment view
- Booking calendar
- Lessons list
- Curriculum framework
- External Article Arcade game launcher
- Support chat
- Profile management
- Referral dashboard Phase 1

### Teacher dashboard

- Overview and feedback queue
- Bookings list/calendar
- Classroom settings
- Availability calendar
- Support channel selection
- Profile and media management
- Feedback dialog with 5,000-character summary
- Referral dashboard Phase 1

### Admin dashboard

- Teacher management
- Student management
- Support inbox
- Announcements
- All bookings list/calendar
- Admin teacher slot reservation
- Referral growth dashboard
- Teacher/student profile controls
- Trial/enrolled learner status
- Teacher payout estimates

### Classroom

- Prejoin screen
- Camera/mic
- WebRTC peer connection
- Supabase hybrid signaling / optional WebSocket signaling
- Tencent/VooV support path
- Screen share display fixes
- Whiteboard/annotation tools
- Chat and files
- Website/file presentation
- China connection panel + low-bandwidth mode

### Desktop/PWA

- Electron desktop wrapper: `TutorPro Online English Classroom`
- GitHub Actions Windows installer build
- PWA install prompt

---

## 4. API Inventory

### Vercel API routes

| Route | Purpose |
|---|---|
| `api/paypal/create-order.js` | Creates server-side PayPal orders |
| `api/paypal/capture-order.js` | Captures PayPal order and credits lessons after verification |
| `api/paypal/webhook.js` | PayPal webhook verification and reward/credit sync |
| `api/_paypal.js` | Shared PayPal/Supabase service-role helpers |

### Security-sensitive environment variables

Required/used:

- `VITE_PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENV`
- `PAYPAL_WEBHOOK_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_TRTC_SDK_APP_ID`
- `VITE_CLASSROOM_TURN_URL`
- `VITE_CLASSROOM_TURN_USERNAME`
- `VITE_CLASSROOM_TURN_CREDENTIAL`

---

## 5. Database / Supabase Inventory

### Existing SQL scripts

| File | Purpose |
|---|---|
| `supabase/schema.sql` | Main profiles/bookings/classroom signaling schema |
| `supabase/bookings_sync.sql` | Booking sync and classroom signaling table |
| `supabase/support_chat.sql` | Parent/teacher support conversations |
| `supabase/account_support_chat_fix.sql` | Account-mode support conversation fix |
| `supabase/public_teachers.sql` | Public teacher RPC |
| `supabase/booking_feedback_resources.sql` | Feedback/resource support |
| `supabase/classroom_files_storage.sql` | Classroom file storage setup |
| `supabase/teacher_interview_recordings.sql` | Teacher interview recordings |
| `supabase/admin_access_fix.sql` | Admin access repair |
| `supabase/teacher_profile_delete.sql` | Teacher deletion RPC |

### Current model characteristics

The system relies heavily on:

- `profiles.profile_data` JSONB for user data
- `bookings` table for shared bookings
- `support_conversations` and `support_messages`
- `classroom_signals` for fallback signaling

### Database risks

- Many product domains are embedded in `profile_data` JSON instead of normalized tables.
- Referral/wallet data Phase 1 is mostly profile JSON driven.
- No dedicated analytics tables yet.
- Fraud detection exists conceptually but not fully normalized.
- JSONB is flexible but needs indexes and extraction views for scale.

---

## 6. Authentication & Access

### Current approach

- Local browser account store still exists for resilience/offline pending flows.
- Supabase Auth powers cloud login/profile sync.
- Admin membership uses `admin_members` and `is_tutorpro_admin()`.
- Public teacher info uses sanitized RPC.

### Strengths

- Supabase Auth available.
- Admin access RPC exists.
- Role-based dashboard rendering exists.

### Gaps

- Some local-storage paths remain and need careful migration hardening.
- Password reset works for email accounts but not WeChat/WhatsApp-only accounts.
- Role-based access should be consolidated in server/RLS for all sensitive workflows.

---

## 7. Security Audit

### Good

- PayPal capture is server-side.
- Supabase service role used only server-side in API.
- Classroom access checks booking ownership.
- Support chat RLS/RPC model exists.
- Admin-only profile controls exist.

### Risks / priorities

1. **RLS completeness:** Ensure every table has role-specific policies.
2. **Service-role API validation:** Keep validating account ownership in APIs.
3. **Referral fraud:** Needs dedicated tables and fraud signals.
4. **Payment crediting:** Add idempotency tables for purchases and rewards.
5. **Rate limiting:** Add edge/API rate limiting for auth-related and payment endpoints.
6. **Audit logs:** Add audit logging for admin changes, payouts, credits, bookings, support actions.
7. **Electron app:** Eventually code-sign installers and harden navigation CSP.
8. **Classroom signaling:** Ensure `classroom_signals` SQL is installed and indexed.

---

## 8. Performance Audit

### Current observations

- CSS is large and monolithic.
- `Dashboards.jsx` and `OnlineClassroom.jsx` are very large.
- Main bundle is large (~1.3 MB minified JS in recent builds).
- TRTC chunk is ~1 MB, but lazy-loaded.
- Many inline styles reduce CSS reuse and make responsive design harder.

### Bottlenecks

- Large dashboard component causes high parse/compile cost.
- Large CSS files make design iteration risky.
- Profile media using base64 JSON may grow profiles over time.
- Frequent polling intervals are used in dashboards and classroom; should be centralized and tuned.

### Recommendations

- Split `Dashboards.jsx` by role and feature.
- Split CSS by domain with CSS modules or scoped files.
- Move large feature panels to lazy-loaded chunks.
- Add image optimization strategy.
- Avoid long-term base64 media in profile JSON; migrate to Supabase Storage.

---

## 9. UI/UX Audit

### Strengths

- Strong TutorPro visual identity.
- Modern purple/lime palette.
- Many premium visual upgrades already exist.
- PWA/desktop route underway.
- China mobile page exists.

### Problems

- Inconsistent UI patterns due to many inline styles.
- Some admin/teacher/student sections have different design languages.
- Mobile has been improved but needs more systematic QA.
- Teacher public cards have gone through multiple iterations and need a final component system.
- Classroom UX still needs a true courseware-led flow.

### Accessibility gaps

- Need consistent focus states.
- Need better semantic headings in dashboards.
- Need keyboard navigation QA for classroom tools.
- Need contrast audit for all dark/light cards.
- Need reduced-motion safe alternatives for animations.

---

## 10. SEO Audit

### Existing SEO assets

- `index.html` meta + JSON-LD
- `robots.txt`
- `sitemap.xml`
- `/online-english-alternatives.html`
- `/cn/`
- SEO automation script/drafts

### Gaps

- Need dedicated published pages for each target keyword.
- Need teacher profile pages indexable by slug.
- Need blog system.
- Need canonical strategy for `www` vs non-`www`.
- Need Search Console indexing workflow.

---

## 11. Test / CI Audit

### Current scripts

- `npm run build`
- `npm run lint`
- `npm run test`
- GitHub Actions desktop build

### Current test issue found during audit

Running tests after `npm ci` failed at `scripts/test-core.mjs` due to:

```text
ReferenceError: WebSocket is not defined
```

This indicates Node test environment lacks a WebSocket polyfill/mock for `classroomTransport.js`.

### Recommendation

- Add a WebSocket mock for Node tests.
- Move browser-only code behind guards.
- Add Vitest or Playwright for real UI flows.
- Add E2E tests for booking/payment/referral/classroom entry.

---

## 12. Technical Debt Summary

| Area | Severity | Notes |
|---|---:|---|
| `Dashboards.jsx` monolith | High | Split by role/features |
| `dashboard.css` monolith | High | Split by dashboard/components |
| JSONB overuse | Medium-High | Fine for early phase, normalize for scale |
| Mixed local/cloud state | Medium-High | Needs formal sync boundary |
| Payment/reward idempotency | High | Move to normalized purchase/reward ledger |
| Classroom reliability | High | TURN/Tencent config needed |
| Mobile consistency | Medium | Needs systematic QA matrix |
| SEO content depth | Medium | Needs page/blog pipeline |
| Tests | High | Core tests currently fail in Node due WebSocket |
| Accessibility | Medium | Needs AA audit pass |

---

## 13. Missing Features vs Master Vision

Already partially implemented:

- Payments
- Referrals Phase 1
- Teacher dashboard
- Parent/student dashboard
- Classroom
- Support chat
- PWA
- Desktop wrapper
- SEO automation skeleton

Still missing or partial:

- Dedicated normalized referral DB
- Coupon manager
- Fraud detection engine
- Full analytics charts
- AI learning reports
- Homework center
- Full game center
- Digital library
- Courseware builder/player
- AI customer support bot
- Push notifications
- Marketing automation
- Certificates
- Avatar/pets/season pass
- Full admin enterprise panel
- Comprehensive tests

---

## 14. Recommended Implementation Roadmap

### Phase A — Stabilization & Safety First

1. Fix test environment WebSocket issue.
2. Run and install latest required SQL scripts in Supabase.
3. Confirm PayPal webhooks and service-role setup.
4. Add audit logs for admin actions.
5. Add classroom diagnostics panel.
6. Add TURN/Tencent production readiness checklist.

### Phase B — Modular Refactor Without UI Changes

1. Split `Dashboards.jsx` into:
   - `dashboards/student/`
   - `dashboards/teacher/`
   - `dashboards/admin/`
   - `components/booking/`
   - `components/payments/`
   - `components/referrals/`
2. Split `dashboard.css` by feature.
3. Extract shared UI primitives:
   - `PortalCard`
   - `StatCard`
   - `EmptyState`
   - `StatusBadge`
   - `ActionBar`
4. Add feature flags.

### Phase C — Admin Dashboard Upgrade (#4)

1. Admin command center widgets:
   - revenue
   - teacher payouts
   - payment status
   - referral analytics
   - missing feedback
   - trials needing enrollment decision
2. CSV exports.
3. Analytics cards and charts.
4. Admin audit timeline.

### Phase D — Payment System Upgrade (#5)

1. Normalize `payments`, `payment_transactions`, `wallet_transactions`.
2. Add receipt upload/verification for GCash/AUB/WeChat.
3. Add payment status in admin student table.
4. Add refund/cancel tracking.
5. Add reward idempotency ledger.

### Phase E — Teacher Profile Upgrade (#6)

1. Dedicated public teacher profile page per teacher.
2. Real reviews, schedule preview, intro video, sample class.
3. SEO schema for teachers.
4. Parent conversion CTA.
5. Teacher availability preview.

### Phase F — Classroom Pro

1. Courseware player instead of relying on screen share.
2. Slide/page sync.
3. Whiteboard overlay.
4. Reward stars/confetti.
5. Low-bandwidth/Tencent-first China mode.
6. Classroom recording plan.

### Phase G — Learning Platform Expansion

1. Homework center.
2. Digital library.
3. AI learning reports.
4. Game center.
5. Student adventure world.
6. Certificates and achievements.

### Phase H — Enterprise SEO & Marketing

1. Blog system.
2. Programmatic SEO pages.
3. Search Console API ranking monitor.
4. Email campaigns.
5. Referral competitions.

---

## 15. Deployment Checklist for Future Changes

Before deploying any major phase:

1. `git status --short` is clean except intended files.
2. `npm ci` completes.
3. `npm run build` passes.
4. Tests pass or known failures documented.
5. Supabase SQL migration is reviewed.
6. Vercel environment variables are confirmed.
7. Payment test is run with low-value transaction or sandbox.
8. Booking flow tested as parent/student/teacher/admin.
9. Mobile view tested at 390px and 430px widths.
10. Classroom tested with two devices.
11. Rollback commit is identified.

---

## 16. Rollback Plan

1. Identify last stable Git commit.
2. In Vercel, redeploy previous successful production deployment.
3. If SQL migration caused issue, apply reverse migration or disable feature flag.
4. If payment/referral issue, disable reward automation and preserve ledger rows.
5. If classroom issue, switch teachers to VooV fallback.
6. Notify admins/teachers of temporary fallback procedures.

---

## 17. Immediate Next Recommendation

The safest next build phase is **Admin Command Center Upgrade** because it improves operations without disrupting student learning flows.

Suggested first increment:

- Admin dashboard: payment/revenue/referral/teacher payout widgets
- Admin action center: missing feedback, unpaid students, pending trials, pending bookings
- CSV export improvements
- Student payment status column

This aligns with your requested sequence: #1 referral first, then #4 admin, #5 payments, #6 teacher profile.
