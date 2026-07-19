import { useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, Clock3, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { supabase } from './supabaseClient.js'

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
    englishBand === 'Needs Review' ? 'Written communication needs closer human review' : '',
    demoBand === 'Weak' ? 'Micro-demo response was too brief for a reliable teaching assessment' : '',
  ].filter(Boolean)
  return {
    source: 'structured-fallback',
    applicantName: applicant.fullName,
    selfReportedExperience: `${applicant.experience || 0} years; ${applicant.specialization || 'specialization not stated'}`,
    certificationsMentioned: [...new Set(credentials.map((item) => item))],
    englishProficiency: { band: englishBand, justification: `Average response length was ${averageWords} words. A human reviewer should verify spoken fluency and pronunciation in a live interview.` },
    teachingApproach: pedagogySignals.length ? 'The applicant described student support, examples, practice, correction, and/or adaptation strategies.' : 'The transcript contains limited evidence of a structured teaching method.',
    liveDemo: { band: demoBand, prompt: microDemoPrompt, justification: `The micro-demo contained ${demoAnswer.split(/\s+/).filter(Boolean).length} words and should be reviewed for correctness and clarity.` },
    strengths,
    concerns,
    availability: transcript.find((item) => item.stage === 'Platform fit & logistics')?.answer || 'Not stated',
    overallRecommendation: recommendation,
    suggestedNextStep: recommendation === 'Strong Hire' ? 'Move to a live demo lesson and credential verification.' : recommendation.startsWith('Consider') ? 'Human interview to verify credentials, spoken English, and teaching experience.' : 'Human review before sending a polite application decision.',
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

export default function TeacherAIInterview({ applicant, onBack, onComplete, submitting = false }) {
  const microDemoPrompt = useMemo(() => {
    const applicantKey = String(applicant.fullName || applicant.email || 'TutorPro applicant')
    const promptIndex = [...applicantKey].reduce((total, character) => total + character.charCodeAt(0), 0) % microDemoPrompts.length
    return microDemoPrompts[promptIndex]
  }, [applicant.email, applicant.fullName])
  const questions = useMemo(() => buildQuestions(microDemoPrompt), [microDemoPrompt])
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState('')
  const [transcript, setTranscript] = useState([])
  const [finished, setFinished] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError] = useState('')
  const startedAtRef = useRef(0)
  const current = questions[index]

  const begin = () => {
    startedAtRef.current = Date.now()
    setStarted(true)
  }

  const answerQuestion = (event) => {
    event.preventDefault()
    const answer = draft.trim()
    if (answer.length < 8) {
      setError('Please give a complete answer before continuing.')
      return
    }
    const nextTranscript = [...transcript, { stage: current.stage, question: current.question, answer }]
    setTranscript(nextTranscript)
    setDraft('')
    setError('')
    if (index === questions.length - 1) setFinished(true)
    else setIndex((value) => value + 1)
  }

  const submitCompletedInterview = async () => {
    setEvaluating(true)
    setError('')
    try {
      const evaluation = await evaluateInterview(applicant, transcript, microDemoPrompt, startedAtRef.current)
      await onComplete(evaluation)
    } catch (submitError) {
      setError(submitError.message)
      setEvaluating(false)
    }
  }

  if (!started) {
    return (
      <section className="teacher-ai-interview teacher-ai-interview--welcome">
        <span className="teacher-ai-avatar"><Bot size={34} /></span>
        <span className="kicker">Required first-round interview</span>
        <h2>TutorPro English Hiring Assistant</h2>
        <p>I’m an AI assistant conducting the first-round screening. This is a short conversation of approximately 10–15 minutes covering your background, English communication, teaching approach, a micro-demo and availability. A real member of the TutorPro English team will review your responses afterward.</p>
        <div><span><Clock3 size={17} /> 10–15 minutes</span><span><ShieldCheck size={17} /> Private hiring review</span><span><Sparkles size={17} /> One question at a time</span></div>
        <button type="button" className="button button--primary" onClick={begin}>Start AI interview <ArrowRight size={17} /></button>
        <button type="button" className="teacher-interview-back" onClick={onBack}><ArrowLeft size={16} /> Back to teaching profile</button>
      </section>
    )
  }

  if (finished) {
    return (
      <section className="teacher-ai-interview teacher-ai-interview--complete">
        <span className="teacher-ai-avatar complete"><CheckCircle2 size={35} /></span>
        <span className="kicker">Interview complete</span>
        <h2>Thank you, {applicant.fullName}.</h2>
        <p>Your responses are ready for the TutorPro English hiring team. A real team member will review your application, credentials and interview before following up. Compensation and platform policy details will be discussed by a human recruiter if you move forward.</p>
        <div className="teacher-interview-complete-summary"><strong>{transcript.length}</strong><span>questions completed</span><strong>100%</strong><span>interview progress</span></div>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button type="button" className="button button--primary button--full" onClick={submitCompletedInterview} disabled={evaluating || submitting}>{evaluating || submitting ? 'Submitting interview and application…' : 'Submit completed application'} <Send size={16} /></button>
      </section>
    )
  }

  return (
    <section className="teacher-ai-interview teacher-ai-interview--question">
      <div className="teacher-interview-top"><span><Bot size={21} /></span><div><small>TutorPro English Hiring Assistant</small><strong>{current.stage}</strong></div><em>{index + 1} / {questions.length}</em></div>
      <div className="teacher-interview-progress"><span style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
      <div className="teacher-interview-question"><small>Question {index + 1}</small><h2>{current.question}</h2></div>
      <form onSubmit={answerQuestion}>
        <label><span>Your answer</span><textarea autoFocus value={draft} onChange={(event) => { setDraft(event.target.value); setError('') }} placeholder="Write a clear and complete answer…" maxLength="2500" /></label>
        <div><small>{draft.length}/2500 characters · Your response is saved when you continue.</small><button type="submit" className="button button--primary" disabled={!draft.trim()}>Save & continue <ArrowRight size={16} /></button></div>
      </form>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <p className="teacher-interview-privacy"><ShieldCheck size={14} /> Interview scoring and internal notes are shown only to the TutorPro English hiring team.</p>
    </section>
  )
}
