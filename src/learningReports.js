function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function textIncludes(text, pattern) {
  return pattern.test(String(text || '').toLowerCase())
}

export function buildLearningReport({ learner = {}, bookings = [], homework = [] } = {}) {
  const completed = bookings.filter((booking) => booking.status === 'completed')
  const attended = bookings.filter((booking) => ['confirmed', 'ongoing', 'completed'].includes(booking.status))
  const absent = bookings.filter((booking) => booking.status === 'absent')
  const feedback = completed.map((booking) => booking.teacherFeedback).filter(Boolean)
  const feedbackText = feedback.map((item) => `${item.summary || ''} ${item.strength || ''} ${item.nextStep || ''} ${item.homework || ''} ${(item.grammarFocus || []).join(' ')} ${(item.practiceWords || []).join(' ')}`).join(' ').toLowerCase()
  const completedHomework = homework.filter((item) => ['completed', 'reviewed'].includes(item.status)).length
  const totalHomework = homework.length
  const homeworkRate = totalHomework ? (completedHomework / totalHomework) * 100 : 0
  const attendanceRate = attended.length + absent.length ? (attended.length / (attended.length + absent.length)) * 100 : 100
  const baseProgress = Number(learner.progress || 18)
  const lessonBoost = completed.length * 4
  const homeworkBoost = Math.min(15, completedHomework * 3)
  const confidenceBoost = textIncludes(feedbackText, /confident|participat|speaking|active|effort|excellent|great|good/) ? 8 : 0
  const needsGrammar = textIncludes(feedbackText, /grammar|tense|verb|sentence|article|plural|preposition|punctuation/)
  const needsReading = textIncludes(feedbackText, /reading|phonics|sound|comprehension|decode|passage/)
  const needsSpeaking = textIncludes(feedbackText, /speaking|pronunciation|fluency|conversation|complete sentence|confidence/)
  const needsVocabulary = textIncludes(feedbackText, /vocabulary|word|meaning|adjective|noun/)

  const scores = {
    speaking: clamp(baseProgress + lessonBoost + confidenceBoost - (needsSpeaking ? 2 : 0)),
    pronunciation: clamp(baseProgress + lessonBoost + (needsSpeaking ? 4 : 0)),
    reading: clamp(baseProgress + lessonBoost + (needsReading ? 4 : 0)),
    listening: clamp(baseProgress + Math.round(attendanceRate / 8) + lessonBoost),
    grammar: clamp(baseProgress + lessonBoost + (needsGrammar ? 3 : 0)),
    vocabulary: clamp(baseProgress + lessonBoost + (needsVocabulary ? 4 : 0)),
    homework: clamp(homeworkRate || (totalHomework ? 20 : 0)),
    attendance: clamp(attendanceRate),
  }

  const recommendations = []
  if (needsGrammar || scores.grammar < 70) recommendations.push({ type: 'Grammar', title: 'Practise complete sentences and grammar accuracy', action: 'Write 5 short sentences using today’s target grammar.' })
  if (needsSpeaking || scores.speaking < 70) recommendations.push({ type: 'Speaking', title: 'Build longer spoken answers', action: 'Answer 3 familiar questions using a full sentence plus one reason.' })
  if (needsReading || scores.reading < 70) recommendations.push({ type: 'Reading', title: 'Read aloud for fluency', action: 'Read a short passage twice and circle difficult words.' })
  if (needsVocabulary || scores.vocabulary < 70) recommendations.push({ type: 'Vocabulary', title: 'Review new words in context', action: 'Use 3 new words in your own sentences.' })
  if (!recommendations.length) recommendations.push({ type: 'Momentum', title: 'Keep the learning streak going', action: 'Review feedback, complete homework, and book the next lesson.' })

  const practiceWords = [...new Set(feedback.flatMap((item) => item.practiceWords || []))].slice(0, 12)
  const grammarFocus = [...new Set(feedback.flatMap((item) => item.grammarFocus || []))].slice(0, 8)
  const recentFeedback = completed.filter((booking) => booking.teacherFeedback).slice(-3).reverse()

  return {
    generatedAt: new Date().toISOString(),
    completedLessons: completed.length,
    totalBookings: bookings.length,
    attendanceRate: clamp(attendanceRate),
    homeworkRate: clamp(homeworkRate),
    completedHomework,
    totalHomework,
    scores,
    recommendations: recommendations.slice(0, 4),
    practiceWords,
    grammarFocus,
    recentFeedback,
    summary: `${learner.name || 'The learner'} has completed ${completed.length} class${completed.length === 1 ? '' : 'es'} and is currently building ${recommendations[0]?.type.toLowerCase() || 'English'} skills.`,
  }
}

export function skillLabel(key) {
  return ({ speaking: 'Speaking', pronunciation: 'Pronunciation', reading: 'Reading', listening: 'Listening', grammar: 'Grammar', vocabulary: 'Vocabulary', homework: 'Homework', attendance: 'Attendance' })[key] || key
}
