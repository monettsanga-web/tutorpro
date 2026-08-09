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
 * commented lines below.
 */

// import { lazy } from 'react'

export const classroomComponents = {
  // OnlineClassroom: lazy(() => import('./OnlineClassroom.jsx')),
  // RecordingPlayback: lazy(() => import('./RecordingPlayback.jsx')),
  OnlineClassroom: null,
  RecordingPlayback: null,
}
