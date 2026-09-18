/**
 * Original English learning content for the game worlds.
 *
 * COPYRIGHT
 * ---------
 * Every word, sentence, question and story here is written for TutorPro. None
 * of it is copied from Cambridge, Oxford or any other publisher. What IS drawn
 * from those programmes is only the *shape* of the syllabus — that primary
 * learners move from phonics to CVC words to digraphs, that grammar starts
 * with articles and subject-verb agreement — which is general pedagogical
 * knowledge, not protected expression.
 *
 * CONTENT DESIGN
 * --------------
 * Levels map to the ages the site already teaches (4-16, with these worlds
 * aimed at 6-12). Each item carries everything a child needs to attempt it
 * without a teacher present: the question, the answer, and a hint written as
 * encouragement rather than correction.
 *
 * Audio uses the browser's speech synthesis, already proven in
 * PracticeWordSpeaker.jsx, so there are no audio files to host and nothing
 * breaks offline.
 */

/** Age bands. The admin can rename these; ids are what the code uses. */
export const LEVELS = [
  { id: 'beginner', name: 'Beginner', ages: '6–7', order: 1 },
  { id: 'elementary', name: 'Elementary', ages: '7–8', order: 2 },
  { id: 'lower', name: 'Lower Primary', ages: '8–9', order: 3 },
  { id: 'upper', name: 'Upper Primary', ages: '9–10', order: 4 },
  { id: 'advanced', name: 'Advanced Primary', ages: '10–12', order: 5 },
]

/**
 * The eight worlds. `unlockXp` is how much total XP opens the world, so
 * progress is earned rather than handed over, but the first two are open
 * immediately — a child must be able to play within seconds of arriving.
 */
export const WORLDS = [
  { id: 'phonics', n: 1, name: 'Phonics Forest', skill: 'Phonics', icon: 'tree', unlockXp: 0, colour: '#4ade80',
    blurb: 'Listen to sounds and find the words that match.' },
  { id: 'vocabulary', n: 2, name: 'Word City', skill: 'Vocabulary', icon: 'city', unlockXp: 0, colour: '#60a5fa',
    blurb: 'Collect new words and learn what they mean.' },
  { id: 'grammar', n: 3, name: 'Grammar Castle', skill: 'Grammar', icon: 'castle', unlockXp: 60, colour: '#a78bfa',
    blurb: 'Choose the sentence that is written correctly.' },
  { id: 'reading', n: 4, name: 'Reading Island', skill: 'Reading', icon: 'island', unlockXp: 140, colour: '#fbbf24',
    blurb: 'Read a short story and answer the questions.' },
  { id: 'listening', n: 5, name: 'Listening Ocean', skill: 'Listening', icon: 'wave', unlockXp: 240, colour: '#22d3ee',
    blurb: 'Listen carefully and choose what you heard.' },
  { id: 'spelling', n: 6, name: 'Spelling Mountain', skill: 'Spelling', icon: 'mountain', unlockXp: 360, colour: '#fb7185',
    blurb: 'Put the letters in the right order.' },
  { id: 'writing', n: 7, name: 'Writing Valley', skill: 'Writing', icon: 'pencil', unlockXp: 500, colour: '#f472b6',
    blurb: 'Finish the sentences and write your own ideas.' },
  { id: 'champion', n: 8, name: 'English Champion', skill: 'Mixed', icon: 'trophy', unlockXp: 700, colour: '#facc15',
    blurb: 'Questions from every world. Only for champions!' },
]

/* ------------------------------------------------------------------ */
/* WORLD 1 — Phonics                                                    */
/* ------------------------------------------------------------------ */

const PHONICS = [
  { id: 'ph1', level: 'beginner', kind: 'choice', say: 'b',
    prompt: 'Which word begins with the /b/ sound?',
    options: ['Ball', 'Cat', 'Fish'], answer: 'Ball',
    hint: 'Say each word out loud. Which one starts with your lips together?' },
  { id: 'ph2', level: 'beginner', kind: 'choice', say: 's',
    prompt: 'Which word begins with the /s/ sound?',
    options: ['Dog', 'Sun', 'Map'], answer: 'Sun',
    hint: 'The /s/ sound is like a snake — ssss.' },
  { id: 'ph3', level: 'beginner', kind: 'build', say: 'cat',
    prompt: 'Build the word you hear.', letters: ['C', 'A', 'T'], answer: 'CAT',
    hint: 'Three sounds: /c/ /a/ /t/.' },
  { id: 'ph4', level: 'beginner', kind: 'build', say: 'pig',
    prompt: 'Build the word you hear.', letters: ['G', 'P', 'I'], answer: 'PIG',
    hint: 'It starts with /p/ and ends with /g/.' },
  { id: 'ph5', level: 'elementary', kind: 'choice', say: 'ship',
    prompt: 'Which two letters make the /sh/ sound in "ship"?',
    options: ['s and h', 'c and h', 't and h'], answer: 's and h',
    hint: 'Two letters join to make one quiet sound: shhh.' },
  { id: 'ph6', level: 'elementary', kind: 'choice', say: 'chair',
    prompt: 'Which word has the /ch/ sound?',
    options: ['Chair', 'Sheep', 'Think'], answer: 'Chair',
    hint: 'The /ch/ sound is like a train: ch-ch-ch.' },
  { id: 'ph7', level: 'elementary', kind: 'build', say: 'frog',
    prompt: 'Build the word you hear.', letters: ['R', 'F', 'G', 'O'], answer: 'FROG',
    hint: 'It begins with a blend: /fr/.' },
  { id: 'ph8', level: 'lower', kind: 'choice', say: 'cake',
    prompt: 'Why does "cake" have a long /a/ sound?',
    options: ['The silent e at the end', 'Because it is short', 'Because of the k'], answer: 'The silent e at the end',
    hint: 'The e at the end is silent, but it makes the a say its own name.' },
  { id: 'ph9', level: 'lower', kind: 'choice', say: 'rain',
    prompt: 'Which word has the same vowel sound as "rain"?',
    options: ['Train', 'Run', 'Rock'], answer: 'Train',
    hint: 'Listen to the middle of each word.' },
  { id: 'ph10', level: 'upper', kind: 'build', say: 'bright',
    prompt: 'Build the word you hear.', letters: ['H', 'B', 'T', 'R', 'I', 'G'], answer: 'BRIGHT',
    hint: 'It starts with /br/ and has the -ight pattern.' },
]

/* ------------------------------------------------------------------ */
/* WORLD 2 — Vocabulary                                                 */
/* ------------------------------------------------------------------ */

export const VOCABULARY = [
  { id: 'v1', level: 'beginner', topic: 'Animals', word: 'elephant', emoji: '🐘',
    meaning: 'A very large grey animal with a long trunk.',
    example: 'The elephant drinks water with its trunk.' },
  { id: 'v2', level: 'beginner', topic: 'Animals', word: 'rabbit', emoji: '🐰',
    meaning: 'A small animal with long ears that hops.',
    example: 'A rabbit hopped across the garden.' },
  { id: 'v3', level: 'beginner', topic: 'Food', word: 'bread', emoji: '🍞',
    meaning: 'A food made from flour and baked in an oven.',
    example: 'I eat bread and eggs for breakfast.' },
  { id: 'v4', level: 'beginner', topic: 'Family', word: 'grandmother', emoji: '👵',
    meaning: 'The mother of your mother or father.',
    example: 'My grandmother tells the best stories.' },
  { id: 'v5', level: 'elementary', topic: 'School', word: 'library', emoji: '📚',
    meaning: 'A room or building full of books you can borrow.',
    example: 'We borrowed three books from the library.' },
  { id: 'v6', level: 'elementary', topic: 'Weather', word: 'thunder', emoji: '⛈️',
    meaning: 'The loud sound you hear during a storm.',
    example: 'The thunder was so loud it woke the baby.' },
  { id: 'v7', level: 'elementary', topic: 'Clothes', word: 'jacket', emoji: '🧥',
    meaning: 'A short coat you wear when it is cold.',
    example: 'Put on your jacket before you go outside.' },
  { id: 'v8', level: 'lower', topic: 'Feelings', word: 'nervous', emoji: '😰',
    meaning: 'Worried about something that is going to happen.',
    example: 'She felt nervous before the school play.' },
  { id: 'v9', level: 'lower', topic: 'Jobs', word: 'engineer', emoji: '👷',
    meaning: 'A person who designs or builds machines and buildings.',
    example: 'The engineer drew a plan for the new bridge.' },
  { id: 'v10', level: 'lower', topic: 'Nature', word: 'mountain', emoji: '🏔️',
    meaning: 'A very high hill made of rock.',
    example: 'Snow covered the top of the mountain.' },
  { id: 'v11', level: 'upper', topic: 'Daily routines', word: 'exhausted', emoji: '😴',
    meaning: 'Extremely tired.',
    example: 'After the long walk we were all exhausted.' },
  { id: 'v12', level: 'upper', topic: 'Hobbies', word: 'collect', emoji: '🗃️',
    meaning: 'To gather things of the same kind and keep them.',
    example: 'My brother likes to collect old coins.' },
  { id: 'v13', level: 'advanced', topic: 'Critical thinking', word: 'compare', emoji: '⚖️',
    meaning: 'To look at two things and find how they are the same or different.',
    example: 'Compare the two stories and tell me which you prefer.' },
  { id: 'v14', level: 'advanced', topic: 'Places', word: 'harbour', emoji: '⚓',
    meaning: 'A safe place by the sea where boats can stop.',
    example: 'Fishing boats returned to the harbour at sunset.' },
]

/* ------------------------------------------------------------------ */
/* WORLD 3 — Grammar                                                    */
/* ------------------------------------------------------------------ */

const GRAMMAR = [
  { id: 'g1', level: 'beginner', topic: 'Articles', prompt: 'Choose the correct word: I saw ___ owl in the tree.',
    options: ['a', 'an', 'the'], answer: 'an',
    hint: 'Owl begins with a vowel sound.' },
  { id: 'g2', level: 'beginner', topic: 'Plurals', prompt: 'What is the plural of "box"?',
    options: ['boxs', 'boxes', 'boxen'], answer: 'boxes',
    hint: 'Words ending in x usually add -es.' },
  { id: 'g3', level: 'beginner', topic: 'Subject-verb', prompt: 'Which sentence is correct?',
    options: ['She go to school every day.', 'She goes to school every day.', 'She going to school every day.'],
    answer: 'She goes to school every day.',
    hint: 'With he, she or it we usually add -s to the verb.' },
  { id: 'g4', level: 'elementary', topic: 'Present continuous', prompt: 'Choose the correct sentence.',
    options: ['They are play football.', 'They are playing football.', 'They is playing football.'],
    answer: 'They are playing football.',
    hint: 'Present continuous is: are + verb + ing.' },
  { id: 'g5', level: 'elementary', topic: 'Past simple', prompt: 'Yesterday I ___ to the park.',
    options: ['go', 'goes', 'went'], answer: 'went',
    hint: 'Yesterday means the past. "Go" becomes "went".' },
  { id: 'g6', level: 'elementary', topic: 'Prepositions', prompt: 'The cat is hiding ___ the bed.',
    options: ['under', 'of', 'to'], answer: 'under',
    hint: 'Which word tells you where something is?' },
  { id: 'g7', level: 'lower', topic: 'Comparatives', prompt: 'An elephant is ___ than a dog.',
    options: ['big', 'bigger', 'biggest'], answer: 'bigger',
    hint: 'We are comparing two animals, so we add -er.' },
  { id: 'g8', level: 'lower', topic: 'There is / are', prompt: 'Choose the correct sentence.',
    options: ['There is five apples.', 'There are five apples.', 'There am five apples.'],
    answer: 'There are five apples.',
    hint: 'Five apples is more than one.' },
  { id: 'g9', level: 'upper', topic: 'Superlatives', prompt: 'This is the ___ book I have ever read.',
    options: ['good', 'better', 'best'], answer: 'best',
    hint: 'We are comparing it with every other book.' },
  { id: 'g10', level: 'upper', topic: 'Conjunctions', prompt: 'I wanted to play outside, ___ it was raining.',
    options: ['but', 'and', 'so'], answer: 'but',
    hint: 'The two parts of the sentence disagree with each other.' },
  { id: 'g11', level: 'advanced', topic: 'Punctuation', prompt: 'Which sentence is punctuated correctly?',
    options: ['where are you going', 'Where are you going?', 'where are you going.'],
    answer: 'Where are you going?',
    hint: 'A question starts with a capital letter and ends with a question mark.' },
  { id: 'g12', level: 'advanced', topic: 'Possessives', prompt: 'That is ___ bag. It belongs to Sara.',
    options: ['Saras', "Sara's", "Saras'"], answer: "Sara's",
    hint: 'One person owns it, so we use apostrophe + s.' },
]

/* ------------------------------------------------------------------ */
/* WORLD 4 — Reading (original stories)                                 */
/* ------------------------------------------------------------------ */

export const STORIES = [
  {
    id: 'backpack', level: 'elementary', title: 'The Mystery of the Missing Backpack', emoji: '🎒',
    paragraphs: [
      'On Monday morning, Mira could not find her backpack. She looked under her bed. She looked behind the door. It was not there.',
      '"Did you leave it at school?" asked her father. Mira shook her head. She remembered carrying it home on Friday.',
      'Then she heard a small noise from the kitchen. Her puppy, Bobo, was sitting inside the backpack, chewing a pencil.',
      'Mira laughed. "Bobo, that is not your bed!" She took the pencil away and gave Bobo his toy instead.',
    ],
    questions: [
      { q: 'What was Mira looking for?', options: ['Her shoes', 'Her backpack', 'Her puppy'], answer: 'Her backpack',
        hint: 'Read the first sentence again.' },
      { q: 'Where did Mira finally find it?', options: ['At school', 'Under her bed', 'In the kitchen'], answer: 'In the kitchen',
        hint: 'She heard a noise from one room.' },
      { q: 'Who was inside the backpack?', options: ['Her father', 'Bobo the puppy', 'Her friend'], answer: 'Bobo the puppy',
        hint: 'Something was chewing a pencil.' },
      { q: 'How did Mira feel at the end?', options: ['Angry', 'Amused', 'Frightened'], answer: 'Amused',
        hint: 'The story says she laughed.' },
    ],
  },
  {
    id: 'kite', level: 'lower', title: 'The Kite That Flew Too High', emoji: '🪁',
    paragraphs: [
      'Danny built a kite from paper, sticks and a long piece of string. He painted a yellow sun on the front.',
      'On Saturday the wind was strong. The kite climbed higher and higher until it looked as small as a bird.',
      'Suddenly the string slipped from his fingers. The kite floated away over the trees and disappeared.',
      'Danny was sad, but his sister said, "Let us build another one. This time we will make the string longer and hold it tighter."',
      'The next weekend, two kites flew above the field.',
    ],
    questions: [
      { q: 'What did Danny paint on his kite?', options: ['A yellow sun', 'A blue bird', 'A red star'], answer: 'A yellow sun',
        hint: 'Look at the first paragraph.' },
      { q: 'Why did the kite fly away?', options: ['It was raining', 'The string slipped', 'A bird took it'], answer: 'The string slipped',
        hint: 'Something happened to his fingers.' },
      { q: 'What did his sister suggest?', options: ['Buying a kite', 'Building another one', 'Giving up'], answer: 'Building another one',
        hint: 'She wanted to try again.' },
      { q: 'What is the main idea of this story?', options: ['Kites are expensive', 'Trying again after losing something', 'Wind is dangerous'],
        answer: 'Trying again after losing something', hint: 'Think about how the story ends.' },
    ],
  },
]

/* ------------------------------------------------------------------ */
/* WORLD 5 — Listening                                                  */
/* ------------------------------------------------------------------ */

const LISTENING = [
  { id: 'l1', level: 'beginner', say: 'The boy is wearing a blue jacket.',
    prompt: 'Listen, then choose what you heard.',
    options: ['The boy is wearing a blue jacket.', 'The girl is wearing a red hat.', 'The boy is riding a blue bike.'],
    answer: 'The boy is wearing a blue jacket.', hint: 'Press play again and listen for the colour.' },
  { id: 'l2', level: 'beginner', say: 'There are three cats on the wall.',
    prompt: 'Listen, then choose what you heard.',
    options: ['There are two cats on the wall.', 'There are three cats on the wall.', 'There are three dogs on the wall.'],
    answer: 'There are three cats on the wall.', hint: 'Listen carefully to the number and the animal.' },
  { id: 'l3', level: 'elementary', say: 'My sister walks to school every morning.',
    prompt: 'Listen, then choose what you heard.',
    options: ['My brother walks to school every morning.', 'My sister walks to school every morning.', 'My sister runs to school every morning.'],
    answer: 'My sister walks to school every morning.', hint: 'Who is it about, and how do they travel?' },
  { id: 'l4', level: 'lower', say: 'We will visit the museum on Thursday afternoon.',
    prompt: 'Listen, then choose what you heard.',
    options: ['We will visit the museum on Tuesday afternoon.', 'We will visit the library on Thursday afternoon.', 'We will visit the museum on Thursday afternoon.'],
    answer: 'We will visit the museum on Thursday afternoon.', hint: 'Listen for the place and the day.' },
  { id: 'l5', level: 'upper', say: 'Although it was raining, the children played happily outside.',
    prompt: 'Listen, then choose what you heard.',
    options: ['Although it was raining, the children played happily outside.', 'Because it was raining, the children stayed inside.', 'When it stopped raining, the children played outside.'],
    answer: 'Although it was raining, the children played happily outside.', hint: 'Listen to the very first word.' },
]

/* ------------------------------------------------------------------ */
/* WORLD 6 — Spelling                                                   */
/* ------------------------------------------------------------------ */

const SPELLING = [
  { id: 's1', level: 'beginner', say: 'sun', scrambled: ['N', 'S', 'U'], answer: 'SUN', hint: 'It shines in the sky.' },
  { id: 's2', level: 'beginner', say: 'book', scrambled: ['O', 'B', 'K', 'O'], answer: 'BOOK', hint: 'You read it.' },
  { id: 's3', level: 'elementary', say: 'school', scrambled: ['H', 'S', 'O', 'C', 'L', 'O'], answer: 'SCHOOL', hint: 'You go there to learn.' },
  { id: 's4', level: 'elementary', say: 'friend', scrambled: ['R', 'F', 'N', 'I', 'D', 'E'], answer: 'FRIEND', hint: 'Someone you like to play with. Remember: i before e here.' },
  { id: 's5', level: 'lower', say: 'because', scrambled: ['E', 'B', 'A', 'C', 'S', 'U', 'E'], answer: 'BECAUSE', hint: 'We use it to give a reason.' },
  { id: 's6', level: 'lower', say: 'beautiful', scrambled: ['U', 'B', 'E', 'A', 'T', 'I', 'F', 'U', 'L'], answer: 'BEAUTIFUL', hint: 'It starts with "beau".' },
  { id: 's7', level: 'upper', say: 'important', scrambled: ['M', 'I', 'P', 'O', 'R', 'T', 'A', 'N', 'T'], answer: 'IMPORTANT', hint: 'Something that matters a lot.' },
  { id: 's8', level: 'advanced', say: 'knowledge', scrambled: ['N', 'K', 'W', 'O', 'L', 'E', 'D', 'G', 'E'], answer: 'KNOWLEDGE', hint: 'It begins with a silent k.' },
]

/* ------------------------------------------------------------------ */
/* WORLD 7 — Writing                                                    */
/* ------------------------------------------------------------------ */

const WRITING = [
  { id: 'w1', level: 'beginner', prompt: 'Finish the sentence: My favourite animal is ___ because ___.',
    minWords: 6, starter: 'My favourite animal is ',
    tips: ['Start with a capital letter.', 'End with a full stop.', 'Give one reason with "because".'] },
  { id: 'w2', level: 'elementary', prompt: 'Write two sentences about your family.',
    minWords: 12, starter: '',
    tips: ['Use a capital letter for names.', 'Try to use "and" to join ideas.', 'Check every sentence has a full stop.'] },
  { id: 'w3', level: 'lower', prompt: 'Describe the weather today. Use at least three describing words.',
    minWords: 15, starter: 'Today the weather is ',
    tips: ['Describing words tell us more: cold, grey, windy.', 'You can use "and" or "but".', 'Read it aloud to check it makes sense.'] },
  { id: 'w4', level: 'upper', prompt: 'Write a short diary entry about the best part of your week.',
    minWords: 25, starter: '',
    tips: ['Start by saying when it happened.', 'Use past simple: went, saw, played.', 'Finish by saying how you felt.'] },
  { id: 'w5', level: 'advanced', prompt: 'Write a short email inviting a friend to your birthday. Include the day, the time and the place.',
    minWords: 30, starter: 'Hi ',
    tips: ['Begin with a greeting.', 'Include all three details: day, time, place.', 'Finish with your name.'] },
]

/* ------------------------------------------------------------------ */
/* Lookup                                                               */
/* ------------------------------------------------------------------ */

export const CONTENT = {
  phonics: PHONICS,
  vocabulary: VOCABULARY,
  grammar: GRAMMAR,
  reading: STORIES,
  listening: LISTENING,
  spelling: SPELLING,
  writing: WRITING,
}

/** Encouraging feedback. Never shames a wrong answer — that is the rule. */
export const PRAISE = ['Excellent!', 'Brilliant!', 'You got it!', 'Well done!', 'Perfect!', 'Superb!']
export const ENCOURAGE = [
  'Almost! Try again.',
  'Great thinking — have another go.',
  "You're getting closer!",
  "Let's look at that once more.",
  'Good try! Read it again carefully.',
]

export const pick = (list) => list[Math.floor(Math.random() * list.length)]

/** Questions for a world, filtered to a level, newest-first difficulty order. */
export function questionsFor(worldId, level = '') {
  const all = CONTENT[worldId] || []
  if (!level) return all
  const order = LEVELS.map((l) => l.id)
  const max = order.indexOf(level)
  if (max < 0) return all
  // Include everything up to and including the child's level, so a session
  // always warms up before it stretches.
  return all.filter((item) => order.indexOf(item.level) <= max)
}

/** The champion world mixes every skill rather than having content of its own. */
export function championQuestions(level = '') {
  return [
    ...questionsFor('phonics', level).filter((q) => q.kind === 'choice').slice(0, 2),
    ...questionsFor('grammar', level).slice(0, 3),
    ...questionsFor('listening', level).slice(0, 2),
  ]
}

/** Which worlds are open at this much XP. */
export function unlockedWorlds(xp = 0) {
  return WORLDS.filter((world) => xp >= world.unlockXp).map((world) => world.id)
}
