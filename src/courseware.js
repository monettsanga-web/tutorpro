const COURSEWARE_KEY = 'tutorpro_courseware_templates_v1'

export const COURSEWARE_SLIDE_TYPES = [
  'Warm-up',
  'Vocabulary',
  'Phonics',
  'Grammar',
  'Reading',
  'Speaking',
  'Listening',
  'Writing',
  'Game',
  'Wrap-up',
]

export const DEFAULT_COURSEWARE_TEMPLATE = {
  id: 'tutorpro-starter-speaking',
  title: 'TutorPro Starter Speaking Lesson',
  level: 'Beginner / Primary',
  goal: 'Build confidence, vocabulary and complete-sentence speaking in a 25-minute class.',
  tags: ['speaking', 'vocabulary', 'grammar', 'kids'],
  isDefault: true,
  createdBy: 'TutorPro Online English PH',
  updatedAt: '2026-07-30T00:00:00.000Z',
  slides: [
    { id: 'warmup', type: 'Warm-up', title: 'Hello, English Explorer!', objective: 'Build confidence and start speaking right away.', prompt: 'Say your name, your mood today, and one thing you can see around you.', teacherNote: 'Encourage full sentence answers: “I feel happy because…”', answer: 'My name is Mia. I feel excited today because I am ready for English class.', vocabulary: ['happy', 'excited', 'ready', 'today'] },
    { id: 'vocab', type: 'Vocabulary', title: 'Power Words', objective: 'Learn and use new words in complete sentences.', prompt: 'Choose two words and make your own sentence.', teacherNote: 'Model pronunciation first, then ask the student to repeat and create.', answer: 'I am excited today. I am ready for class.', vocabulary: ['confident', 'practice', 'sentence', 'because'] },
    { id: 'grammar', type: 'Grammar', title: 'Complete Sentence Builder', objective: 'Use complete sentences with a subject and verb.', prompt: 'Fix this answer: “Because happy.”', teacherNote: 'Guide the learner to add a subject and verb.', answer: 'I am happy because I can speak English.', vocabulary: ['I am', 'because', 'can', 'speak'] },
    { id: 'reading', type: 'Reading', title: 'Read and Answer', objective: 'Read for meaning and answer in a full sentence.', prompt: 'Read: “Ben has a red book. He reads every night.” What does Ben have?', teacherNote: 'Ask the student to point to the answer and speak in a complete sentence.', answer: 'Ben has a red book.', vocabulary: ['red', 'book', 'reads', 'night'] },
    { id: 'speaking', type: 'Speaking', title: 'Speak Like a Star', objective: 'Answer with details, not one-word answers.', prompt: 'What is your favorite animal? Tell me why.', teacherNote: 'Extend with follow-up: color, size, habitat, feeling.', answer: 'My favorite animal is a dog because it is friendly and playful.', vocabulary: ['favorite', 'animal', 'friendly', 'playful'] },
    { id: 'wrapup', type: 'Wrap-up', title: 'Class Review Mission', objective: 'Review today’s words and set homework.', prompt: 'Say one new word and one sentence you learned today.', teacherNote: 'Give stars, summarize progress, and assign homework.', answer: 'Today I learned “confident.” I can say: “I am confident in English.”', vocabulary: ['review', 'learned', 'confident', 'homework'] },
  ],
}

const BUILT_IN_COURSEWARE_TEMPLATES = [
  DEFAULT_COURSEWARE_TEMPLATE,
  {
    id: 'tutorpro-phonics-short-vowels',
    title: 'Phonics: Short Vowel Mission',
    level: 'Beginner / Young Learners',
    goal: 'Practice short vowel sounds, blending and speaking in short sentences.',
    tags: ['phonics', 'reading', 'vowels'],
    isDefault: true,
    createdBy: 'TutorPro Online English PH',
    updatedAt: '2026-07-30T00:00:00.000Z',
    slides: [
      { id: 'phonics-warmup', type: 'Warm-up', title: 'Sound Detective', objective: 'Listen for short vowel sounds.', prompt: 'Say: cat, bed, pig, dog, sun. Which sound is in the middle?', teacherNote: 'Model the mouth shape and have the student repeat each word twice.', answer: 'cat has /a/, bed has /e/, pig has /i/, dog has /o/, sun has /u/.', vocabulary: ['cat', 'bed', 'pig', 'dog', 'sun'] },
      { id: 'phonics-a', type: 'Phonics', title: 'Short A Words', objective: 'Blend CVC words with short a.', prompt: 'Read: cat, map, bag, fan. Make one sentence with a word.', teacherNote: 'Use finger blending: /c/ /a/ /t/ → cat.', answer: 'I see a cat. I have a map.', vocabulary: ['cat', 'map', 'bag', 'fan'] },
      { id: 'phonics-ei', type: 'Phonics', title: 'Short E and I', objective: 'Compare /e/ and /i/ sounds.', prompt: 'Read: pen, bed, sit, big. Which words have /e/? Which have /i/?', teacherNote: 'Correct gently if the learner mixes e/i.', answer: 'Pen and bed have /e/. Sit and big have /i/.', vocabulary: ['pen', 'bed', 'sit', 'big'] },
      { id: 'phonics-read', type: 'Reading', title: 'Mini Story', objective: 'Read CVC words in context.', prompt: 'Read: “The cat can sit on the mat.” What can the cat do?', teacherNote: 'Ask the learner to circle/read target sounds.', answer: 'The cat can sit on the mat.', vocabulary: ['cat', 'can', 'sit', 'mat'] },
      { id: 'phonics-game', type: 'Game', title: 'Find the Sound', objective: 'Identify words by vowel sound.', prompt: 'Teacher says a sound. Student chooses a matching word from the vocabulary list.', teacherNote: 'Award a star for every full-sentence answer.', answer: 'The word “cat” has the short a sound.', vocabulary: ['short a', 'short e', 'short i', 'short o'] },
      { id: 'phonics-wrap', type: 'Wrap-up', title: 'Sound Champion Review', objective: 'Review new words and assign practice.', prompt: 'Say three words you read today and one sentence.', teacherNote: 'Send homework: read the mini story three times.', answer: 'I read cat, sit and mat. The cat can sit.', vocabulary: ['read', 'practice', 'sound', 'sentence'] },
    ],
  },
  {
    id: 'tutorpro-cambridge-speaking-primary',
    title: 'Cambridge-Style Speaking Builder',
    level: 'Primary / A1-A2',
    goal: 'Practice picture description, reasons and longer speaking answers.',
    tags: ['cambridge', 'speaking', 'picture description'],
    isDefault: true,
    createdBy: 'TutorPro Online English PH',
    updatedAt: '2026-07-30T00:00:00.000Z',
    slides: [
      { id: 'cam-warmup', type: 'Warm-up', title: 'Question Ladder', objective: 'Answer familiar questions with confidence.', prompt: 'Answer: What do you like doing after school? Why?', teacherNote: 'Ask two follow-up questions to extend the answer.', answer: 'I like playing football after school because it is fun and healthy.', vocabulary: ['after school', 'because', 'fun', 'healthy'] },
      { id: 'cam-vocab', type: 'Vocabulary', title: 'Describe the Picture', objective: 'Use adjectives and prepositions.', prompt: 'Describe a classroom using: next to, behind, in front of, colorful.', teacherNote: 'Have the learner say at least three sentences.', answer: 'The books are next to the bag. The chair is in front of the desk.', vocabulary: ['next to', 'behind', 'in front of', 'colorful'] },
      { id: 'cam-grammar', type: 'Grammar', title: 'There is / There are', objective: 'Describe objects accurately.', prompt: 'Make two sentences: one with “There is…” and one with “There are…”.', teacherNote: 'Correct singular/plural agreement.', answer: 'There is a pencil on the desk. There are three books in the bag.', vocabulary: ['there is', 'there are', 'desk', 'books'] },
      { id: 'cam-reading', type: 'Reading', title: 'Read and Explain', objective: 'Read a short prompt and answer why.', prompt: 'Read: “Lina brings an umbrella because it is cloudy.” Why does Lina bring an umbrella?', teacherNote: 'Require the word “because” in the answer.', answer: 'Lina brings an umbrella because it is cloudy.', vocabulary: ['umbrella', 'cloudy', 'brings', 'because'] },
      { id: 'cam-speaking', type: 'Speaking', title: 'Long Answer Challenge', objective: 'Give detailed answers with reasons.', prompt: 'Which is better: reading a book or watching a video? Give two reasons.', teacherNote: 'Use the frame: I think ___ is better because ___. Also, ___.', answer: 'I think reading a book is better because I can learn new words. Also, it helps my imagination.', vocabulary: ['better', 'reason', 'learn', 'imagination'] },
      { id: 'cam-wrap', type: 'Wrap-up', title: 'Exam Confidence Review', objective: 'Review speaking targets for the next class.', prompt: 'Say one strong answer from today again, but make it even better.', teacherNote: 'Praise fluency, accuracy and confidence separately.', answer: 'I improved my answer by adding more details and reasons.', vocabulary: ['fluency', 'accuracy', 'confidence', 'details'] },
    ],
  },
]

function readCustomTemplates() {
  if (typeof localStorage === 'undefined') return []
  try {
    const parsed = JSON.parse(localStorage.getItem(COURSEWARE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCustomTemplates(templates) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(COURSEWARE_KEY, JSON.stringify(templates))
  window.dispatchEvent(new CustomEvent('tutorpro:courseware-change'))
  window.dispatchEvent(new CustomEvent('tutorpro:data-change'))
}

function makeCoursewareId(prefix = 'courseware') {
  const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${uuid}`
}

function cleanText(value, fallback = '', max = 2000) {
  const text = String(value || '').trim()
  return (text || fallback).slice(0, max)
}

function cleanVocabulary(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(/[,\n]/)
  return [...new Set(list.map((item) => String(item || '').trim()).filter(Boolean))].slice(0, 12)
}

export function normalizeCoursewareSlide(slide = {}, index = 0) {
  return {
    id: cleanText(slide.id, `slide-${index + 1}`, 80).replace(/[^a-z0-9_-]/gi, '-').toLowerCase() || `slide-${index + 1}`,
    type: cleanText(slide.type, COURSEWARE_SLIDE_TYPES[index % COURSEWARE_SLIDE_TYPES.length], 40),
    title: cleanText(slide.title, `Lesson slide ${index + 1}`, 140),
    objective: cleanText(slide.objective, 'Practice English confidently.', 500),
    prompt: cleanText(slide.prompt, 'Answer using a complete English sentence.', 1500),
    teacherNote: cleanText(slide.teacherNote, 'Support the learner with examples and praise.', 1500),
    answer: cleanText(slide.answer, 'Sample answer will appear here.', 1500),
    vocabulary: cleanVocabulary(slide.vocabulary),
  }
}

export function normalizeCoursewareTemplate(template = {}) {
  const slides = Array.isArray(template.slides) ? template.slides : []
  const normalizedSlides = slides.length
    ? slides.map(normalizeCoursewareSlide).slice(0, 30)
    : [normalizeCoursewareSlide({}, 0)]
  return {
    id: cleanText(template.id, makeCoursewareId(), 100).replace(/[^a-z0-9_-]/gi, '-').toLowerCase(),
    title: cleanText(template.title, 'Untitled TutorPro Lesson', 140),
    level: cleanText(template.level, 'All levels', 80),
    goal: cleanText(template.goal, 'Help the learner speak English with confidence.', 500),
    tags: cleanVocabulary(template.tags),
    isDefault: Boolean(template.isDefault),
    createdBy: cleanText(template.createdBy, 'TutorPro Online English', 120),
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: template.updatedAt || new Date().toISOString(),
    slides: normalizedSlides,
  }
}

export function cloneCoursewareTemplate(template = DEFAULT_COURSEWARE_TEMPLATE, changes = {}) {
  return normalizeCoursewareTemplate({
    ...template,
    ...changes,
    id: changes.id || makeCoursewareId(),
    isDefault: false,
    createdAt: changes.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export function getCoursewareTemplates() {
  const custom = readCustomTemplates().map(normalizeCoursewareTemplate).filter((item) => !item.isDefault)
  const builtInIds = new Set(BUILT_IN_COURSEWARE_TEMPLATES.map((item) => item.id))
  return [
    ...BUILT_IN_COURSEWARE_TEMPLATES.map(normalizeCoursewareTemplate),
    ...custom.filter((item) => item.id && !builtInIds.has(item.id)),
  ]
}

export function getCoursewareTemplateById(templateId) {
  const id = String(templateId || '')
  return getCoursewareTemplates().find((template) => template.id === id) || null
}

export function saveCoursewareTemplate(template) {
  const normalized = normalizeCoursewareTemplate({ ...template, isDefault: false, updatedAt: new Date().toISOString() })
  const templates = readCustomTemplates().map(normalizeCoursewareTemplate).filter((item) => !item.isDefault)
  const index = templates.findIndex((item) => item.id === normalized.id)
  if (index >= 0) templates[index] = normalized
  else templates.unshift(normalized)
  writeCustomTemplates(templates)
  return normalized
}

export function deleteCoursewareTemplate(templateId) {
  const id = String(templateId || '')
  const builtIn = BUILT_IN_COURSEWARE_TEMPLATES.some((template) => template.id === id)
  if (builtIn) throw new Error('Built-in TutorPro lessons cannot be deleted. Duplicate it first, then edit your copy.')
  writeCustomTemplates(readCustomTemplates().filter((template) => template.id !== id))
}

export function createBlankCoursewareTemplate(ownerName = 'TutorPro Teacher') {
  return normalizeCoursewareTemplate({
    id: makeCoursewareId(),
    title: 'New TutorPro Lesson',
    level: 'Beginner / Primary',
    goal: 'Add the lesson goal here.',
    tags: ['speaking'],
    createdBy: ownerName,
    isDefault: false,
    slides: [
      { id: 'slide-1', type: 'Warm-up', title: 'Warm-up Question', objective: 'Start speaking confidently.', prompt: 'Answer the teacher’s warm-up question in a full sentence.', teacherNote: 'Add your teaching notes here.', answer: 'I feel happy today because I am ready for class.', vocabulary: ['happy', 'ready'] },
    ],
  })
}

export function coursewareSnapshot(template) {
  const normalized = normalizeCoursewareTemplate(template || DEFAULT_COURSEWARE_TEMPLATE)
  return {
    id: normalized.id,
    title: normalized.title,
    level: normalized.level,
    goal: normalized.goal,
    tags: normalized.tags,
    createdBy: normalized.createdBy,
    updatedAt: normalized.updatedAt,
    slides: normalized.slides,
  }
}
