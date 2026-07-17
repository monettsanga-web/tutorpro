import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { loginAccount, logoutAccount, registerAccount } from './auth.js'

const yearOptions = [
  'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6',
  'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11',
]

const signUpProviders = [
  { id: 'gmail', label: 'Gmail', mark: 'G' },
  { id: 'yahoo', label: 'Yahoo Mail', mark: 'Y!' },
  { id: 'wechat', label: 'WeChat', mark: 'We' },
  { id: 'whatsapp', label: 'WhatsApp', mark: 'WA' },
  { id: 'email', label: 'Other email', mark: '@' },
]

function providerField(provider) {
  if (provider === 'wechat') return { label: 'WeChat ID', placeholder: 'Your WeChat ID', inputMode: 'text' }
  if (provider === 'whatsapp') return { label: 'WhatsApp number', placeholder: '+63 912 345 6789', inputMode: 'tel' }
  return { label: provider === 'gmail' ? 'Gmail address' : provider === 'yahoo' ? 'Yahoo Mail address' : 'Email address', placeholder: provider === 'gmail' ? 'you@gmail.com' : provider === 'yahoo' ? 'you@yahoo.com' : 'you@example.com', inputMode: 'email' }
}

function validProviderLogin(provider, value) {
  const login = value.trim()
  if (provider === 'gmail') return /^[^\s@]+@gmail\.com$/i.test(login)
  if (provider === 'yahoo') return /^[^\s@]+@yahoo\.[a-z.]{2,}$/i.test(login)
  if (provider === 'wechat') return /^[a-z][-_a-z0-9]{5,19}$/i.test(login)
  if (provider === 'whatsapp') return /^\+?[0-9\s()-]{8,20}$/.test(login)
  return /^\S+@\S+\.\S+$/.test(login)
}

const initialForm = {
  parentName: '',
  authProvider: 'gmail',
  email: '',
  password: '',
  confirmPassword: '',
  childName: '',
  year: '',
  curriculum: '',
  goal: '',
  frequency: '',
  terms: false,
}

function FieldError({ children }) {
  if (!children) return null
  return <span className="field-error">{children}</span>
}

export default function AuthModal({
  initialMode = 'register',
  selectedPlan = '',
  preferredTeacher = null,
  currentAccount,
  onClose,
  onAuthenticated,
  onExplore,
  onEnterPortal,
  onTeacherAccess,
}) {
  const [view, setView] = useState(initialMode)
  const [registerStep, setRegisterStep] = useState(1)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [createdAccount, setCreatedAccount] = useState(null)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const updateField = (event) => {
    const { name, value, checked, type } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setFormError('')
  }

  const validateAccountStep = () => {
    const nextErrors = {}
    if (form.parentName.trim().length < 2) nextErrors.parentName = 'Enter your full name.'
    if (!validProviderLogin(form.authProvider, form.email)) nextErrors.email = `Enter a valid ${providerField(form.authProvider).label.toLowerCase()}.`
    if (form.password.length < 8) nextErrors.password = 'Use at least 8 characters.'
    else if (!/[0-9]/.test(form.password)) nextErrors.password = 'Add at least one number.'
    if (form.confirmPassword !== form.password) nextErrors.confirmPassword = 'Passwords do not match.'
    if (!form.terms) nextErrors.terms = 'Please confirm you are the parent or guardian.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const validateStudentStep = () => {
    const nextErrors = {}
    if (form.childName.trim().length < 2) nextErrors.childName = 'Enter the student’s name.'
    if (!form.year) nextErrors.year = 'Choose a school year.'
    if (!form.curriculum) nextErrors.curriculum = 'Choose a curriculum.'
    if (!form.goal) nextErrors.goal = 'Choose a learning goal.'
    if (!form.frequency) nextErrors.frequency = 'Choose a lesson rhythm.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const continueRegistration = (event) => {
    event.preventDefault()
    if (validateAccountStep()) {
      setRegisterStep(2)
      setErrors({})
    }
  }

  const completeRegistration = async (event) => {
    event.preventDefault()
    if (!validateStudentStep()) return
    setIsSubmitting(true)
    setFormError('')
    try {
      const account = await registerAccount({ ...form, selectedPlan, preferredTeacherId: preferredTeacher?.id || '' })
      setCreatedAccount(account)
      onAuthenticated(account)
      setView('success')
    } catch (error) {
      setFormError(error.message)
      if (error.message.includes('already exists')) setRegisterStep(1)
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitLogin = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (form.email.trim().length < 3) nextErrors.email = 'Enter your email, WeChat ID or WhatsApp number.'
    if (!form.password) nextErrors.password = 'Enter your password.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setIsSubmitting(true)
    setFormError('')
    try {
      const account = await loginAccount(form.email, form.password)
      onAuthenticated(account)
      onEnterPortal(account)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const switchView = (nextView) => {
    setView(nextView)
    setRegisterStep(1)
    setErrors({})
    setFormError('')
  }

  const handleLogout = () => {
    logoutAccount()
    onAuthenticated(null)
    switchView('login')
  }

  const activeAccount = createdAccount || currentAccount

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="auth-shell" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="auth-close" onClick={onClose} aria-label="Close registration"><X size={21} /></button>

        <aside className="auth-story">
          <div className="auth-story__brand">
            <span><BookOpen size={22} /></span>
            <strong>Tutor<span>Pro</span></strong>
          </div>
          <div className="auth-story__content">
            <span className="kicker kicker--light">Your learning space</span>
            <h2>Big confidence starts with a small first step.</h2>
            <p>Create your family account and tell us what would make the biggest difference for your child.</p>
            <ul>
              <li><span><Check size={15} /></span> Free first one-to-one class</li>
              <li><span><Check size={15} /></span> Cambridge & Oxford aligned</li>
              <li><span><Check size={15} /></span> A plan shaped around your child</li>
            </ul>
          </div>
          <div className="auth-story__quote">
            <Sparkles size={18} />
            <p>“A place to ask questions, practise freely and feel proud of every step forward.”</p>
          </div>
          <i className="auth-orbit auth-orbit--one" />
          <i className="auth-orbit auth-orbit--two" />
        </aside>

        <div className="auth-panel">
          {view === 'register' && (
            <>
              <div className="auth-heading">
                <span className="auth-heading__icon"><UserRound size={22} /></span>
                <div>
                  <span>{registerStep === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}</span>
                  <h2 id="auth-title">{registerStep === 1 ? 'Create your account' : 'Tell us about your learner'}</h2>
                  <p>{registerStep === 1 ? 'Start free. No card or commitment needed.' : 'We’ll use this to shape the right first lesson.'}</p>
                </div>
              </div>

              <div className="auth-progress" aria-label={`Registration step ${registerStep} of 2`}>
                <span className="complete" />
                <span className={registerStep === 2 ? 'complete' : ''} />
              </div>

              {formError && <div className="auth-alert" role="alert">{formError}</div>}

              {registerStep === 1 ? (
                <form className="auth-form" onSubmit={continueRegistration} noValidate>
                  <label>
                    <span>Parent or guardian name</span>
                    <div className={`input-wrap ${errors.parentName ? 'input-wrap--error' : ''}`}>
                      <UserRound size={18} /><input autoFocus autoComplete="name" name="parentName" value={form.parentName} onChange={updateField} placeholder="Your full name" />
                    </div>
                    <FieldError>{errors.parentName}</FieldError>
                  </label>
                  <fieldset className="provider-picker">
                    <legend>Choose how to sign in</legend>
                    <div>{signUpProviders.map((provider) => <button type="button" className={form.authProvider === provider.id ? 'active' : ''} onClick={() => { setForm((current) => ({ ...current, authProvider: provider.id, email: '' })); setErrors((current) => ({ ...current, email: '' })) }} key={provider.id}><span>{provider.mark}</span>{provider.label}</button>)}</div>
                  </fieldset>
                  <label>
                    <span>{providerField(form.authProvider).label}</span>
                    <div className={`input-wrap ${errors.email ? 'input-wrap--error' : ''}`}>
                      <Mail size={18} /><input autoComplete={['gmail', 'yahoo', 'email'].includes(form.authProvider) ? 'email' : 'username'} inputMode={providerField(form.authProvider).inputMode} name="email" value={form.email} onChange={updateField} placeholder={providerField(form.authProvider).placeholder} />
                    </div>
                    <FieldError>{errors.email}</FieldError>
                  </label>
                  <div className="auth-form__row">
                    <label>
                      <span>Password</span>
                      <div className={`input-wrap ${errors.password ? 'input-wrap--error' : ''}`}>
                        <LockKeyhole size={18} /><input autoComplete="new-password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={updateField} placeholder="8+ characters" />
                        <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                      </div>
                      <FieldError>{errors.password}</FieldError>
                    </label>
                    <label>
                      <span>Confirm password</span>
                      <div className={`input-wrap ${errors.confirmPassword ? 'input-wrap--error' : ''}`}>
                        <LockKeyhole size={18} /><input autoComplete="new-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={updateField} placeholder="Repeat password" />
                      </div>
                      <FieldError>{errors.confirmPassword}</FieldError>
                    </label>
                  </div>
                  <label className="check-field">
                    <input type="checkbox" name="terms" checked={form.terms} onChange={updateField} />
                    <span>I confirm I am registering this student as their parent or guardian.</span>
                  </label>
                  <FieldError>{errors.terms}</FieldError>
                  <button className="button button--primary button--full auth-submit" type="submit">
                    Continue to student profile <ArrowRight size={17} />
                  </button>
                </form>
              ) : (
                <form className="auth-form" onSubmit={completeRegistration} noValidate>
                  <label>
                    <span>Student’s first name</span>
                    <div className={`input-wrap ${errors.childName ? 'input-wrap--error' : ''}`}>
                      <GraduationCap size={18} /><input autoFocus autoComplete="off" name="childName" value={form.childName} onChange={updateField} placeholder="First name" />
                    </div>
                    <FieldError>{errors.childName}</FieldError>
                  </label>
                  <div className="auth-form__row">
                    <label>
                      <span>School year</span>
                      <select className={errors.year ? 'select-error' : ''} name="year" value={form.year} onChange={updateField}>
                        <option value="">Choose year</option>
                        {yearOptions.map((year) => <option key={year}>{year}</option>)}
                      </select>
                      <FieldError>{errors.year}</FieldError>
                    </label>
                    <label>
                      <span>Curriculum</span>
                      <select className={errors.curriculum ? 'select-error' : ''} name="curriculum" value={form.curriculum} onChange={updateField}>
                        <option value="">Choose curriculum</option>
                        <option>Cambridge</option>
                        <option>Oxford</option>
                        <option>Not sure yet</option>
                      </select>
                      <FieldError>{errors.curriculum}</FieldError>
                    </label>
                  </div>
                  <label>
                    <span>Main learning goal</span>
                    <select className={errors.goal ? 'select-error' : ''} name="goal" value={form.goal} onChange={updateField}>
                      <option value="">What should we focus on?</option>
                      <option>Speaking with confidence</option>
                      <option>Reading comprehension</option>
                      <option>Writing and grammar</option>
                      <option>Schoolwork and exam support</option>
                      <option>Build an all-round foundation</option>
                    </select>
                    <FieldError>{errors.goal}</FieldError>
                  </label>
                  <fieldset className="frequency-field">
                    <legend>Preferred lesson rhythm</legend>
                    <div>
                      {['1–2 weekly', '4–5 weekly', 'Not sure'].map((frequency) => (
                        <label key={frequency} className={form.frequency === frequency ? 'selected' : ''}>
                          <input type="radio" name="frequency" value={frequency} checked={form.frequency === frequency} onChange={updateField} />
                          <span>{frequency}</span>
                        </label>
                      ))}
                    </div>
                    <FieldError>{errors.frequency}</FieldError>
                  </fieldset>
                  {preferredTeacher && <div className="selected-teacher"><UserRound size={16} /><span><strong>{preferredTeacher.fullName} selected</strong><small>{preferredTeacher.teacher.specialization}</small></span></div>}
                  {selectedPlan && <div className="selected-plan"><Sparkles size={16} /> {selectedPlan} plan selected</div>}
                  <div className="auth-form__actions">
                    <button className="button button--outline" type="button" onClick={() => setRegisterStep(1)}><ArrowLeft size={16} /> Back</button>
                    <button className="button button--primary" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating account…' : 'Create my free account'} {!isSubmitting && <ArrowRight size={17} />}
                    </button>
                  </div>
                </form>
              )}
              <p className="auth-switch">Already have an account? <button onClick={() => switchView('login')}>Log in</button></p>
              <button className="auth-role-link" onClick={onTeacherAccess}><GraduationCap size={16} /> Applying as a teacher? Open teacher registration</button>
            </>
          )}

          {view === 'login' && (
            <>
              <div className="auth-heading auth-heading--compact">
                <span className="auth-heading__icon"><LockKeyhole size={22} /></span>
                <div>
                  <span>Welcome back</span>
                  <h2 id="auth-title">Log in to TutorPro</h2>
                  <p>Pick up where your learner left off.</p>
                </div>
              </div>
              {formError && <div className="auth-alert" role="alert">{formError}</div>}
              <form className="auth-form auth-form--login" onSubmit={submitLogin} noValidate>
                <label>
                  <span>Email, WeChat ID or WhatsApp number</span>
                  <div className={`input-wrap ${errors.email ? 'input-wrap--error' : ''}`}>
                    <Mail size={18} /><input autoFocus autoComplete="username" name="email" value={form.email} onChange={updateField} placeholder="Enter your account login" />
                  </div>
                  <FieldError>{errors.email}</FieldError>
                </label>
                <label>
                  <span>Password</span>
                  <div className={`input-wrap ${errors.password ? 'input-wrap--error' : ''}`}>
                    <LockKeyhole size={18} /><input autoComplete="current-password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={updateField} placeholder="Your password" />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                  </div>
                  <FieldError>{errors.password}</FieldError>
                </label>
                <button className="button button--primary button--full auth-submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Logging in…' : 'Log in'} {!isSubmitting && <ArrowRight size={17} />}
                </button>
              </form>
              <div className="auth-security"><ShieldCheck size={17} /> Your password is never stored as plain text.</div>
              <p className="auth-switch">New to TutorPro? <button onClick={() => switchView('register')}>Create a free account</button></p>
              <button className="auth-role-link" onClick={onTeacherAccess}><GraduationCap size={16} /> Teacher registration and login</button>
            </>
          )}

          {view === 'success' && activeAccount && (
            <div className="auth-result">
              <div className="auth-confetti" aria-hidden="true"><i /><i /><i /><i /><i /></div>
              <span className="auth-result__icon"><CheckCircle2 size={35} /></span>
              <span className="kicker">You’re all set</span>
              <h2 id="auth-title">Welcome to TutorPro, {activeAccount.parentName.split(' ')[0]}!</h2>
              <p>{activeAccount.child.name}’s learning profile is ready. You can now explore the plan that best fits your family.</p>
              <div className="account-summary">
                <div><span>Student</span><strong>{activeAccount.child.name}</strong></div>
                <div><span>Level</span><strong>{activeAccount.child.year}</strong></div>
                <div><span>Curriculum</span><strong>{activeAccount.child.curriculum}</strong></div>
              </div>
              <button className="button button--primary button--full auth-submit" onClick={() => onEnterPortal(activeAccount)}>Open student dashboard <ArrowRight size={17} /></button>
              <button className="auth-result__link" onClick={onExplore}>Explore lesson plans first</button>
            </div>
          )}

          {view === 'account' && currentAccount && (
            <div className="account-view">
              <div className="account-view__top">
                <span className="account-avatar">{currentAccount.parentName.slice(0, 1).toUpperCase()}</span>
                <div><span>Family account</span><h2 id="auth-title">Hi, {currentAccount.parentName.split(' ')[0]}</h2><p>{currentAccount.loginId || currentAccount.email}</p></div>
              </div>
              <div className="account-view__student">
                <span className="auth-heading__icon"><GraduationCap size={22} /></span>
                <div><span>Student profile</span><strong>{currentAccount.child.name}</strong><p>{currentAccount.child.year} · {currentAccount.child.curriculum}</p></div>
              </div>
              <dl className="account-details">
                <div><dt>Learning goal</dt><dd>{currentAccount.child.goal}</dd></div>
                <div><dt>Lesson rhythm</dt><dd>{currentAccount.child.frequency}</dd></div>
                {currentAccount.selectedPlan && <div><dt>Plan interest</dt><dd>{currentAccount.selectedPlan}</dd></div>}
              </dl>
              <button className="button button--primary button--full" onClick={() => onEnterPortal(currentAccount)}>Open student dashboard <ArrowRight size={17} /></button>
              <button className="logout-button" onClick={handleLogout}><LogOut size={16} /> Log out</button>
            </div>
          )}

          <div className="auth-panel__foot"><ShieldCheck size={15} /> Secure account setup · No payment required</div>
        </div>
      </section>
    </div>
  )
}
