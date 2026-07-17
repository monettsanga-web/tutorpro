import { useState } from 'react'
import {
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
  X,
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

function GameHeader({ title, subtitle, score, onBack, icon: Icon }) {
  return (
    <div className="game-header">
      <button onClick={onBack}><ArrowLeft size={18} /> Games</button>
      <div><span><Icon size={20} /></span><div><small>{subtitle}</small><h2>{title}</h2></div></div>
      <div className="game-score"><Star size={16} fill="currentColor" /><strong>{score}</strong><span>stars</span></div>
    </div>
  )
}

function WordQuest({ onBack, onEarn }) {
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const question = wordQuestions[index % wordQuestions.length]
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
    setIndex((value) => (value + 1) % wordQuestions.length)
    setAnswer('')
  }

  return (
    <div className="game-stage game-stage--words">
      <GameHeader title="Word Quest" subtitle="Vocabulary challenge" score={score} onBack={onBack} icon={BookOpen} />
      <div className="game-progress"><span style={{ width: `${((index % wordQuestions.length) + 1) / wordQuestions.length * 100}%` }} /></div>
      <section className="word-game-card">
        <div className="word-game-card__badge"><Sparkles size={22} /></div>
        <span>Which word matches this meaning?</span>
        <h3>“{question.clue}”</h3>
        <div className="word-options">{question.options.map((option) => <button className={answer ? option === question.answer ? 'correct' : option === answer ? 'wrong' : 'dimmed' : ''} onClick={() => choose(option)} key={option}><span>{option}</span>{answer && option === question.answer && <Check size={18} />}{answer === option && !correct && <X size={18} />}</button>)}</div>
        {answer && <div className={`game-result ${correct ? 'correct' : 'wrong'}`}><strong>{correct ? 'Brilliant! +1 star' : `Almost! The answer is “${question.answer}”.`}</strong><button onClick={next}>Next word <ArrowRight size={16} /></button></div>}
      </section>
    </div>
  )
}

function shuffledTokens(sentence) {
  return sentence.split(' ').map((word, index) => ({ id: `${index}-${word}`, word })).sort(() => Math.random() - 0.5)
}

function SentenceSprint({ onBack, onEarn }) {
  const [index, setIndex] = useState(0)
  const [tokens, setTokens] = useState(() => shuffledTokens(sentenceQuestions[0]))
  const [selected, setSelected] = useState([])
  const [result, setResult] = useState('')
  const [score, setScore] = useState(0)
  const sentence = sentenceQuestions[index]

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
    const nextIndex = (index + 1) % sentenceQuestions.length
    setIndex(nextIndex)
    setTokens(shuffledTokens(sentenceQuestions[nextIndex]))
    setSelected([])
    setResult('')
  }

  return (
    <div className="game-stage game-stage--sentences">
      <GameHeader title="Sentence Sprint" subtitle="Build a perfect sentence" score={score} onBack={onBack} icon={Puzzle} />
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

function ListenAndSpell({ onBack, onEarn }) {
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [score, setScore] = useState(0)
  const item = spellingWords[index]

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
    setIndex((value) => (value + 1) % spellingWords.length)
    setInput('')
    setResult('')
  }

  return (
    <div className="game-stage game-stage--spelling">
      <GameHeader title="Listen & Spell" subtitle="Hear it, type it, master it" score={score} onBack={onBack} icon={Volume2} />
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

  const earn = (stars) => {
    setSessionStars((value) => value + stars)
    onEarnStars(stars)
  }

  if (activeGame === 'words') return <WordQuest onBack={() => setActiveGame('')} onEarn={earn} />
  if (activeGame === 'sentences') return <SentenceSprint onBack={() => setActiveGame('')} onEarn={earn} />
  if (activeGame === 'spelling') return <ListenAndSpell onBack={() => setActiveGame('')} onEarn={earn} />

  const games = [
    { id: 'words', title: 'Word Quest', description: 'Match clues to vocabulary and grow your word power.', icon: BookOpen, color: 'purple', reward: '+1 star' },
    { id: 'sentences', title: 'Sentence Sprint', description: 'Put scrambled words in order before time runs away.', icon: Puzzle, color: 'pink', reward: '+2 stars' },
    { id: 'spelling', title: 'Listen & Spell', description: 'Listen to clear English and type the word you hear.', icon: Volume2, color: 'green', reward: '+2 stars' },
  ]

  return (
    <div className="games-hub portal-view">
      <section className="games-hero">
        <div><span className="portal-kicker">TutorPro English Game Zone</span><h1>Play, practise, power up!</h1><p>{learner.name} can build vocabulary, grammar and listening skills while earning stars.</p></div>
        <div className="games-star-bank"><span><Star size={25} fill="currentColor" /></span><div><small>This session</small><strong>{sessionStars} stars</strong><em>{learner.gameStars || 0} all-time</em></div></div>
        <Gamepad2 className="games-hero__icon" size={110} />
      </section>
      <div className="game-card-grid">{games.map(({ id, title, description, icon: Icon, color, reward }) => <article className={`game-card game-card--${color}`} key={id}><div className="game-card__art"><span><Icon size={31} /></span><i><Zap size={18} /></i></div><span className="game-card__reward">{reward}</span><h2>{title}</h2><p>{description}</p><button onClick={() => setActiveGame(id)}>Play now <ArrowRight size={17} /></button></article>)}</div>
      <section className="games-tip"><Sparkles size={21} /><div><strong>Little and often works best</strong><span>Ten minutes of English play each day can make new words feel natural.</span></div></section>
    </div>
  )
}
