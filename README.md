# TutorPro English Hub

A polished, responsive website for TutorPro's personalised Cambridge and Oxford English tutoring service.

## Features

- Animated marketing experience with responsive desktop and mobile layouts
- Two-step parent and student registration flow
- Persistent login, account profile and logout
- Password hashing with the browser Web Crypto API
- Curriculum selector, pricing, FAQs and free-class calls to action
- No dependency on the previous Base44 pages

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

## Authentication note

The included registration system works fully in the browser and persists accounts on the current device. Before accepting real customer registrations across multiple devices, connect the same UI to a hosted authentication/database service such as Supabase, Firebase or a custom API.
