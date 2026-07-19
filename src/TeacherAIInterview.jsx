import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, AudioLines, CheckCircle2, Clock3, Mic, Radio, RotateCcw, Send, ShieldCheck, Sparkles, Square, UploadCloud, Volume2 } from 'lucide-react'
import { supabase } from './supabaseClient.js'
import { uploadTeacherInterviewRecordings } from './teacherInterviewMedia.js'

const interviewerPortrait = `${import.meta.env.BASE_URL}assets/tutorpro-live-male-interviewer.webp`
const MAX_ANSWER_SECONDS = 300

const microDemoPrompts = [
  "Imagine I'm a beginner student. Teach me the difference between 'much' and 'many' in under two minutes, as if this were a real lesson.",
  "I'm an intermediate student who keeps confusing past simple and present perfect. Give me a short explanation and one example to fix that.",
  "Pretend I just made this mistake: 'I have went to the store yesterday.' Correct me the way you would with a real student.",
]

function buildQuestions(microDemoPrompt) {
  return [
    { stage: 'Introduction', question: 'Please introduce yourself and tell me briefly why you became an English teacher.' },
    { stage: 'Background & credentials', question: 'Tell me about your teaching experience: how long have you taught, which ages and levels, and was it online, in person, or both?' },
    { stage: 'Background & credentials', question: 'What teaching degree, bachelor’s degree, TEFL, TESOL, CELTA, or other relevant certifications do you currently hold?' },
    { stage: 'Background & credentials', question: 'Which English skills, subjects, curricula, age groups, or exam areas do you specialize in?' },
    { stage: 'English proficiency', question: "How would you explain the difference between 'a' and 'the' to a beginner student?" },
    { stage: 'English proficiency', question: 'Describe a challenging teaching moment and explain what you did, what happened, and what you learned from it.' },
    { stage: 'Teaching philosophy', question: 'How would you help a student who is too shy or nervous to speak English during class?' },
    { stage: 'Teaching philosophy', question: 'How do you adjust your lesson for a complete beginner compared with an advanced student?' },
    { stage: 'Teaching philosophy', question: 'How do you keep a student motivated over many lessons?' },
    { stage: 'Teaching philosophy', question: 'When a student makes a mistake, how do you decide whether to correct it immediately or let the student finish?' },
    { stage: 'Live micro-demo', question: microDemoPrompt },
    { stage: 'Live micro-demo follow-up', question: 'Now imagine the student still looks confused. Explain the same teaching point in a different and simpler way.' },
    { stage: 'Platform fit & logistics', question: 'What days and hours can you reliably teach, what is your timezone, and what internet, webcam, headset, and quiet teaching space do you have?' },
    { stage: 'Platform fit & motivation', question: 'Why do you want to teach with TutorPro English, and which Primary or Secondary learners do you most enjoy teaching?' },
  ]
}

function localEvaluation(applicant, transcript, microDemoPrompt, startedAt) {
  const answers = transcript.map((item) => item.answer)
  const combined = answers.join(' ')
  const averageWords = Math.round(answers.reduce((total, answer) => total + answer.split(/\s+/).filter(Boolean).length, 0) / Math.max(1, answers.length))
  const credentials = combined.match(/\b(?:tefl|tesol|celta|bachelor(?:'s)?|degree|licensed teacher|education degree)\b/gi) || []
  const pedagogySignals = combined.match(/\b(?:adapt|encourage|scaffold|model|example|visual|practice|feedback|wait time|student-centred|differentiate|motivat|confidence|context|check understanding)\w*/gi) || []
  const experience = Number(applicant.experience) || 0
  const englishBand = averageWords >= 28 ? 'Strong' : averageWords >= 14 ? 'Good' : 'Needs Review'
  const demoAnswer = transcript.find((item) => item.stage === 'Live micro-demo')?.answer || ''
  const demoBand = demoAnswer.split(/\s+/).length >= 45 ? 'Strong' : demoAnswer.split(/\s+/).length >= 20 ? 'Good' : 'Weak'
  const recommendation = englishBand === 'Strong' && demoBand !== 'Weak' && experience >= 1 && credentials.length && pedagogySignals.length >= 5
    ? 'Strong Hire'
    : englishBand === 'Needs Review' || demoBand === 'Weak'
      ? 'Not a Fit Now'
      : 'Consider / Second Interview'
  const strengths = [
    experience > 0 ? `${experience} year(s) of self-reported teaching experience` : '',
    credentials.length ? `Relevant credentials mentioned: ${[...new Set(credentials.map((item) => item.toUpperCase()))].join(', ')}` : '',
    pedagogySignals.length >= 5 ? 'Demonstrated adaptable and student-aware teaching language' : '',
    demoBand === 'Strong' ? 'Provided a detailed live micro-demo response' : '',
  ].filter(Boolean)
  const concerns = [
    !credentials.length ? 'Bachelor’s degree or TEFL-related certification needs human verification' : '',
    experience < 1 ? 'Limited self-reported ESL teaching experience' : '',
    englishBand === 'Needs Review' ? 'Spoken response transcript needs closer human review' : '',
    demoBand === 'Weak' ? 'Micro-demo response was too brief for a reliable teaching assessment' : '',
  ].filter(Boolean)
  return {
    source: 'structured-fallback',
    applicantName: applicant.fullName,
    selfReportedExperience: `${applicant.experience || 0} years; ${applicant.specialization || 'specialization not stated'}`,
    certificationsMentioned: [...new Set(credentials.map((item) => item))],
    englishProficiency: { band: englishBand, justification: `Average spoken-response transcript length was ${averageWords} words. A human reviewer should listen to the recordings to verify fluency and pronunciation.` },
    teachingApproach: pedagogySignals.length ? 'The applicant described student support, examples, practice, correction, and/or adaptation strategies.' : 'The transcript contains limited evidence of a structured teaching method.',
    liveDemo: { band: demoBand, prompt: microDemoPrompt, justification: `The micro-demo transcript contained ${demoAnswer.split(/\s+/).filter(Boolean).length} words and should be reviewed with its audio recording.` },
    strengths,
    concerns,
    availability: transcript.find((item) => item.stage === 'Platform fit & logistics')?.answer || 'Not stated',
    overallRecommendation: recommendation,
    suggestedNextStep: recommendation === 'Strong Hire' ? 'Listen to the recorded answers, then move to a live demo lesson and credential verification.' : recommendation.startsWith('Consider') ? 'Listen to the recordings and hold a human interview to verify credentials, spoken English, and teaching experience.' : 'Human review of the recordings before sending a polite application decision.',
    completedAt: new Date().toISOString(),
    durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
    transcript,
  }
}

async function evaluateInterview(applicant, transcript, microDemoPrompt, startedAt) {
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('teacher-interview-evaluator', {
        body: { applicant, transcript, microDemoPrompt },
      })
      if (!error && data?.overallRecommendation) {
        return {
          ...data,
          source: 'ai-evaluator',
          completedAt: new Date().toISOString(),
          durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
          transcript,
        }
      }
    } catch {
      // The structured private fallback keeps the application flow available.
    }
  }
  return localEvaluation(applicant, transcript, microDemoPrompt, startedAt)
}

function preferredRecordingMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const options = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm']
  return options.find((type) => MediaRecorder.isTypeSupported?.(type)) || ''
}

function formatTime(seconds) {
  const value = Math.max(0, Math.round(seconds || 0))
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}

function chooseEnglishMaleVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  const english = voices.filter((voice) => /^en(?:-|_)/i.test(voice.lang))
  const maleNames = /\b(?:daniel|george|guy|ryan|mark|david|james|oliver|thomas|arthur|alex|fred|ralph|aaron|lee)\b/i
  return english.find((voice) => /^en-GB/i.test(voice.lang) && maleNames.test(voice.name))
    || english.find((voice) => /^en-GB/i.test(voice.lang))
    || english.find((voice) => maleNames.test(voice.name))
    || english[0]
    || null
}

export default function TeacherAIInterview({ applicant, onBack, onComplete, submitting = false }) {
  const microDemoPrompt = useMemo(() => {
    const applicantKey = String(applicant.fullName || applicant.email || 'TutorPro applicant')
    const promptIndex = [...applicantKey].reduce((total, character) => total + character.charCodeAt(0), 0) % microDemoPrompts.length
    return microDemoPrompts[promptIndex]
  }, [applicant.email, applicant.fullName])
  const questions = useMemo(() => buildQuestions(microDemoPrompt), [microDemoPrompt])
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [transcript, setTranscript] = useState([])
  const [finished, setFinished] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState('ready')
  const [speaking, setSpeaking] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [answerTranscript, setAnswerTranscript] = useState('')
  const [recordedAnswer, setRecordedAnswer] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(null)
  const startedAtRef = useRef(0)
  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const recognitionRef = useRef(null)
  const recognitionTextRef = useRef('')
  const liveTranscriptRef = useRef('')
  const recordingStartedAtRef = useRef(0)
  const recordingTimerRef = useRef(null)
  const speechTimerRef = useRef(null)
  const recordingsRef = useRef([])
  const uploadResultRef = useRef(null)
  const recordedUrlRef = useRef('')
  const mountedRef = useRef(true)
  const current = questions[index]

  const stopMediaStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }

  const stopRecognition = () => {
    try { recognitionRef.current?.stop() } catch { /* Recognition may already be stopped. */ }
    recognitionRef.current = null
  }

  const clearRecordingTimer = () => {
    window.clearInterval(recordingTimerRef.current)
    recordingTimerRef.current = null
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      window.clearTimeout(speechTimerRef.current)
      window.clearInterval(recordingTimerRef.current)
      try { recognitionRef.current?.stop() } catch { /* Recognition may already be stopped. */ }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
      window.speechSynthesis?.cancel()
      if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current)
    }
  }, [])

  const begin = () => {
    startedAtRef.current = Date.now()
    setStarted(true)
  }

  const speakQuestion = (question) => new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      resolve()
      return
    }
    window.clearTimeout(speechTimerRef.current)
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(question)
    utterance.lang = 'en-GB'
    utterance.rate = 0.92
    utterance.pitch = 0.92
    utterance.volume = 1
    utterance.voice = chooseEnglishMaleVoice()
    let completed = false
    const finish = () => {
      if (completed) return
      completed = true
      window.clearTimeout(speechTimerRef.current)
      if (mountedRef.current) setSpeaking(false)
      resolve()
    }
    utterance.onstart = () => { if (mountedRef.current) setSpeaking(true) }
    utterance.onend = finish
    utterance.onerror = finish
    speechTimerRef.current = window.setTimeout(() => {
      window.speechSynthesis.cancel()
      finish()
    }, Math.min(45000, Math.max(12000, question.length * 85)))
    window.speechSynthesis.speak(utterance)
  })

  const replayQuestion = async () => {
    if (phase !== 'ready') return
    setError('')
    await speakQuestion(current.question)
  }

  const beginRecognition = () => {
    if (typeof window === 'undefined') return
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) return
    try {
      const recognition = new Recognition()
      recognition.lang = 'en-GB'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      recognitionTextRef.current = ''
      recognition.onresult = (event) => {
        let finalText = recognitionTextRef.current
        let interimText = ''
        for (let resultIndex = event.resultIndex; resultIndex < event.results.length; resultIndex += 1) {
          const text = event.results[resultIndex][0]?.transcript || ''
          if (event.results[resultIndex].isFinal) finalText = `${finalText} ${text}`.trim()
          else interimText = `${interimText} ${text}`.trim()
        }
        recognitionTextRef.current = finalText
        liveTranscriptRef.current = `${finalText} ${interimText}`.trim()
        if (mountedRef.current) setLiveTranscript(liveTranscriptRef.current)
      }
      recognition.onerror = () => { /* The applicant can type or correct the transcript after recording. */ }
      recognitionRef.current = recognition
      recognition.start()
    } catch {
      recognitionRef.current = null
    }
  }

  const finishRecording = () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    setPhase('processing')
    clearRecordingTimer()
    stopRecognition()
    recorder.stop()
  }

  const startRecording = async () => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('This browser cannot record audio. Open the application in current Chrome, Edge or Safari and allow microphone access.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        video: false,
      })
      mediaStreamRef.current = stream
      setPhase('asking')
      await speakQuestion(current.question)
      if (!mountedRef.current) return
      setPhase('countdown')
      for (let value = 3; value > 0; value -= 1) {
        setCountdown(value)
        await new Promise((resolve) => window.setTimeout(resolve, 700))
        if (!mountedRef.current) return
      }

      const mimeType = preferredRecordingMimeType()
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 64000,
      })
      const chunks = []
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data)
      }
      recorder.onstop = () => {
        const durationSeconds = Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000))
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current)
        recordedUrlRef.current = url
        const automaticTranscript = recognitionTextRef.current.trim() || liveTranscriptRef.current.trim()
        if (mountedRef.current) {
          setRecordedAnswer({ blob, url, durationSeconds, mimeType: recorder.mimeType || mimeType || blob.type })
          setAnswerTranscript(automaticTranscript)
          setElapsed(durationSeconds)
          setPhase('review')
        }
        stopMediaStream()
      }
      mediaRecorderRef.current = recorder
      recordingStartedAtRef.current = Date.now()
      setElapsed(0)
      recognitionTextRef.current = ''
      liveTranscriptRef.current = ''
      setLiveTranscript('')
      setPhase('recording')
      recorder.start(500)
      beginRecognition()
      recordingTimerRef.current = window.setInterval(() => {
        const seconds = Math.round((Date.now() - recordingStartedAtRef.current) / 1000)
        if (mountedRef.current) setElapsed(seconds)
        if (seconds >= MAX_ANSWER_SECONDS) finishRecording()
      }, 500)
    } catch (recordingError) {
      stopMediaStream()
      setPhase('ready')
      setSpeaking(false)
      const denied = /notallowed|permission|denied/i.test(recordingError?.name || recordingError?.message || '')
      setError(denied ? 'Microphone permission was blocked. Allow microphone access in your browser, then press Start answer again.' : `The microphone could not start: ${recordingError.message}`)
    }
  }

  const recordAgain = () => {
    if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current)
    recordedUrlRef.current = ''
    setRecordedAnswer(null)
    setAnswerTranscript('')
    recognitionTextRef.current = ''
    liveTranscriptRef.current = ''
    setLiveTranscript('')
    setElapsed(0)
    setError('')
    setPhase('ready')
  }

  const saveRecordedAnswer = () => {
    const answer = answerTranscript.trim()
    if (!recordedAnswer?.blob?.size) {
      setError('Record your spoken answer before continuing.')
      return
    }
    if (answer.length < 8) {
      setError('Review the automatic transcript and add at least a short transcript of your recorded answer.')
      return
    }
    const response = {
      stage: current.stage,
      question: current.question,
      answer,
      recording: {
        durationSeconds: recordedAnswer.durationSeconds,
        mimeType: recordedAnswer.mimeType.split(';')[0],
        byteSize: recordedAnswer.blob.size,
      },
    }
    const nextTranscript = [...transcript, response]
    recordingsRef.current[index] = {
      index,
      blob: recordedAnswer.blob,
      durationSeconds: recordedAnswer.durationSeconds,
      mimeType: recordedAnswer.mimeType,
    }
    setTranscript(nextTranscript)
    if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current)
    recordedUrlRef.current = ''
    setRecordedAnswer(null)
    setAnswerTranscript('')
    recognitionTextRef.current = ''
    liveTranscriptRef.current = ''
    setLiveTranscript('')
    setElapsed(0)
    setError('')
    setPhase('ready')
    if (index === questions.length - 1) setFinished(true)
    else setIndex((value) => value + 1)
  }

  const submitCompletedInterview = async () => {
    setEvaluating(true)
    setError('')
    try {
      let evaluation = await evaluateInterview(applicant, transcript, microDemoPrompt, startedAtRef.current)
      let recordingCredentials = null
      if (!uploadResultRef.current) {
        try {
          const uploaded = await uploadTeacherInterviewRecordings({
            applicant,
            transcript,
            recordings: recordingsRef.current.filter(Boolean),
            onProgress: (completed, total) => setUploadProgress({ completed, total }),
          })
          uploadResultRef.current = uploaded
        } catch (uploadError) {
          uploadResultRef.current = {
            credentials: null,
            summary: {
              recordingCount: recordingsRef.current.filter(Boolean).length,
              recordingStatus: 'secure-upload-unavailable',
              recordingNotice: uploadError.message,
            },
          }
        }
      }
      evaluation = { ...evaluation, ...uploadResultRef.current.summary }
      recordingCredentials = uploadResultRef.current.credentials
      await onComplete(evaluation, recordingCredentials)
    } catch (submitError) {
      setError(submitError.message)
      setEvaluating(false)
      setUploadProgress(null)
    }
  }

  if (!started) {
    return (
      <section className="teacher-ai-interview teacher-ai-interview--welcome">
        <figure className="teacher-interviewer-portrait teacher-interviewer-portrait--male">
          <img src={interviewerPortrait} alt="TutorPro English fictional English male AI hiring assistant" decoding="async" />
          <figcaption><i aria-hidden="true" /> English AI interviewer · Online</figcaption>
        </figure>
        <span className="kicker">Required recorded first-round interview</span>
        <h2>Meet your TutorPro English Hiring Assistant</h2>
        <p>I’m a fictional English male AI interviewer—not a human recruiter. I’ll show and read each question in a natural British English voice. Take as long as you need to review each question, then press <strong>Start answer</strong> when you are ready. Your microphone records one answer at a time and you can listen, re-record and review the transcript before continuing.</p>
        <div className="teacher-interview-features"><span><Clock3 size={17} /> 15–25 minutes</span><span><Mic size={17} /> Microphone required</span><span><ShieldCheck size={17} /> Private hiring review</span><span><Sparkles size={17} /> Review before saving</span></div>
        <button type="button" className="button button--primary" onClick={begin}>Enter recorded interview <ArrowRight size={17} /></button>
        <button type="button" className="teacher-interview-back" onClick={onBack}><ArrowLeft size={16} /> Back to teaching profile</button>
      </section>
    )
  }

  if (finished) {
    return (
      <section className="teacher-ai-interview teacher-ai-interview--complete">
        <span className="teacher-ai-avatar complete"><CheckCircle2 size={35} /></span>
        <span className="kicker">Recorded interview complete</span>
        <h2>Thank you, {applicant.fullName}.</h2>
        <p>Your recorded responses and reviewed transcripts are ready for the TutorPro English hiring team. A real team member will review your application, credentials and interview before following up. Compensation and platform policy details will be discussed by a human recruiter if you move forward.</p>
        <div className="teacher-interview-complete-summary"><strong>{transcript.length}</strong><span>recorded answers</span><strong>100%</strong><span>interview progress</span></div>
        {uploadProgress && <div className="teacher-interview-upload"><UploadCloud size={18} /><span><strong>Securing recorded answers</strong><small>{uploadProgress.completed} of {uploadProgress.total} uploaded</small></span></div>}
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button type="button" className="button button--primary button--full" onClick={submitCompletedInterview} disabled={evaluating || submitting}>{evaluating || submitting ? 'Securing recordings and submitting…' : 'Submit recorded application'} <Send size={16} /></button>
      </section>
    )
  }

  return (
    <section className="teacher-ai-interview teacher-ai-interview--question">
      <div className="teacher-interview-top"><span className={`teacher-interviewer-mini ${speaking ? 'is-speaking' : ''}`}><img src={interviewerPortrait} alt="" aria-hidden="true" /><i aria-hidden="true" /></span><div><small>TutorPro English Hiring Assistant · English male AI voice</small><strong>{current.stage}</strong></div><em>{index + 1} / {questions.length}</em></div>
      <div className="teacher-interview-progress"><span style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>

      <div className={`teacher-live-question ${speaking ? 'is-speaking' : ''}`}>
        <div className="teacher-live-question__portrait"><img src={interviewerPortrait} alt="Fictional English male AI interviewer" /><span><i /> {speaking ? 'Asking your question…' : 'Ready when you are'}</span></div>
        <div className="teacher-interview-question"><small>Question {index + 1} · Review before recording</small><h2>{current.question}</h2>{phase === 'ready' && <button type="button" onClick={replayQuestion} disabled={speaking}><Volume2 size={15} /> {speaking ? 'Speaking…' : 'Hear question'}</button>}</div>
      </div>

      <div className={`teacher-answer-recorder teacher-answer-recorder--${phase}`}>
        {phase === 'ready' && <><div className="teacher-answer-recorder__intro"><span><Mic size={22} /></span><div><strong>Take your time to prepare</strong><p>Your recording starts only after you press the button, hear the question and see the 3-second countdown.</p></div></div><button type="button" className="button button--primary button--full" onClick={startRecording}><Mic size={17} /> Start answer</button></>}
        {phase === 'asking' && <div className="teacher-recording-status"><AudioLines size={31} /><strong>Your interviewer is asking the question</strong><span>Recording has not started yet. Listen, then wait for the countdown.</span><div className="teacher-speaking-bars" aria-hidden="true">{Array.from({ length: 7 }, (_, bar) => <i key={bar} />)}</div></div>}
        {phase === 'countdown' && <div className="teacher-recording-status teacher-recording-countdown"><strong>{countdown}</strong><span>Get ready to answer…</span></div>}
        {phase === 'recording' && <><div className="teacher-recording-live"><span><i /> Recording</span><strong>{formatTime(elapsed)}</strong><em>Maximum 5:00</em></div><div className="teacher-recording-wave" aria-hidden="true">{Array.from({ length: 22 }, (_, bar) => <i key={bar} />)}</div><div className="teacher-live-transcript"><small>Live automatic transcript</small><p>{liveTranscript || 'Start speaking naturally. Your words will appear here when browser transcription is available.'}</p></div><button type="button" className="button teacher-stop-recording button--full" onClick={finishRecording}><Square size={15} fill="currentColor" /> Stop answer</button></>}
        {phase === 'processing' && <div className="teacher-recording-status"><Radio size={28} /><strong>Preparing your answer…</strong><span>Please keep this window open.</span></div>}
        {phase === 'review' && recordedAnswer && <><div className="teacher-answer-review__heading"><div><span><CheckCircle2 size={17} /> Answer recorded</span><small>{formatTime(recordedAnswer.durationSeconds)} · {(recordedAnswer.blob.size / 1024).toFixed(0)} KB</small></div><audio controls src={recordedAnswer.url}>Your browser cannot play this recorded answer.</audio></div><label className="teacher-transcript-review"><span>Review your answer transcript</span><textarea value={answerTranscript} onChange={(event) => { setAnswerTranscript(event.target.value); setError('') }} placeholder="Automatic transcription may be unavailable on some browsers. Type or correct your spoken answer here before continuing." maxLength="5000" /><small>Correct transcription mistakes only—your original audio remains unchanged. {answerTranscript.length}/5000</small></label><div className="teacher-answer-review__actions"><button type="button" className="button button--outline" onClick={recordAgain}><RotateCcw size={16} /> Record again</button><button type="button" className="button button--primary" onClick={saveRecordedAnswer}>Use answer & continue <ArrowRight size={16} /></button></div></>}
      </div>

      {error && <div className="auth-error" role="alert">{error}</div>}
      <p className="teacher-interview-privacy"><ShieldCheck size={14} /> Audio and internal notes are private and available only to the TutorPro English hiring team. The portrait is AI-generated.</p>
    </section>
  )
}
