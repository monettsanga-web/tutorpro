# TutorPro English Hub

A responsive TutorPro website with animated marketing pages, role-based registration, dashboards and lesson booking.

## Included portals

### Student / parent

- Two-step family and learner registration
- Personalised student profile with goals, progress, streaks and achievements
- 24-hour weekly lesson calendar divided into 30-minute slots
- One-to-one booking restricted to teacher-approved availability
- Booking history, calendar status tracking and cancellation
- Editable learning preferences

### Teacher

- Teacher registration and professional profile application
- Credential filename capture for administrator review
- Approval-status visibility
- Booking acceptance, decline and lesson completion
- Click-and-drag weekly availability painting
- Locked booked slots that cannot be offered to another student
- Profile, lesson and rating overview

### Administrator

- Private email-and-password setup and login; the authorized address is never displayed publicly
- Create approved teacher accounts with temporary passwords
- Teacher approval, rejection and suspension controls
- Direct access to any teacher dashboard from the teacher table
- Student access suspension, restoration and direct dashboard access
- Book available teacher slots on behalf of students
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
