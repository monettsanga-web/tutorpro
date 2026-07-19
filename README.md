# TutorPro English

A responsive TutorPro English platform with IP-aware localisation, premium UX motion, interactive English games, a self-contained curriculum carousel, role-based dashboards and lesson booking.

## Premium experience

- Smooth scroll-progress indicator and cinematic hero entrance sequence
- Cursor-following ambient light on desktop with touch-safe mobile fallbacks
- Subtle 3D card tilt, depth, glow and magnetic button interactions
- Animated statistics, headings, curriculum materials and dashboard transitions
- Premium portal hover states, sidebar motion and dialog entrances
- Full `prefers-reduced-motion` accessibility support

## Included portals

### Student / parent

- Built-in Chinese/English parent support chat on both the website and Parent Dashboard, with automatic IP-language translation
- Private JPG/PNG/WebP/PDF/TXT chat attachments up to 3 MB for parents and administrators
- Guest and registered-parent conversations with secure local thread access
- Two-step family and learner registration
- Sign up and log in with Gmail, Yahoo Mail, WeChat ID, WhatsApp number or another email provider
- Official branded icons for Gmail, Yahoo, WeChat, WhatsApp and other email methods
- Provider selection stays inside TutorPro English so users can complete registration without being redirected
- One family account can manage one to three named student profiles
- Individual schedules, progress and display photo for each student
- Adaptive 3D English games for Years 1–3, 4–6 and 7–11 with persistent stars
- Interactive A–Z Alphabet Bubble Adventure with letter names, phonics sounds and animated rewards
- WebGL Word Galaxy, 3D Grammar Bridge and speech-powered Sound Safari missions
- One rating and optional review after every completed class
- Teacher feedback, strengths, next steps and homework shown on completed lessons
- 24-hour weekly lesson calendar divided into 30-minute slots
- One-to-one booking restricted to teacher-approved availability
- Click-and-drag multi-booking for up to twelve non-overlapping lesson times
- Bold 30-minute time labels, multi-selection count and shared notes
- Booking history, calendar status tracking and cancellation
- Bilingual booking emails to parent and teacher through a secure Supabase Edge Function
- Downloadable iPhone/Android calendar events with 30-minute and 10-minute class reminders
- Parent-visible learning goals with custom goal editing restricted to administrators

### Teacher

- Required 14-question recorded AI first-round interview before application submission
- Fictional English male AI interviewer with synchronized photorealistic speaking frames and a consistent prerecorded masculine native-English voice
- Applicant-controlled microphone recording with question review, spoken prompt, countdown, playback, re-recording and transcript correction
- Randomized live micro-demo, pedagogy scenarios, English screening and platform-fit questions
- Private audio, interview transcript and structured hiring recommendation for Administrator review
- Teacher registration and professional profile application
- Editable teacher display name, display photo and introduction-video uploads for the public teacher showcase
- Public teacher discovery with experience, ratings and teacher selection
- Post-class student feedback with strengths, next steps and optional homework
- List/calendar booking views with separate pending, confirmed, ongoing, completed, absent, cancelled and declined filters
- Hover-or-tap feedback access from each student name, plus mark-absent and restore controls
- Credential filename capture for administrator review
- Approval-status visibility
- Booking acceptance, decline and lesson completion
- Click-and-drag weekly availability painting
- Locked booked slots that cannot be offered to another student
- Private Zoom or VooV fallback links visible only to booked students, teachers and administrators
- Unique TutorPro English classroom for every confirmed booking
- Live camera, microphone, screen sharing, synchronized annotation and lesson-file sharing
- Larger teacher/student camera tiles on the left with a large central lesson, screen-share and presentation board
- Uploaded images and PDFs can be presented and annotated directly on the classroom board
- Students can annotate only after the teacher grants permission; permission can be revoked live
- Pen, highlighter, eraser, colour and text annotation tools synchronize between participants
- Private classroom chat with per-message translation and classroom phrase fallback
- Deterministic booking credentials guarantee the teacher and student use the same classroom ID and hidden token across devices
- Hybrid classroom signaling uses Realtime first, authenticated HTTPS polling as a fallback, and automatic offer/ICE retries
- Profile, lesson and rating overview

### Administrator

- Live parent support inbox with unread badges, Chinese-language identification, replies and close/reopen controls
- Supabase administrator login on every device; the Admin Portal never falls back to a device-local signup screen
- Shared realtime bookings so teacher and student receive the same classroom ID and room token
- Private administrator email; the authorized address is never displayed publicly
- Create approved teacher accounts with temporary passwords
- Teacher approval, rejection and suspension controls
- Teacher and Student Open controls enter a safe administrator profile view immediately, even when Supabase refresh is slow
- Dedicated administrator teacher profile with biography, credentials, availability, classroom and booking details
- All bookings grouped by teacher profile with teacher and status filters for pending, confirmed, ongoing, completed, absent, cancelled and declined lessons
- Private recorded-answer playback, AI interview assessment, recommendation, concerns and complete applicant transcript
- Teacher approval/rejection/suspension requires Supabase to return the updated row and reports RLS errors instead of showing a false success
- Per-student profile suspension and restoration with clear learner-facing status messages
- Safe removal of individual student profiles or final family registrations with typed confirmation
- Automatic cleanup of removed student bookings and profile media
- Direct access to each student dashboard
- Live admin refresh when student or teacher registrations change in the same tab or another tab
- Automatic merging of older and current registration records so no student disappears from Admin
- Per-tab sessions so an administrator can stay logged in while testing student or teacher registration separately
- New teachers appear as pending for approval; new students appear with active/suspended profile controls
- Select a specific student name and book an available teacher slot on their behalf
- Platform-wide booking status controls
- Overview metrics for students, teachers and lessons
- Hover/focus account menu on the homepage with direct dashboard access and secure logout

### Localisation

- Detects the visitor country from IP with two fast providers and falls back safely to the browser locale
- Automatically selects English, Filipino, Korean, Chinese, Japanese, Spanish, French, German, Portuguese, Arabic, Vietnamese or Thai
- Provides a persistent manual language selector
- Applies language and text-direction preferences without mutating React-rendered dashboard elements
- Additional full-text translations can be added through React-safe locale dictionaries

### Shared registration database

- Optional Supabase Auth and Realtime integration for cross-device registration synchronization
- Student registrations appear automatically in Admin → Students
- Teacher registrations appear as pending in Admin → Teachers
- Admin approval and suspension changes flow back to the correct dashboard
- Browser storage remains available as an offline/same-browser fallback

Follow [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) to create and connect the free Supabase project securely.

## Deploy for mainland China

The frontend is prepared for Tencent EdgeOne Pages: Google Drive curriculum photos are copied into the build, while Google Fonts, Google Translate and Google STUN are not required at runtime. IP country detection uses fast fallback providers and never blocks page rendering.

[![Deploy with EdgeOne Makers](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?repository-url=https%3A%2F%2Fgithub.com%2Fmonettsanga-web%2Ftutorpro%2Ftree%2Farena%2F019f690b-tutorpro&project-name=tutorpro-english&output-directory=.%2Fdist&install-command=npm%20ci&build-command=npm%20run%20build%3Aedgeone)

See [`CHINA_DEPLOYMENT.md`](CHINA_DEPLOYMENT.md) for setup, domain, ICP, Supabase and live-classroom considerations.

## Run locally

```bash
npm install
npm run dev
```

## Online classroom signaling

The classroom uses peer-to-peer WebRTC for video, audio and screen sharing. Same-browser tabs use `BroadcastChannel`. Separate devices use Supabase Realtime first and the secured `classroom_signals` table through ordinary HTTPS polling when WebSockets are blocked. Classroom credentials are deterministically repaired from the shared booking ID, preventing two devices from displaying the same room while silently using different tokens. The included WebSocket service remains available as an optional dedicated signaling path:

```bash
npm run classroom:server
```

Run the latest `supabase/bookings_sync.sql` to enable the HTTPS signaling fallback. Set `VITE_CLASSROOM_SIGNALING_URL` only when a hosted secure `wss://` service is available. Production deployments—especially cross-border China lessons—should also configure China-accessible TURN credentials. Camera, microphone and screen sharing require HTTPS or localhost. Every room is isolated by its booking-specific classroom ID and secret token.

## Checks

```bash
npm test
npm run lint
npm run build
npm audit
```

The core-flow test covers registration, login, multi-student accounts, profile status, teacher availability, booking conflicts, private classroom access, lesson feedback and ratings. The synchronization test verifies that student and teacher sign-ups appear in Admin, and that admin approvals and suspensions flow back to the correct dashboard.

## Data and authentication note

The app uses Supabase for cross-device registration profiles when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured. Without those values it falls back to browser storage, which only synchronizes the same website origin/browser. Game rewards, ratings and bookings currently retain a browser-storage fallback; uploaded profile photos and introduction videos use IndexedDB. Live classroom files are shared only for the active room session and should use authenticated cloud object storage in production. Passwords are salted and hashed with the Web Crypto API for the fallback flow, while configured cloud accounts use Supabase Auth. Gmail, Yahoo, WeChat and WhatsApp currently work as validated account identifiers with a TutorPro English password. Production OAuth or one-time-code authentication requires provider app credentials and a hosted authentication service.
