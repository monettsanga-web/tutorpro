import { useEffect, useState } from 'react'
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
import { getApprovedTeachers, getCurrentAccount, initializePlatform, logoutAccount, updateAccount } from './auth.js'
import { IntroVideo, ProfilePhoto } from './ProfileMedia.jsx'

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
  { id: '1ENm8p2-G_glMXNyojA6e180EEWFIELYO', title: 'Power Up', publisher: 'Cambridge', level: 'Primary series', tone: 'cyan' },
  { id: '1DR1mPyBwMFLXXPvYDX4RpGOkXS3pEf5L', title: 'Power Up Academy', publisher: 'Cambridge', level: 'Young learners', tone: 'orange' },
  { id: '1TZdRANL2OTg50UiTTcFIV17-E-ULyfxv', title: 'Grammar Friends', publisher: 'Oxford', level: 'Grammar series', tone: 'violet' },
  { id: '1IYX1WmS69ZuuKQeIwQSt0Y2qJHcjoHPC', title: 'Family and Friends', publisher: 'Oxford', level: 'Primary series', tone: 'green' },
  { id: '1zvWowq1nDpftZLior_jOHiDLrECOXZSc', title: 'THiNK', publisher: 'Cambridge', level: 'Secondary series', tone: 'pink' },
  { id: '1glUQpYaPNfGP2HGjaCJE3TWyIVlSzIgq', title: 'Global English', publisher: 'Cambridge', level: 'Primary series', tone: 'blue' },
  { id: '1LVx0W1YK8TuSRLu97kQl-ydGsQBOfuvu', title: 'Phonics Monster ASAP', publisher: 'A-List', level: 'Phonics', tone: 'lime' },
  { id: '1_E3DCPaqM_o-oDK9UGpEKKL7_SAGr9_I', title: 'Best Phonics', publisher: 'A-List', level: 'Early readers', tone: 'green' },
  { id: '1Xd2aZnnrWIn-OtFoRqVadMtxG_ng7hIM', title: 'Everybody Up', publisher: 'Oxford', level: 'Primary series', tone: 'violet' },
  { id: '1RCJobEvIAqmM80-9vOE8a9RrQqvD3cZq', title: "Let's Go", publisher: 'Oxford', level: 'Young learners', tone: 'yellow' },
  { id: '1jycufY6vwbEwLkwp3Rl6nHAY538Fo4l3', title: 'Phonics Monster', publisher: 'A-List', level: 'Phonics', tone: 'yellow' },
  { id: '1GWmHeEDtpOw1WZQ--rBLiPkAIGKWMnwX', title: 'Ready, Set, Sing!', publisher: 'A-List', level: 'Early learners', tone: 'yellow' },
  { id: '1XXrOahvCyezLd1tX8MIlP8H9-v3yxFlo', title: 'Smart Up', publisher: 'A-List', level: 'Primary series', tone: 'blue' },
  { id: '1v_U1s0cxAV3FTSXdUabk6LxvFQe8fDRj', title: 'Wonderful World', publisher: 'National Geographic Learning', level: 'Reading series', tone: 'sky' },
]

const driveImage = (id) => `https://drive.google.com/thumbnail?id=${id}&sz=w1600`

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

function Header({ onBook, onLogin, onAccount, onLogout, onTeacherAccess, onAdminAccess, currentAccount }) {
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
          <a href="#teachers" onClick={closeMenu}>Teachers</a>
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
            <img src={driveImage(activeSlide.id)} alt={`${activeSlide.title} English learning book series`} loading={activeIndex === 0 ? 'eager' : 'lazy'} referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = `https://lh3.googleusercontent.com/d/${activeSlide.id}=w1600` }} />
          </div>
          <button className="curriculum-arrow curriculum-arrow--prev" onClick={() => showSlide(activeIndex - 1)} aria-label="Previous curriculum"><ChevronLeft size={23} /></button>
          <button className="curriculum-arrow curriculum-arrow--next" onClick={() => showSlide(activeIndex + 1)} aria-label="Next curriculum"><ChevronRight size={23} /></button>
          <div className="curriculum-carousel__progress" aria-hidden="true"><span key={activeIndex} /></div>
        </div>

        <div className="curriculum-thumbnails" role="tablist" aria-label="Choose curriculum slide">
          {curriculumSlides.map((slide, index) => <button role="tab" aria-selected={index === activeIndex} className={index === activeIndex ? 'active' : ''} onClick={() => showSlide(index)} key={slide.id}><img src={driveImage(slide.id)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = `https://lh3.googleusercontent.com/d/${slide.id}=w320` }} /><span>{slide.title}</span></button>)}
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

function TeacherShowcase({ onChooseTeacher }) {
  const teachers = getApprovedTeachers()

  return (
    <section className="section public-teachers" id="teachers">
      <div className="container">
        <div className="section-heading section-heading--split">
          <div><span className="kicker">Choose with confidence</span><h2>Meet the people behind every breakthrough.</h2></div>
          <p>Watch teacher introductions, compare experience and choose the educator who feels right for your child.</p>
        </div>
        <div className="public-teacher-grid">
          {teachers.length ? teachers.map((teacher) => (
            <article className="public-teacher-card" key={teacher.id}>
              <div className="public-teacher-card__video"><IntroVideo accountId={teacher.id} compact /></div>
              <div className="public-teacher-card__profile">
                <ProfilePhoto accountId={teacher.id} name={teacher.fullName} className="public-teacher-photo" />
                <div><span className="available"><i /> Available for students</span><h3>{teacher.fullName}</h3><p>{teacher.teacher.specialization}</p></div>
                <div className="public-teacher-rating"><Star size={15} fill="currentColor" /><strong>{teacher.teacher.rating || 'New'}</strong>{teacher.teacher.ratingCount > 0 && <small>({teacher.teacher.ratingCount})</small>}</div>
              </div>
              <p className="public-teacher-card__bio">{teacher.teacher.bio}</p>
              <div className="public-teacher-facts"><span><strong>{teacher.teacher.experience}</strong> years</span><span><strong>{teacher.teacher.lessonsCompleted || 0}</strong> lessons</span><span><strong>{teacher.teacher.languages?.split(',')[0]}</strong> language</span></div>
              <button className="button button--primary button--full" onClick={() => onChooseTeacher(teacher)}>Choose {teacher.fullName.split(' ')[0]} <ArrowRight size={17} /></button>
            </article>
          )) : <div className="public-teachers-empty"><span><Users size={28} /></span><div><h3>Teacher profiles are being prepared.</h3><p>Approved TutorPro English teachers will appear here as soon as their profiles are ready.</p></div></div>}
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
              <a href="#why">Why TutorPro English</a>
              <a href="#programmes">Programmes</a>
              <a href="#teachers">Teachers</a>
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
      />
      <main>
        <Hero onBook={openRegistration} />
        <Stats />
        <CurriculumCarousel onBook={openRegistration} />
        <WhyTutorPro />
        <Programmes />
        <HowItWorks onBook={openRegistration} />
        <TeacherShowcase onChooseTeacher={chooseTeacher} />
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
