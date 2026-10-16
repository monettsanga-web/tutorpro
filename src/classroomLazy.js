/**
 * Where the classroom's lazy imports live — or rather, where they no longer do.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Wrapping `lazy(() => import('./OnlineClassroom.jsx'))` in a ternary does NOT
 * remove it from the build. Rollup still treats the dynamic import as
 * reachable and emits the chunk, and the built dashboard bundle still contains
 * a reference to it — verified by grepping `OnlineClassroom-*.js` out of the
 * compiled `Dashboards-*.js`. A disabled feature that is still downloadable is
 * still a liability.
 *
 * Concentrating the imports here means the classroom is switched off by the
 * absence of an `import()` expression, not by a runtime branch around one.
 * With the export below empty, nothing in the application graph points at
 * OnlineClassroom.jsx, RecordingPlayback.jsx, classroomTransport.js,
 * classroomStorage.js, classroomRecording.js, iceServers.js,
 * tencentClassroom.js or the Tencent TRTC SDK, so none of them are bundled,
 * shipped or executable.
 *
 * TO RE-ENABLE THE CLASSROOM
 * --------------------------
 * Set CLASSROOM_ENABLED to true in classroomFeature.js and restore the two
 * lazy imports below (done 2026-10-16 for the global relight; mainland
 * China is excluded at runtime by classroomRegionNotice()).
 */

import { lazy } from 'react'

/* Relit for the global classroom (2026-10-16). The imports stay LAZY: the
   ~877 kB classroom chunk and the TRTC SDK are fetched only when somebody
   actually enters a class, never on dashboard load. To switch the classroom
   off again, comment these two lines out as well as setting
   CLASSROOM_ENABLED = false, so the chunks leave the build entirely. */
export const classroomComponents = {
  OnlineClassroom: lazy(() => import('./OnlineClassroom.jsx')),
  RecordingPlayback: lazy(() => import('./RecordingPlayback.jsx')),
}
