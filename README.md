# TutorPro English

A responsive TutorPro English website with automatic location-aware translation, interactive English games, PayPal checkout, a Google Drive-powered curriculum carousel, role-based dashboards and lesson booking.

## Included portals

### Student / parent

- Two-step family and learner registration
- Sign up and log in with Gmail, Yahoo Mail, WeChat ID, WhatsApp number or another email provider
- Secure provider-launch links open Gmail, Yahoo, WeChat or WhatsApp in a separate tab while preserving the TutorPro English registration form
- One family account can manage one to three named student profiles
- Individual payment status, schedules, progress and display photo for each student
- Unpaid students are automatically prevented from booking
- PayPal checkout, lesson-credit plans and per-student payment history
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
- Private Zoom or VooV classroom links visible only to booked students, teachers and administrators
- Profile, lesson and rating overview

### Administrator

- Private email-and-password setup and login; the authorized address is never displayed publicly
- Create approved teacher accounts with temporary passwords
- Teacher approval, rejection and suspension controls
- Direct access to any teacher dashboard from the teacher table
- Student access suspension, restoration and direct dashboard access
- Paid/unpaid controls for every individual learner
- Select a specific student name and book an available teacher slot on their behalf
- Platform-wide booking status controls
- Overview metrics for students, teachers and lessons

### Localisation

- Detects the visitor country through IP geolocation with browser-language fallback
- Automatically selects English, Filipino, Korean, Chinese, Japanese, Spanish, French, German, Portuguese, Arabic, Vietnamese or Thai
- Provides a persistent manual language selector
- Uses Google Website Translator to translate public pages and dashboards

## Run locally

```bash
npm install
npm run dev
```

## Checks

```bash
npm run lint
npm run build
```

## Data and authentication note

The current build is a fully interactive browser prototype. Accounts, game rewards, payments, profiles, ratings and bookings persist on the current device using local storage; uploaded profile photos and introduction videos use IndexedDB. Passwords are salted and hashed with the Web Crypto API. Gmail, Yahoo, WeChat and WhatsApp currently work as validated account identifiers with a TutorPro English password. Production OAuth or one-time-code authentication requires provider app credentials and a hosted authentication service. PayPal uses its sandbox client by default; set `VITE_PAYPAL_CLIENT_ID` and verify completed orders with a server-side webhook before accepting real payments. Connect the included data and media functions to a hosted authentication, database and file-storage service before serving real customers across devices.
