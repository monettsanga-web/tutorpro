/**
 * Online Classroom feature switch.
 *
 * WHY THIS EXISTS
 * ---------------
 * The built-in video classroom was by far the largest generator of Supabase
 * traffic on this site. A single lesson opened a Realtime channel with
 * presence and broadcast, a second Realtime channel subscribed to
 * postgres_changes, repeated polling timers, Storage uploads and downloads for
 * shared files and recordings, and two Edge Function calls for TURN and TRTC
 * credentials. All of that ran whether or not anybody actually spoke.
 *
 * It is now switched off in production. This module is the ONLY place that
 * decides that, so the classroom can be brought back by flipping one value
 * rather than by unpicking changes across a dozen files.
 *
 * WHAT "OFF" MEANS HERE
 * ---------------------
 * Not hidden — genuinely not loaded. The classroom is a lazily imported
 * chunk, so when this flag is false:
 *   - `src/OnlineClassroom.jsx` is never imported, so its ~877 kB chunk and
 *     the ~1,031 kB Tencent TRTC SDK chunk are never fetched;
 *   - `classroomTransport.js` never runs, so no Realtime channel, no
 *     presence, no broadcast and no postgres_changes subscription is opened;
 *   - `iceServers.js` and `tencentClassroom.js` never run, so the
 *     `turn-credentials` and `trtc-usersig` Edge Functions are never invoked;
 *   - `classroomStorage.js` and `classroomRecording.js` never run, so no
 *     classroom Storage upload, download or signed-URL request is made;
 *   - getUserMedia and getDisplayMedia are never called, so the browser never
 *     asks for camera, microphone or screen-share permission.
 *
 * WHAT IS DELIBERATELY UNAFFECTED
 * -------------------------------
 * Everything else keeps working exactly as before: registration, all three
 * logins, profiles, bookings and trial bookings, payments, feedback and
 * ratings, notifications, support chat, and the marketing site. The Realtime
 * channels used by bookings (`tutorpro-bookings`), profiles
 * (`tutorpro-profile-live-updates`) and site settings
 * (`tutorpro-site-settings`) are NOT classroom features and are untouched.
 *
 * No database table, Storage bucket, Edge Function or row has been deleted.
 * Historical lesson data, attendance records, shared files and recordings all
 * remain in Supabase exactly as they were; production simply stops requesting
 * them.
 */

/**
 * Master switch. Set to `true` to bring the classroom back.
 *
 * An environment variable can force it on for a staging deploy without a code
 * change, but the default is off so production never re-enables it by
 * accident (a missing or misspelled variable fails closed, not open).
 */
/*
 * NOTE ON THE LITERAL `false`.
 *
 * This is deliberately a plain constant and not a computed expression. Vite
 * and Rollup can only remove a dynamic `import()` from the build if the branch
 * guarding it is statically known to be dead. An earlier version read the flag
 * from an environment variable at runtime, and the result was that the
 * classroom chunks were still emitted AND still referenced by the dashboard
 * bundle — verified by finding `OnlineClassroom-*.js` inside the built
 * `Dashboards-*.js`. Traffic would then depend purely on nobody clicking.
 *
 * With a literal `false`, `if (CLASSROOM_ENABLED && ...)` is provably dead
 * code, the dynamic imports are dropped, and the classroom chunks disappear
 * from the build entirely. That is the difference between "hidden" and
 * "cannot possibly run".
 *
 * TO RE-ENABLE THE CLASSROOM: change this single line to `true` and rebuild.
 */
export const CLASSROOM_ENABLED = false

/** Wording shown wherever an "Enter classroom" control used to be. */
export const CLASSROOM_COMING_SOON_LABEL = 'Classroom Coming Soon'

export const CLASSROOM_COMING_SOON_NOTE =
  'Our built-in video classroom is being upgraded. Your lesson still goes ahead as normal — your teacher will send the meeting link for this class.'

export function isClassroomEnabled() {
  return CLASSROOM_ENABLED
}
