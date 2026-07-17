# TutorPro English

A responsive TutorPro English website with automatic location-aware translation, interactive English games, a Google Drive-powered curriculum carousel, role-based dashboards and lesson booking.

## Included portals

### Student / parent

- Two-step family and learner registration
- Sign up and log in with Gmail, Yahoo Mail, WeChat ID, WhatsApp number or another email provider
- Official branded icons for Gmail, Yahoo, WeChat, WhatsApp and other email methods
- Provider selection stays inside TutorPro English so users can complete registration without being redirected
- One family account can manage one to three named student profiles
- Individual schedules, progress and display photo for each student
- Adaptive 3D English games for Years 1–3, 4–6 and 7–11 with persistent stars
- WebGL Word Galaxy, 3D Grammar Bridge and speech-powered Sound Safari missions
- One rating and optional review after every completed class
- Teacher feedback, strengths, next steps and homework shown on completed lessons
- 24-hour weekly lesson calendar divided into 30-minute slots
- One-to-one booking restricted to teacher-approved availability
- Booking history, calendar status tracking and cancellation
- Editable learning preferences

### Teacher

- Teacher registration and professional profile application
- Display photo and introduction-video uploads for the public teacher showcase
- Public teacher discovery with experience, ratings and teacher selection
- Post-class student feedback with strengths, next steps and optional homework
- Credential filename capture for administrator review
- Approval-status visibility
- Booking acceptance, decline and lesson completion
- Click-and-drag weekly availability painting
- Locked booked slots that cannot be offered to another student
- Private Zoom or VooV fallback links visible only to booked students, teachers and administrators
- Unique TutorPro English classroom for every confirmed booking
- Live camera, microphone, screen sharing, synchronized annotation and lesson-file sharing
- Profile, lesson and rating overview

### Administrator

- Private email-and-password setup and login; the authorized address is never displayed publicly
- Create approved teacher accounts with temporary passwords
- Teacher approval, rejection and suspension controls
- Direct access to any teacher dashboard from the teacher table
- Per-student profile suspension and restoration with clear learner-facing status messages
- Safe removal of individual student profiles or final family registrations with typed confirmation
- Automatic cleanup of removed student bookings and profile media
- Direct access to each student dashboard
- Live admin refresh when student or teacher registrations change in the same tab or another tab
- Automatic merging of older and current registration records so no student disappears from Admin
- Per-tab sessions so an administrator can stay logged in while testing student or teacher registration separately
- New teachers appear as pending for approval; new students appear with active/suspended profile controls
- Paid/unpaid controls for every individual learner
- Select a specific student name and book an available teacher slot on their behalf
- Platform-wide booking status controls
- Overview metrics for students, teachers and lessons
- Hover/focus account menu on the homepage with direct dashboard access and secure logout

### Localisation

- Detects the visitor country through IP geolocation with browser-language fallback
- Automatically selects English, Filipino, Korean, Chinese, Japanese, Spanish, French, German, Portuguese, Arabic, Vietnamese or Thai
- Provides a persistent manual language selector
- Uses Google Website Translator to translate public pages and dashboards

### Shared registration database

- Optional Supabase Auth and Realtime integration for cross-device registration synchronization
- Student registrations appear automatically in Admin → Students
- Teacher registrations appear as pending in Admin → Teachers
- Admin approval and suspension changes flow back to the correct dashboard
- Browser storage remains available as an offline/same-browser fallback

Follow [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) to create and connect the free Supabase project securely.

## Run locally

```bash
npm install
npm run dev
```

## Online classroom signaling

The classroom uses peer-to-peer WebRTC for video, audio and screen sharing. For a same-browser two-tab demo, it automatically uses `BroadcastChannel`. For students and teachers on different devices, run the included signaling service:

```bash
npm run classroom:server
```

Copy `.env.example` to `.env.local` and set:

```env
VITE_CLASSROOM_SIGNALING_URL=ws://localhost:8787
```

Use a hosted `wss://` signaling endpoint and TURN credentials in production. Camera, microphone and screen sharing require HTTPS or localhost. Every room is isolated by its booking-specific classroom ID and secret token.

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
