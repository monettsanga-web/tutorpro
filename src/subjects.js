/**
 * The subjects TutorPro teaches.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The site was built around a single subject, so "English" was written into
 * dozens of places by hand. Adding Science, Maths and ICT by hand as well
 * would mean four copies of the same list drifting apart. Everything that
 * needs to know what is taught reads from here instead: the homepage
 * programmes, the subjects page, the booking form, teacher profiles and
 * registration.
 *
 * ADDING ANOTHER SUBJECT LATER
 * ----------------------------
 * Add one entry below. The homepage cards, the booking dropdown, the teacher
 * specialisation list and the registration form all pick it up with no
 * further changes.
 *
 * A NOTE ON HONESTY
 * -----------------
 * Nothing here claims an accreditation, an exam board or a qualification that
 * has not been verified. English is described as Cambridge and Oxford aligned
 * because that is true and already published. The new subjects are described
 * as following the school curriculum, which is a statement about how lessons
 * are planned rather than a claim of endorsement by an exam board.
 */

export const SUBJECTS = [
  {
    id: 'english',
    name: 'English',
    short: 'English',
    tagline: 'Reading, writing, speaking and confidence',
    // The original subject: this is the only one with a published alignment.
    accreditation: 'Cambridge & Oxford aligned',
    accent: 'coral',
    icon: 'BookOpen',
    blurb: 'Phonics, reading, grammar and speaking practice, one-to-one with a teacher who listens.',
    primary: 'Phonics, reading fluency, everyday speaking and early writing.',
    secondary: 'Essay structure, comprehension, analysis and exam technique.',
    focusOptions: [
      'Speaking with confidence',
      'Reading comprehension',
      'Writing and grammar',
      'Schoolwork and exam support',
      'Build an all-round foundation',
    ],
  },
  {
    id: 'maths',
    name: 'Maths',
    short: 'Maths',
    tagline: 'From counting to algebra, without the panic',
    accreditation: 'Follows your child’s school curriculum',
    accent: 'blue',
    icon: 'Calculator',
    blurb: 'Number sense, problem solving and the steps in between — worked through slowly until it clicks.',
    primary: 'Number, place value, times tables, fractions, shape and word problems.',
    secondary: 'Algebra, geometry, ratio, statistics and exam-style problem solving.',
    focusOptions: [
      'Catching up with class',
      'Times tables and number sense',
      'Fractions, decimals and percentages',
      'Algebra and equations',
      'Problem solving and word problems',
      'Exam preparation',
    ],
  },
  {
    id: 'science',
    name: 'Science',
    short: 'Science',
    tagline: 'Curious questions, clear explanations',
    accreditation: 'Follows your child’s school curriculum',
    accent: 'green',
    icon: 'FlaskConical',
    blurb: 'Biology, chemistry and physics explained in plain language, with the reasoning made visible.',
    primary: 'Living things, materials, forces, space and simple investigations.',
    secondary: 'Biology, chemistry and physics topics, practical write-ups and exam questions.',
    focusOptions: [
      'Understanding class topics',
      'Biology',
      'Chemistry',
      'Physics',
      'Investigations and write-ups',
      'Exam preparation',
    ],
  },
  {
    id: 'ict',
    name: 'ICT',
    short: 'ICT',
    tagline: 'Real digital skills, safely taught',
    accreditation: 'Follows your child’s school curriculum',
    accent: 'violet',
    icon: 'Laptop',
    blurb: 'Computing, coding and the everyday software skills school and homework now assume.',
    primary: 'Typing, safe internet use, documents, presentations and first steps in coding.',
    secondary: 'Spreadsheets, databases, programming, algorithms and digital literacy.',
    focusOptions: [
      'Computer basics and typing',
      'Documents and presentations',
      'Spreadsheets and data',
      'Coding and algorithms',
      'Online safety',
      'Exam preparation',
    ],
  },
]

/** The default subject, used wherever an older record has no subject stored. */
export const DEFAULT_SUBJECT_ID = 'english'

export function subjectById(id) {
  return SUBJECTS.find((subject) => subject.id === id) || null
}

/**
 * Resolve whatever is stored on an old record into a real subject.
 *
 * Every booking, teacher and learner created before this feature existed has
 * no subject field at all. They are English lessons, so they resolve to
 * English rather than to a blank — nothing in the history looks broken.
 */
export function resolveSubject(value) {
  if (!value) return subjectById(DEFAULT_SUBJECT_ID)
  const needle = String(value).trim().toLowerCase()
  return SUBJECTS.find((subject) => subject.id === needle)
    || SUBJECTS.find((subject) => subject.name.toLowerCase() === needle)
    // "Mathematics" and "Math" both mean Maths; teachers type either.
    || (['math', 'mathematics'].includes(needle) ? subjectById('maths') : null)
    || (['computing', 'computer science', 'it'].includes(needle) ? subjectById('ict') : null)
    || subjectById(DEFAULT_SUBJECT_ID)
}

export function subjectName(value) {
  return resolveSubject(value).name
}

/** Lesson focus choices for a subject, for the booking form. */
export function focusOptionsFor(value) {
  return resolveSubject(value).focusOptions
}

/**
 * What a teacher can say they teach.
 *
 * The existing options were 'Both Curricula', 'Cambridge' and 'Oxford', which
 * are English curricula rather than subjects. Those are preserved so no
 * existing teacher profile is invalidated, and the subjects are added
 * alongside them.
 */
export const TEACHER_SPECIALIZATIONS = [
  'Both Curricula',
  'Cambridge',
  'Oxford',
  ...SUBJECTS.filter((subject) => subject.id !== 'english').map((subject) => subject.name),
  'Multiple subjects',
]

/** Subject ids a teacher covers, read from their stored profile. */
export function teacherSubjectIds(teacher) {
  const stored = teacher?.teacher?.subjects
  if (Array.isArray(stored) && stored.length) {
    return stored.map((id) => resolveSubject(id).id)
  }
  // No subject list stored: fall back to their specialisation text, and
  // finally to English, which is what every existing teacher teaches.
  const specialization = teacher?.teacher?.specialization
  if (specialization === 'Multiple subjects') return SUBJECTS.map((subject) => subject.id)
  const matched = SUBJECTS.find((subject) => subject.name === specialization)
  return matched ? [matched.id] : [DEFAULT_SUBJECT_ID]
}

export function teacherTeachesSubject(teacher, subjectId) {
  return teacherSubjectIds(teacher).includes(resolveSubject(subjectId).id)
}
