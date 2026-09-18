import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Lock, RotateCcw, Sparkles, Star, Volume2, Zap } from 'lucide-react'
import {
  CONTENT, ENCOURAGE, LEVELS, PRAISE, STORIES, WORLDS,
  championQuestions, questionsFor,
} from './learningContent.js'

/**
 * The English Adventure — eight worlds of game-based practice.
 *
 * WHY A SEPARATE COMPONENT FROM StudentGames.jsx
 * ----------------------------------------------
 * StudentGames is a hub of four quick arcade games plus links to partner
 * sites. This is the structured curriculum: worlds unlock in order, content
 * is levelled to the child's age, and progress feeds the existing XP, stars
 * and badge system in rewards.js rather than inventing a second one.
 *
 * DESIGN RULES FOR CHILDREN
 * -------------------------
 * 1. A wrong answer is never punished. No lives are lost, no score drops, and
 *    the feedback offers a hint and another go. Children who fear being wrong
 *    stop guessing, and guessing is how language is learned.
 * 2. Every question is answerable without reading instructions.
 * 3. Audio everywhere. A six-year-old who cannot read the question can still
 *    press the speaker and hear it.
 * 4. Big targets. Every answer button clears 56px so a small finger on a
 *    tablet does not mis-hit.
 */


/**
 * World icons as inline SVG.
 *
 * Emoji were used first and rendered as empty boxes wherever the operating
 * system lacked the glyph — caught in a screenshot, not by a passing test.
 * These inherit the world colour through currentColor and look identical on
 * every child's device.
 */
const WORLD_ICON = {
  tree: <><path d="M12 22v-6" /><path d="M12 16 6.5 10h3L5 4.5h5L12 2l2 2.5h5L14.5 10h3z" /></>,
  city: <><path d="M3 21h18" /><path d="M5 21V8l5-4v17" /><path d="M14 21V11l5 3v7" /><path d="M8 9h.01M8 13h.01M8 17h.01" /></>,
  castle: <><path d="M3 21h18" /><path d="M4 21V9l3 2V6l3 2V6l2-3 2 3v2l3-2v5l3-2v12" /><path d="M10 21v-4a2 2 0 1 1 4 0v4" /></>,
  island: <><path d="M2 20c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0" /><path d="M12 17V9" /><path d="M12 9c3-3 6-2 7 0-3 1-5 1-7 0z" /><path d="M12 9C9 6 6 7 5 9c3 1 5 1 7 0z" /></>,
  wave: <><path d="M2 8c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" /><path d="M2 14c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" /><path d="M2 20c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" /></>,
  mountain: <><path d="m2 20 7-13 4 7 2-3 7 9z" /><path d="m7.5 11 1.5-2 1.5 2" /></>,
  pencil: <><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /><path d="m15 5 4 4" /></>,
  trophy: <><path d="M6 4h12v5a6 6 0 0 1-12 0z" /><path d="M6 6H3v2a3 3 0 0 0 3 3M18 6h3v2a3 3 0 0 1-3 3" /><path d="M10 15h4M9 21h6M12 15v6" /></>,
}

function WorldIcon({ name, size = 34 }) {
  const paths = WORLD_ICON[name]
  if (!paths) return null
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Audio                                                               */
/* ------------------------------------------------------------------ */

/**
 * Speech synthesis, matching the approach already proven in
 * PracticeWordSpeaker.jsx. No audio files to host, works offline, and it
 * degrades silently on browsers without support rather than breaking a game.
 */
function speak(text, rate = 0.85) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(String(text))
    utterance.lang = 'en-GB'
    utterance.rate = rate
    const voice = window.speechSynthesis.getVoices()
      .find((v) => /en-GB|en-US/i.test(v.lang) && /female|samantha|karen|serena/i.test(v.name))
    if (voice) utterance.voice = voice
    window.speechSynthesis.speak(utterance)
  } catch { /* Audio is an enhancement; never let it break the game. */ }
}

function SpeakButton({ text, label = 'Listen', big = false }) {
  return (
    <button
      type="button"
      className={`adv-speak ${big ? 'adv-speak--big' : ''}`}
      onClick={() => speak(text)}
      aria-label={`${label}: ${text}`}
    >
      <Volume2 size={big ? 26 : 18} /> {label}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Shared game shell                                                   */
/* ------------------------------------------------------------------ */

function GameShell({ world, index, total, xp, stars, streak, children, onBack }) {
  return (
    <div className="adv-game">
      <header className="adv-hud">
        <button type="button" className="adv-hud__back" onClick={onBack} aria-label="Back to the map">
          <ArrowLeft size={18} /> Map
        </button>
        <div className="adv-hud__stats">
          <span title="Stars"><Star size={16} /> {stars}</span>
          <span title="XP"><Zap size={16} /> {xp}</span>
          <span title="Streak"><Sparkles size={16} /> {streak}</span>
        </div>
      </header>
      <div className="adv-progress" role="progressbar" aria-valuenow={index} aria-valuemin={0} aria-valuemax={total}
        aria-label={`Question ${index + 1} of ${total}`}>
        <i style={{ width: `${total ? (index / total) * 100 : 0}%`, background: world.colour }} />
      </div>
      <p className="adv-count">Question {Math.min(index + 1, total)} of {total}</p>
      {children}
    </div>
  )
}

/** Feedback panel. Correct celebrates; wrong offers a hint and a retry. */
function Feedback({ state, hint, onNext, onRetry, isLast, seed = 0 }) {
  // Chosen from the question number rather than Math.random: pure, stable
  // across re-renders, and still varied from question to question.
  const list = state === 'right' ? PRAISE : ENCOURAGE
  const message = list[seed % list.length]

  if (!state) return null
  if (state === 'right') {
    return (
      <div className="adv-feedback adv-feedback--right" role="status">
        <strong>{message} ⭐ +10 XP</strong>
        <button className="adv-next" onClick={onNext}>
          {isLast ? 'Finish' : 'Next'} <ArrowRight size={18} />
        </button>
      </div>
    )
  }
  return (
    <div className="adv-feedback adv-feedback--try" role="status">
      <strong>{message}</strong>
      {hint && <p className="adv-hint">💡 {hint}</p>}
      <button className="adv-next adv-next--soft" onClick={onRetry}>
        <RotateCcw size={17} /> Try again
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Question types                                                      */
/* ------------------------------------------------------------------ */

function ChoiceQuestion({ item, state, onAnswer }) {
  const audio = item.say || item.prompt
  return (
    <>
      <div className="adv-question">
        <h2>{item.prompt || item.q}</h2>
        <SpeakButton text={audio} big />
      </div>
      <div className="adv-options">
        {(item.options || []).map((option) => (
          <button
            key={option}
            type="button"
            className={`adv-option ${state === 'right' && option === item.answer ? 'is-right' : ''}`}
            disabled={state === 'right'}
            onClick={() => onAnswer(option === item.answer)}
          >
            <span>{option}</span>
            <Volume2
              size={17}
              className="adv-option__say"
              role="button"
              tabIndex={0}
              aria-label={`Listen to ${option}`}
              onClick={(event) => { event.stopPropagation(); speak(option) }}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); speak(option) } }}
            />
          </button>
        ))}
      </div>
    </>
  )
}

/** Letter-ordering, used by both phonics building and spelling. */
function BuildQuestion({ item, state, onAnswer }) {
  const letters = item.letters || item.scrambled || []
  const [picked, setPicked] = useState([])

  // Published so automated tests can spell the word deliberately instead of
  // clicking at random. Harmless in production: it is the same answer already
  // present in the bundle, and nothing in the UI reads it.
  useEffect(() => {
    if (typeof window !== 'undefined') window.__advAnswer = item.answer
  }, [item.answer])

  const used = picked.map((p) => p.index)
  const current = picked.map((p) => p.letter).join('')

  /*
   * When the word is complete, judge it. A WRONG answer must also hand the
   * letters back, otherwise every tile is used up, the retry button has
   * nothing to reset, and the child is stranded on the question with no way
   * forward. Caught by playing the world through in a browser: question 4
   * reached 0 available letters and 0 options and simply stopped.
   */
  const check = (next) => {
    const word = next.map((entry) => entry.letter).join('')
    if (word.length !== item.answer.length) return
    const correct = word === item.answer
    if (!correct) {
      // Small delay so the child sees the word they built before it clears.
      window.setTimeout(() => setPicked([]), 700)
    }
    onAnswer(correct)
  }

  return (
    <>
      <div className="adv-question">
        <h2>{item.prompt || 'Put the letters in order.'}</h2>
        <SpeakButton text={item.say} label="Hear the word" big />
      </div>
      <div className="adv-build" aria-live="polite">
        {item.answer.split('').map((_, slot) => (
          <span key={slot} className={`adv-slot ${picked[slot] ? 'is-filled' : ''}`}>
            {picked[slot]?.letter || ''}
          </span>
        ))}
      </div>
      <div className="adv-letters">
        {letters.map((letter, index) => (
          <button
            key={`${letter}-${index}`}
            type="button"
            className="adv-letter"
            disabled={used.includes(index) || state === 'right'}
            onClick={() => { const next = [...picked, { letter, index }]; setPicked(next); check(next) }}
          >
            {letter}
          </button>
        ))}
      </div>
      {picked.length > 0 && state !== 'right' && (
        <button type="button" className="adv-clear" onClick={() => setPicked([])}>
          <RotateCcw size={15} /> Clear {current && `(${current})`}
        </button>
      )}
    </>
  )
}

function VocabularyCard({ item, state, onAnswer, pool }) {
  /*
   * Three options: the real meaning plus two decoys.
   *
   * Ordered by a hash of the item id rather than Math.random. Random during
   * render is impure, and it would also reshuffle the buttons every time a
   * child retried - which is disorienting when they are trying to remember
   * which one they already pressed.
   */
  const options = useMemo(() => {
    const seed = [...item.id].reduce((total, character) => total + character.charCodeAt(0), 0)
    const others = pool.filter((entry) => entry.id !== item.id)
    const decoys = [others[seed % others.length], others[(seed * 7 + 3) % others.length]]
      .filter((entry, index, list) => entry && list.indexOf(entry) === index)
      .slice(0, 2)
    const all = [item, ...decoys]
    return all.map((entry, index) => ({ entry, order: (seed + index * 5) % all.length }))
      .sort((a, b) => a.order - b.order)
      .map(({ entry }) => entry)
  }, [item, pool])

  return (
    <>
      <div className="adv-question adv-question--word">
        <span className="adv-emoji" aria-hidden="true">{item.emoji}</span>
        <h2>{item.word}</h2>
        <SpeakButton text={item.word} label="Say it" big />
        <p className="adv-topic">{item.topic}</p>
      </div>
      <p className="adv-ask">What does this word mean?</p>
      <div className="adv-options">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`adv-option ${state === 'right' && option.id === item.id ? 'is-right' : ''}`}
            disabled={state === 'right'}
            onClick={() => onAnswer(option.id === item.id)}
          >
            <span>{option.meaning}</span>
          </button>
        ))}
      </div>
      {state === 'right' && (
        <p className="adv-example">
          <strong>Example:</strong> {item.example}
          <SpeakButton text={item.example} label="Hear it" />
        </p>
      )}
    </>
  )
}

/** Writing: encouraging, never auto-marked wrong. Checks effort, not grammar. */
function WritingTask({ item, onDone }) {
  const [text, setText] = useState(item.starter || '')
  const [checked, setChecked] = useState(false)

  const words = text.trim().split(/\s+/).filter(Boolean).length
  const longEnough = words >= item.minWords
  const capital = /^[A-Z]/.test(text.trim())
  const stop = /[.!?]\s*$/.test(text.trim())

  return (
    <>
      <div className="adv-question">
        <h2>{item.prompt}</h2>
        <SpeakButton text={item.prompt} big />
      </div>
      <textarea
        className="adv-write"
        value={text}
        onChange={(event) => { setText(event.target.value); setChecked(false) }}
        placeholder="Write your answer here…"
        rows={5}
        aria-label="Your writing"
      />
      <p className="adv-wordcount">{words} words {longEnough ? '✅' : `· aim for ${item.minWords}`}</p>

      {!checked ? (
        <button className="adv-next" onClick={() => setChecked(true)} disabled={words === 0}>
          Check my writing <Check size={18} />
        </button>
      ) : (
        <div className="adv-feedback adv-feedback--right">
          {/* Feedback guides rather than grades. It never supplies the answer. */}
          <strong>Nice work! Here is what I noticed:</strong>
          <ul className="adv-checks">
            <li>{capital ? '✅' : '💡'} {capital ? 'You started with a capital letter.' : 'Remember to start with a capital letter.'}</li>
            <li>{stop ? '✅' : '💡'} {stop ? 'You finished with a full stop.' : 'Try finishing with a full stop.'}</li>
            <li>{longEnough ? '✅' : '💡'} {longEnough ? 'Great length!' : 'Try adding one more detail.'}</li>
          </ul>
          {item.tips.map((tip) => <p className="adv-hint" key={tip}>💡 {tip}</p>)}
          <button className="adv-next" onClick={onDone}>Finish <ArrowRight size={18} /></button>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Reading world — story then questions                                */
/* ------------------------------------------------------------------ */

function ReadingWorld({ story, onAnswer, index, state }) {
  const [reading, setReading] = useState(true)
  if (reading) {
    return (
      <div className="adv-story">
        <h2>{story.title}</h2>
        <SpeakButton text={story.paragraphs.join(' ')} label="Read it to me" big />
        {story.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <button className="adv-next" onClick={() => setReading(false)}>
          I have read it <ArrowRight size={18} />
        </button>
      </div>
    )
  }
  const question = story.questions[index]
  if (!question) return null
  return <ChoiceQuestion item={question} state={state} onAnswer={onAnswer} />
}

/* ------------------------------------------------------------------ */
/* World player                                                        */
/* ------------------------------------------------------------------ */

function WorldPlayer({ world, level, onBack, onEarn }) {
  const items = useMemo(() => {
    if (world.id === 'champion') return championQuestions(level)
    if (world.id === 'reading') return STORIES.filter((s) => questionsFor('reading', level).includes(s)).slice(0, 1)
    return questionsFor(world.id, level).slice(0, 8)
  }, [world.id, level])

  const [index, setIndex] = useState(0)
  const [state, setState] = useState(null)
  const [xp, setXp] = useState(0)
  const [stars, setStars] = useState(0)
  const [streak, setStreak] = useState(0)
  const [done, setDone] = useState(false)
  const banked = useRef(false)

  const story = world.id === 'reading' ? items[0] : null
  const total = story ? story.questions.length : items.length
  const item = story ? story.questions[index] : items[index]

  const answer = (correct) => {
    if (correct) {
      setState('right')
      setXp((value) => value + 10)
      setStars((value) => value + 1)
      setStreak((value) => value + 1)
    } else {
      setState('wrong')
      setStreak(0)
    }
  }

  const next = () => {
    setState(null)
    if (index + 1 >= total) setDone(true)
    else setIndex(index + 1)
  }

  // Bank the reward once, when the world is finished.
  useEffect(() => {
    if (!done || banked.current) return
    banked.current = true
    onEarn({ xp: xp + 20, stars, world: world.id })
  }, [done, xp, stars, world.id, onEarn])

  if (done) {
    return (
      <div className="adv-done">
        <span className="adv-done__icon" aria-hidden="true" style={{ color: world.colour }}>
          <WorldIcon name={world.icon} size={58} />
        </span>
        <h2>World complete!</h2>
        <p>You finished <strong>{world.name}</strong>.</p>
        <div className="adv-done__stats">
          <span><Zap size={20} /> {xp + 20} XP</span>
          <span><Star size={20} /> {stars} stars</span>
        </div>
        <button className="adv-next" onClick={onBack}>Back to the map <ArrowRight size={18} /></button>
      </div>
    )
  }

  if (!item && world.id !== 'writing') {
    return (
      <div className="adv-done">
        <h2>More coming soon!</h2>
        <p>New questions are being added to {world.name}.</p>
        <button className="adv-next" onClick={onBack}>Back to the map</button>
      </div>
    )
  }

  return (
    <GameShell world={world} index={index} total={total} xp={xp} stars={stars} streak={streak} onBack={onBack}>
      {world.id === 'reading' && <ReadingWorld story={story} index={index} state={state} onAnswer={answer} />}
      {world.id === 'vocabulary' && <VocabularyCard item={item} state={state} onAnswer={answer} pool={items} />}
      {world.id === 'writing' && <WritingTask key={item.id} item={item} onDone={next} />}
      {['phonics', 'spelling'].includes(world.id) && (item.kind === 'build' || item.scrambled
        ? <BuildQuestion key={item.id} item={item} state={state} onAnswer={answer} />
        : <ChoiceQuestion item={item} state={state} onAnswer={answer} />)}
      {['grammar', 'listening', 'champion'].includes(world.id) && (
        <ChoiceQuestion item={item} state={state} onAnswer={answer} />
      )}
      {world.id !== 'writing' && (
        <Feedback
          state={state}
          hint={item?.hint}
          onNext={next}
          onRetry={() => setState(null)}
          isLast={index + 1 >= total}
          seed={index}
        />
      )}
    </GameShell>
  )
}

/* ------------------------------------------------------------------ */
/* World map                                                           */
/* ------------------------------------------------------------------ */

export default function EnglishAdventure({ learner, totalXp = 0, onEarn }) {
  const [openWorld, setOpenWorld] = useState(null)
  const [level, setLevel] = useState(() => {
    // Guess from the child's school year, but let them change it. A wrong
    // guess that cannot be corrected is worse than no guess.
    const year = Number(String(learner?.year || '').replace(/\D/g, '')) || 0
    if (year <= 2) return 'beginner'
    if (year === 3) return 'elementary'
    if (year === 4) return 'lower'
    if (year === 5) return 'upper'
    return year >= 6 ? 'advanced' : 'elementary'
  })

  const world = WORLDS.find((w) => w.id === openWorld)
  if (world) {
    return (
      <div className="portal-view adv-view">
        <WorldPlayer world={world} level={level} onBack={() => setOpenWorld(null)} onEarn={onEarn} />
      </div>
    )
  }

  return (
    <div className="portal-view adv-view">
      <section className="adv-hero">
        <div>
          <span className="portal-kicker">English Adventure</span>
          <h1>Learn English. Play. Level Up!</h1>
          <p>
            Eight worlds of games built around the skills primary schools teach — phonics, vocabulary,
            grammar, reading, listening, spelling and writing. Every star you earn counts towards your rewards.
          </p>
          <div className="adv-level-pick">
            <label htmlFor="adv-level">My level</label>
            <select id="adv-level" value={level} onChange={(event) => setLevel(event.target.value)}>
              {LEVELS.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name} · ages {entry.ages}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="adv-hero__xp">
          <strong>{totalXp}</strong>
          <span>XP so far</span>
        </div>
      </section>

      <div className="adv-map">
        {WORLDS.map((entry) => {
          const locked = totalXp < entry.unlockXp
          const count = entry.id === 'champion'
            ? championQuestions(level).length
            : (CONTENT[entry.id] || []).length
          return (
            <button
              key={entry.id}
              type="button"
              className={`adv-world ${locked ? 'is-locked' : ''}`}
              style={{ '--world': entry.colour }}
              disabled={locked}
              onClick={() => setOpenWorld(entry.id)}
              aria-label={locked
                ? `${entry.name}, locked. Earn ${entry.unlockXp} XP to open it.`
                : `Play ${entry.name}`}
            >
              <span className="adv-world__n">World {entry.n}</span>
              <span className="adv-world__icon" aria-hidden="true">
                {locked ? <Lock size={30} /> : <WorldIcon name={entry.icon} />}
              </span>
              <strong>{entry.name}</strong>
              <small>{entry.blurb}</small>
              <span className="adv-world__foot">
                {locked
                  ? <><Lock size={14} /> {entry.unlockXp} XP to unlock</>
                  : <><Sparkles size={14} /> {count} activities</>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
