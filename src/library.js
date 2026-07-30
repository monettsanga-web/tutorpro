const BOOKMARK_KEY = 'tutorpro_library_bookmarks_v1'

export const LIBRARY_CATEGORIES = ['Reading', 'Grammar', 'Phonics', 'Vocabulary', 'Speaking', 'Cambridge', 'Oxford', 'Video', 'Worksheet']

export const LIBRARY_RESOURCES = [
  {
    id: 'article-arcade-a-an',
    title: 'Article Arcade: A or An?',
    category: 'Grammar',
    level: 'Beginner',
    type: 'Game',
    description: 'A fast grammar arcade game for choosing a or an before nouns.',
    url: 'https://article-arcade-za96106rp-tutor-pro.vercel.app/',
    tags: ['articles', 'grammar', 'a/an'],
    featured: true,
  },
  {
    id: 'cambridge-primary-speaking',
    title: 'Cambridge Primary Speaking Practice',
    category: 'Cambridge',
    level: 'Primary',
    type: 'Speaking guide',
    description: 'Prompt ideas for answering in full sentences with reasons and examples.',
    url: 'https://www.cambridgeenglish.org/learning-english/parents-and-children/',
    tags: ['cambridge', 'speaking', 'primary'],
    featured: true,
  },
  {
    id: 'oxford-grammar-practice',
    title: 'Oxford Grammar Practice Ideas',
    category: 'Oxford',
    level: 'Primary / Secondary',
    type: 'Practice guide',
    description: 'Grammar review ideas for sentence structure, punctuation and verb tenses.',
    url: 'https://elt.oup.com/student',
    tags: ['oxford', 'grammar', 'writing'],
  },
  {
    id: 'phonics-short-vowels',
    title: 'Short Vowel Phonics Drill',
    category: 'Phonics',
    level: 'Beginner',
    type: 'Teacher activity',
    description: 'Practice short vowel sounds with read-aloud examples and blending.',
    url: 'https://www.readingrockets.org/topics/phonics-and-decoding',
    tags: ['phonics', 'vowels', 'reading'],
  },
  {
    id: 'reading-confidence-routine',
    title: '5-Minute Reading Confidence Routine',
    category: 'Reading',
    level: 'All levels',
    type: 'Routine',
    description: 'A simple read-aloud routine parents can use before the next class.',
    url: 'https://www.readingrockets.org/reading-101/reading-101-families',
    tags: ['reading', 'parents', 'fluency'],
  },
  {
    id: 'vocabulary-notebook',
    title: 'Vocabulary Notebook Method',
    category: 'Vocabulary',
    level: 'All levels',
    type: 'Worksheet idea',
    description: 'Record new words, meanings, example sentences and pronunciation notes.',
    url: 'https://www.tutorpro.site/online-english-alternatives.html',
    tags: ['vocabulary', 'homework', 'sentences'],
  },
  {
    id: 'speaking-full-sentences',
    title: 'Speaking in Complete Sentences',
    category: 'Speaking',
    level: 'Beginner / Intermediate',
    type: 'Speaking practice',
    description: 'Help learners extend answers from one word to complete sentences.',
    url: 'https://www.tutorpro.site/',
    tags: ['speaking', 'confidence', 'sentences'],
  },
  {
    id: 'china-classroom-guide',
    title: 'China Classroom Connection Guide',
    category: 'Video',
    level: 'Parents',
    type: 'Guide',
    description: 'China-friendly classroom guidance: Chrome/Edge, low-bandwidth mode and VooV backup.',
    url: 'https://www.tutorpro.site/cn/',
    tags: ['china', 'voov', 'classroom'],
    featured: true,
  },
]

function storageKey(accountId) {
  return `${BOOKMARK_KEY}:${accountId || 'guest'}`
}

export function getLibraryBookmarks(accountId) {
  try { return JSON.parse(localStorage.getItem(storageKey(accountId)) || '[]') } catch { return [] }
}

export function toggleLibraryBookmark(accountId, resourceId) {
  const current = new Set(getLibraryBookmarks(accountId))
  if (current.has(resourceId)) current.delete(resourceId)
  else current.add(resourceId)
  const next = [...current]
  localStorage.setItem(storageKey(accountId), JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('tutorpro:library-change'))
  return next
}

export function getRecommendedLibraryResources({ learner, feedback = [], homework = [] } = {}) {
  const text = `${learner?.goal || ''} ${feedback.map((item) => `${item.teacherFeedback?.summary || ''} ${item.teacherFeedback?.nextStep || ''} ${item.teacherFeedback?.grammarFocus?.join(' ') || ''}`).join(' ')} ${homework.map((item) => `${item.type} ${item.title}`).join(' ')}`.toLowerCase()
  const scored = LIBRARY_RESOURCES.map((resource) => {
    const score = resource.tags.reduce((total, tag) => total + (text.includes(tag.toLowerCase()) ? 2 : 0), resource.featured ? 1 : 0)
    return { resource, score }
  }).sort((a, b) => b.score - a.score)
  return scored.slice(0, 4).map((item) => item.resource)
}

export function searchLibraryResources(query = '', category = 'All') {
  const term = query.trim().toLowerCase()
  return LIBRARY_RESOURCES
    .filter((item) => category === 'All' || item.category === category)
    .filter((item) => !term || `${item.title} ${item.description} ${item.tags.join(' ')} ${item.level}`.toLowerCase().includes(term))
}
