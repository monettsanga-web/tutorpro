import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  CalendarCheck2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Globe2,
  GraduationCap,
  Heart,
  LayoutDashboard,
  LogOut,
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
import { getApprovedTeachers, getCurrentAccount, initializePlatform, logoutAccount, mergeCloudAccounts, updateAccount } from './auth.js'
import { fetchPublicTeachers, subscribeToCloudProfiles } from './cloudProfiles.js'
import { IntroVideo, ProfilePhoto, SampleClassPlayer } from './ProfileMedia.jsx'

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

const curriculumSlides = [
  { id: '1ENm8p2-G_glMXNyojA6e180EEWFIELYO', image: 'assets/curriculum/power-up-drive.jpg', title: 'Power Up', publisher: 'Cambridge', level: 'Primary series', tone: 'cyan' },
  { id: '1DR1mPyBwMFLXXPvYDX4RpGOkXS3pEf5L', image: 'assets/curriculum/power-up-academy-drive.jpg', title: 'Power Up Academy', publisher: 'Cambridge', level: 'Young learners', tone: 'orange' },
  { id: '1TZdRANL2OTg50UiTTcFIV17-E-ULyfxv', image: 'assets/curriculum/grammar-friends-drive.jpg', title: 'Grammar Friends', publisher: 'Oxford', level: 'Grammar series', tone: 'violet' },
  { id: '1IYX1WmS69ZuuKQeIwQSt0Y2qJHcjoHPC', image: 'assets/curriculum/family-and-friends-drive.jpg', title: 'Family and Friends', publisher: 'Oxford', level: 'Primary series', tone: 'green' },
  { id: '1zvWowq1nDpftZLior_jOHiDLrECOXZSc', image: 'assets/curriculum/think-drive.jpg', title: 'THiNK', publisher: 'Cambridge', level: 'Secondary series', tone: 'pink' },
  { id: '1glUQpYaPNfGP2HGjaCJE3TWyIVlSzIgq', image: 'assets/curriculum/global-english-drive.jpg', title: 'Global English', publisher: 'Cambridge', level: 'Primary series', tone: 'blue' },
  { id: '1LVx0W1YK8TuSRLu97kQl-ydGsQBOfuvu', image: 'assets/curriculum/phonics-monster-asap-drive.jpg', title: 'Phonics Monster ASAP', publisher: 'A-List', level: 'Phonics', tone: 'lime' },
  { id: '1_E3DCPaqM_o-oDK9UGpEKKL7_SAGr9_I', image: 'assets/curriculum/best-phonics-drive.jpg', title: 'Best Phonics', publisher: 'A-List', level: 'Early readers', tone: 'green' },
  { id: '1Xd2aZnnrWIn-OtFoRqVadMtxG_ng7hIM', image: 'assets/curriculum/everybody-up-drive.jpg', title: 'Everybody Up', publisher: 'Oxford', level: 'Primary series', tone: 'violet' },
  { id: '1RCJobEvIAqmM80-9vOE8a9RrQqvD3cZq', image: 'assets/curriculum/lets-go-drive.jpg', title: "Let's Go", publisher: 'Oxford', level: 'Young learners', tone: 'yellow' },
  { id: '1jycufY6vwbEwLkwp3Rl6nHAY538Fo4l3', image: 'assets/curriculum/phonics-monster-drive.jpg', title: 'Phonics Monster', publisher: 'A-List', level: 'Phonics', tone: 'yellow' },
  { id: '1GWmHeEDtpOw1WZQ--rBLiPkAIGKWMnwX', image: 'assets/curriculum/ready-set-sing-drive.jpg', title: 'Ready, Set, Sing!', publisher: 'A-List', level: 'Early learners', tone: 'yellow' },
  { id: '1XXrOahvCyezLd1tX8MIlP8H9-v3yxFlo', image: 'assets/curriculum/smart-up-drive.jpg', title: 'Smart Up', publisher: 'A-List', level: 'Primary series', tone: 'blue' },
  { id: '1v_U1s0cxAV3FTSXdUabk6LxvFQe8fDRj', image: 'assets/curriculum/wonderful-world-drive.jpg', title: 'Wonderful World', publisher: 'National Geographic Learning', level: 'Reading series', tone: 'sky' },
]

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
    <a className={`logo ${light ? 'logo--light' : ''}`} href="#top" aria-label="TutorPro English home">
      <span className="logo__mark" aria-hidden="true">
        <img src={assetUrl('assets/tutorpro-panda-logo.webp')} alt="" />
      </span>
      <span className="logo__text">
        Tutor<span>Pro</span><small>English</small>
      </span>
    </a>
  )
}

function Header({ onBook, onLogin, onAccount, onLogout, onTeacherAccess, onAdminAccess, currentAccount, onOpenTeachers }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const accountName = currentAccount?.parentName || currentAccount?.fullName || 'TutorPro English user'
  const accountRole = currentAccount?.role === 'admin' ? 'Administrator' : currentAccount?.role === 'teacher' ? 'Teacher' : 'Family account'

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
          <a href="#programmes" onClick={closeMenu}>Programmes</a>
          <a href="#teachers" onClick={(e) => { e.preventDefault(); closeMenu(); onOpenTeachers(); }}>Teachers</a>
          <a href="#journey" onClick={closeMenu}>How it works</a>
          <a href="#pricing" onClick={closeMenu}>Pricing</a>
          <div className="nav__mobile-actions">
            {currentAccount ? (
              <>
                <button className="account-link" onClick={() => openAndClose(onAccount)}><span>{accountName.slice(0, 1).toUpperCase()}</span>Open my dashboard</button>
                <button className="mobile-logout-button" onClick={() => openAndClose(onLogout)}><LogOut size={17} /> Log out</button>
              </>
            ) : (
              <>
                <button className="mobile-portal-button mobile-portal-button--primary" onClick={() => openAndClose(onBook)}>Student registration</button>
                <button className="mobile-portal-button" onClick={() => openAndClose(onLogin)}>Student login</button>
                <button className="mobile-portal-button" onClick={() => openAndClose(onTeacherAccess)}>Teacher portal</button>
                <button className="mobile-portal-button" onClick={() => openAndClose(onAdminAccess)}>Admin portal</button>
              </>
            )}
          </div>
        </nav>
        <div className="header-actions">
          {currentAccount ? (
            <div className="header-account-menu">
              <button className="account-link account-link--trigger" aria-haspopup="menu"><span>{accountName.slice(0, 1).toUpperCase()}</span><div><small>{accountRole}</small><strong>Hi, {accountName.split(' ')[0]}</strong></div><ChevronDown size={15} /></button>
              <div className="header-account-dropdown" role="menu">
                <div className="header-account-dropdown__identity"><span>{accountName.slice(0, 1).toUpperCase()}</span><div><strong>{accountName}</strong><small>{currentAccount.loginId || currentAccount.email}</small></div></div>
                <button role="menuitem" onClick={onAccount}><span><LayoutDashboard size={17} /></span><div><strong>Open dashboard</strong><small>Continue learning and manage your account</small></div><ArrowRight size={15} /></button>
                <button className="header-signout" role="menuitem" onClick={onLogout}><span><LogOut size={17} /></span><div><strong>Log out</strong><small>Sign out safely from this device</small></div></button>
              </div>
            </div>
          ) : (
            <>
              <button className="header-portal-link" onClick={onLogin}>Student login</button>
              <button className="header-portal-link" onClick={onTeacherAccess}>Teacher portal</button>
              <button className="header-portal-link header-portal-link--admin" onClick={onAdminAccess}>Admin portal</button>
            </>
          )}
          <button className="button button--primary button--small" onClick={onBook}>
            {currentAccount ? 'My dashboard' : 'Student registration'} <ArrowUpRight size={16} />
          </button>
        </div>
        <button className="menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
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
          <div className="hero__proof" aria-label="TutorPro English benefits">
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

function AnimatedStat({ value, label }) {
  const elementRef = useRef(null)
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    const numericValue = Number.parseInt(value, 10)
    if (!Number.isFinite(numericValue) || !elementRef.current || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let frame = 0
    let startedAt = 0
    const suffix = value.replace(String(numericValue), '')
    const run = (time) => {
      if (!startedAt) startedAt = time
      const progress = Math.min(1, (time - startedAt) / 1200)
      const eased = 1 - ((1 - progress) ** 3)
      setDisplayValue(`${Math.round(numericValue * eased)}${suffix}`)
      if (progress < 1) frame = window.requestAnimationFrame(run)
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      setDisplayValue(`0${suffix}`)
      frame = window.requestAnimationFrame(run)
      observer.disconnect()
    }, { threshold: 0.65 })
    observer.observe(elementRef.current)
    return () => {
      observer.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [value])

  return <div className="stat" ref={elementRef}><strong>{displayValue}</strong><span>{label}</span></div>
}

function Stats() {
  const items = [
    ['500+', 'active students'],
    ['20+', 'expert tutors'],
    ['98%', 'success rate'],
    ['5+', 'years of experience'],
  ]

  return (
    <section className="stats" aria-label="TutorPro English at a glance">
      <div className="container stats__inner">
        <p>Trusted by growing learners</p>
        <div className="stats__items">
          {items.map(([number, label]) => <AnimatedStat value={number} label={label} key={label} />)}
        </div>
      </div>
    </section>
  )
}

function CurriculumCover({ slide, compact = false }) {
  const shortPublisher = slide.publisher === 'National Geographic Learning' ? 'NGL' : slide.publisher
  return (
    <div className={`curriculum-book-cover curriculum-book-cover--${slide.tone} ${slide.image ? 'curriculum-book-cover--photo' : ''} ${compact ? 'curriculum-book-cover--compact' : ''}`} role="img" aria-label={`${slide.title} by ${slide.publisher}`}>
      {slide.image && <img className="curriculum-cover-photo" src={assetUrl(slide.image)} alt={`${slide.title} English learning book series`} loading={compact ? 'lazy' : 'eager'} />}
      <div className="curriculum-book-cover__book">
        <span>{shortPublisher}</span>
        <i aria-hidden="true">Aa</i>
        <strong>{slide.title}</strong>
        <small>{slide.level}</small>
        <em>TutorPro English materials</em>
      </div>
      {!compact && <><div className="curriculum-book-cover__book curriculum-book-cover__book--back"><span>{shortPublisher}</span><strong>{slide.title}</strong></div><div className="curriculum-cover-shapes" aria-hidden="true"><i /><i /><i /></div></>}
    </div>
  )
}

function CurriculumCarousel({ onBook }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [touchStart, setTouchStart] = useState(null)
  const activeSlide = curriculumSlides[activeIndex]

  const showSlide = (index) => setActiveIndex((index + curriculumSlides.length) % curriculumSlides.length)

  useEffect(() => {
    if (paused) return undefined
    const timer = window.setInterval(() => showSlide(activeIndex + 1), 5200)
    return () => window.clearInterval(timer)
  }, [activeIndex, paused])

  const finishSwipe = (event) => {
    if (touchStart === null) return
    const distance = event.changedTouches[0].clientX - touchStart
    if (Math.abs(distance) > 50) showSlide(activeIndex + (distance < 0 ? 1 : -1))
    setTouchStart(null)
  }

  return (
    <section className="curriculum-showcase" id="materials" aria-label="English curriculum materials">
      <div className="container">
        <div className="curriculum-showcase__heading">
          <div><span className="kicker">A world of learning</span><h2>Great lessons start with brilliant materials.</h2></div>
          <p>Explore the colourful Cambridge, Oxford and international series that inspire our personalised English lessons.</p>
        </div>

        <div className={`curriculum-carousel curriculum-carousel--${activeSlide.tone}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onTouchStart={(event) => setTouchStart(event.touches[0].clientX)} onTouchEnd={finishSwipe}>
          <div className="curriculum-carousel__copy" key={`copy-${activeSlide.id}`}>
            <span className="curriculum-carousel__count">{String(activeIndex + 1).padStart(2, '0')} / {curriculumSlides.length}</span>
            <div className="curriculum-carousel__brand"><BookOpen size={17} /> {activeSlide.publisher}</div>
            <h3>{activeSlide.title}</h3>
            <p>{activeSlide.level} · Carefully matched to each learner’s age, confidence and curriculum goals.</p>
            <div className="curriculum-carousel__actions"><a className="button button--cream" href="#programmes">Explore programmes <ArrowRight size={16} /></a><button className="carousel-text-button" onClick={onBook}>Start with a free class</button></div>
          </div>
          <div className="curriculum-carousel__visual" key={`image-${activeSlide.id}`}>
            <CurriculumCover slide={activeSlide} />
          </div>
          <button className="curriculum-arrow curriculum-arrow--prev" onClick={() => showSlide(activeIndex - 1)} aria-label="Previous curriculum"><ChevronLeft size={23} /></button>
          <button className="curriculum-arrow curriculum-arrow--next" onClick={() => showSlide(activeIndex + 1)} aria-label="Next curriculum"><ChevronRight size={23} /></button>
          <div className="curriculum-carousel__progress" aria-hidden="true"><span key={activeIndex} /></div>
        </div>

        <div className="curriculum-thumbnails" role="tablist" aria-label="Choose curriculum slide">
          {curriculumSlides.map((slide, index) => <button role="tab" aria-selected={index === activeIndex} className={index === activeIndex ? 'active' : ''} onClick={() => showSlide(index)} key={slide.id}><CurriculumCover slide={slide} compact /><span>{slide.title}</span></button>)}
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
            <span className="kicker">Why TutorPro English</span>
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

function PublicTeacherCard({ teacher, onChooseTeacher }) {
  const [activeMedia, setActiveMedia] = useState('photo') // photo, intro, sample
  const profile = teacher.teacher || {}

  // Some fun default superpowers if none is provided
  const defaultSuperpowers = [
    "Makes grammar feel like a magical adventure! 🪄",
    "Unbreakable patience and a constant warm smile! 😊",
    "Uses amazing animal puppets and hand props! 🧸",
    "Speaks in clear, simple accents perfect for kids! 🗣️",
    "Transforms vocabulary drills into fun games! 🎮"
  ]
  const seedIndex = (teacher.fullName?.charCodeAt(0) || 0) % defaultSuperpowers.length
  const superpower = profile.superpower || defaultSuperpowers[seedIndex]

  // Generate specialties
  const badges = []
  if (profile.specialization) badges.push(profile.specialization)
  if (Number(profile.experience) >= 5) badges.push("5+ Yrs Exp")
  if (profile.rating && Number(profile.rating) >= 4.8) badges.push("⭐ Top Rated")
  badges.push("TEFL Certified")
  badges.push("Kids Specialist")

  return (
    <article className="public-teacher-card novakid-style-card" style={{ background: '#110925', border: '1px solid rgba(188, 233, 78, 0.25)', boxShadow: '0 15px 40px rgba(0, 0, 0, 0.45)', borderRadius: '22px', padding: '24px', transition: 'transform 220ms ease, box-shadow 220ms ease' }}>
      {/* Media Viewport */}
      <div className="public-teacher-card__media-viewport" style={{ position: 'relative', height: '220px', borderRadius: '12px', overflow: 'hidden', background: '#090510', marginBottom: '16px' }}>
        {activeMedia === 'photo' && (
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2b184a 0%, #110925 100%)' }}>
            <ProfilePhoto accountId={teacher.id} name={teacher.fullName} className="public-teacher-photo-large" style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid #bce94e', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <span style={{ background: '#bce94e', color: '#090510', fontSize: '0.62rem', fontWeight: '850', padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase' }}>Available</span>
              <span style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: '0.62rem', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', backdropFilter: 'blur(4px)' }}>1-on-1 Class</span>
            </div>
          </div>
        )}
        {activeMedia === 'intro' && (
          <div style={{ width: '100%', height: '100%' }}>
            <IntroVideo accountId={teacher.id} compact={false} />
          </div>
        )}
        {activeMedia === 'sample' && (
          <div style={{ width: '100%', height: '100%' }}>
            <SampleClassPlayer url={profile.sampleClassUrl} />
          </div>
        )}

        {/* Media Selector Overlay Buttons */}
        <div className="media-tab-selector" style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '20px', backdropFilter: 'blur(4px)', zIndex: 10 }}>
          <button
            type="button"
            onClick={() => setActiveMedia('photo')}
            style={{ border: 'none', background: activeMedia === 'photo' ? '#bce94e' : 'transparent', color: activeMedia === 'photo' ? '#090510' : '#fff', padding: '3px 8px', borderRadius: '15px', fontSize: '0.6rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Photo
          </button>
          <button
            type="button"
            onClick={() => setActiveMedia('intro')}
            style={{ border: 'none', background: activeMedia === 'intro' ? '#bce94e' : 'transparent', color: activeMedia === 'intro' ? '#090510' : '#fff', padding: '3px 8px', borderRadius: '15px', fontSize: '0.6rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Intro 🎬
          </button>
          <button
            type="button"
            onClick={() => setActiveMedia('sample')}
            style={{ border: 'none', background: activeMedia === 'sample' ? '#bce94e' : 'transparent', color: activeMedia === 'sample' ? '#090510' : '#fff', padding: '3px 8px', borderRadius: '15px', fontSize: '0.6rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Sample 📖
          </button>
        </div>
      </div>

      {/* Teacher Profile Info */}
      <div className="public-teacher-card__profile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          {/* Bold, prominent Novakid-style name */}
          <h3 style={{ fontSize: '1.45rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.02em', marginBottom: '2px', fontFamily: '"Manrope", sans-serif' }}>
            {teacher.fullName}
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#b9adc7', margin: 0 }}>
            {profile.specialization || "Professional ESL Educator"}
          </p>
        </div>
        <div className="public-teacher-rating" style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '8px' }}>
          <Star size={14} fill="#ffc107" color="#ffc107" />
          <strong style={{ fontSize: '0.82rem', color: '#fff' }}>{profile.rating || 'New'}</strong>
          {profile.ratingCount > 0 && <small style={{ fontSize: '0.68rem', color: '#b9adc7' }}>({profile.ratingCount})</small>}
        </div>
      </div>

      {/* Specialty Badges Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
        {badges.slice(0, 4).map((badge, idx) => (
          <span key={idx} style={{ background: 'rgba(188, 233, 78, 0.08)', border: '1px solid rgba(188, 233, 78, 0.2)', color: '#bce94e', fontSize: '0.65rem', fontWeight: '800', padding: '2px 8px', borderRadius: '6px' }}>
            {badge}
          </span>
        ))}
      </div>

      {/* Kid-Friendly Superpower section */}
      <div style={{ background: 'rgba(120, 80, 201, 0.07)', border: '1px solid rgba(120, 80, 201, 0.15)', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px' }}>
        <p style={{ margin: 0, fontSize: '0.74rem', color: '#e9d5ff', lineHeight: '1.4' }}>
          <span style={{ fontWeight: '900', color: '#bce94e', marginRight: '4px' }}>⚡ SUPERPOWER:</span>
          {superpower}
        </p>
      </div>

      <p className="public-teacher-card__bio" style={{ fontSize: '0.76rem', color: '#b9adc7', lineHeight: '1.5', margin: '0 0 14px 0', minHeight: '44px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical' }}>
        {profile.bio || "Hello! Let's build your child's English confidence with interactive, high-energy, fun learning slots."}
      </p>

      <div className="public-teacher-facts" style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginBottom: '16px', gap: '15px' }}>
        <span style={{ flex: 1, fontSize: '0.72rem', color: '#b9adc7' }}><strong style={{ color: '#fff', fontSize: '0.85rem', display: 'block' }}>{profile.experience || 0} yrs</strong> Experience</span>
        <span style={{ flex: 1, fontSize: '0.72rem', color: '#b9adc7' }}><strong style={{ color: '#fff', fontSize: '0.85rem', display: 'block' }}>{profile.lessonsCompleted || 0}+</strong> Classes</span>
        <span style={{ flex: 1, fontSize: '0.72rem', color: '#b9adc7' }}><strong style={{ color: '#fff', fontSize: '0.85rem', display: 'block' }}>{profile.languages?.split(',')[0] || 'English'}</strong> Native</span>
      </div>

      <button className="button button--primary button--full" style={{ background: '#bce94e', color: '#090510', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.78rem', padding: '10px 16px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(188, 233, 78, 0.15)' }} onClick={() => onChooseTeacher(teacher)}>
        Book Free Trial with {teacher.fullName.split(' ')[0]} <ArrowRight size={16} />
      </button>
    </article>
  )
}

function TeacherShowcase({ onChooseTeacher, onBack }) {
  const teachers = getApprovedTeachers()

  return (
    <section className="section public-teachers" id="teachers" style={{ background: 'linear-gradient(180deg, #110925 0%, #090510 100%)', padding: '80px 0' }}>
      <div className="container">
        {onBack && (
          <button 
            onClick={onBack} 
            style={{ 
              background: 'rgba(188, 233, 78, 0.08)', 
              color: '#bce94e', 
              border: '1px solid rgba(188, 233, 78, 0.25)', 
              padding: '8px 16px', 
              borderRadius: '20px', 
              cursor: 'pointer', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontWeight: '900', 
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '32px',
              transition: 'all 0.2s'
            }}
          >
            <ChevronLeft size={16} /> Return to Homepage
          </button>
        )}
        <div className="section-heading section-heading--split" style={{ marginBottom: '50px' }}>
          <div>
            <span className="kicker" style={{ color: '#bce94e', fontWeight: '900', letterSpacing: '0.1em' }}>Meet our star team of teachers</span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.02em', marginTop: '8px' }}>
              Choosing your child’s favorite English teacher is easy!
            </h2>
          </div>
          <p style={{ color: '#b9adc7', fontSize: '0.98rem', lineHeight: '1.6', maxWidth: '480px' }}>
            Compare credentials, read friendly superpowers, and switch between their presentation video and a live sample class recording to find the perfect educator.
          </p>
        </div>
        <div className="public-teacher-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '30px' }}>
          {teachers.length ? teachers.map((teacher) => (
            <PublicTeacherCard key={teacher.id} teacher={teacher} onChooseTeacher={onChooseTeacher} />
          )) : <div className="public-teachers-empty" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <span style={{ display: 'inline-block', padding: '16px', background: 'rgba(120, 80, 201, 0.1)', color: '#bce94e', borderRadius: '50%', marginBottom: '12px' }}><Users size={32} /></span>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '6px' }}>Teacher profiles are being prepared.</h3>
              <p style={{ color: '#b9adc7', fontSize: '0.85rem' }}>Approved TutorPro English teachers will appear here as soon as their profiles are ready.</p>
            </div>
          </div>}
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

function Footer({ onRegister, onLogin, onAccount, onTeacherAccess, onAdminAccess, currentAccount, onOpenTeachers }) {
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
              <a href="#why">Why TutorPro English</a>
              <a href="#programmes">Programmes</a>
              <a href="#teachers" onClick={(e) => { e.preventDefault(); onOpenTeachers(); }}>Teachers</a>
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
          <span>© {new Date().getFullYear()} TutorPro English</span>
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
  const [preferredTeacher, setPreferredTeacher] = useState(null)
  const [teacherVersion, setTeacherVersion] = useState(0)
  const [showPublicTeachers, setShowPublicTeachers] = useState(false)

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#teachers') {
        setShowPublicTeachers(true)
      } else if (window.location.hash === '') {
        setShowPublicTeachers(false)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    handleHashChange() // Check initial hash
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const [currentAccount, setCurrentAccount] = useState(() => {
    initializePlatform()
    return getCurrentAccount()
  })
  void teacherVersion

  useEffect(() => {
    let active = true
    const refreshTeachers = async () => {
      try {
        const teachers = await fetchPublicTeachers()
        if (!active) return
        mergeCloudAccounts(teachers)
        setTeacherVersion((value) => value + 1)
      } catch {
        // Existing browser data remains available until Supabase reconnects.
      }
    }
    refreshTeachers()
    const unsubscribe = subscribeToCloudProfiles(refreshTeachers)
    const interval = window.setInterval(refreshTeachers, 10000)
    return () => {
      active = false
      unsubscribe()
      window.clearInterval(interval)
    }
  }, [])

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
    setPreferredTeacher(null)
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

  const chooseTeacher = (teacher) => {
    if (currentAccount?.role === 'student') {
      const updated = updateAccount(currentAccount.id, { preferredTeacherId: teacher.id })
      setCurrentAccount(updated)
      enterPortal(updated)
      return
    }
    setSelectedPlan('')
    setPreferredTeacher(teacher)
    setAuthMode('register')
    setRoleAccess(null)
    setAuthOpen(true)
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
        onLogout={logout}
        onTeacherAccess={() => openRoleAccess('teacher')}
        onAdminAccess={() => openRoleAccess('admin')}
        currentAccount={currentAccount}
        onOpenTeachers={() => setShowPublicTeachers(true)}
      />
      {showPublicTeachers ? (
        <main>
          <TeacherShowcase onChooseTeacher={chooseTeacher} onBack={() => { setShowPublicTeachers(false); window.scrollTo(0, 0); }} />
        </main>
      ) : (
        <main>
          <Hero onBook={openRegistration} />
          <Stats />
          <CurriculumCarousel onBook={openRegistration} />
          <WhyTutorPro />
          <Programmes />
          <HowItWorks onBook={openRegistration} />
          <Pricing onBook={openRegistration} />
          <FAQ onBook={openRegistration} />
          <FinalCTA onBook={openRegistration} />
        </main>
      )}
      <Footer
        onRegister={openRegistration}
        onLogin={openLogin}
        onAccount={openAccount}
        onTeacherAccess={() => openRoleAccess('teacher')}
        onAdminAccess={() => openRoleAccess('admin')}
        currentAccount={currentAccount}
        onOpenTeachers={() => setShowPublicTeachers(true)}
      />
      {authOpen && (
        <AuthModal
          initialMode={authMode}
          selectedPlan={selectedPlan}
          preferredTeacher={preferredTeacher}
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
