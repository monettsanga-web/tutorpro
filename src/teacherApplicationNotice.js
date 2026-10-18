/**
 * The one-time thank-you and checklist a teacher sees after applying.
 *
 * THE OWNER'S ASK
 * ---------------
 * When a teacher finishes applying, greet them once on their profile with
 * the review-team checklist (photo, introduction video link, sample class
 * link - links, never files), and let it delete itself after 24 hours.
 *
 * THE RULES
 * ---------
 * - It shows only while `teacher.applicationNoticeAt` is less than 24 hours
 *   old. The timestamp is set the moment the application is submitted and
 *   travels with the account, so the notice follows the teacher to whatever
 *   device they open next.
 * - It is dismissible, and the dismissal is remembered per browser, so
 *   "once" means once: closing it never brings it back.
 * - A missing, broken or future-dated timestamp shows NOTHING. Resurrecting
 *   a year-old application's welcome card would read as the site forgetting
 *   the teacher; silence is the safer failure.
 *
 * Kept free of React so scripts/test-teacher-notice.mjs can pin the window
 * and the wording without a browser.
 */

export const APPLICATION_NOTICE_HOURS = 24

export const DISMISSED_KEY = 'tutorpro_teacher_application_notice_dismissed_v1'

export const TEACHER_APPLICATION_NOTICE = 'Hello! 👋 Thank you for applying to become an English teacher at **TutorPro English Philippines!** We appreciate your interest in joining our teaching team. 🇵📚 Your application will be considered for review by our team. In the meantime, please make sure your **Teacher Profile** is complete by adding the following: ✅ **Profile Picture** – Upload a clear and professional profile picture. 🎥 **Video Introduction** – Paste the link to your video introduction directly into your Teacher Profile. 🧑‍🏫 **Sample Class Video (if available)** – You may also paste a link to a sample teaching video so we can get a better idea of your teaching style and skills. 📌 **Important Reminder:** Please paste the links to your video introduction and sample class directly into your Teacher Profile. **Do not upload the video files themselves.** You may use a shareable video link, such as a YouTube link, and make sure the videos can be viewed by our review team. Best of luck!'

/** Hours since the application stamp, or null when the date is unusable. */
export function applicationNoticeAgeInHours(noticeAt, now = Date.now()) {
  const stamped = Date.parse(noticeAt || '')
  if (!Number.isFinite(stamped)) return null
  return (now - stamped) / (60 * 60 * 1000)
}

/**
 * Should this teacher see the application notice right now?
 */
export function shouldShowApplicationNotice(account, dismissedIds = [], now = Date.now()) {
  if (!account?.id) return false
  if (dismissedIds.includes(account.id)) return false
  const age = applicationNoticeAgeInHours(account.teacher?.applicationNoticeAt, now)
  if (age === null) return false
  return age >= 0 && age < APPLICATION_NOTICE_HOURS
}

/**
 * The notice split into plain and **bold** runs, so the profile card can
 * render the owner's emphasis without shipping a markdown parser.
 */
export function noticeSegments(text = TEACHER_APPLICATION_NOTICE) {
  return String(text)
    .split(/\*\*([^*]+)\*\*/g)
    .filter((part) => part !== '')
    .map((part, index) => ({ strong: index % 2 === 1, text: part }))
}

export function readDismissedTeacherNotices() {
  try {
    const value = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function rememberDismissedTeacherNotice(id) {
  const next = [...new Set([...readDismissedTeacherNotices(), id])].slice(-50)
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)) } catch { /* Private mode: in-memory only. */ }
  return next
}
