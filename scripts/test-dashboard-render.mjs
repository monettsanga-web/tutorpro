import React from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'

const shared = new Map()
globalThis.localStorage = {
  getItem: (key) => shared.get(key) ?? null,
  setItem: (key, value) => shared.set(key, String(value)),
  removeItem: (key) => shared.delete(key),
}
globalThis.sessionStorage = globalThis.localStorage

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { StudentDashboard, TeacherDashboard, AdminDashboard, AdminTeacherProfile, AdminStudentProfile, BookingSlotDialog } = await vite.ssrLoadModule('/src/Dashboards.jsx')
  const { default: PortalAccess } = await vite.ssrLoadModule('/src/PortalAccess.jsx')
  const { default: PremiumMotion } = await vite.ssrLoadModule('/src/PremiumMotion.jsx')
  const { default: AuthProviderPicker } = await vite.ssrLoadModule('/src/AuthProviderPicker.jsx')
  const { default: LetterBubbleAdventure } = await vite.ssrLoadModule('/src/LetterBubbleAdventure.jsx')
  const callbacks = { onAccountChange() {}, onHome() {}, onLogout() {} }

  const incompleteStudent = {
    id: 'student-incomplete', role: 'student', status: 'active', parentName: 'Parent', email: 'parent@example.com', children: [], child: null,
  }
  const incompleteTeacher = {
    id: 'teacher-incomplete', role: 'teacher', status: 'pending', fullName: '', email: 'teacher@example.com', teacher: null,
  }
  const administrator = {
    id: 'admin-test', role: 'admin', status: 'active', fullName: 'Administrator', email: 'admin@example.com',
  }

  const studentHtml = renderToString(React.createElement(StudentDashboard, { account: incompleteStudent, ...callbacks }))
  const teacherHtml = renderToString(React.createElement(TeacherDashboard, { account: incompleteTeacher, ...callbacks }))
  const adminHtml = renderToString(React.createElement(AdminDashboard, { account: administrator, onHome() {}, onLogout() {} }))
  const adminTeacherHtml = renderToString(React.createElement(AdminTeacherProfile, { teacher: incompleteTeacher, onBack() {}, onStatusChange() {}, onRemove() {}, processing: false, error: '' }))
  const adminStudentHtml = renderToString(React.createElement(AdminStudentProfile, { account: incompleteStudent, learnerId: '', onBack() {}, onStatusChange() {}, onGoalChange() {}, onRemove() {}, processing: false, error: '' }))
  const adminLoginHtml = renderToString(React.createElement(PortalAccess, { mode: 'admin', onClose() {}, onAuthenticated() {}, onEnterPortal() {} }))
  const teacherLoginHtml = renderToString(React.createElement(PortalAccess, { mode: 'teacher', onClose() {}, onAuthenticated() {}, onEnterPortal() {} }))
  const premiumMotionHtml = renderToString(React.createElement(PremiumMotion))
  const letterGameHtml = renderToString(React.createElement(LetterBubbleAdventure, { onBack() {}, onEarn() {} }))
  const bookingDialogHtml = renderToString(React.createElement(BookingSlotDialog, {
    booking: { id: 'booking-test', studentId: 'student-test', learnerId: 'learner-test', learnerName: 'Alex', teacherId: 'teacher-test', teacherName: 'Teacher Test', date: '2027-06-01', time: '16:00', duration: 25, focus: 'Speaking', status: 'confirmed', note: 'Please practise reading.', slotComment: '' },
    account: { id: 'teacher-test', role: 'teacher', fullName: 'Teacher Test' },
    onClose() {}, onChanged() {},
  }))
  sessionStorage.setItem('tutorpro_visitor_country', 'CN')
  const chineseProviderHtml = renderToString(React.createElement(AuthProviderPicker, { value: 'email', onSelect() {} }))
  sessionStorage.removeItem('tutorpro_visitor_country')

  if (!studentHtml.includes('Finish this student registration')) throw new Error('Incomplete student recovery view failed to render.')
  if (!teacherHtml.includes('Good day')) throw new Error('Incomplete teacher dashboard failed to render.')
  if (!adminHtml.includes('TutorPro English command centre')) throw new Error('Administrator dashboard failed to render.')
  if (!adminTeacherHtml.includes('About the teacher') || !adminTeacherHtml.includes('New Teacher') || !adminTeacherHtml.includes('Delete profile')) throw new Error('Administrator teacher profile controls failed to render.')
  if (!adminStudentHtml.includes('Parent and login details') || !adminStudentHtml.includes('Incomplete student profile') || !adminStudentHtml.includes('Main Learning Goal') || !adminStudentHtml.includes('Only administrators can edit')) throw new Error('Administrator student profile controls failed to render.')
  if (!adminLoginHtml.includes('Administrator login') || adminLoginHtml.includes('Create the admin account')) throw new Error('Admin Portal did not default to login on a new device.')
  if (!teacherLoginHtml.includes('Teacher login')) throw new Error('Teacher Portal did not default to login.')
  if (!premiumMotionHtml.includes('premium-scroll-progress') || !premiumMotionHtml.includes('premium-pointer-glow')) throw new Error('Premium motion layer failed to render.')
  if (!letterGameHtml.includes('Alphabet Bubble Adventure') || !letterGameHtml.includes('Find this letter') || !letterGameHtml.includes('letter-round-count') || !letterGameHtml.includes('of 26')) throw new Error('Interactive A–Z letter game failed to render.')
  if (!bookingDialogHtml.includes('booking-comment-editor') || !bookingDialogHtml.includes('Alex') || !bookingDialogHtml.includes('Save comment') || !bookingDialogHtml.includes('Cancel booking') || !bookingDialogHtml.includes('Parent booking note')) throw new Error('Responsive booking comment and cancellation controls failed to render.')
  if (!chineseProviderHtml.includes('中国家长注册提示') || !chineseProviderHtml.includes('其他邮箱 / Other email') || !chineseProviderHtml.includes('请不要使用 Gmail')) throw new Error('Chinese parent email guidance failed to render.')
  process.stdout.write('Student, Teacher and Admin dashboard rendering: PASS\n')
} finally {
  await vite.close()
}
