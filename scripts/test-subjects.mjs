/**
 * Subject support checks.
 *
 * The whole platform predates subjects: every existing booking, teacher and
 * learner has no subject field at all. The single most important property
 * here is that none of those records break or silently change meaning — they
 * are all English lessons and must keep reading as English.
 */

import assert from 'node:assert/strict'

let passed = 0
const check = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ok  ${name}`) }
  catch (error) { console.error(`FAIL  ${name}\n      ${error.message}`); process.exitCode = 1 }
}

const {
  SUBJECTS, DEFAULT_SUBJECT_ID, subjectById, resolveSubject, subjectName,
  focusOptionsFor, TEACHER_SPECIALIZATIONS, teacherSubjectIds, teacherTeachesSubject,
} = await import('../src/subjects.js')

console.log('\nThe catalogue')

check('all four subjects are present', () => {
  assert.deepEqual(SUBJECTS.map((s) => s.id), ['english', 'maths', 'science', 'ict'])
})

check('English stays first, so it remains the headline subject', () => {
  assert.equal(SUBJECTS[0].id, 'english')
  assert.equal(DEFAULT_SUBJECT_ID, 'english')
})

check('only English claims the Cambridge/Oxford alignment', () => {
  // Claiming an exam-board alignment for the new subjects would be untrue.
  const claiming = SUBJECTS.filter((s) => /cambridge|oxford/i.test(s.accreditation))
  assert.deepEqual(claiming.map((s) => s.id), ['english'])
})

check('every subject has the copy the pages need', () => {
  SUBJECTS.forEach((s) => {
    ;['name', 'tagline', 'accreditation', 'accent', 'icon', 'blurb', 'primary', 'secondary'].forEach((field) => {
      assert.ok(String(s[field] || '').trim().length > 0, `${s.id} is missing ${field}`)
    })
    assert.ok(s.focusOptions.length >= 4, `${s.id} needs real focus options`)
  })
})

check('each subject has a distinct accent colour', () => {
  const accents = SUBJECTS.map((s) => s.accent)
  assert.equal(new Set(accents).size, accents.length)
})

console.log('\nOld records must not break')

check('a booking with no subject reads as English', () => {
  assert.equal(resolveSubject(undefined).id, 'english')
  assert.equal(resolveSubject(null).id, 'english')
  assert.equal(resolveSubject('').id, 'english')
})

check('an unrecognised value falls back to English rather than blank', () => {
  assert.equal(resolveSubject('astrophysics').id, 'english')
  assert.equal(subjectName('nonsense'), 'English')
})

check('a teacher with no subjects list is treated as an English teacher', () => {
  assert.deepEqual(teacherSubjectIds({ teacher: {} }), ['english'])
  assert.deepEqual(teacherSubjectIds({}), ['english'])
  assert.deepEqual(teacherSubjectIds(null), ['english'])
})

check('the three original specialisations are still offered', () => {
  ;['Both Curricula', 'Cambridge', 'Oxford'].forEach((option) => {
    assert.ok(TEACHER_SPECIALIZATIONS.includes(option), `${option} must not be removed`)
  })
})

check('an existing Cambridge/Oxford teacher still teaches English', () => {
  assert.ok(teacherTeachesSubject({ teacher: { specialization: 'Cambridge' } }, 'english'))
  assert.ok(teacherTeachesSubject({ teacher: { specialization: 'Both Curricula' } }, 'english'))
})

console.log('\nResolving what people actually type')

check('names and ids both resolve', () => {
  assert.equal(resolveSubject('maths').id, 'maths')
  assert.equal(resolveSubject('Maths').id, 'maths')
  assert.equal(resolveSubject('SCIENCE').id, 'science')
  assert.equal(resolveSubject('ict').id, 'ict')
})

check('"Math" and "Mathematics" both mean Maths', () => {
  assert.equal(resolveSubject('Math').id, 'maths')
  assert.equal(resolveSubject('mathematics').id, 'maths')
})

check('"Computing", "Computer Science" and "IT" all mean ICT', () => {
  assert.equal(resolveSubject('Computing').id, 'ict')
  assert.equal(resolveSubject('computer science').id, 'ict')
  assert.equal(resolveSubject('IT').id, 'ict')
})

check('whitespace does not defeat matching', () => {
  assert.equal(resolveSubject('  Science  ').id, 'science')
})

console.log('\nTeacher subject assignment')

check('an explicit subjects list is honoured', () => {
  const teacher = { teacher: { subjects: ['maths', 'science'] } }
  assert.deepEqual(teacherSubjectIds(teacher), ['maths', 'science'])
  assert.ok(teacherTeachesSubject(teacher, 'maths'))
  assert.ok(!teacherTeachesSubject(teacher, 'ict'))
})

check('"Multiple subjects" means every subject', () => {
  const teacher = { teacher: { specialization: 'Multiple subjects' } }
  assert.deepEqual(teacherSubjectIds(teacher).sort(), ['english', 'ict', 'maths', 'science'])
})

check('a single-subject specialisation maps to that subject', () => {
  assert.deepEqual(teacherSubjectIds({ teacher: { specialization: 'Science' } }), ['science'])
})

check('a stored list containing junk still resolves to real subjects', () => {
  const ids = teacherSubjectIds({ teacher: { subjects: ['maths', 'gibberish'] } })
  ids.forEach((id) => assert.ok(subjectById(id), `${id} must be a real subject`))
})

console.log('\nBooking focus options')

check('focus options differ per subject', () => {
  assert.notDeepEqual(focusOptionsFor('maths'), focusOptionsFor('english'))
  assert.ok(focusOptionsFor('ict').some((option) => /coding/i.test(option)))
  assert.ok(focusOptionsFor('science').some((option) => /biology/i.test(option)))
})

check('an unknown subject still yields usable options', () => {
  assert.deepEqual(focusOptionsFor('nope'), focusOptionsFor('english'))
})

check('the original English focus options are unchanged', () => {
  // Existing bookings store these exact strings; changing them would orphan them.
  assert.deepEqual(focusOptionsFor('english'), [
    'Speaking with confidence',
    'Reading comprehension',
    'Writing and grammar',
    'Schoolwork and exam support',
    'Build an all-round foundation',
  ])
})

console.log(`\n${passed} checks passed.`)
