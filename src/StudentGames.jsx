import { useState } from 'react'
import LetterBubbleAdventure from './LetterBubbleAdventure.jsx'
import WordGalaxy3D from './WordGalaxy3D.jsx'
import {
  ALargeSmall,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Gamepad2,
  Puzzle,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Volume2,
  Zap,
} from 'lucide-react'

const wordQuestions = [
  { clue: 'A place where you can borrow and read many books.', answer: 'library', options: ['library', 'bakery', 'garden', 'station'] },
  { clue: 'To speak very quietly.', answer: 'whisper', options: ['shout', 'whisper', 'laugh', 'sing'] },
  { clue: 'Feeling sure that you can do something well.', answer: 'confident', options: ['sleepy', 'confident', 'hungry', 'nervous'] },
  { clue: 'A journey taken to learn or discover something.', answer: 'adventure', options: ['adventure', 'homework', 'breakfast', 'weather'] },
  { clue: 'To make something easier to understand.', answer: 'explain', options: ['collect', 'forget', 'explain', 'borrow'] },
  { clue: 'Something that happens because of an action.', answer: 'result', options: ['question', 'result', 'picture', 'holiday'] },
]

const sentenceQuestions = [
  'I enjoy reading stories after school',
  'The friendly teacher helped me understand',
  'We are learning English together today',
  'My favourite book is full of adventures',
  'She speaks clearly and listens carefully',
]

const spellingWords = [
  { word: 'beautiful', hint: 'Very pleasing to look at' },
  { word: 'because', hint: 'Used when giving a reason' },
  { word: 'adventure', hint: 'An exciting journey' },
  { word: 'different', hint: 'Not the same' },
  { word: 'language', hint: 'A system people use to communicate' },
  { word: 'wonderful', hint: 'Extremely good or delightful' },
]

const levelContent = {
  beginner: {
    label: 'Rookie Explorer',
    description: 'Short words, clear clues and friendly sentence patterns for Years 1–3.',
    words: [
      { clue: 'An animal that says meow.', answer: 'cat', options: ['cat', 'fish', 'bird', 'frog'] },
      { clue: 'The colour of a clear daytime sky.', answer: 'blue', options: ['red', 'blue', 'black', 'pink'] },
      { clue: 'We use this to read stories.', answer: 'book', options: ['shoe', 'book', 'cup', 'ball'] },
      { clue: 'The opposite of small.', answer: 'big', options: ['cold', 'slow', 'big', 'soft'] },
      { clue: 'A place where you learn with a teacher.', answer: 'school', options: ['beach', 'school', 'farm', 'shop'] },
    ],
    sentences: ['I like my English class', 'The cat is very happy', 'We read a book together', 'My teacher helps me learn'],
    spelling: [{ word: 'friend', hint: 'A person you like' }, { word: 'school', hint: 'A place to learn' }, { word: 'happy', hint: 'Feeling good' }, { word: 'yellow', hint: 'The colour of sunshine' }],
  },
  explorer: {
    label: 'Galaxy Explorer',
    description: 'Vocabulary, grammar and listening challenges designed for Years 4–6.',
    words: wordQuestions,
    sentences: sentenceQuestions,
    spelling: spellingWords,
  },
  master: {
    label: 'Language Master',
    description: 'Advanced vocabulary and complex sentence patterns for Years 7–11.',
    words: [
      { clue: 'Able to change easily when circumstances become different.', answer: 'adaptable', options: ['accurate', 'adaptable', 'ordinary', 'cautious'] },
      { clue: 'A conclusion reached using evidence and reasoning.', answer: 'inference', options: ['inference', 'permission', 'preference', 'influence'] },
      { clue: 'To examine something carefully and in detail.', answer: 'analyse', options: ['announce', 'analyse', 'arrange', 'achieve'] },
      { clue: 'Expressing ideas clearly and effectively.', answer: 'articulate', options: ['fortunate', 'articulate', 'immediate', 'delicate'] },
      { clue: 'Something that is certain to happen and cannot be avoided.', answer: 'inevitable', options: ['invisible', 'inevitable', 'incredible', 'independent'] },
      { clue: 'To make a situation less severe or difficult.', answer: 'alleviate', options: ['accelerate', 'alleviate', 'associate', 'appreciate'] },
    ],
    sentences: ['Although the task was challenging we persevered', 'Effective communication requires clarity and empathy', 'The evidence supports a completely different conclusion', 'Learning another language broadens our perspective'],
    spelling: [{ word: 'environment', hint: 'The natural world around us' }, { word: 'communication', hint: 'The exchange of information' }, { word: 'independent', hint: 'Able to act by yourself' }, { word: 'opportunity', hint: 'A favourable chance' }, { word: 'achievement', hint: 'Something completed successfully' }],
  },
}

function learnerLevel(year = '') {
  const yearNumber = Number(String(year).match(/\d+/)?.[0] || 4)
  if (yearNumber <= 3) return 'beginner'
  if (yearNumber >= 7) return 'master'
  return 'explorer'
}

function GameHeader({ title, subtitle, score, onBack, icon: Icon }) {
  return (
    <div className="game-header">
      <button onClick={onBack}><ArrowLeft size={18} /> Games</button>
      <div><span><Icon size={20} /></span><div><small>{subtitle}</small><h2>{title}</h2></div></div>
      <div className="game-score"><Star size={16} fill="currentColor" /><strong>{score}</strong><span>stars</span></div>
    </div>
  )
}

function WordQuest({ onBack, onEarn, questions, levelLabel }) {
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const question = questions[index % questions.length]
  const correct = answer === question.answer

  const choose = (option) => {
    if (answer) return
    setAnswer(option)
    if (option === question.answer) {
      setScore((value) => value + 10)
      onEarn(1)
    }
  }

  const next = () => {
    setIndex((value) => (value + 1) % questions.length)
    setAnswer('')
  }

  return (
    <div className="game-stage game-stage--words">
      <GameHeader title="Word Galaxy 3D" subtitle={`${levelLabel} · Vocabulary mission`} score={score} onBack={onBack} icon={BookOpen} />
      <div className="game-progress"><span style={{ width: `${((index % questions.length) + 1) / questions.length * 100}%` }} /></div>
      <section className="word-game-card">
        <div className="word-game-card__badge"><Sparkles size={22} /></div>
        <span>Which word matches this meaning?</span>
        <h3>“{question.clue}”</h3>
        <WordGalaxy3D options={question.options} onPick={choose} disabled={Boolean(answer)} />
        {answer && <div className={`game-result ${correct ? 'correct' : 'wrong'}`}><strong>{correct ? 'Mission complete! +1 star' : `Navigation correction: the answer is “${question.answer}”.`}</strong><button onClick={next}>Next galaxy <ArrowRight size={16} /></button></div>}
      </section>
    </div>
  )
}

function shuffledTokens(sentence) {
  return sentence.split(' ').map((word, index) => ({ id: `${index}-${word}`, word })).sort(() => Math.random() - 0.5)
}

function SentenceSprint({ onBack, onEarn, sentences, levelLabel }) {
  const [index, setIndex] = useState(0)
  const [tokens, setTokens] = useState(() => shuffledTokens(sentences[0]))
  const [selected, setSelected] = useState([])
  const [result, setResult] = useState('')
  const [score, setScore] = useState(0)
  const sentence = sentences[index]

  const addWord = (token) => {
    if (result || selected.some((item) => item.id === token.id)) return
    setSelected((items) => [...items, token])
  }

  const removeWord = (token) => {
    if (result) return
    setSelected((items) => items.filter((item) => item.id !== token.id))
  }

  const check = () => {
    const response = selected.map((token) => token.word).join(' ')
    const isCorrect = response === sentence
    setResult(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) {
      setScore((value) => value + 15)
      onEarn(2)
    }
  }

  const reset = () => {
    setSelected([])
    setResult('')
  }

  const next = () => {
    const nextIndex = (index + 1) % sentences.length
    setIndex(nextIndex)
    setTokens(shuffledTokens(sentences[nextIndex]))
    setSelected([])
    setResult('')
  }

  return (
    <div className="game-stage game-stage--sentences">
      <GameHeader title="Grammar Bridge 3D" subtitle={`${levelLabel} · Build the path`} score={score} onBack={onBack} icon={Puzzle} />
      <section className="sentence-game-card">
        <span>Tap the words in the correct order</span>
        <div className={`sentence-answer ${result}`}>
          {selected.length ? selected.map((token) => <button onClick={() => removeWord(token)} key={token.id}>{token.word}</button>) : <p>Your sentence will appear here…</p>}
        </div>
        <div className="sentence-tokens">{tokens.map((token) => <button disabled={selected.some((item) => item.id === token.id)} onClick={() => addWord(token)} key={token.id}>{token.word}</button>)}</div>
        <div className="sentence-actions"><button onClick={reset}><RotateCcw size={15} /> Reset</button>{!result ? <button className="game-main-button" disabled={selected.length !== tokens.length} onClick={check}>Check sentence <Check size={16} /></button> : <button className="game-main-button" onClick={result === 'correct' ? next : reset}>{result === 'correct' ? 'Next sentence' : 'Try again'} <ArrowRight size={16} /></button>}</div>
        {result && <div className={`game-result-banner ${result}`}>{result === 'correct' ? 'Perfect sentence! +2 stars' : 'Good try—move the words and try once more.'}</div>}
      </section>
    </div>
  )
}

function ListenAndSpell({ onBack, onEarn, words, levelLabel }) {
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [score, setScore] = useState(0)
  const item = words[index]

  const speak = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(item.word)
    utterance.lang = 'en-US'
    utterance.rate = 0.78
    window.speechSynthesis.speak(utterance)
  }

  const check = (event) => {
    event.preventDefault()
    const isCorrect = input.trim().toLowerCase() === item.word
    setResult(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) {
      setScore((value) => value + 12)
      onEarn(2)
    }
  }

  const next = () => {
    setIndex((value) => (value + 1) % words.length)
    setInput('')
    setResult('')
  }

  return (
    <div className="game-stage game-stage--spelling">
      <GameHeader title="Sound Safari 3D" subtitle={`${levelLabel} · Hear it and master it`} score={score} onBack={onBack} icon={Volume2} />
      <section className="spelling-game-card">
        <div className="sound-orb" onClick={speak} role="button" tabIndex="0" onKeyDown={(event) => event.key === 'Enter' && speak()}><i /><i /><span><Volume2 size={34} /></span></div>
        <h3>Listen to the word</h3>
        <p>Hint: {item.hint}</p>
        <button className="listen-again" onClick={speak}><Volume2 size={15} /> Play word</button>
        <form onSubmit={check}><input autoFocus value={input} disabled={Boolean(result)} onChange={(event) => setInput(event.target.value)} placeholder="Type what you hear" autoComplete="off" /><button className="game-main-button" disabled={!input.trim()} type="submit">Check spelling</button></form>
        {result && <div className={`spelling-result ${result}`}><span>{result === 'correct' ? <Trophy size={25} /> : <RotateCcw size={25} />}</span><div><strong>{result === 'correct' ? 'Excellent spelling! +2 stars' : `The word is “${item.word}”`}</strong><small>{result === 'correct' ? 'You heard every sound clearly.' : 'Listen again and remember each sound.'}</small></div><button onClick={result === 'correct' ? next : () => { setInput(''); setResult(''); speak() }}>{result === 'correct' ? 'Next' : 'Retry'} <ArrowRight size={15} /></button></div>}
      </section>
    </div>
  )
}

export default function StudentGames({ learner, onEarnStars }) {
  const [activeGame, setActiveGame] = useState('')
  const [sessionStars, setSessionStars] = useState(0)
  const level = learnerLevel(learner.year)
  const content = levelContent[level]

  const earn = (stars) => {
    setSessionStars((value) => value + stars)
    onEarnStars(stars)
  }

  if (activeGame === 'letters') return <LetterBubbleAdventure onBack={() => setActiveGame('')} onEarn={earn} />
  if (activeGame === 'words') return <WordQuest onBack={() => setActiveGame('')} onEarn={earn} questions={content.words} levelLabel={content.label} />
  if (activeGame === 'sentences') return <SentenceSprint onBack={() => setActiveGame('')} onEarn={earn} sentences={content.sentences} levelLabel={content.label} />
  if (activeGame === 'spelling') return <ListenAndSpell onBack={() => setActiveGame('')} onEarn={earn} words={content.spelling} levelLabel={content.label} />

  const games = [
    { id: 'letters', title: 'Alphabet Bubble Adventure', description: 'Listen to every letter from A to Z and pop the matching magic bubble.', icon: ALargeSmall, color: 'blue', reward: '+1 each letter' },
    { id: 'words', title: 'Word Galaxy 3D', description: 'Pilot through space and capture the correct vocabulary orb.', icon: BookOpen, color: 'purple', reward: '+1 star' },
    { id: 'sentences', title: 'Grammar Bridge 3D', description: 'Place word blocks in order to build a bridge across the void.', icon: Puzzle, color: 'pink', reward: '+2 stars' },
    { id: 'spelling', title: 'Sound Safari 3D', description: 'Follow the sound beacon, hear English and spell each discovery.', icon: Volume2, color: 'green', reward: '+2 stars' },
  ]

  return (
    <div className="games-hub portal-view">
      <section className="games-hero">
        <div><span className="portal-kicker">TutorPro English 3D Game Zone</span><div className={`adaptive-level adaptive-level--${level}`}><Gamepad2 size={14} /> {content.label} · {learner.year}</div><h1>Enter a world built for your level.</h1><p>{content.description} Every mission adapts to {learner.name}’s current school year.</p></div>
        <div className="games-star-bank"><span><Star size={25} fill="currentColor" /></span><div><small>This session</small><strong>{sessionStars} stars</strong><em>{learner.gameStars || 0} all-time</em></div></div>
        <Gamepad2 className="games-hero__icon" size={110} />
      </section>
      <div className="game-card-grid">{games.map(({ id, title, description, icon: Icon, color, reward }) => <article className={`game-card game-card--${color}`} key={id}><div className="game-card__art"><span><Icon size={31} /></span><i><Zap size={18} /></i></div><span className="game-card__reward">{reward}</span><h2>{title}</h2><p>{description}</p><button onClick={() => setActiveGame(id)}>Play now <ArrowRight size={17} /></button></article>)}</div>
      <section className="games-tip"><Sparkles size={21} /><div><strong>Little and often works best</strong><span>Ten minutes of English play each day can make new words feel natural.</span></div></section>
    </div>
  )
}
