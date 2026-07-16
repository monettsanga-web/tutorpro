# TutorPro English Hub

A responsive TutorPro website with animated marketing pages, role-based registration, dashboards and lesson booking.

## Included portals

### Student / parent

- Two-step family and learner registration
- Personalised student profile with goals, progress, streaks and achievements
- One-to-one booking flow with teacher, date, time, duration and lesson focus
- Booking history, status tracking and cancellation
- Editable learning preferences

### Teacher

- Teacher registration and professional profile application
- Credential filename capture for administrator review
- Approval-status visibility
- Booking acceptance, decline and lesson completion
- Weekly availability management
- Profile, lesson and rating overview

### Administrator

- First-time administrator setup for `monettsanga@yahoo.com`
- Teacher approval, rejection and suspension controls
- Student access suspension and restoration
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

The current build is a fully interactive browser prototype. Accounts, approval states, profiles and bookings persist on the current device using local storage, and passwords are salted and hashed with the Web Crypto API. Before using the platform with real customers across multiple devices, connect the included data functions to a hosted authentication/database service such as Supabase, Firebase or a custom API.
