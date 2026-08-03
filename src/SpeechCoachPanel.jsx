import { useEffect, useRef, useState } from 'react'
import { Copy, Mic, MicOff, Sparkles, Volume2 } from 'lucide-react'
import {
  analyseTranscript,
  buildLessonSummary,
  grammarSuggestions,
  recommendHomework,
  scorePronunciation,
  speakingBalance,
  speechRecognitionSupported,
  startSpeechRecognition,
} from './speechCoach.js'
import { speakPracticeWord } from './PracticeWordSpeaker.jsx'

/**
 * In-classroom AI speech coach.
 *
 * Listens to the microphone, transcribes live, scores pronunciation against
 * the lesson's practice words, flags grammar slips and tracks speaking time.
 * Everything runs locally in the browser — no audio is uploaded.
 */
export default function SpeechCoachPanel({
  role = 'student',
  studentName = 'Student',
  practiceWords = [],
  onSummary,
}) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [attempts, setAttempts] = useState([])
  const [targetWord, setTargetWord] = useState(practiceWords[0] || '')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const controllerRef = useRef(null)
  const timerRef = useRef(null)
  const targetRef = useRef(targetWord)
  const lastScoredRef = useRef('')

  useEffect(() => { targetRef.current = targetWord }, [targetWord])

  useEffect(() => () => {
    window.clearInterval(timerRef.current)
    try { controllerRef.current?.stop() } catch { /* already stopped */ }
  }, [])

  const supported = speechRecognitionSupported()

  const stopListening = () => {
    try { controllerRef.current?.stop() } catch { /* already stopped */ }
    controllerRef.current = null
    window.clearInterval(timerRef.current)
    setListening(false)
    setInterim('')
  }

  const beginListening = () => {
    setError('')
    if (!supported) {
      setError('Speech recognition needs Chrome, Edge or Safari.')
      return
    }
    try {
      controllerRef.current = startSpeechRecognition({
        onResult: ({ finalText, interimText, lastConfidence }) => {
          setTranscript(finalText)
          setInterim(interimText)
          // Score the newest final phrase against the chosen target word.
          const target = targetRef.current
          if (target && finalText && finalText !== lastScoredRef.current) {
            const spokenTail = finalText.split(' ').slice(-4).join(' ')
            lastScoredRef.current = finalText
            const result = scorePronunciation(target, spokenTail, lastConfidence)
            if (result.score > 0) {
              setAttempts((current) => [...current.slice(-19), { ...result, at: Date.now() }])
            }
          }
        },
        onError: (recognitionError) => setError(recognitionError.message || 'Microphone error.'),
      })
      setListening(true)
      timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    } catch (startError) {
      setError(startError.message || 'Could not start the microphone.')
    }
  }

  const reset = () => {
    stopListening()
    setTranscript('')
    setInterim('')
    setAttempts([])
    setSeconds(0)
    lastScoredRef.current = ''
  }

  const stats = analyseTranscript(transcript, seconds)
  const grammar = grammarSuggestions(transcript)
  const balance = speakingBalance(0, seconds)
  const latest = attempts[attempts.length - 1]

  const shareSummary = () => {
    const summary = buildLessonSummary({ transcript, seconds, attempts, studentName })
    const homework = recommendHomework({ attempts, transcript })
    onSummary?.({ ...summary, homework, transcript })
    navigator.clipboard?.writeText(summary.summary).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    }).catch(() => {})
  }

  return (
    <div className="speech-coach">
      <div className="speech-coach__head">
        <div>
          <b><Sparkles size={14} /> AI speech coach</b>
          <small>
            {supported
              ? 'Listens to the microphone, scores pronunciation and tracks speaking time. Audio never leaves this device.'
              : 'Speech recognition needs Chrome, Edge or Safari.'}
          </small>
        </div>
        <button
          type="button"
          className={`speech-coach__mic ${listening ? 'is-live' : ''}`}
          onClick={() => (listening ? stopListening() : beginListening())}
          disabled={!supported}
        >
          {listening ? <MicOff size={15} /> : <Mic size={15} />}
          {listening ? 'Stop' : 'Listen'}
        </button>
      </div>

      {error && <p className="speech-coach__error" role="alert">{error}</p>}

      {practiceWords.length > 0 && (
        <div className="speech-coach__targets">
          <span>Practise word</span>
          <div>
            {practiceWords.slice(0, 8).map((word) => (
              <button
                type="button"
                key={word}
                className={targetWord === word ? 'active' : ''}
                onClick={() => setTargetWord(word)}
              >
                {word}
              </button>
            ))}
          </div>
          {targetWord && (
            <button type="button" className="speech-coach__hear" onClick={() => speakPracticeWord(targetWord)}>
              <Volume2 size={13} /> Hear "{targetWord}"
            </button>
          )}
        </div>
      )}

      {latest && (
        <div className={`speech-coach__score speech-coach__score--${latest.tone}`}>
          <strong>{latest.emoji} {latest.score}%</strong>
          <div>
            <b>{latest.label}</b>
            <small>{latest.feedback}</small>
          </div>
        </div>
      )}

      {(listening || transcript) && (
        <div className="speech-coach__transcript">
          <span>Live transcript</span>
          <p>{transcript} <i>{interim}</i>{!transcript && !interim && 'Listening…'}</p>
        </div>
      )}

      <div className="speech-coach__stats">
        <div><strong>{stats.wordCount}</strong><span>words</span></div>
        <div><strong>{stats.uniqueCount}</strong><span>vocabulary</span></div>
        <div><strong>{stats.wordsPerMinute || '—'}</strong><span>words/min</span></div>
        <div><strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong><span>speaking</span></div>
      </div>

      {role !== 'student' && seconds > 20 && (
        <p className={`speech-coach__balance ${balance.healthy ? 'is-good' : ''}`}>{balance.note}</p>
      )}

      {grammar.length > 0 && (
        <div className="speech-coach__grammar">
          <span>Grammar suggestions</span>
          {grammar.map((item) => (
            <div key={item.note}>
              <b>{item.phrase}</b> → <em>{item.suggestion}</em>
              <small>{item.note}</small>
            </div>
          ))}
        </div>
      )}

      {attempts.length > 1 && (
        <div className="speech-coach__history">
          <span>Attempts</span>
          <div>
            {attempts.slice(-8).map((attempt) => (
              <i key={attempt.at} className={`tone-${attempt.tone}`} title={`${attempt.target}: ${attempt.score}%`}>
                {attempt.target} {attempt.score}%
              </i>
            ))}
          </div>
        </div>
      )}

      {(transcript || attempts.length > 0) && (
        <div className="speech-coach__actions">
          <button type="button" onClick={reset}>Reset</button>
          {role !== 'student' && (
            <button type="button" className="primary" onClick={shareSummary}>
              <Copy size={13} /> {copied ? 'Summary copied' : 'Copy lesson summary'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
