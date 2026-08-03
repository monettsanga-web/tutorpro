/**
 * TutorPro speech coach.
 *
 * Live speech-to-text plus lightweight pronunciation, grammar and speaking-time
 * analysis for the classroom. Everything runs in the browser using the Web
 * Speech API, so there is no per-minute API cost and no audio leaves the device.
 *
 * The scoring is deliberately transparent and rule-based rather than a black
 * box: teachers need to be able to explain a score to a parent.
 */

/* ------------------------------------------------------------------ */
/* Speech recognition                                                  */
/* ------------------------------------------------------------------ */

export function speechRecognitionSupported() {
  if (typeof window === 'undefined') return false
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

/**
 * Start continuous dictation.
 * onResult receives { finalText, interimText, lastConfidence }.
 * Returns a controller with stop().
 */
export function startSpeechRecognition({ lang = 'en-GB', onResult, onError, onEnd } = {}) {
  if (!speechRecognitionSupported()) throw new Error('Speech recognition needs Chrome, Edge or Safari.')
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new Recognition()
  recognition.lang = lang
  recognition.continuous = true
  recognition.interimResults = true
  recognition.maxAlternatives = 1

  let finalText = ''
  let stopped = false

  recognition.onresult = (event) => {
    let interimText = ''
    let lastConfidence = 0
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index]
      const text = result[0]?.transcript || ''
      if (result.isFinal) {
        finalText = `${finalText} ${text}`.trim()
        lastConfidence = result[0]?.confidence ?? 0
      } else {
        interimText = `${interimText} ${text}`.trim()
      }
    }
    onResult?.({ finalText, interimText, lastConfidence })
  }

  recognition.onerror = (event) => {
    // "no-speech" and "aborted" are normal during a lesson; ignore them.
    if (['no-speech', 'aborted'].includes(event.error)) return
    onError?.(new Error(event.error || 'Speech recognition error'))
  }

  recognition.onend = () => {
    // Chrome stops after a pause; restart so the lesson keeps transcribing.
    if (!stopped) {
      try { recognition.start() } catch { /* already restarting */ }
      return
    }
    onEnd?.(finalText)
  }

  recognition.start()

  return {
    stop: () => { stopped = true; try { recognition.stop() } catch { /* already stopped */ } },
    get transcript() { return finalText },
  }
}

/* ------------------------------------------------------------------ */
/* Pronunciation scoring                                               */
/* ------------------------------------------------------------------ */

const normalise = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z\s']/g, '')
  .replace(/\s+/g, ' ')
  .trim()

/** Levenshtein distance, used for "how close was the attempt". */
function editDistance(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    previous = current
  }
  return previous[b.length]
}

/**
 * Collapse English spellings that sound identical, so a learner who says a
 * word correctly is not penalised for the recogniser's spelling choice.
 * "elefant" and "elephant" sound the same and should both score full marks.
 */
function phoneticKey(value) {
  return normalise(value)
    // Digraphs and silent-letter clusters first, before single-letter rules.
    .replace(/ph/g, 'f')
    .replace(/(?:tion|sion)/g, 'xn')
    .replace(/(?:sch|sk)/g, 'sk')
    .replace(/(?:sh|ch)/g, 'x')
    .replace(/(?:ough|augh)/g, 'o')
    .replace(/(?:igh|ite|ight)/g, 'it')
    .replace(/(?:qu|kw)/g, 'kw')
    .replace(/(?:ck|kh|q)/g, 'k')
    .replace(/(?:wr|rh)/g, 'r')
    .replace(/(?:kn|gn|pn|mb\b)/g, 'n')
    .replace(/(?:ce|ci|cy)/g, (match) => `s${match[1]}`)
    .replace(/c/g, 'k')
    // Vowel families that commonly sound alike.
    .replace(/(?:ea|ee|ie|ei)/g, 'e')
    .replace(/(?:oo|ou|ow|u)/g, 'u')
    .replace(/(?:ai|ay|ey)/g, 'a')
    .replace(/(?:z|s)+/g, 's')
    .replace(/h/g, '')        // largely silent between consonants
    .replace(/(.)\1+/g, '$1') // collapse doubled letters
    .replace(/e\b/g, '')      // silent trailing e
    .trim()
}

/** 0–100 similarity between the target word and what was actually heard. */
export function pronunciationSimilarity(target, spoken) {
  const a = normalise(target)
  const b = normalise(spoken)
  if (!a || !b) return 0
  if (a === b) return 100

  // Exact letter comparison.
  const literal = Math.max(0, Math.round((1 - (editDistance(a, b) / Math.max(a.length, b.length))) * 100))

  // Sound-alike comparison, which is what actually matters for pronunciation.
  const pa = phoneticKey(target)
  const pb = phoneticKey(spoken)
  if (pa && pb) {
    if (pa === pb) return 100
    const phonetic = Math.max(0, Math.round((1 - (editDistance(pa, pb) / Math.max(pa.length, pb.length))) * 100))
    // Reward the learner with whichever reading is kinder to a correct attempt.
    return Math.max(literal, phonetic)
  }
  return literal
}

export function pronunciationBand(score) {
  if (score >= 90) return { id: 'excellent', label: 'Excellent', emoji: '🌟', tone: 'green' }
  if (score >= 75) return { id: 'good', label: 'Good', emoji: '👍', tone: 'blue' }
  if (score >= 55) return { id: 'practise', label: 'Keep practising', emoji: '💪', tone: 'orange' }
  return { id: 'again', label: 'Try again', emoji: '🔁', tone: 'pink' }
}

/**
 * Score one attempt at a target word.
 * Combines how closely the text matched with the recogniser's own confidence,
 * weighted toward the text match because confidence varies a lot by device.
 */
export function scorePronunciation(target, spoken, confidence = 0) {
  const similarity = pronunciationSimilarity(target, spoken)
  const confidenceScore = Math.round(Math.max(0, Math.min(1, confidence)) * 100)
  const score = confidence > 0
    ? Math.round((similarity * 0.75) + (confidenceScore * 0.25))
    : similarity
  const band = pronunciationBand(score)
  return {
    target,
    spoken: String(spoken || '').trim(),
    score,
    similarity,
    confidence: confidenceScore,
    ...band,
    feedback: buildPronunciationFeedback(target, spoken, score),
  }
}

function buildPronunciationFeedback(target, spoken, score) {
  const clean = normalise(spoken)
  if (!clean) return `We did not hear anything. Tap the microphone and say "${target}" clearly.`
  if (score >= 90) return `Excellent! "${target}" sounded clear and accurate.`
  if (score >= 75) return `Good attempt. Say "${target}" once more, a little slower.`
  const targetClean = normalise(target)
  if (clean.length < targetClean.length - 1) return `It sounded shortened. Try saying every syllable of "${target}".`
  if (clean.length > targetClean.length + 1) return `It sounded stretched. Try "${target}" a little more crisply.`
  return `We heard "${clean}". Listen to "${target}" again, then repeat it.`
}

/* ------------------------------------------------------------------ */
/* Grammar suggestions                                                 */
/* ------------------------------------------------------------------ */

/** Common ESL learner mistakes, chosen for young learners. */
const GRAMMAR_RULES = [
  { test: /\bi\s+is\b/i, fix: 'I am', note: 'Use "I am", not "I is".' },
  { test: /\bhe\s+are\b/i, fix: 'he is', note: 'Use "he is", not "he are".' },
  { test: /\bshe\s+are\b/i, fix: 'she is', note: 'Use "she is", not "she are".' },
  { test: /\bthey\s+is\b/i, fix: 'they are', note: 'Use "they are", not "they is".' },
  { test: /\bwe\s+is\b/i, fix: 'we are', note: 'Use "we are", not "we is".' },
  { test: /\bdon't\s+has\b/i, fix: "don't have", note: 'Use "don\u2019t have", not "don\u2019t has".' },
  { test: /\bdoesn't\s+has\b/i, fix: "doesn't have", note: 'Use "doesn\u2019t have", not "doesn\u2019t has".' },
  { test: /\bdid\s+went\b/i, fix: 'went', note: 'After "did", use the base verb: "did go".' },
  { test: /\bmore\s+better\b/i, fix: 'better', note: '"Better" is already comparative.' },
  { test: /\bmost\s+best\b/i, fix: 'best', note: '"Best" is already superlative.' },
  { test: /\ba\s+([aeiou])/i, fix: 'an', note: 'Use "an" before a vowel sound.' },
  { test: /\bvery\s+much\s+like\b/i, fix: 'really like', note: 'More natural: "I really like".' },
  { test: /\bi\s+have\s+\d+\s+years?\b/i, fix: 'I am … years old', note: 'Say "I am 8 years old", not "I have 8 years".' },
  { test: /\bexplain\s+me\b/i, fix: 'explain to me', note: 'Use "explain to me".' },
  { test: /\bdiscuss\s+about\b/i, fix: 'discuss', note: '"Discuss" does not take "about".' },
]

export function grammarSuggestions(text) {
  const value = String(text || '')
  if (!value.trim()) return []
  const found = []
  GRAMMAR_RULES.forEach((rule) => {
    const match = value.match(rule.test)
    if (match) found.push({ phrase: match[0].trim(), suggestion: rule.fix, note: rule.note })
  })
  // Only surface each distinct mistake once.
  return found.filter((item, index) => found.findIndex((other) => other.note === item.note) === index).slice(0, 6)
}

/* ------------------------------------------------------------------ */
/* Transcript analytics                                                */
/* ------------------------------------------------------------------ */

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'am',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'them', 'my', 'your',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'from', 'that', 'this', 'these', 'those',
  'do', 'does', 'did', 'have', 'has', 'had', 'can', 'will', 'would', 'so', 'not', 'no',
  'yes', 'ok', 'okay', 'very', 'just', 'like', 'what', 'how', 'why', 'when', 'where',
])

const FILLERS = ['um', 'uh', 'erm', 'ah', 'hmm', 'like', 'you know']

/** Word count, unique vocabulary, filler usage and estimated speaking pace. */
export function analyseTranscript(text, seconds = 0) {
  const clean = normalise(text)
  const words = clean ? clean.split(' ').filter(Boolean) : []
  const unique = new Set(words.filter((word) => !STOP_WORDS.has(word) && word.length > 2))
  const fillerCount = FILLERS.reduce((total, filler) => {
    const matches = clean.match(new RegExp(`\\b${filler}\\b`, 'g'))
    return total + (matches ? matches.length : 0)
  }, 0)
  const minutes = seconds > 0 ? seconds / 60 : 0
  return {
    wordCount: words.length,
    uniqueWords: [...unique],
    uniqueCount: unique.size,
    fillerCount,
    wordsPerMinute: minutes > 0 ? Math.round(words.length / minutes) : 0,
    speakingSeconds: Math.round(seconds),
  }
}

/** New vocabulary the student used that is not already known. */
export function newVocabulary(transcript, knownWords = []) {
  const known = new Set(knownWords.map((word) => normalise(word)))
  const { uniqueWords } = analyseTranscript(transcript)
  return uniqueWords.filter((word) => !known.has(word)).slice(0, 25)
}

/** Share of talking time between teacher and student, as percentages. */
export function speakingBalance(teacherSeconds = 0, studentSeconds = 0) {
  const total = teacherSeconds + studentSeconds
  if (total <= 0) return { teacher: 0, student: 0, total: 0, healthy: false, note: 'No speech detected yet.' }
  const student = Math.round((studentSeconds / total) * 100)
  const teacher = 100 - student
  // In a good ESL lesson the student should be talking a substantial share.
  const healthy = student >= 40
  return {
    teacher,
    student,
    total: Math.round(total),
    healthy,
    note: healthy
      ? 'Great balance — the student is speaking plenty.'
      : student >= 25
        ? 'Try to give the student more speaking turns.'
        : 'The student is speaking very little. Ask more open questions.',
  }
}

/** Plain-language lesson summary the teacher can paste into feedback. */
export function buildLessonSummary({ transcript = '', seconds = 0, attempts = [], studentName = 'The student' } = {}) {
  const stats = analyseTranscript(transcript, seconds)
  const grammar = grammarSuggestions(transcript)
  const scored = attempts.filter((item) => Number.isFinite(item?.score))
  const averageScore = scored.length
    ? Math.round(scored.reduce((total, item) => total + item.score, 0) / scored.length)
    : 0
  const strong = scored.filter((item) => item.score >= 85).map((item) => item.target)
  const needsWork = scored.filter((item) => item.score < 70).map((item) => item.target)

  const lines = []
  lines.push(`${studentName} spoke ${stats.wordCount} word${stats.wordCount === 1 ? '' : 's'} using ${stats.uniqueCount} different vocabulary words.`)
  if (stats.wordsPerMinute) lines.push(`Speaking pace was about ${stats.wordsPerMinute} words per minute.`)
  if (scored.length) lines.push(`Pronunciation practice averaged ${averageScore}% across ${scored.length} word${scored.length === 1 ? '' : 's'}.`)
  if (strong.length) lines.push(`Pronounced clearly: ${strong.slice(0, 8).join(', ')}.`)
  if (needsWork.length) lines.push(`Needs more practice: ${needsWork.slice(0, 8).join(', ')}.`)
  if (grammar.length) lines.push(`Grammar to review: ${grammar.map((item) => item.note).slice(0, 3).join(' ')}`)
  if (stats.fillerCount > 4) lines.push(`Used ${stats.fillerCount} filler words — encourage pausing instead of saying "um".`)

  return {
    summary: lines.join(' '),
    stats,
    grammar,
    averageScore,
    strongWords: strong,
    practiceWords: needsWork,
  }
}

/** Homework suggestions derived from what actually went wrong in the lesson. */
export function recommendHomework({ attempts = [], transcript = '' } = {}) {
  const recommendations = []
  const weak = attempts.filter((item) => Number.isFinite(item?.score) && item.score < 70).map((item) => item.target)
  if (weak.length) {
    recommendations.push({
      type: 'Pronunciation',
      title: `Practise ${weak.length} tricky word${weak.length === 1 ? '' : 's'}`,
      action: `Say each word 5 times using the audio button: ${weak.slice(0, 6).join(', ')}.`,
    })
  }
  const grammar = grammarSuggestions(transcript)
  if (grammar.length) {
    recommendations.push({
      type: 'Grammar',
      title: 'Fix a common sentence pattern',
      action: grammar[0].note,
    })
  }
  const stats = analyseTranscript(transcript)
  if (stats.wordCount > 0 && stats.uniqueCount < 12) {
    recommendations.push({
      type: 'Vocabulary',
      title: 'Widen vocabulary range',
      action: 'Learn 5 new describing words and use each one in a sentence.',
    })
  }
  if (stats.fillerCount > 4) {
    recommendations.push({
      type: 'Fluency',
      title: 'Reduce filler words',
      action: 'Record yourself answering 3 questions without saying "um" or "like".',
    })
  }
  return recommendations.slice(0, 4)
}
