const HOMEWORK_KEY = 'tutorpro_homework_v1'

function readHomeworkRows() {
  try { return JSON.parse(localStorage.getItem(HOMEWORK_KEY) || '[]') } catch { return [] }
}

function writeHomeworkRows(rows) {
  localStorage.setItem(HOMEWORK_KEY, JSON.stringify(rows))
  window.dispatchEvent(new CustomEvent('tutorpro:homework-change'))
  window.dispatchEvent(new CustomEvent('tutorpro:data-change'))
}

export const HOMEWORK_TYPES = [
  'Reading',
  'Writing',
  'Speaking',
  'Vocabulary',
  'Grammar',
  'Worksheet',
  'Video',
  'Game practice',
]

export function getHomework(filters = {}) {
  return readHomeworkRows()
    .filter((item) => !filters.teacherId || item.teacherId === filters.teacherId)
    .filter((item) => !filters.studentId || item.studentId === filters.studentId)
    .filter((item) => !filters.learnerId || item.learnerId === filters.learnerId)
    .filter((item) => !filters.status || item.status === filters.status)
    .sort((a, b) => `${b.createdAt}`.localeCompare(`${a.createdAt}`))
}

export function createHomework(details) {
  if (!details.teacherId) throw new Error('Teacher is required.')
  if (!details.studentId || !details.learnerId) throw new Error('Choose a student.')
  if (!details.title?.trim()) throw new Error('Add a homework title.')
  if (!details.instructions?.trim()) throw new Error('Add homework instructions.')
  const row = {
    id: crypto.randomUUID(),
    teacherId: details.teacherId,
    teacherName: details.teacherName || 'TutorPro Teacher',
    studentId: details.studentId,
    learnerId: details.learnerId,
    learnerName: details.learnerName || 'Student',
    type: HOMEWORK_TYPES.includes(details.type) ? details.type : 'Reading',
    title: details.title.trim().slice(0, 140),
    instructions: details.instructions.trim().slice(0, 4000),
    resourceUrl: String(details.resourceUrl || '').trim().slice(0, 2048),
    dueDate: details.dueDate || '',
    status: 'assigned',
    studentNote: '',
    teacherReview: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const rows = [row, ...readHomeworkRows()]
  writeHomeworkRows(rows)
  return row
}

export function updateHomework(homeworkId, changes) {
  const rows = readHomeworkRows()
  const index = rows.findIndex((item) => item.id === homeworkId)
  if (index < 0) throw new Error('Homework not found.')
  rows[index] = { ...rows[index], ...changes, updatedAt: new Date().toISOString() }
  writeHomeworkRows(rows)
  return rows[index]
}

export function removeHomework(homeworkId) {
  const rows = readHomeworkRows()
  writeHomeworkRows(rows.filter((item) => item.id !== homeworkId))
}

export function homeworkStats(rows = readHomeworkRows()) {
  const total = rows.length
  const completed = rows.filter((item) => item.status === 'completed' || item.status === 'reviewed').length
  const overdue = rows.filter((item) => item.dueDate && item.status === 'assigned' && item.dueDate < new Date().toISOString().slice(0, 10)).length
  return { total, completed, overdue, assigned: rows.filter((item) => item.status === 'assigned').length, reviewed: rows.filter((item) => item.status === 'reviewed').length }
}
