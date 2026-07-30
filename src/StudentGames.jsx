import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, ExternalLink, Gamepad2, RotateCcw, ShieldCheck, Sparkles, Trophy, Zap } from 'lucide-react'
import confetti from 'canvas-confetti'

const ARTICLE_ARCADE_URL = 'https://article-arcade-za96106rp-tutor-pro.vercel.app/'
const ARTICLE_ARCADE_COVER = `${import.meta.env.BASE_URL}assets/article-arcade-cover-hd.png`

const VOCABULARY = [
  { word: 'apple', emoji: '🍎', article: 'an', meaning: 'a red or green fruit' },
  { word: 'banana', emoji: '🍌', article: 'a', meaning: 'a long yellow fruit' },
  { word: 'elephant', emoji: '🐘', article: 'an', meaning: 'a very large animal' },
  { word: 'book', emoji: '📘', article: 'a', meaning: 'something we read' },
  { word: 'umbrella', emoji: '☂️', article: 'an', meaning: 'used when it rains' },
  { word: 'pencil', emoji: '✏️', article: 'a', meaning: 'used for writing' },
]

const SENTENCES = [
  { prompt: 'Build the sentence', words: ['I', 'can', 'speak', 'English'], answer: 'I can speak English' },
  { prompt: 'Build the sentence', words: ['She', 'likes', 'reading', 'books'], answer: 'She likes reading books' },
  { prompt: 'Build the sentence', words: ['We', 'are', 'learning', 'grammar'], answer: 'We are learning grammar' },
]

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5)
}

function celebrateGameWin() {
  confetti({ particleCount: 90, spread: 70, origin: { y: 0.72 }, colors: ['#bce94e', '#7048df', '#ff4f87', '#38e0c4', '#ffd23f'] })
  window.setTimeout(() => confetti({ particleCount: 55, spread: 90, origin: { x: 0.15, y: 0.65 } }), 120)
  window.setTimeout(() => confetti({ particleCount: 55, spread: 90, origin: { x: 0.85, y: 0.65 } }), 220)
}

function GameShell({ title, subtitle, onBack, children }) {
  return (
    <div className="portal-view game-center-play-view">
      <button className="portal-secondary-button game-back-button" onClick={onBack}><ArrowLeft size={16} /> Back to games</button>
      <section className="game-play-shell">
        <div className="game-play-shell__ambient" aria-hidden="true" />
        <div className="game-play-shell__header"><span><Gamepad2 size={22} /></span><div><small>Now playing</small><h1>{title}</h1><p>{subtitle}</p></div><b>XP MODE</b></div>
        {children}
      </section>
    </div>
  )
}

function MemoryMatchGame({ onBack, onEarnStars }) {
  const cards = useMemo(() => shuffle(VOCABULARY.flatMap((item) => ([
    { id: `${item.word}-word`, pair: item.word, label: item.word },
    { id: `${item.word}-emoji`, pair: item.word, label: item.emoji },
  ]))), [])
  const [open, setOpen] = useState([])
  const [matched, setMatched] = useState([])
  const [won, setWon] = useState(false)

  useEffect(() => { if (won) celebrateGameWin() }, [won])

  const choose = (card) => {
    if (open.some((item) => item.id === card.id) || matched.includes(card.pair) || open.length >= 2) return
    const next = [...open, card]
    setOpen(next)
    if (next.length === 2) {
      if (next[0].pair === next[1].pair) {
        const nextMatched = [...matched, card.pair]
        setMatched(nextMatched)
        setOpen([])
        if (nextMatched.length === VOCABULARY.length) {
          setWon(true)
          onEarnStars?.(3)
        }
      } else window.setTimeout(() => setOpen([]), 700)
    }
  }

  return <GameShell title="Memory Match" subtitle="Match the word with the picture." onBack={onBack}><div className="memory-game-grid">{cards.map((card) => { const visible = open.some((item) => item.id === card.id) || matched.includes(card.pair); return <button key={card.id} className={visible ? 'flipped' : ''} onClick={() => choose(card)}>{visible ? card.label : '?'}</button> })}</div>{won && <div className="game-win-banner"><Trophy size={22} /> Great memory! +3 stars</div>}</GameShell>
}

function WordQuizGame({ onBack, onEarnStars }) {
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const item = VOCABULARY[index]
  const choices = useMemo(() => shuffle(VOCABULARY.map((entry) => entry.word)).slice(0, 4).includes(item.word) ? shuffle(VOCABULARY.map((entry) => entry.word)).slice(0, 4) : shuffle([item.word, ...shuffle(VOCABULARY.filter((entry) => entry.word !== item.word)).slice(0, 3).map((entry) => entry.word)]), [item.word])
  useEffect(() => { if (done) celebrateGameWin() }, [done])

  const answer = (choice) => {
    const correct = choice === item.word
    const nextScore = score + (correct ? 1 : 0)
    setScore(nextScore)
    if (index + 1 >= VOCABULARY.length) {
      setDone(true)
      onEarnStars?.(Math.max(1, Math.round(nextScore / 2)))
    } else setIndex(index + 1)
  }
  return <GameShell title="Picture Quiz" subtitle="Choose the word that matches the picture." onBack={onBack}>{done ? <div className="game-result-card"><CheckCircle2 size={38} /><h2>{score}/{VOCABULARY.length}</h2><p>You earned stars for your vocabulary practice.</p></div> : <div className="word-quiz-card"><div className="word-quiz-emoji">{item.emoji}</div><p>{item.meaning}</p><div>{choices.map((choice) => <button key={choice} onClick={() => answer(choice)}>{choice}</button>)}</div></div>}</GameShell>
}

function SentenceBuilderGame({ onBack, onEarnStars }) {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState([])
  const [pool, setPool] = useState(() => shuffle(SENTENCES[0].words))
  const [completed, setCompleted] = useState(0)
  const sentence = SENTENCES[index]
  useEffect(() => { if (completed === SENTENCES.length) celebrateGameWin() }, [completed])
  const pick = (word) => { setPicked([...picked, word]); setPool(pool.filter((item, itemIndex) => itemIndex !== pool.indexOf(word))) }
  const reset = () => { setPicked([]); setPool(shuffle(sentence.words)) }
  const check = () => {
    if (picked.join(' ') === sentence.answer) {
      const nextCompleted = completed + 1
      setCompleted(nextCompleted)
      if (index + 1 >= SENTENCES.length) onEarnStars?.(4)
      else { setIndex(index + 1); setPicked([]); setPool(shuffle(SENTENCES[index + 1].words)) }
    } else reset()
  }
  return <GameShell title="Sentence Builder" subtitle="Put the words in the correct order." onBack={onBack}><div className="sentence-builder-card"><p>{sentence.prompt}</p><div className="sentence-answer-box">{picked.length ? picked.join(' ') : 'Tap words below…'}</div><div className="sentence-word-bank">{pool.map((word, idx) => <button key={`${word}-${idx}`} onClick={() => pick(word)}>{word}</button>)}</div><div className="sentence-actions"><button onClick={reset}><RotateCcw size={15} /> Reset</button><button onClick={check}>Check sentence</button></div>{completed === SENTENCES.length && <div className="game-win-banner"><Trophy size={22} /> Sentence champion! +4 stars</div>}</div></GameShell>
}

function GrammarRaceGame({ onBack, onEarnStars }) {
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const item = VOCABULARY[index]
  useEffect(() => { if (done) celebrateGameWin() }, [done])
  const answer = (article) => {
    const nextScore = score + (article === item.article ? 1 : 0)
    setScore(nextScore)
    if (index + 1 >= VOCABULARY.length) { setDone(true); onEarnStars?.(Math.max(1, Math.round(nextScore / 2))) }
    else setIndex(index + 1)
  }
  return <GameShell title="Grammar Race" subtitle="Choose A or AN before the noun." onBack={onBack}>{done ? <div className="game-result-card"><Trophy size={38} /><h2>{score}/{VOCABULARY.length}</h2><p>Great grammar race!</p></div> : <div className="grammar-race-card"><h2>___ {item.word}</h2><span>{item.emoji}</span><div><button onClick={() => answer('a')}>A</button><button onClick={() => answer('an')}>AN</button></div></div>}</GameShell>
}

export default function StudentGames({ learner, onEarnStars }) {
  const [activeGame, setActiveGame] = useState('hub')
  const games = [
    { id: 'memory', title: 'Memory Match', text: 'Match words and pictures.', icon: '🧠', stars: '+3' },
    { id: 'quiz', title: 'Picture Quiz', text: 'Choose the correct word.', icon: '🖼️', stars: '+1–3' },
    { id: 'sentence', title: 'Sentence Builder', text: 'Put words in order.', icon: '✍️', stars: '+4' },
    { id: 'grammar', title: 'Grammar Race', text: 'Pick A or AN quickly.', icon: '🏁', stars: '+1–3' },
    { id: 'arcade', title: 'Article Arcade', text: 'Open the premium A/An arcade.', icon: '🎮', stars: 'external' },
  ]
  if (activeGame === 'memory') return <MemoryMatchGame onBack={() => setActiveGame('hub')} onEarnStars={onEarnStars} />
  if (activeGame === 'quiz') return <WordQuizGame onBack={() => setActiveGame('hub')} onEarnStars={onEarnStars} />
  if (activeGame === 'sentence') return <SentenceBuilderGame onBack={() => setActiveGame('hub')} onEarnStars={onEarnStars} />
  if (activeGame === 'grammar') return <GrammarRaceGame onBack={() => setActiveGame('hub')} onEarnStars={onEarnStars} />
  return (
    <div className="portal-view game-center-view">
      <section className="game-center-hero"><div><span className="portal-kicker">Educational game center</span><h1>{learner?.name ? `${learner.name}'s Game World` : 'Game World'}</h1><p>Play quick English games to practise vocabulary, grammar, reading and sentence building. Stars earned here also support the rewards dashboard.</p><div className="external-game-zone__badges"><span><Gamepad2 size={14} /> Vocabulary</span><span><Sparkles size={14} /> Grammar</span><span><ShieldCheck size={14} /> Rewards ready</span></div></div><img src={ARTICLE_ARCADE_COVER} alt="Article Arcade cover" /></section>
      <section className="game-center-grid">{games.map((game) => <article className="portal-card game-center-card" key={game.id}><span>{game.icon}</span><h2>{game.title}</h2><p>{game.text}</p><small>{game.stars} stars</small>{game.id === 'arcade' ? <a className="portal-primary-button" href={ARTICLE_ARCADE_URL} target="_blank" rel="noreferrer">Launch Arcade <ExternalLink size={15} /></a> : <button className="portal-primary-button" onClick={() => setActiveGame(game.id)}>Play now <Zap size={15} /></button>}</article>)}</section>
    </div>
  )
}
