import { useEffect, useRef, useState } from 'react'
import {
  ALargeSmall,
  ArrowLeft,
  Check,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react'

const alphabet = [
  { letter: 'A', sound: 'ah', word: 'apple', emoji: '🍎' },
  { letter: 'B', sound: 'buh', word: 'ball', emoji: '⚽' },
  { letter: 'C', sound: 'kuh', word: 'cat', emoji: '🐱' },
  { letter: 'D', sound: 'duh', word: 'dog', emoji: '🐶' },
  { letter: 'E', sound: 'eh', word: 'egg', emoji: '🥚' },
  { letter: 'F', sound: 'fff', word: 'fish', emoji: '🐟' },
  { letter: 'G', sound: 'guh', word: 'goat', emoji: '🐐' },
  { letter: 'H', sound: 'huh', word: 'hat', emoji: '🎩' },
  { letter: 'I', sound: 'ih', word: 'igloo', emoji: '🧊' },
  { letter: 'J', sound: 'juh', word: 'jam', emoji: '🍓' },
  { letter: 'K', sound: 'kuh', word: 'kite', emoji: '🪁' },
  { letter: 'L', sound: 'lll', word: 'lion', emoji: '🦁' },
  { letter: 'M', sound: 'mmm', word: 'moon', emoji: '🌙' },
  { letter: 'N', sound: 'nnn', word: 'nest', emoji: '🪺' },
  { letter: 'O', sound: 'ah', word: 'octopus', emoji: '🐙' },
  { letter: 'P', sound: 'puh', word: 'panda', emoji: '🐼' },
  { letter: 'Q', sound: 'kwuh', word: 'queen', emoji: '👑' },
  { letter: 'R', sound: 'rrr', word: 'rainbow', emoji: '🌈' },
  { letter: 'S', sound: 'sss', word: 'sun', emoji: '☀️' },
  { letter: 'T', sound: 'tuh', word: 'tiger', emoji: '🐯' },
  { letter: 'U', sound: 'uh', word: 'umbrella', emoji: '☂️' },
  { letter: 'V', sound: 'vvv', word: 'van', emoji: '🚐' },
  { letter: 'W', sound: 'wuh', word: 'whale', emoji: '🐋' },
  { letter: 'X', sound: 'ks', word: 'fox', emoji: '🦊' },
  { letter: 'Y', sound: 'yuh', word: 'yoyo', emoji: '🪀' },
  { letter: 'Z', sound: 'zzz', word: 'zebra', emoji: '🦓' },
]

const bubbleSlots = [
  { x: 24, y: 18, size: 108, delay: '0s' },
  { x: 52, y: 10, size: 138, delay: '-1.4s' },
  { x: 77, y: 22, size: 104, delay: '-2.2s' },
  { x: 35, y: 57, size: 92, delay: '-0.7s' },
  { x: 59, y: 53, size: 116, delay: '-1.8s' },
  { x: 82, y: 60, size: 84, delay: '-2.8s' },
]

function letterOptions(targetIndex) {
  const offsets = [0, 5, 11, 17, 21, 24]
  return offsets
    .map((offset) => alphabet[(targetIndex + offset) % alphabet.length])
    .sort((left, right) => {
      const leftRank = ((left.letter.charCodeAt(0) * 7) + (targetIndex * 11)) % 31
      const rightRank = ((right.letter.charCodeAt(0) * 7) + (targetIndex * 11)) % 31
      return leftRank - rightRank
    })
}

function playTone(correct) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return
  const context = new AudioContextClass()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(correct ? 620 : 190, context.currentTime)
  if (correct) oscillator.frequency.exponentialRampToValueAtTime(940, context.currentTime + 0.18)
  gain.gain.setValueAtTime(0.0001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.025)
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.34)
  window.setTimeout(() => context.close().catch(() => {}), 500)
}

export default function LetterBubbleAdventure({ onBack, onEarn }) {
  const [targetIndex, setTargetIndex] = useState(0)
  const [selected, setSelected] = useState('')
  const [result, setResult] = useState('')
  const [score, setScore] = useState(0)
  const [soundOn, setSoundOn] = useState(true)
  const [complete, setComplete] = useState(false)
  const timerRef = useRef(null)
  const target = alphabet[targetIndex]
  const options = letterOptions(targetIndex)
  const background = `${import.meta.env.BASE_URL}assets/letter-bubble-world.jpg`

  useEffect(() => () => {
    window.clearTimeout(timerRef.current)
    window.speechSynthesis?.cancel()
  }, [])

  const speak = (item = target, praise = false) => {
    if (!soundOn || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const text = `${praise ? 'Great finding! ' : ''}${item.letter}. ${item.letter} says ${item.sound}, as in ${item.word}.`
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.72
    utterance.pitch = 1.12
    window.speechSynthesis.speak(utterance)
  }

  const choose = (item) => {
    if (result || complete) return
    setSelected(item.letter)
    if (item.letter === target.letter) {
      setResult('correct')
      setScore((value) => value + 10)
      onEarn(1)
      if (soundOn) {
        playTone(true)
        speak(target, true)
      }
      timerRef.current = window.setTimeout(() => {
        if (targetIndex === alphabet.length - 1) {
          setComplete(true)
          setResult('')
        } else {
          setTargetIndex((value) => value + 1)
          setSelected('')
          setResult('')
        }
      }, 1500)
    } else {
      setResult('wrong')
      if (soundOn) playTone(false)
      timerRef.current = window.setTimeout(() => {
        setSelected('')
        setResult('')
      }, 750)
    }
  }

  const restart = () => {
    window.clearTimeout(timerRef.current)
    window.speechSynthesis?.cancel()
    setTargetIndex(0)
    setSelected('')
    setResult('')
    setScore(0)
    setComplete(false)
  }

  if (complete) {
    return (
      <div className="game-stage letter-adventure-stage">
        <div className="game-header">
          <button onClick={onBack}><ArrowLeft size={18} /> Games</button>
          <div><span><ALargeSmall size={20} /></span><div><small>Alphabet Bubble Adventure</small><h2>A–Z mission complete</h2></div></div>
          <div className="game-score"><Star size={16} fill="currentColor" /><strong>{score}</strong><span>points</span></div>
        </div>
        <section className="letter-game-complete" style={{ backgroundImage: `linear-gradient(rgba(20,9,50,0.16), rgba(20,9,50,0.7)), url(${background})` }}>
          <div className="letter-complete-stars" aria-hidden="true">✦ ★ ✦ ★ ✦</div>
          <span><Trophy size={46} /></span>
          <small>Alphabet champion</small>
          <h1>You found every letter from A to Z!</h1>
          <p>Brilliant work. You listened to the letter names, practised their sounds and popped all 26 magic bubbles.</p>
          <div><strong>26</strong><span>letters found</span><strong>{score}</strong><span>points earned</span></div>
          <button onClick={restart}><RotateCcw size={17} /> Play A–Z again</button>
        </section>
      </div>
    )
  }

  return (
    <div className="game-stage letter-adventure-stage">
      <div className="game-header">
        <button onClick={onBack}><ArrowLeft size={18} /> Games</button>
        <div><span><ALargeSmall size={20} /></span><div><small>Listen, look and pop</small><h2>Alphabet Bubble Adventure</h2></div></div>
        <div className="game-score"><Star size={16} fill="currentColor" /><strong>{score}</strong><span>points</span></div>
      </div>
      <div className="game-progress letter-game-progress"><span style={{ width: `${((targetIndex + (result === 'correct' ? 1 : 0)) / alphabet.length) * 100}%` }} /></div>

      <section className={`letter-bubble-world ${result === 'correct' ? 'celebrating' : ''}`} style={{ backgroundImage: `linear-gradient(90deg, rgba(7,20,48,0.2), rgba(7,20,48,0.04)), url(${background})` }}>
        <div className="letter-mission-card">
          <span>Find this letter</span>
          <strong>{target.letter}<small>{target.letter.toLowerCase()}</small></strong>
          <button onClick={() => speak()} className={soundOn ? '' : 'muted'}><Volume2 size={17} /> Hear letter & sound</button>
        </div>

        <button className="letter-sound-toggle" onClick={() => { setSoundOn((value) => !value); window.speechSynthesis?.cancel() }} aria-label={soundOn ? 'Turn letter sounds off' : 'Turn letter sounds on'}>{soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>

        <div className="letter-mascot-message"><span>{result === 'correct' ? 'Amazing!' : result === 'wrong' ? 'Almost!' : `Can you find ${target.letter}?`}</span><small>{result === 'correct' ? `${target.letter} is for ${target.word}!` : result === 'wrong' ? `Listen again and look for ${target.letter}.` : `${target.emoji} ${target.letter} says “${target.sound}”`}</small></div>

        <div className="letter-bubble-field" aria-label={`Find the letter ${target.letter}`}>
          {options.map((item, index) => {
            const isSelected = selected === item.letter
            const stateClass = isSelected ? result : ''
            const slot = bubbleSlots[index]
            return (
              <button
                className={`letter-bubble ${stateClass}`}
                style={{ '--bubble-x': `${slot.x}%`, '--bubble-y': `${slot.y}%`, '--bubble-size': `${slot.size}px`, '--bubble-delay': slot.delay }}
                onClick={() => choose(item)}
                disabled={Boolean(result)}
                aria-label={`Letter ${item.letter}`}
                key={item.letter}
              >
                <i />
                <strong>{item.letter}</strong>
                <small>{item.letter.toLowerCase()}</small>
                {stateClass === 'correct' && <Check size={24} />}
              </button>
            )
          })}
        </div>

        {result === 'correct' && <div className="letter-celebration" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ '--confetti-left': `${3 + (index * 5.4)}%`, '--confetti-hue': `${(index * 47) % 360}`, '--confetti-delay': `${(index % 6) * -0.06}s`, '--confetti-drift': `${((index % 5) - 2) * 24}px` }} />)}</div>}
        <div className="letter-round-count"><Sparkles size={14} /> Letter {targetIndex + 1} of 26</div>
      </section>

      <div className="letter-alphabet-track" aria-label="Alphabet progress">
        {alphabet.map((item, index) => <span className={index < targetIndex || (index === targetIndex && result === 'correct') ? 'found' : index === targetIndex ? 'current' : ''} key={item.letter}>{item.letter}</span>)}
      </div>
    </div>
  )
}
