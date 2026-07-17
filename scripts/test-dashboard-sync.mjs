const sharedStorage = new Map()
let activeSession = new Map()

globalThis.localStorage = {
  getItem: (key) => sharedStorage.get(key) ?? null,
  setItem: (key, value) => sharedStorage.set(key, String(value)),
  removeItem: (key) => sharedStorage.delete(key),
}
globalThis.sessionStorage = {
  getItem: (key) => activeSession.get(key) ?? null,
  setItem: (key, value) => activeSession.set(key, String(value)),
  removeItem: (key) => activeSession.delete(key),
}

const auth = await import('../src/auth.js')
auth.initializePlatform()

const studentTab = new Map()
activeSession = studentTab
const family = await auth.registerAccount({
  parentName: 'Synced Parent',
  email: 'sync-parent@example.com',
  authProvider: 'email',
  password: 'Student123',
  childName: 'Synced Student',
  year: 'Year 5',
  curriculum: 'Cambridge',
  goal: 'Speaking with confidence',
  frequency: '1–2 weekly',
})

const teacherTab = new Map()
activeSession = teacherTab
const teacher = await auth.registerTeacher({
  fullName: 'Synced Teacher',
  email: 'sync-teacher@example.com',
  authProvider: 'email',
  password: 'Teacher123',
  specialization: 'Cambridge',
  bio: 'An experienced teacher applying through the synchronized teacher registration flow.',
  education: 'Bachelor of Education',
  experience: 4,
  languages: 'English',
  credentials: [],
})

const adminTab = new Map()
activeSession = adminTab
const adminStudents = auth.getAccounts('student')
const adminTeachers = auth.getAccounts('teacher')
if (!adminStudents.some((account) => account.id === family.id)) throw new Error('Student signup did not synchronize to Admin data.')
if (!adminTeachers.some((account) => account.id === teacher.id && account.status === 'pending')) throw new Error('Teacher signup did not synchronize as pending.')

auth.updateLearnerAccess(family.id, family.child.id, 'suspended')
auth.updateAccount(teacher.id, { status: 'approved' })

activeSession = studentTab
const studentAfterAdmin = auth.getAccountById(family.id)
if (studentAfterAdmin.child.accessStatus !== 'suspended') {
  throw new Error('Admin student controls did not synchronize back to Student data.')
}

activeSession = teacherTab
if (auth.getAccountById(teacher.id).status !== 'approved') throw new Error('Admin teacher approval did not synchronize back to Teacher data.')

if (!studentTab.size || !teacherTab.size || adminTab.size) throw new Error('Per-tab session isolation failed.')
process.stdout.write('Admin ↔ Student ↔ Teacher dashboard synchronization: PASS\n')
