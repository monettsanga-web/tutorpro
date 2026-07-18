# TutorPro English — China-accessible deployment

GitHub Pages can be slow or unreachable from mainland China. TutorPro English is therefore prepared for deployment to **Tencent EdgeOne Pages**.

## One-click deployment

Open this link while signed in to Tencent EdgeOne:

[Deploy TutorPro English to Tencent EdgeOne Pages](https://edgeone.ai/pages/new?repository-url=https%3A%2F%2Fgithub.com%2Fmonettsanga-web%2Ftutorpro%2Ftree%2Farena%2F019f690b-tutorpro&project-name=tutorpro-english&output-directory=.%2Fdist&install-command=npm%20ci&build-command=npm%20run%20build%3Aedgeone)

Then:

1. Authorize EdgeOne to read the public GitHub repository.
2. Confirm the branch is `arena/019f690b-tutorpro`.
3. Confirm the detected settings:
   - Install command: `npm ci`
   - Build command: `npm run build:edgeone`
   - Output directory: `dist`
   - Node.js: `22.17.1`
4. Select **Create Now**.
5. After the build finishes, copy the EdgeOne project URL and test it from a mainland China mobile connection.

The repository includes `edgeone.json`, so these settings and safe cache/security headers are applied automatically.

## Domain and ICP note

A temporary EdgeOne project URL can be used first. A custom TutorPro English domain is strongly recommended for a stable permanent address.

- EdgeOne **Global (excluding mainland China)** can be used without an ICP filing, but mainland performance should be tested with the final domain.
- Selecting acceleration nodes **inside mainland China** requires a custom domain, identity verification, and an ICP filing.

## China-ready frontend changes

The website build no longer depends on Google Fonts, Google Drive curriculum images, Google Translate, Google STUN, or an overseas IP-location lookup. Curriculum artwork is rendered locally and all required website images, scripts, games, and styles are included in the deployment.

## Backend and live-classroom note

The current shared database is Supabase. Availability can vary by province or network in mainland China. The static website can load from EdgeOne while Supabase login or realtime services remain slower. For a fully mainland-hosted production system, the next infrastructure phase is migrating profiles/bookings to Tencent Cloud or Alibaba Cloud and adding a China-accessible TURN/signaling service for live classrooms.
