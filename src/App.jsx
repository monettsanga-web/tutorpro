import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  CalendarCheck2,
  Check,
  ChevronDown,
  Clock3,
  Globe2,
  GraduationCap,
  Heart,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react'
import AuthModal from './AuthModal.jsx'
import PortalAccess from './PortalAccess.jsx'
import { AdminDashboard, StudentDashboard, TeacherDashboard } from './Dashboards.jsx'
import { getCurrentAccount, initializePlatform, logoutAccount } from './auth.js'

const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`

const programmes = {
  primary: [
    {
      name: 'Cambridge Primary',
      years: 'Years 1–6',
      description: 'Build strong foundations in reading, writing, speaking and comprehension.',
      accent: 'coral',
    },
    {
      name: 'Oxford Primary',
      years: 'Years 1–6',
      description: 'Grow literacy and a love of language through clear, engaging lessons.',
      accent: 'gold',
    },
  ],
  secondary: [
    {
      name: 'Cambridge Secondary',
      years: 'Years 7–11',
      description: 'Develop the analysis and writing skills students need for IGCSE English.',
      accent: 'coral',
    },
    {
      name: 'Oxford Secondary',
      years: 'Years 7–11',
      description: 'Master advanced language and literature with structured one-to-one support.',
      accent: 'gold',
    },
  ],
}

const faqs = [
  {
    question: 'What curricula do you follow?',
    answer:
      'Lessons are aligned with Cambridge and Oxford English curricula for Primary and Secondary students. Your tutor will adapt each class to your child’s year level, current goals and schoolwork.',
  },
  {
    question: 'Is the first class really free?',
    answer:
      'Yes. New students can take a free first class before choosing a plan. It is a chance to meet the tutor, discuss goals and experience the teaching approach with no commitment.',
  },
  {
    question: 'What is the difference between the plans?',
    answer:
      'The Weekly plan is designed for one or two classes a week and is paid weekly. The Package plan is for four or five 25-minute classes a week, paid monthly, with priority scheduling and a dedicated tutor.',
  },
  {
    question: 'Can I change plans later?',
    answer:
      'Yes. You can start with the rhythm that works now and change as your child’s schedule or learning goals evolve.',
  },
  {
    question: 'How do online classes work?',
    answer:
      'Create a family account, complete your child’s learning profile and choose a lesson rhythm. We use those details to prepare the right one-to-one support and track progress from class to class.',
  },
]

function Logo({ light = false }) {
  return (
    <a className={`logo ${light ? 'logo--light' : ''}`} href="#top" aria-label="TutorPro home">
      <span className="logo__mark" aria-hidden="true">
        <img src={assetUrl('assets/tutorpro-panda-logo.webp')} alt="" />
      </span>
      <span className="logo__text">
        Tutor<span>Pro</span>
      </span>
    </a>
  )
}

function Header({ onBook, onLogin, onAccount, currentAccount }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)
  const openAndClose = (callback) => {
    closeMenu()
    callback()
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo />
        <nav className={`nav ${menuOpen ? 'nav--open' : ''}`} aria-label="Main navigation">
          <a href="#why" onClick={closeMenu}>Why TutorPro</a>
          <a href="#programmes" onClick={closeMenu}>Programmes</a>
          <a href="#journey" onClick={closeMenu}>How it works</a>
          <a href="#pricing" onClick={closeMenu}>Pricing</a>
          <a href="#faq" onClick={closeMenu}>FAQ</a>
          <div className="nav__mobile-actions">
            {currentAccount ? (
              <button className="account-link" onClick={() => openAndClose(onAccount)}>
                <span>{currentAccount.parentName.slice(0, 1).toUpperCase()}</span>
                My account
              </button>
            ) : (
              <button className="text-link button-reset" onClick={() => openAndClose(onLogin)}>Student login</button>
            )}
            <button className="button button--primary" onClick={() => openAndClose(onBook)}>
              {currentAccount ? 'Open my account' : 'Create a free account'}
            </button>
          </div>
        </nav>
        <div className="header-actions">
          {currentAccount ? (
            <button className="account-link" onClick={onAccount}>
              <span>{currentAccount.parentName.slice(0, 1).toUpperCase()}</span>
              Hi, {currentAccount.parentName.split(' ')[0]}
            </button>
          ) : (
            <button className="login-link button-reset" onClick={onLogin}>Log in</button>
          )}
          <button className="button button--primary button--small" onClick={onBook}>
            {currentAccount ? 'My account' : 'Register free'} <ArrowUpRight size={16} />
          </button>
        </div>
        <button
          className="menu-button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </header>
  )
}

function Hero({ onBook }) {
  return (
    <section className="hero" id="top">
      <div className="hero__dots" aria-hidden="true" />
      <div className="container hero__grid">
        <div className="hero__content">
          <div className="eyebrow">
            <span><Sparkles size={14} /></span>
            Cambridge & Oxford aligned
          </div>
          <h1>English confidence, built <em>one lesson</em> at a time.</h1>
          <p className="hero__lede">
            Personalised 1-to-1 online tutoring that helps Primary and Secondary students speak up, write clearly and thrive at school.
          </p>
          <div className="hero__actions">
            <button className="button button--primary button--large" onClick={onBook}>
              Book a free first class <ArrowRight size={18} />
            </button>
            <a className="button button--quiet button--large" href="#programmes">
              Explore programmes
            </a>
          </div>
          <div className="hero__proof" aria-label="TutorPro benefits">
            <span><Check size={15} /> No commitment</span>
            <span><Check size={15} /> From $8 per class</span>
            <span><Check size={15} /> Flexible times</span>
          </div>
        </div>

        <div className="hero__visual">
          <div className="hero__photo-wrap">
            <img
              className="hero__photo"
              src={assetUrl('assets/tutorpro-hero.webp')}
              alt="A student taking part in a friendly online English lesson"
            />
            <div className="class-pill">
              <span className="class-pill__icon"><MessageCircle size={18} /></span>
              <span><strong>1-to-1 attention</strong>Every class, every child</span>
            </div>
          </div>
          <div className="progress-card">
            <div className="progress-card__top">
              <span className="progress-card__icon"><Target size={18} /></span>
              <span><small>Learning goal</small><strong>Confident speaking</strong></span>
            </div>
            <div className="progress-card__bar"><span /></div>
            <div className="progress-card__foot"><span>Great progress</span><strong>82%</strong></div>
          </div>
          <div className="hero__shape" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}

function Stats() {
  const items = [
    ['500+', 'active students'],
    ['20+', 'expert tutors'],
    ['98%', 'success rate'],
    ['5+', 'years of experience'],
  ]

  return (
    <section className="stats" aria-label="TutorPro at a glance">
      <div className="container stats__inner">
        <p>Trusted by growing learners</p>
        <div className="stats__items">
          {items.map(([number, label]) => (
            <div className="stat" key={label}>
              <strong>{number}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WhyTutorPro() {
  const benefits = [
    {
      icon: GraduationCap,
      title: 'The right curriculum',
      text: 'Every lesson connects to the Cambridge or Oxford learning journey your child already follows.',
      color: 'coral',
    },
    {
      icon: UserRoundCheck,
      title: 'A tutor who gets them',
      text: 'One-to-one teaching means the pace, examples and feedback all fit how your child learns best.',
      color: 'gold',
    },
    {
      icon: CalendarCheck2,
      title: 'Learning that fits life',
      text: 'Choose 25 or 50 minutes and book times around school, activities and family routines.',
      color: 'blue',
    },
  ]

  return (
    <section className="section why" id="why">
      <div className="container">
        <div className="section-heading section-heading--split">
          <div>
            <span className="kicker">Why TutorPro</span>
            <h2>Less pressure. More progress.</h2>
          </div>
          <p>Support that meets your child where they are—and gives them a clear path to where they want to be.</p>
        </div>
        <div className="benefit-grid">
          {benefits.map(({ icon: Icon, title, text, color }, index) => (
            <article className="benefit" key={title}>
              <span className={`benefit__number benefit__number--${color}`}>0{index + 1}</span>
              <div className={`benefit__icon benefit__icon--${color}`}><Icon size={25} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <div className="lesson-note">
          <img src={assetUrl('assets/online-english-lesson.jpg')} alt="A child learning one-to-one with an online tutor" />
          <div className="lesson-note__copy">
            <span className="lesson-note__label"><ShieldCheck size={16} /> Always one-to-one</span>
            <h3>One child. One tutor. One clear goal.</h3>
            <p>No crowded class and no getting lost in the lesson. Your child has the space to ask, practise and make mistakes safely.</p>
          </div>
          <a className="text-link text-link--arrow" href="#programmes">Find their programme <ArrowRight size={16} /></a>
        </div>
      </div>
    </section>
  )
}

function Programmes() {
  const [level, setLevel] = useState('primary')

  return (
    <section className="section programmes" id="programmes">
      <div className="container programmes__grid">
        <div className="programmes__intro">
          <span className="kicker kicker--light">Programmes</span>
          <h2>Made for their school years.</h2>
          <p>
            Focused English support from first foundations to exam-ready analysis. Choose a level to see the right path.
          </p>
          <div className="level-toggle" role="group" aria-label="Choose school level">
            <button
              className={level === 'primary' ? 'active' : ''}
              aria-pressed={level === 'primary'}
              onClick={() => setLevel('primary')}
            >
              Primary
            </button>
            <button
              className={level === 'secondary' ? 'active' : ''}
              aria-pressed={level === 'secondary'}
              onClick={() => setLevel('secondary')}
            >
              Secondary
            </button>
          </div>
        </div>

        <div className="programme-list" aria-live="polite">
          {programmes[level].map((programme, index) => (
            <article className="programme-card" key={programme.name}>
              <div className={`programme-card__mark programme-card__mark--${programme.accent}`}>
                {index === 0 ? <Globe2 size={25} /> : <BookOpen size={25} />}
              </div>
              <div className="programme-card__body">
                <span>{programme.years}</span>
                <h3>{programme.name}</h3>
                <p>{programme.description}</p>
              </div>
              <ArrowUpRight className="programme-card__arrow" size={20} />
            </article>
          ))}
          <div className="programme-note">
            <BadgeCheck size={20} />
            <p><strong>Not sure which path fits?</strong> We’ll help you choose during the free first class.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorks({ onBook }) {
  const steps = [
    {
      icon: Users,
      title: 'Tell us about your child',
      text: 'Share their year, curriculum and the skills they want to strengthen.',
    },
    {
      icon: Heart,
      title: 'Build their learning profile',
      text: 'Choose a curriculum, school year and goal so every lesson starts with the right focus.',
    },
    {
      icon: Star,
      title: 'See confidence grow',
      text: 'Start learning one-to-one and follow progress from lesson to lesson.',
    },
  ]

  return (
    <section className="section journey" id="journey">
      <div className="container">
        <div className="section-heading section-heading--center">
          <span className="kicker">How it works</span>
          <h2>From “I’m stuck” to “I’ve got this.”</h2>
          <p>Getting the right support should feel simple.</p>
        </div>
        <div className="steps">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <article className="step" key={title}>
              <div className="step__top">
                <span className="step__icon"><Icon size={23} /></span>
                <span className="step__number">0{index + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              {index < steps.length - 1 && <ArrowRight className="step__arrow" size={21} />}
            </article>
          ))}
        </div>
        <div className="journey__action">
          <button className="button button--primary button--large" onClick={onBook}>
            Take the first step <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  )
}

function Pricing({ onBook }) {
  return (
    <section className="section pricing" id="pricing">
      <div className="container">
        <div className="section-heading section-heading--center">
          <span className="kicker">Simple pricing</span>
          <h2>Choose your child’s rhythm.</h2>
          <p>Start with a free class. Stay flexible, with no long-term commitment.</p>
        </div>

        <div className="pricing-grid">
          <article className="price-card">
            <div className="price-card__head">
              <span className="price-card__icon"><Clock3 size={22} /></span>
              <div><h3>Weekly</h3><p>For steady, flexible support</p></div>
            </div>
            <div className="price-options">
              <div><strong>$10</strong><span>/ 25 min</span></div>
              <i />
              <div><strong>$20</strong><span>/ 50 min</span></div>
            </div>
            <p className="price-card__cadence">1–2 classes per week · pay weekly</p>
            <ul>
              <li><Check size={16} /> Flexible scheduling</li>
              <li><Check size={16} /> Any supported curriculum</li>
              <li><Check size={16} /> One-to-one attention</li>
              <li><Check size={16} /> Progress tracking</li>
            </ul>
            <button className="button button--outline button--full" onClick={() => onBook('Weekly')}>
              Try your first class free <ArrowRight size={17} />
            </button>
          </article>

          <article className="price-card price-card--featured">
            <div className="best-value"><Sparkles size={14} /> Best value</div>
            <div className="price-card__head">
              <span className="price-card__icon"><CalendarCheck2 size={22} /></span>
              <div><h3>Package</h3><p>For faster, consistent progress</p></div>
            </div>
            <div className="package-price">
              <strong>$8</strong><span>/ 25 min class</span>
            </div>
            <p className="price-card__cadence">4–5 classes per week · pay monthly</p>
            <ul>
              <li><Check size={16} /> Save $2 on every class</li>
              <li><Check size={16} /> Priority scheduling</li>
              <li><Check size={16} /> Dedicated tutor assignment</li>
              <li><Check size={16} /> Detailed progress reports</li>
            </ul>
            <button className="button button--primary button--full" onClick={() => onBook('Package')}>
              Try your first class free <ArrowRight size={17} />
            </button>
          </article>
        </div>
        <p className="pricing-note"><ShieldCheck size={16} /> Secure booking · Free first class for new students</p>
      </div>
    </section>
  )
}

function FAQ({ onBook }) {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section className="section faq" id="faq">
      <div className="container faq__grid">
        <div className="faq__intro">
          <span className="kicker">Good to know</span>
          <h2>Questions, answered.</h2>
          <p>Your free account keeps your child’s level, curriculum and learning goals together in one place.</p>
          <button className="text-link text-link--arrow button-reset" onClick={onBook}>
            Create a free account <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="faq-list">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div className={`faq-item ${isOpen ? 'faq-item--open' : ''}`} key={faq.question}>
                <button
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                >
                  <span>{faq.question}</span>
                  <ChevronDown size={20} />
                </button>
                <div className="faq-item__answer" id={`faq-answer-${index}`}>
                  <p>{faq.answer}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function FinalCTA({ onBook }) {
  return (
    <section className="final-cta">
      <div className="container final-cta__inner">
        <div className="final-cta__icon"><Sparkles size={27} /></div>
        <div>
          <span className="kicker kicker--light">Their next chapter starts here</span>
          <h2>Let’s make English their strong subject.</h2>
          <p>Meet an expert tutor and experience a one-to-one class—free.</p>
        </div>
        <button className="button button--cream button--large" onClick={onBook}>
          Book a free class <ArrowRight size={18} />
        </button>
      </div>
    </section>
  )
}

function Footer({ onRegister, onLogin, onAccount, onTeacherAccess, onAdminAccess, currentAccount }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__main">
          <div className="footer__brand">
            <Logo light />
            <p>Personalised English tutoring for confident, capable learners.</p>
            <span>Cambridge & Oxford aligned</span>
          </div>
          <div className="footer__links">
            <div>
              <h3>Explore</h3>
              <a href="#why">Why TutorPro</a>
              <a href="#programmes">Programmes</a>
              <a href="#journey">How it works</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div>
              <h3>Get started</h3>
              {currentAccount ? (
                <button onClick={onAccount}>Open my dashboard</button>
              ) : (
                <>
                  <button onClick={onRegister}>Student registration</button>
                  <button onClick={onLogin}>Student login</button>
                </>
              )}
              <button onClick={onTeacherAccess}>Teacher portal</button>
              <button onClick={onAdminAccess}>Admin portal</button>
            </div>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} TutorPro English Hub</span>
          <a className="footer__credit" href="https://www.pexels.com/photo/7014777/">Learning photo via Pexels</a>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('register')
  const [roleAccess, setRoleAccess] = useState(null)
  const [activePortal, setActivePortal] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [currentAccount, setCurrentAccount] = useState(() => {
    initializePlatform()
    return getCurrentAccount()
  })

  useEffect(() => {
    const elements = document.querySelectorAll(
      '.section-heading, .benefit, .lesson-note, .programmes__intro, .programme-card, .step, .price-card, .faq__intro, .faq-item, .final-cta__inner',
    )
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    elements.forEach((element, index) => {
      element.classList.add('reveal')
      element.style.setProperty('--reveal-delay', `${(index % 3) * 70}ms`)
    })

    if (reducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('reveal--visible'))
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  const enterPortal = (account) => {
    setCurrentAccount(account)
    setAuthOpen(false)
    setRoleAccess(null)
    setActivePortal(account.role || 'student')
  }

  const openRegistration = (plan = '') => {
    if (currentAccount) {
      enterPortal(currentAccount)
      return
    }
    setSelectedPlan(typeof plan === 'string' ? plan : '')
    setAuthMode('register')
    setRoleAccess(null)
    setAuthOpen(true)
  }

  const openLogin = () => {
    setSelectedPlan('')
    setAuthMode('login')
    setRoleAccess(null)
    setAuthOpen(true)
  }

  const openAccount = () => {
    if (currentAccount) enterPortal(currentAccount)
    else openLogin()
  }

  const openRoleAccess = (role) => {
    setAuthOpen(false)
    setRoleAccess(role)
  }

  const closeAndExplore = () => {
    setAuthOpen(false)
    window.setTimeout(() => document.querySelector('#pricing')?.scrollIntoView({ behavior: 'smooth' }), 80)
  }

  const logout = () => {
    logoutAccount()
    setCurrentAccount(null)
    setActivePortal(null)
  }

  if (activePortal && currentAccount) {
    const portalProps = {
      account: currentAccount,
      onHome: () => setActivePortal(null),
      onLogout: logout,
    }
    if (activePortal === 'admin') return <AdminDashboard {...portalProps} />
    if (activePortal === 'teacher') return <TeacherDashboard {...portalProps} onAccountChange={setCurrentAccount} />
    return <StudentDashboard {...portalProps} onAccountChange={setCurrentAccount} />
  }

  return (
    <>
      <Header
        onBook={openRegistration}
        onLogin={openLogin}
        onAccount={openAccount}
        currentAccount={currentAccount}
      />
      <main>
        <Hero onBook={openRegistration} />
        <Stats />
        <WhyTutorPro />
        <Programmes />
        <HowItWorks onBook={openRegistration} />
        <Pricing onBook={openRegistration} />
        <FAQ onBook={openRegistration} />
        <FinalCTA onBook={openRegistration} />
      </main>
      <Footer
        onRegister={openRegistration}
        onLogin={openLogin}
        onAccount={openAccount}
        onTeacherAccess={() => openRoleAccess('teacher')}
        onAdminAccess={() => openRoleAccess('admin')}
        currentAccount={currentAccount}
      />
      {authOpen && (
        <AuthModal
          initialMode={authMode}
          selectedPlan={selectedPlan}
          currentAccount={currentAccount}
          onClose={() => setAuthOpen(false)}
          onAuthenticated={setCurrentAccount}
          onExplore={closeAndExplore}
          onEnterPortal={enterPortal}
          onTeacherAccess={() => openRoleAccess('teacher')}
        />
      )}
      {roleAccess && (
        <PortalAccess
          key={roleAccess}
          mode={roleAccess}
          onClose={() => setRoleAccess(null)}
          onAuthenticated={setCurrentAccount}
          onEnterPortal={enterPortal}
        />
      )}
    </>
  )
}
