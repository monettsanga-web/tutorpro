import { lazy, Suspense, useEffect, useState } from 'react'
import { TEACHER_SPECIALIZATIONS } from './subjects.js'
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileCheck2,
  GraduationCap,
  LockKeyhole,
  Mail,
  MonitorSmartphone,
  PenLine,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { loginAccount, registerTeacher, requestPasswordReset } from './auth.js'
import AuthProviderPicker from './AuthProviderPicker.jsx'
import OneTapLoginRow from './OneTapLoginRow.jsx'
import { oneTapProviderFor, startOneTapSignIn } from './oneTapAuth.js'
import { confirmTeacherInvite, isValidEmail, isValidOtp, normalizeOtp, setTeacherPassword } from './teacherInvites.js'

const TeacherAIInterview = lazy(() => import('./TeacherAIInterview.jsx'))
const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`
function validTeacherLogin(provider, value) {
  const login = value.trim()
  if (provider === 'gmail') return /^[^\s@]+@gmail\.com$/i.test(login)
  if (provider === 'yahoo') return /^[^\s@]+@yahoo\.[a-z.]{2,}$/i.test(login)
  if (provider === 'apple') return /^[^\s@]+@(icloud|me|mac)\.com$/i.test(login)
  if (provider === 'qq') return /^[^\s@]+@qq\.com$/i.test(login)
  if (provider === 'wechat') return /^[a-z][-_a-z0-9]{5,19}$/i.test(login)
  if (provider === 'whatsapp') return /^\+?[0-9\s()-]{8,20}$/.test(login)
  return /^\S+@\S+\.\S+$/.test(login)
}

/* ---------------------------------------------------------------------------
   WHY THE TEACHER APPLICATION IS DESKTOP-ONLY

   The application is three steps, and the third is a recorded AI interview:
   the applicant answers fourteen questions on camera and microphone while the
   recording is uploaded. On a phone that step fails often enough to be the
   difference between an application and an abandoned one — the browser has to
   hold a media stream, a WebSocket and a multi-hundred-megabyte bundle open at
   the same time, and iOS Safari drops the recording when the screen locks or
   the keyboard opens. Step 2 is not much better: a 30-character bio, an
   education field, a credential upload and two selects, all inside a modal
   that a soft keyboard covers half of.

   So a phone is told plainly, before the applicant types a single character,
   to finish on a laptop or a computer. Nothing is lost by stopping here —
   this is the first screen, so there is no half-finished application to
   abandon, and no incomplete row is ever written to `profiles`.

   Deliberately NOT blocked on a phone: teacher login, redeeming an invitation
   code and resetting a password. Those are short forms an existing teacher
   may genuinely need away from a computer, and locking them out would strand
   them. Only `register` is gated.

   The width test matches the phone breakpoint the rest of the auth CSS uses
   (760px), so the notice and the styles appear together. `pointer: coarse`
   alone would be wrong: it is true on a tablet and on a touchscreen laptop,
   and both of those can complete the interview comfortably. Rendered
   server-side there is no `window`, and a narrow desktop window is not a
   phone, so the default is "not a phone".
   --------------------------------------------------------------------------- */
const PHONE_LAYOUT_QUERY = '(max-width: 760px)'

function usePhoneLayout() {
  const [isPhone, setIsPhone] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(PHONE_LAYOUT_QUERY).matches))

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const query = window.matchMedia(PHONE_LAYOUT_QUERY)
    const apply = () => setIsPhone(query.matches)
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  return isPhone
}

function TeacherApplicationNeedsDesktop({ onLogin }) {
  return (
    <div className="device-notice" role="status">
      <span className="device-notice__icon"><MonitorSmartphone size={30} /></span>
      <span className="kicker">Teacher application</span>
      <h2 id="role-access-title">Please use a laptop or computer to apply.</h2>
      <p>
        The application ends with a recorded AI interview — about fifteen minutes of
        video and audio that has to be captured and uploaded in one sitting. Phone
        browsers interrupt that recording when the screen locks, the keyboard opens
        or a call comes in, and an interrupted interview cannot be resumed.
      </p>
      <ul>
        {/* Each item is a flex row: the tick, then ONE text span. Letting the
            words sit loose in the li would make every phrase and every
            <strong> its own flex item and lay the sentence out in columns. */}
        <li><span><Check size={14} /></span><span>Open <strong>www.tutorpro.site</strong> on a laptop or desktop computer</span></li>
        <li><span><Check size={14} /></span><span>Choose <strong>Teacher portal</strong>, then <strong>Apply as a teacher</strong></span></li>
        <li><span><Check size={14} /></span><span>Allow camera and microphone when the interview starts</span></li>
      </ul>
      <p className="device-notice__reassurance">
        You have not started an application on this phone, so there is nothing to lose
        or re-enter. Already applied, or holding an invitation code? You can sign in
        from this phone right now.
      </p>
      <button className="button button--primary button--full" type="button" onClick={onLogin}>
        Go to teacher login <ArrowRight size={17} />
      </button>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   ONE obvious way into the application, reused by every teacher screen.

   "Apply as a teacher" used to exist only as a small text link underneath the
   login form, so the portal read as a door for people who already had an
   account. It is now a real call to action above the form, and it follows the
   teacher to the invitation and password-reset screens too — an applicant who
   landed on the wrong one should not have to work out how to get back.

   `variant="inline"` is the quieter form used under an existing primary
   button, so two full-width calls to action never compete on one screen.
   On a phone this still opens the application view; that view shows the
   "use a laptop" notice rather than the form, so the entry point stays
   visible and honest instead of disappearing.
   --------------------------------------------------------------------------- */
function TeacherApplyCta({ onClick, variant = 'block' }) {
  return variant === 'inline' ? (
    <p className="auth-switch"><button type="button" onClick={onClick}>Apply as a teacher</button></p>
  ) : (
    <button className="teacher-apply-cta" type="button" onClick={onClick}>
      <span className="teacher-apply-cta__icon"><PenLine size={18} /></span>
      <span>
        <strong>Apply as a teacher</strong>
        <small>Not teaching with us yet? Start your application — profile, credentials and a short AI interview.</small>
      </span>
      <ArrowRight size={17} />
    </button>
  )
}

export default function PortalAccess({ mode, initialView = 'login', onClose, onAuthenticated, onEnterPortal, resumeIdentity = null, resumeStep = 2, notice = '' }) {
  const isAdmin = mode === 'admin'
  const isPhone = usePhoneLayout()
  /* The gate lives here rather than in the caller so that every route into the
     application — the header, the footer, the login screen, an invitation view,
     a deep link — meets the same rule. */
  const teacherApplicationBlocked = !isAdmin && isPhone
  const [view, setView] = useState(initialView)
  /* Invited teachers arrive with a code instead of a password. Supabase Auth
     owns the code itself — generation, expiry and attempt limits — so nothing
     security-sensitive is reimplemented here. */
  const [invite, setInvite] = useState({ email: '', code: '', password: '' })
  const [inviteBusy, setInviteBusy] = useState(false)

  const updateInvite = (event) => {
    const { name, value } = event.target
    setInvite((current) => ({ ...current, [name]: name === 'code' ? normalizeOtp(value) : value }))
    setError('')
  }

  const submitInviteCode = async (event) => {
    event.preventDefault()
    setError('')
    setInviteBusy(true)
    try {
      await confirmTeacherInvite({ email: invite.email, code: invite.code })
      await setTeacherPassword(invite.password)
      setView('invite-done')
    } catch (inviteError) {
      setError(inviteError.message)
    } finally {
      setInviteBusy(false)
    }
  }
  const [step, setStep] = useState(resumeIdentity ? Math.max(resumeStep || 2, 2) : 1)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [created, setCreated] = useState(null)
  const [providerNote, setProviderNote] = useState('')
  const [form, setForm] = useState({
    fullName: resumeIdentity?.fullName || '', authProvider: resumeIdentity?.provider || 'gmail', email: resumeIdentity?.email || '', password: '', confirmPassword: '',
    specialization: 'Both Curricula', bio: '', education: '', experience: '', languages: '', credentials: [],
  })

  useEffect(() => {
    const handleKeyDown = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setErrors((current) => ({ ...current, [event.target.name]: '' }))
    setError('')
  }

  const validateCredentials = () => {
    const next = {}
    if (!isAdmin && view !== 'login' && form.fullName.trim().length < 2) next.fullName = 'Enter your full name.'
    if (isAdmin && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid administrator email.'
    if (!isAdmin && view === 'login' && form.email.trim().length < 3) next.email = 'Enter your account login.'
    if (!isAdmin && view !== 'login' && !validTeacherLogin(form.authProvider, form.email)) next.email = 'Enter a valid login for the selected provider.'
    if (form.password.length < 8 || !/[0-9]/.test(form.password)) next.password = 'Use 8+ characters with a number.'
    if (view !== 'login' && form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const nextTeacherStep = (event) => {
    event.preventDefault()
    /* Belt and braces behind the gate in the render: a device that reports
       itself as a phone never advances, even if the notice were bypassed. */
    if (teacherApplicationBlocked) {
      setError('Teacher applications have to be completed on a laptop or a computer.')
      return
    }
    if (validateCredentials()) setStep(2)
  }

  const continueToInterview = (event) => {
    event.preventDefault()
    if (teacherApplicationBlocked) {
      setError('Teacher applications have to be completed on a laptop or a computer.')
      return
    }
    const next = {}
    if (form.bio.trim().length < 30) next.bio = 'Write at least 30 characters about your teaching.'
    if (!form.education.trim()) next.education = 'Add your education.'
    if (!form.experience || Number(form.experience) < 0) next.experience = 'Add your years of experience.'
    if (!form.languages.trim()) next.languages = 'Add at least one language.'
    setErrors(next)
    if (Object.keys(next).length) return
    setStep(3)
    setError('')
  }

  const completeInterview = async (interview, recordingCredentials) => {
    setSubmitting(true)
    setError('')
    try {
      const account = await registerTeacher({ ...form, interview, ...(resumeIdentity ? { oneTap: true } : {}) })
      if (recordingCredentials) {
        try {
          const { linkTeacherInterviewSession } = await import('./teacherInterviewMedia.js')
          await linkTeacherInterviewSession(recordingCredentials, account.id)
        } catch (recordingError) {
          setError(`Your application was created, but the private audio needs attention: ${recordingError.message}`)
        }
      }
      setCreated(account)
      onAuthenticated(account)
      setView('success')
    } catch (submitError) {
      setError(submitError.message)
      throw submitError
    } finally {
      setSubmitting(false)
    }
  }

  const submitLogin = async (event) => {
    event.preventDefault()
    if (!validateCredentials()) return
    setSubmitting(true)
    try {
      const account = await loginAccount(form.email, form.password)
      if (isAdmin && account.role !== 'admin') throw new Error('This login does not have administrator access.')
      if (!isAdmin && account.role !== 'teacher') throw new Error('This login is not a teacher account.')
      onAuthenticated(account)
      onEnterPortal(account)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const submitPasswordResetRequest = async (event) => {
    event.preventDefault()
    const next = {}
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter the email address on your teacher account.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSubmitting(true)
    setError('')
    try {
      await requestPasswordReset(form.email)
      setView('reset-sent')
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleFiles = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 5)
    setForm((current) => ({ ...current, credentials: files.map((file) => file.name) }))
  }

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`role-access role-access--${mode}`} role="dialog" aria-modal="true" aria-labelledby="role-access-title">
        <button className="auth-close" onClick={onClose} aria-label="Close"><X size={21} /></button>
        <aside className="role-access__story">
          <div className="role-access__logo"><img src={assetUrl('assets/tutorpro-panda-logo.webp')} alt="TutorPro Online English panda logo" /></div>
          <span className="kicker kicker--light">{isAdmin ? 'TutorPro Online English control centre' : 'Teach with TutorPro Online English'}</span>
          <h2>{isAdmin ? 'Lead every learning journey with clarity.' : 'Your expertise can unlock a child’s confidence.'}</h2>
          <p>{isAdmin ? 'One secure dashboard for teacher approvals, student access and every lesson booking.' : 'Build your profile, set your schedule and manage one-to-one lessons from a focused teacher studio.'}</p>
          <ul>{(isAdmin ? ['Approve and manage teacher access', 'Oversee students and learning profiles', 'Control every booking status'] : ['Flexible weekly availability', 'Clear booking management', 'Cambridge and Oxford learners']).map((item) => <li key={item}><span><Check size={14} /></span>{item}</li>)}</ul>
        </aside>

        <div className="role-access__panel">
          {(error || notice) && <div className="portal-error" role="alert">{error || notice}</div>}

          {!isAdmin && view === 'register' && (teacherApplicationBlocked ? (
            /* A phone never reaches the three-step form. See the note on
               usePhoneLayout above for why the application is desktop-only
               while login, invitation codes and password resets are not. */
            <TeacherApplicationNeedsDesktop onLogin={() => { setView('login'); setStep(1); setError(''); setErrors({}) }} />
          ) : (
            <>
              <div className="auth-heading"><span className="auth-heading__icon"><BriefcaseBusiness size={22} /></span><div><span>Teacher application · {step} of 3</span><h2 id="role-access-title">{step === 1 ? 'Create your teacher account' : step === 2 ? 'Build your teaching profile' : 'Complete your AI interview'}</h2><p>{step === 1 ? 'Your profile will be reviewed before bookings open.' : step === 2 ? 'Help the administrator verify your experience.' : 'A required first-round screening before application submission.'}</p></div></div>
              <div className="auth-progress auth-progress--three"><span className="complete" /><span className={step >= 2 ? 'complete' : ''} /><span className={step >= 3 ? 'complete' : ''} /></div>
              {step === 1 ? (
                <form className="auth-form" onSubmit={nextTeacherStep} noValidate>
                  <label><span>Full name</span><div className={`input-wrap ${errors.fullName ? 'input-wrap--error' : ''}`}><UserRound size={18} /><input autoFocus name="fullName" autoComplete="name" value={form.fullName} onChange={update} placeholder="Your full name" /></div>{errors.fullName && <small className="field-error">{errors.fullName}</small>}</label>
                  <AuthProviderPicker value={form.authProvider} onSelect={async (provider) => {
                    /* Gmail and Apple tiles redirect to the provider's own site;
                       the application resumes at step 2 when the teacher returns. */
                    const oneTapProvider = oneTapProviderFor(provider)
                    if (oneTapProvider) {
                      if (form.fullName.trim().length < 2) {
                        setErrors((current) => ({ ...current, fullName: 'Enter your full name first — your provider opens right after.' }))
                        return
                      }
                      setProviderNote('')
                      const result = await startOneTapSignIn(oneTapProvider, { kind: 'teacher-register', surface: 'teacher', fullName: form.fullName.trim() })
                      if (result.error) {
                        setForm((current) => ({ ...current, authProvider: provider, email: '' }))
                        setProviderNote(result.error)
                      }
                      return
                    }
                    setForm((current) => ({ ...current, authProvider: provider, email: '' }))
                  }} />
                  <OneTapLoginRow surface="teacher" variant="register" intentKind="teacher-register" note={providerNote} onNote={setProviderNote} gateMessage={form.fullName.trim().length < 2 ? 'Enter your full name first — your provider opens right after.' : ''} />
                  <label><span>{form.authProvider === 'wechat' ? 'WeChat ID' : form.authProvider === 'whatsapp' ? 'WhatsApp number' : form.authProvider === 'apple' ? 'Apple ID email' : form.authProvider === 'qq' ? 'QQ Mail address' : 'Email address'}</span><div className={`input-wrap ${errors.email ? 'input-wrap--error' : ''}`}><Mail size={18} /><input name="email" autoComplete="username" value={form.email} onChange={update} placeholder={form.authProvider === 'wechat' ? 'Your WeChat ID' : form.authProvider === 'whatsapp' ? '+63 912 345 6789' : form.authProvider === 'apple' ? 'you@icloud.com' : form.authProvider === 'qq' ? 'you@qq.com' : 'teacher@example.com'} /></div>{errors.email && <small className="field-error">{errors.email}</small>}</label>
                  <div className="auth-form__row">
                    <label><span>Password</span><div className={`input-wrap ${errors.password ? 'input-wrap--error' : ''}`}><LockKeyhole size={18} /><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={update} placeholder="8+ characters" /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{errors.password && <small className="field-error">{errors.password}</small>}</label>
                    <label><span>Confirm password</span><div className={`input-wrap ${errors.confirmPassword ? 'input-wrap--error' : ''}`}><LockKeyhole size={18} /><input name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.confirmPassword} onChange={update} placeholder="Repeat password" /></div>{errors.confirmPassword && <small className="field-error">{errors.confirmPassword}</small>}</label>
                  </div>
                  <button className="button button--primary button--full auth-submit" type="submit">Continue to teaching profile <ArrowRight size={17} /></button>
                </form>
              ) : step === 2 ? (
                <form className="auth-form teacher-profile-form" onSubmit={continueToInterview} noValidate>
                  <div className="auth-form__row"><label><span>Specialization</span><select name="specialization" value={form.specialization} onChange={update}>{TEACHER_SPECIALIZATIONS.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Years of experience</span><input className={errors.experience ? 'select-error' : ''} type="number" min="0" inputMode="numeric" autoComplete="off" name="experience" value={form.experience} onChange={update} placeholder="e.g. 5" />{errors.experience && <small className="field-error">{errors.experience}</small>}</label></div>
                  <label><span>Short teaching bio</span><textarea className={errors.bio ? 'select-error' : ''} name="bio" value={form.bio} onChange={update} placeholder="Describe your approach, experience and the learners you support…" />{errors.bio && <small className="field-error">{errors.bio}</small>}</label>
                  <div className="auth-form__row"><label><span>Education</span><input className={errors.education ? 'select-error' : ''} name="education" value={form.education} onChange={update} placeholder="Degree or qualification" />{errors.education && <small className="field-error">{errors.education}</small>}</label><label><span>Languages</span><input className={errors.languages ? 'select-error' : ''} name="languages" value={form.languages} onChange={update} placeholder="English, Filipino…" />{errors.languages && <small className="field-error">{errors.languages}</small>}</label></div>
                  <label className="credential-upload"><input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFiles} /><span><Upload size={20} /></span><div><strong>{form.credentials.length ? `${form.credentials.length} file(s) selected` : 'Upload credentials'}</strong><small>Certificates, degree or ID · PDF/JPG/PNG</small></div></label>
                  <div className="auth-form__actions"><button className="button button--outline" type="button" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button><button className="button button--primary" type="submit">Continue to AI interview <ArrowRight size={17} /></button></div>
                </form>
              ) : (
                <Suspense fallback={<div className="teacher-interview-loading"><i /><strong>Preparing TutorPro Online English Hiring Assistant…</strong></div>}><TeacherAIInterview applicant={form} onBack={() => setStep(2)} onComplete={completeInterview} submitting={submitting} /></Suspense>
              )}
              <p className="auth-switch">Already registered? <button onClick={() => { setView('login'); setStep(1); setError('') }}>Teacher login</button></p>
            </>
          ))}

          {!isAdmin && view === 'login' && (
            <><div className="auth-heading role-login-heading"><span className="auth-heading__icon"><GraduationCap size={22} /></span><div><span>Teacher studio</span><h2 id="role-access-title">Teacher login</h2><p>Manage your profile, availability and bookings.</p></div></div><TeacherApplyCta onClick={() => { setView('register'); setError(''); setErrors({}) }} /><LoginForm form={form} update={update} errors={errors} showPassword={showPassword} setShowPassword={setShowPassword} submitting={submitting} onSubmit={submitLogin} onForgot={() => { setView('reset-request'); setError(''); setErrors({}) }} /><OneTapLoginRow surface="teacher" note={providerNote} onNote={setProviderNote} /><p className="auth-switch"><button onClick={() => { setView('invite'); setError(''); setErrors({}) }}>I have an invitation code</button></p></>
          )}

          {!isAdmin && view === 'invite' && (
            <>
              <div className="auth-heading role-login-heading">
                <span className="auth-heading__icon"><GraduationCap size={22} /></span>
                <div>
                  <span>Teacher studio</span>
                  <h2 id="role-access-title">Enter your invitation code</h2>
                  <p>Your administrator emailed you a six-digit code. Enter it here and choose your own password — nobody else will know it.</p>
                </div>
              </div>
              <form className="auth-form" onSubmit={submitInviteCode} noValidate>
                <label><span>Email address</span>
                  <div className="input-wrap"><Mail size={18} />
                    <input name="email" autoComplete="username" value={invite.email} onChange={updateInvite} placeholder="The address the invitation was sent to" />
                  </div>
                </label>
                <label><span>Six-digit code</span>
                  <div className="input-wrap">
                    <input name="code" inputMode="numeric" autoComplete="one-time-code" value={invite.code} onChange={updateInvite} placeholder="123456" />
                  </div>
                </label>
                <label><span>Choose your password</span>
                  <div className="input-wrap"><LockKeyhole size={18} />
                    <input name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={invite.password} onChange={updateInvite} placeholder="At least 8 characters including a number" />
                    <button type="button" className="input-reveal" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                  </div>
                </label>
                <button
                  className="button button--primary button--full"
                  type="submit"
                  disabled={inviteBusy || !isValidEmail(invite.email) || !isValidOtp(invite.code) || invite.password.length < 8}
                >
                  {inviteBusy ? 'Confirming…' : 'Confirm and set my password'}
                </button>
              </form>
              <p className="auth-switch">Code not working? <button onClick={() => { setView('login'); setError('') }}>Back to teacher login</button></p>
              <TeacherApplyCta variant="inline" onClick={() => { setView('register'); setError(''); setErrors({}) }} />
            </>
          )}

          {!isAdmin && view === 'invite-done' && (
            <div className="role-success">
              <span><CheckCircle2 size={36} /></span>
              <span className="kicker">Account confirmed</span>
              <h2 id="role-access-title">You are all set.</h2>
              <p>Your password is saved and your email is confirmed. Your administrator needs to approve your profile before bookings open — you will be able to sign in and fill in your experience, education and biography straight away.</p>
              <button className="button button--primary button--full" onClick={() => { setView('login'); setInvite({ email: '', code: '', password: '' }) }}>Go to teacher login</button>
              <TeacherApplyCta variant="inline" onClick={() => { setView('register'); setError(''); setErrors({}) }} />
            </div>
          )}

          {!isAdmin && view === 'reset-request' && (
            <>
              <div className="auth-heading role-login-heading"><span className="auth-heading__icon"><Mail size={22} /></span><div><span>Password help</span><h2 id="role-access-title">Reset teacher password</h2><p>Enter your registered teacher email and we’ll send a secure reset link.</p></div></div>
              <form className="auth-form" onSubmit={submitPasswordResetRequest} noValidate>
                <label><span>Email address</span><div className={`input-wrap ${errors.email ? 'input-wrap--error' : ''}`}><Mail size={18} /><input autoFocus name="email" autoComplete="email" value={form.email} onChange={update} placeholder="teacher@example.com" /></div>{errors.email && <small className="field-error">{errors.email}</small>}</label>
                <button className="button button--primary button--full auth-submit" type="submit" disabled={submitting}>{submitting ? 'Sending reset link…' : 'Send reset link'} {!submitting && <ArrowRight size={17} />}</button>
              </form>
              <p className="auth-switch">Remembered your password? <button onClick={() => { setView('login'); setError(''); setErrors({}) }}>Back to teacher login</button></p>
              <TeacherApplyCta variant="inline" onClick={() => { setView('register'); setError(''); setErrors({}) }} />
            </>
          )}

          {!isAdmin && view === 'reset-sent' && (
            <div className="role-success"><span><CheckCircle2 size={36} /></span><span className="kicker">Reset link sent</span><h2 id="role-access-title">Check your email.</h2><p>If that teacher email is registered, you’ll receive a secure password reset link. Open the link and create your new password.</p><button className="button button--primary button--full" onClick={() => setView('login')}>Back to teacher login</button>
              <TeacherApplyCta variant="inline" onClick={() => { setView('register'); setError(''); setErrors({}) }} /></div>
          )}

          {!isAdmin && view === 'success' && created && (
            <div className="role-success"><span><CheckCircle2 size={36} /></span><span className="kicker">Application received</span><h2 id="role-access-title">Your teacher studio is ready.</h2><p>The administrator can now review your profile, credentials, reviewed transcript and recorded AI interview. You can open your dashboard while approval is pending.</p><div><FileCheck2 size={20} /><span><strong>Profile and recorded interview</strong><small>{created.teacher?.interview?.recordingStatus === 'securely-uploaded' ? 'Audio secured · Pending administrator review' : 'Transcript saved · Audio storage setup pending'}</small></span></div><button className="button button--primary button--full" onClick={() => onEnterPortal(created)}>Open teacher dashboard <ArrowRight size={17} /></button></div>
          )}

          {isAdmin && (
            <>
              <div className="auth-heading role-login-heading"><span className="auth-heading__icon auth-heading__icon--admin"><ShieldCheck size={22} /></span><div><span>Restricted access</span><h2 id="role-access-title">Administrator login</h2><p>Sign in with the administrator account configured in Supabase.</p></div></div>
              <form className="auth-form" onSubmit={submitLogin} noValidate>
                <label><span>Administrator email</span><div className={`input-wrap ${errors.email ? 'input-wrap--error' : ''}`}><Mail size={18} /><input autoFocus name="email" type="email" autoComplete="email" value={form.email} onChange={update} placeholder="Enter administrator email" /></div>{errors.email && <small className="field-error">{errors.email}</small>}</label>
                <label><span>Password</span><div className={`input-wrap ${errors.password ? 'input-wrap--error' : ''}`}><LockKeyhole size={18} /><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={update} placeholder="Your admin password" /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{errors.password && <small className="field-error">{errors.password}</small>}</label>
                <button className="button button--primary button--full auth-submit" type="submit" disabled={submitting}>{submitting ? 'Logging in…' : 'Open admin dashboard'} {!submitting && <ArrowRight size={17} />}</button>
              </form>
              <div className="admin-security-note"><ShieldCheck size={17} /><span><strong>Administrator-only area</strong><small>This device authenticates directly with Supabase.</small></span></div>
            </>
          )}        </div>
      </section>
    </div>
  )
}

function LoginForm({ form, update, errors, showPassword, setShowPassword, submitting, onSubmit, onForgot }) {
  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <label><span>Email, WeChat ID or WhatsApp number</span><div className={`input-wrap ${errors.email ? 'input-wrap--error' : ''}`}><Mail size={18} /><input autoFocus name="email" autoComplete="username" value={form.email} onChange={update} placeholder="Enter your account login" /></div>{errors.email && <small className="field-error">{errors.email}</small>}</label>
      <label><span>Password</span><div className={`input-wrap ${errors.password ? 'input-wrap--error' : ''}`}><LockKeyhole size={18} /><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={update} placeholder="Your password" /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{errors.password && <small className="field-error">{errors.password}</small>}</label>
      <button className="button button--primary button--full auth-submit" type="submit" disabled={submitting}>{submitting ? 'Logging in…' : 'Open teacher dashboard'} {!submitting && <ArrowRight size={17} />}</button>
      {onForgot && <p className="auth-switch auth-switch--compact"><button type="button" onClick={onForgot}>Forgot password?</button></p>}
    </form>
  )
}
