import { useEffect, useState } from 'react'
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
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { hasAdminAccount, loginAccount, registerAdmin, registerTeacher } from './auth.js'

const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`
const teacherProviders = [
  ['gmail', 'Gmail', 'G'], ['yahoo', 'Yahoo', 'Y!'], ['wechat', 'WeChat', 'We'], ['whatsapp', 'WhatsApp', 'WA'], ['email', 'Other email', '@'],
]

function validTeacherLogin(provider, value) {
  const login = value.trim()
  if (provider === 'gmail') return /^[^\s@]+@gmail\.com$/i.test(login)
  if (provider === 'yahoo') return /^[^\s@]+@yahoo\.[a-z.]{2,}$/i.test(login)
  if (provider === 'wechat') return /^[a-z][-_a-z0-9]{5,19}$/i.test(login)
  if (provider === 'whatsapp') return /^\+?[0-9\s()-]{8,20}$/.test(login)
  return /^\S+@\S+\.\S+$/.test(login)
}

export default function PortalAccess({ mode, onClose, onAuthenticated, onEnterPortal }) {
  const isAdmin = mode === 'admin'
  const [view, setView] = useState(isAdmin ? (hasAdminAccount() ? 'login' : 'setup') : 'register')
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [created, setCreated] = useState(null)
  const [form, setForm] = useState({
    fullName: '', authProvider: 'gmail', email: '', password: '', confirmPassword: '',
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
    if (validateCredentials()) setStep(2)
  }

  const submitTeacher = async (event) => {
    event.preventDefault()
    const next = {}
    if (form.bio.trim().length < 30) next.bio = 'Write at least 30 characters about your teaching.'
    if (!form.education.trim()) next.education = 'Add your education.'
    if (!form.experience || Number(form.experience) < 0) next.experience = 'Add your years of experience.'
    if (!form.languages.trim()) next.languages = 'Add at least one language.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    try {
      const account = await registerTeacher(form)
      setCreated(account)
      onAuthenticated(account)
      setView('success')
    } catch (submitError) {
      setError(submitError.message)
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

  const submitAdminSetup = async (event) => {
    event.preventDefault()
    if (!validateCredentials()) return
    setSubmitting(true)
    try {
      const account = await registerAdmin(form.email, form.password)
      onAuthenticated(account)
      onEnterPortal(account)
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
          <div className="role-access__logo"><img src={assetUrl('assets/tutorpro-panda-logo.webp')} alt="TutorPro English panda logo" /></div>
          <span className="kicker kicker--light">{isAdmin ? 'TutorPro English control centre' : 'Teach with TutorPro English'}</span>
          <h2>{isAdmin ? 'Lead every learning journey with clarity.' : 'Your expertise can unlock a child’s confidence.'}</h2>
          <p>{isAdmin ? 'One secure dashboard for teacher approvals, student access and every lesson booking.' : 'Build your profile, set your schedule and manage one-to-one lessons from a focused teacher studio.'}</p>
          <ul>{(isAdmin ? ['Approve and manage teacher access', 'Oversee students and learning profiles', 'Control every booking status'] : ['Flexible weekly availability', 'Clear booking management', 'Cambridge and Oxford learners']).map((item) => <li key={item}><span><Check size={14} /></span>{item}</li>)}</ul>
        </aside>

        <div className="role-access__panel">
          {error && <div className="portal-error" role="alert">{error}</div>}

          {!isAdmin && view === 'register' && (
            <>
              <div className="auth-heading"><span className="auth-heading__icon"><BriefcaseBusiness size={22} /></span><div><span>Teacher application · {step} of 2</span><h2 id="role-access-title">{step === 1 ? 'Create your teacher account' : 'Build your teaching profile'}</h2><p>{step === 1 ? 'Your profile will be reviewed before bookings open.' : 'Help the administrator verify your experience.'}</p></div></div>
              <div className="auth-progress"><span className="complete" /><span className={step === 2 ? 'complete' : ''} /></div>
              {step === 1 ? (
                <form className="auth-form" onSubmit={nextTeacherStep} noValidate>
                  <label><span>Full name</span><div className={`input-wrap ${errors.fullName ? 'input-wrap--error' : ''}`}><UserRound size={18} /><input autoFocus name="fullName" autoComplete="name" value={form.fullName} onChange={update} placeholder="Your full name" /></div>{errors.fullName && <small className="field-error">{errors.fullName}</small>}</label>
                  <fieldset className="provider-picker"><legend>Choose how to sign in</legend><div>{teacherProviders.map(([id, label, mark]) => <button type="button" className={form.authProvider === id ? 'active' : ''} onClick={() => setForm((current) => ({ ...current, authProvider: id, email: '' }))} key={id}><span>{mark}</span>{label}</button>)}</div></fieldset>
                  <label><span>{form.authProvider === 'wechat' ? 'WeChat ID' : form.authProvider === 'whatsapp' ? 'WhatsApp number' : 'Email address'}</span><div className={`input-wrap ${errors.email ? 'input-wrap--error' : ''}`}><Mail size={18} /><input name="email" autoComplete="username" value={form.email} onChange={update} placeholder={form.authProvider === 'wechat' ? 'Your WeChat ID' : form.authProvider === 'whatsapp' ? '+63 912 345 6789' : 'teacher@example.com'} /></div>{errors.email && <small className="field-error">{errors.email}</small>}</label>
                  <div className="auth-form__row">
                    <label><span>Password</span><div className={`input-wrap ${errors.password ? 'input-wrap--error' : ''}`}><LockKeyhole size={18} /><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={update} placeholder="8+ characters" /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{errors.password && <small className="field-error">{errors.password}</small>}</label>
                    <label><span>Confirm password</span><div className={`input-wrap ${errors.confirmPassword ? 'input-wrap--error' : ''}`}><LockKeyhole size={18} /><input name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.confirmPassword} onChange={update} placeholder="Repeat password" /></div>{errors.confirmPassword && <small className="field-error">{errors.confirmPassword}</small>}</label>
                  </div>
                  <button className="button button--primary button--full auth-submit" type="submit">Continue to teaching profile <ArrowRight size={17} /></button>
                </form>
              ) : (
                <form className="auth-form teacher-profile-form" onSubmit={submitTeacher} noValidate>
                  <div className="auth-form__row"><label><span>Specialization</span><select name="specialization" value={form.specialization} onChange={update}><option>Both Curricula</option><option>Cambridge</option><option>Oxford</option></select></label><label><span>Years of experience</span><input className={errors.experience ? 'select-error' : ''} type="number" min="0" name="experience" value={form.experience} onChange={update} placeholder="e.g. 5" />{errors.experience && <small className="field-error">{errors.experience}</small>}</label></div>
                  <label><span>Short teaching bio</span><textarea className={errors.bio ? 'select-error' : ''} name="bio" value={form.bio} onChange={update} placeholder="Describe your approach, experience and the learners you support…" />{errors.bio && <small className="field-error">{errors.bio}</small>}</label>
                  <div className="auth-form__row"><label><span>Education</span><input className={errors.education ? 'select-error' : ''} name="education" value={form.education} onChange={update} placeholder="Degree or qualification" />{errors.education && <small className="field-error">{errors.education}</small>}</label><label><span>Languages</span><input className={errors.languages ? 'select-error' : ''} name="languages" value={form.languages} onChange={update} placeholder="English, Filipino…" />{errors.languages && <small className="field-error">{errors.languages}</small>}</label></div>
                  <label className="credential-upload"><input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFiles} /><span><Upload size={20} /></span><div><strong>{form.credentials.length ? `${form.credentials.length} file(s) selected` : 'Upload credentials'}</strong><small>Certificates, degree or ID · PDF/JPG/PNG</small></div></label>
                  <div className="auth-form__actions"><button className="button button--outline" type="button" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button><button className="button button--primary" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit application'} {!submitting && <ArrowRight size={17} />}</button></div>
                </form>
              )}
              <p className="auth-switch">Already registered? <button onClick={() => { setView('login'); setStep(1); setError('') }}>Teacher login</button></p>
            </>
          )}

          {!isAdmin && view === 'login' && (
            <><div className="auth-heading role-login-heading"><span className="auth-heading__icon"><GraduationCap size={22} /></span><div><span>Teacher studio</span><h2 id="role-access-title">Teacher login</h2><p>Manage your profile, availability and bookings.</p></div></div><LoginForm form={form} update={update} errors={errors} showPassword={showPassword} setShowPassword={setShowPassword} submitting={submitting} onSubmit={submitLogin} /><p className="auth-switch">New to TutorPro English? <button onClick={() => { setView('register'); setError('') }}>Apply as a teacher</button></p></>
          )}

          {!isAdmin && view === 'success' && created && (
            <div className="role-success"><span><CheckCircle2 size={36} /></span><span className="kicker">Application received</span><h2 id="role-access-title">Your teacher studio is ready.</h2><p>The administrator can now review your profile and credentials. You can open your dashboard while approval is pending.</p><div><FileCheck2 size={20} /><span><strong>Profile status</strong><small>Pending administrator review</small></span></div><button className="button button--primary button--full" onClick={() => onEnterPortal(created)}>Open teacher dashboard <ArrowRight size={17} /></button></div>
          )}

          {isAdmin && (
            <>
              <div className="auth-heading role-login-heading"><span className="auth-heading__icon auth-heading__icon--admin"><ShieldCheck size={22} /></span><div><span>{view === 'setup' ? 'First-time secure setup' : 'Restricted access'}</span><h2 id="role-access-title">{view === 'setup' ? 'Create the admin account' : 'Administrator login'}</h2><p>{view === 'setup' ? 'Set the password for the locked administrator email.' : 'Manage teachers, students and bookings.'}</p></div></div>
              <form className="auth-form" onSubmit={view === 'setup' ? submitAdminSetup : submitLogin} noValidate>
                <label><span>Administrator email</span><div className={`input-wrap ${errors.email ? 'input-wrap--error' : ''}`}><Mail size={18} /><input autoFocus name="email" type="email" autoComplete="email" value={form.email} onChange={update} placeholder="Enter administrator email" /></div>{errors.email && <small className="field-error">{errors.email}</small>}</label>
                <label><span>Password</span><div className={`input-wrap ${errors.password ? 'input-wrap--error' : ''}`}><LockKeyhole size={18} /><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={view === 'setup' ? 'new-password' : 'current-password'} value={form.password} onChange={update} placeholder={view === 'setup' ? 'Create a strong password' : 'Your admin password'} /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{errors.password && <small className="field-error">{errors.password}</small>}</label>
                {view === 'setup' && <label><span>Confirm password</span><div className={`input-wrap ${errors.confirmPassword ? 'input-wrap--error' : ''}`}><LockKeyhole size={18} /><input name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.confirmPassword} onChange={update} placeholder="Repeat admin password" /></div>{errors.confirmPassword && <small className="field-error">{errors.confirmPassword}</small>}</label>}
                <button className="button button--primary button--full auth-submit" type="submit" disabled={submitting}>{submitting ? 'Please wait…' : view === 'setup' ? 'Create secure admin account' : 'Open admin dashboard'} {!submitting && <ArrowRight size={17} />}</button>
              </form>
              <div className="admin-security-note"><ShieldCheck size={17} /><span><strong>Administrator-only area</strong><small>All platform controls are available after login.</small></span></div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function LoginForm({ form, update, errors, showPassword, setShowPassword, submitting, onSubmit }) {
  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <label><span>Email, WeChat ID or WhatsApp number</span><div className={`input-wrap ${errors.email ? 'input-wrap--error' : ''}`}><Mail size={18} /><input autoFocus name="email" autoComplete="username" value={form.email} onChange={update} placeholder="Enter your account login" /></div>{errors.email && <small className="field-error">{errors.email}</small>}</label>
      <label><span>Password</span><div className={`input-wrap ${errors.password ? 'input-wrap--error' : ''}`}><LockKeyhole size={18} /><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={update} placeholder="Your password" /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{errors.password && <small className="field-error">{errors.password}</small>}</label>
      <button className="button button--primary button--full auth-submit" type="submit" disabled={submitting}>{submitting ? 'Logging in…' : 'Open teacher dashboard'} {!submitting && <ArrowRight size={17} />}</button>
    </form>
  )
}
