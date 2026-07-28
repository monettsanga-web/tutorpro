# TutorPro English Classroom Desktop App

Desktop wrapper for the TutorPro English classroom experience. The production app loads https://www.tutorpro.site so student/teacher accounts, bookings and classroom access stay synchronized with the live website and Supabase.

## Development

```bash
npm run desktop:dev
```

## Build installers

```bash
npm run desktop:dist
```

Outputs are created in `release/`.

## Classroom notes

- Built with Electron/Chromium for laptop and PC use.
- Enables camera/microphone and screen-sharing permissions inside the desktop app.
- External links open in the default browser.
- For China learners, continue to use Tencent/VooV backup when browser WebRTC cannot connect.


## Production sync behavior

The installed app opens the live TutorPro website inside a desktop window. Users must log in inside the app once; after login, their Supabase account, bookings, schedules and classroom links are the same as the website.

If you want to point the desktop app to another deployment, set `TUTORPRO_APP_URL` at build/runtime.
