# TutorPro English Hub

A responsive TutorPro website with animated marketing pages, role-based registration, dashboards and lesson booking.

## Included portals

### Student / parent

- Two-step family and learner registration
- Sign up and log in with Gmail, Yahoo Mail, WeChat ID, WhatsApp number or another email provider
- One family account can manage one to three named student profiles
- Individual payment status, schedules, progress and display photo for each student
- Unpaid students are automatically prevented from booking
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

The current build is a fully interactive browser prototype. Accounts, approval states, profiles, ratings and bookings persist on the current device using local storage; uploaded profile photos and introduction videos use IndexedDB. Passwords are salted and hashed with the Web Crypto API. Gmail, Yahoo, WeChat and WhatsApp currently work as validated account identifiers with a TutorPro password. Production OAuth or one-time-code authentication requires provider app credentials and a hosted authentication service. Before using the platform with real customers across multiple devices, connect the included data and media functions to a hosted authentication, database and file-storage service such as Supabase, Firebase or a custom API.
