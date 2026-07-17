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
  const { StudentDashboard, TeacherDashboard, AdminDashboard } = await vite.ssrLoadModule('/src/Dashboards.jsx')
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

  if (!studentHtml.includes('Finish this student registration')) throw new Error('Incomplete student recovery view failed to render.')
  if (!teacherHtml.includes('Good day')) throw new Error('Incomplete teacher dashboard failed to render.')
  if (!adminHtml.includes('TutorPro English command centre')) throw new Error('Administrator dashboard failed to render.')
  process.stdout.write('Student, Teacher and Admin dashboard rendering: PASS\n')
} finally {
  await vite.close()
}
