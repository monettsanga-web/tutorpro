# Online Classroom disabled — egress reduction report

**Date:** 9 August 2026 · **Commit:** `78fd56e` · **Branch:** `main`

---

## Executive summary

The Online Classroom is switched off in production. It is not merely hidden —
its code is **no longer present in the deployed build**, so it cannot open a
Realtime channel, call an Edge Function, touch Storage, or request a camera.

**Nothing was deleted.** No Supabase table, bucket, file, Edge Function,
policy or row was touched. Every classroom source file remains in the
repository and every classroom test suite still passes. Re-enabling is a
one-line change.

---

## 1. Files modified

| File | Change |
|---|---|
| `src/classroomFeature.js` | **NEW.** Single source of truth: `CLASSROOM_ENABLED = false`. |
| `src/classroomLazy.js` | **NEW.** Holds the classroom `import()` calls; now commented out, which is what removes the chunks. |
| `src/Dashboards.jsx` | Classroom mounts, entry buttons, teacher launcher, TRTC picker and recording player all gated. |
| `src/classroom.css` | Added the `.classroom-coming-soon` style. |
| `package.json` | Added `verify:classroomoff` and `verify:dashoff`. |
| `scripts/verify-classroom-disabled.mjs` | **NEW.** 8 browser checks. |
| `scripts/verify-dashboard-classroom-off.mjs` | **NEW.** 7 logged-in browser checks. |

## 2. Files deleted

**None.**

## 3. Classroom features disabled

Video calls · camera · microphone · screen sharing · classroom presence ·
classroom chat · whiteboard · live file sharing · classroom polling · live
state sync · classroom Storage · classroom Edge Functions · recording capture
and playback · the embedded Tencent RTC classroom.

## 4. Supabase Realtime connections removed

From `src/classroomTransport.js`, now unreachable:

| Channel | Type |
|---|---|
| `tutorpro-classroom-<room>-<token>` | `broadcast` (signalling) + `presence` (sync/join/leave) |
| `…-durable-<participant>` | `postgres_changes` on the signalling table |

**Deliberately kept** (not classroom features):

- `tutorpro-bookings` — booking notifications
- `tutorpro-profile-live-updates` — profile sync
- `tutorpro-site-settings` — admin settings

## 5. Polling removed

10 `setInterval`/`setTimeout` sites in `OnlineClassroom.jsx` and 2 in
`classroomTransport.js` (heartbeat/reconnect) no longer load or run. No
polling belonging to any other feature was touched.

## 6. Database queries removed

`openTeacherClassroom()` previously flipped a booking to `ongoing` and pushed
that write to Supabase — plus the Realtime fan-out it triggers — every time a
teacher opened a classroom. It now returns early. Attendance writes
(`recordJoin`/`recordLeave`) no longer run.

## 7. Storage requests removed

| Bucket | Operations stopped |
|---|---|
| `classroom-files` | `list`, `upload`, `createSignedUrl`, `remove` |
| `classroom-recordings` | `upload`, `createSignedUrl` (up to **1 GB per recording** — the largest single egress source), `remove` |

Buckets and files are **untouched**; production simply stops requesting them.

## 8. Edge Function calls removed

- `trtc-usersig` (Tencent credentials)
- `turn-credentials` (WebRTC TURN relay)

Both functions **still exist** in Supabase. Untouched: `mass-announcement`,
`support-notification`, `teacher-interview-evaluator`, `booking-notification`,
`follow-up-email`.

## 9. Video / WebRTC removed

`RTCPeerConnection`, `getUserMedia`, `getDisplayMedia`, `MediaRecorder`
(classroom) and the `trtc-sdk-v5` SDK are all out of the shipped build.

**Left alone:** `src/app/api/livekit/token/route.ts` is dead code already — a
Next.js route in a Vite app, never bundled or served. `TeacherAIInterview.jsx`
uses `getUserMedia`/`MediaRecorder` for the **teacher hiring interview**, which
is a separate live feature and was not touched.

## 10. Measured results

Build output, before vs after:

```
BEFORE   dist/assets = 15 MB
         OnlineClassroom  877.96 kB   (310.33 kB gzip)
         trtc SDK       1,031.43 kB   (285.15 kB gzip)
         tencentClassroom  11.41 kB
         RecordingPlayback  1.79 kB

AFTER    dist/assets = 11 MB
         none of the above chunks are emitted at all
```

Runtime, real headless browser, full page load + complete scroll:

```
classroom JS chunks requested ......... 0
classroom Edge Function calls ......... 0
classroom Storage requests ............ 0
classroom websockets .................. 0
getUserMedia / getDisplayMedia / RTC .. 0
JS errors ............................. 0
```

> I have **not** measured Supabase egress in the dashboard, because the
> classroom was already idle in this environment — there is no live lesson to
> compare against. What is proven is that the code which generated that
> traffic is no longer downloadable or executable in production.

## 11. Additional egress findings (reported, not changed)

**A. Realtime socket opens for every anonymous visitor.**
`src/App.jsx:1751` calls `subscribeToCloudSiteSettings()` on every page load.
Measured: a `wss://…/realtime/v1/websocket` connection opens on the public
homepage **with no channel actually joined**. This exists so an admin toggling
teacher-directory visibility updates live. Every visitor pays for a socket to
serve an admin convenience. **Recommendation:** only subscribe when an admin
is signed in. Left alone as it is outside this task's scope.

**B. `select('*')` on large tables.**

| Location | Query |
|---|---|
| `cloudBookings.js:150` | `bookings.select('*')` — no limit; grows forever |
| `cloudBookings.js:99,115` | `bookings.select('*')` |
| `cloudProfiles.js:114` | `profiles.select('*')` — every profile |
| `Dashboards.jsx:5398` | `support_conversations.select('*')` |

`bookings` rows carry large JSON (`booking_data`, feedback, recording lists),
so this is likely your biggest remaining egress after the classroom. Fixing it
means selecting named columns and paginating — a behaviour-affecting change I
did not make without approval.

## 12. Features confirmed still working

Verified by browser test and by full suite runs: homepage and marketing pages,
student login and dashboard, bookings and booking cards, lesson calendar,
package checkout UI, support chat, notifications, profiles, the panda mascot,
and the language switcher.

Test suites, all passing: `test:feedback` 17 · `test:writepolicy` 40 ·
`test:reviews` 62 · `test:fbmerge` 24 · `test:ptreviews` 54 · `test:status` 15
· `test:upload` 15 · `test:ice` 27 · `test:handshake` 18 · `test:sharing` 27 ·
`test:signalling` 17 · `test:roles` 22 · `test:presence` 17 · `test:media` 18
· `test:reach` 23 · `test:synchealth` 23.

## 13. Build and lint

- `npm run build` — **passes**, no errors.
- `npx eslint src` — **190 problems (181 errors, 9 warnings)**, byte-identical
  to the pre-existing baseline. No new problems introduced.

## 14. Classroom code intentionally left in place

`OnlineClassroom.jsx`, `classroomTransport.js`, `classroomStorage.js`,
`classroomRecording.js`, `classroomAttendance.js`, `iceServers.js`,
`tencentClassroom.js`, `RecordingPlayback.jsx`, `components/ClassroomDashboard.jsx`,
`components/WhiteboardSlides.jsx`, `classroom.css`, and the `trtc-sdk-v5`
dependency.

None are reachable from the application graph, so none are shipped. They are
kept so the feature can be restored, and so its test suites keep passing.
`classroomAttendance.js` is still imported by `Dashboards.jsx` for **reading**
historical attendance on past bookings — it performs no network calls.

## 15. Not deleted — requires your explicit approval

**Tables:** any classroom/signalling tables (kept; historical data intact).
**Buckets:** `classroom-files`, `classroom-recordings`.
**Edge Functions:** `trtc-usersig`, `turn-credentials`.
**Environment variables** (now unused by the build, safe to remove but left):
`VITE_TRTC_SDK_APP_ID`, `VITE_CLASSROOM_TURN_URL`,
`VITE_CLASSROOM_TURN_USERNAME`, `VITE_CLASSROOM_TURN_CREDENTIAL`.
`LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` were already unused.

> Storage buckets are the one place where **stored data itself costs money**
> monthly. If you want the storage bill reduced as well as the egress, say so
> and I will show you exactly what is in each bucket before anything is
> deleted.

## 16. How to re-enable

Set `CLASSROOM_ENABLED = true` in `src/classroomFeature.js`, uncomment the two
lines in `src/classroomLazy.js`, and rebuild.
