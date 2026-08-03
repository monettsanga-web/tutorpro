import { useEffect, useRef, useState } from 'react'
import { Loader2, Volume2, VolumeX } from 'lucide-react'

/**
 * Pronunciation practice for teacher feedback "words to practise".
 *
 * Uses the browser Web Speech API (speechSynthesis) so it works offline,
 * costs nothing and needs no extra service. Students tap a word to hear it,
 * and can switch between a normal and a slow "sound it out" reading.
 */

let cachedVoices = []

function loadVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  const voices = window.speechSynthesis.getVoices() || []
  if (voices.length) cachedVoices = voices
  return cachedVoices
}

export function speechSupported() {
  return typeof window !== 'undefined'
    && Boolean(window.speechSynthesis)
    && typeof window.SpeechSynthesisUtterance !== 'undefined'
}

/** Prefer a clear native English teaching voice for young learners. */
function chooseTeachingVoice(preferredLang = 'en-GB') {
  const voices = loadVoices()
  if (!voices.length) return null
  const english = voices.filter((voice) => /^en(?:-|_)/i.test(voice.lang))
  if (!english.length) return null
  const clearNames = /\b(?:samantha|karen|moira|tessa|serena|fiona|google uk english female|google us english|libby|sonia|aria|jenny|emma|amy|joanna|salli|natasha|clara)\b/i
  const exactLang = english.filter((voice) => voice.lang.replace('_', '-').toLowerCase().startsWith(preferredLang.toLowerCase()))
  return exactLang.find((voice) => clearNames.test(voice.name))
    || exactLang.find((voice) => !/\b(?:compact|novelty|whisper|bad|bells|boing|jester|organ|trinoids|zarvox)\b/i.test(voice.name))
    || exactLang[0]
    || english.find((voice) => clearNames.test(voice.name))
    || english[0]
    || null
}

export function speakPracticeWord(word, { slow = false, lang = 'en-GB', onStart, onEnd } = {}) {
  if (!speechSupported() || !word) { onEnd?.(); return () => {} }
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new window.SpeechSynthesisUtterance(String(word))
  utterance.lang = lang
  utterance.rate = slow ? 0.55 : 0.9
  utterance.pitch = 1
  utterance.volume = 1
  const voice = chooseTeachingVoice(lang)
  if (voice) utterance.voice = voice

  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    window.clearTimeout(timer)
    onEnd?.()
  }
  utterance.onstart = () => onStart?.()
  utterance.onend = finish
  utterance.onerror = finish
  // Safety net: some browsers never fire onend for very short utterances.
  const timer = window.setTimeout(finish, Math.min(15000, Math.max(2500, String(word).length * (slow ? 420 : 260))))
  synth.speak(utterance)
  return () => { synth.cancel(); finish() }
}

/** A single tappable word chip that speaks itself. */
export function PracticeWordChip({ word, slow = false, lang = 'en-GB', className = '' }) {
  const [speaking, setSpeaking] = useState(false)
  const stopRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => () => {
    mountedRef.current = false
    stopRef.current?.()
  }, [])

  if (!speechSupported()) return <i className={className}>{word}</i>

  const play = () => {
    if (speaking) { stopRef.current?.(); return }
    stopRef.current = speakPracticeWord(word, {
      slow,
      lang,
      onStart: () => { if (mountedRef.current) setSpeaking(true) },
      onEnd: () => { if (mountedRef.current) setSpeaking(false) },
    })
  }

  return (
    <button
      type="button"
      className={`practice-word-chip ${speaking ? 'is-speaking' : ''} ${className}`.trim()}
      onClick={play}
      title={`Hear "${word}" pronounced`}
      aria-label={`Play pronunciation of ${word}`}
    >
      <Volume2 size={13} aria-hidden="true" />
      <span>{word}</span>
    </button>
  )
}

/**
 * Full pronunciation practice panel shown under a feedback card.
 * Includes per-word playback, slow mode and "play all".
 */
export default function PracticeWordSpeaker({ words = [], title = 'Words to practise', hint = 'Tap a word to hear how it sounds, then say it out loud.' }) {
  const list = Array.isArray(words) ? words.filter(Boolean) : []
  const [slow, setSlow] = useState(false)
  const [activeWord, setActiveWord] = useState('')
  const [playingAll, setPlayingAll] = useState(false)
  const cancelRef = useRef(null)
  const mountedRef = useRef(true)
  const supported = speechSupported()

  useEffect(() => {
    // Voice list loads asynchronously in Chrome; warm it up.
    loadVoices()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
    return () => {
      mountedRef.current = false
      cancelRef.current = null
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, [])

  if (!list.length) return null

  const stopAll = () => {
    cancelRef.current = null
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    setPlayingAll(false)
    setActiveWord('')
  }

  const playOne = (word) => {
    if (playingAll) stopAll()
    if (activeWord === word) { stopAll(); return }
    setActiveWord(word)
    speakPracticeWord(word, {
      slow,
      onEnd: () => { if (mountedRef.current) setActiveWord('') },
    })
  }

  const playAll = () => {
    if (playingAll) { stopAll(); return }
    setPlayingAll(true)
    const token = {}
    cancelRef.current = token
    const speakIndex = (index) => {
      if (!mountedRef.current || cancelRef.current !== token || index >= list.length) {
        if (mountedRef.current && cancelRef.current === token) stopAll()
        return
      }
      const word = list[index]
      setActiveWord(word)
      speakPracticeWord(word, {
        slow,
        onEnd: () => window.setTimeout(() => speakIndex(index + 1), 380),
      })
    }
    speakIndex(0)
  }

  return (
    <div className="practice-word-speaker">
      <div className="practice-word-speaker__head">
        <div>
          <b><Volume2 size={14} /> {title}</b>
          <small>{supported ? hint : 'Pronunciation audio is not supported in this browser. Try Chrome, Edge or Safari.'}</small>
        </div>
        {supported && (
          <div className="practice-word-speaker__controls">
            <button
              type="button"
              className={slow ? 'active' : ''}
              onClick={() => { stopAll(); setSlow((value) => !value) }}
              title="Slow, sound-it-out pronunciation"
            >
              🐢 Slow
            </button>
            <button type="button" className={playingAll ? 'active' : ''} onClick={playAll}>
              {playingAll ? <><VolumeX size={14} /> Stop</> : <><Volume2 size={14} /> Play all</>}
            </button>
          </div>
        )}
      </div>
      <div className="practice-word-speaker__list">
        {list.map((word) => (
          <button
            type="button"
            key={word}
            className={`practice-word-button ${activeWord === word ? 'is-speaking' : ''}`}
            onClick={() => supported && playOne(word)}
            disabled={!supported}
            aria-label={supported ? `Play pronunciation of ${word}` : word}
          >
            {activeWord === word ? <Loader2 size={14} className="practice-word-button__spin" /> : <Volume2 size={14} />}
            <span>{word}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
