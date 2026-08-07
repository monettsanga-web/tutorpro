import { lazy, Suspense, useEffect, useRef, useState } from 'react'
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
  Mail,
  MessageCircle,
  Phone,
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
const AdminDashboard = lazy(() => import('./Dashboards.jsx').then((m) => ({ default: m.AdminDashboard })))
const StudentDashboard = lazy(() => import('./Dashboards.jsx').then((m) => ({ default: m.StudentDashboard })))
const TeacherDashboard = lazy(() => import('./Dashboards.jsx').then((m) => ({ default: m.TeacherDashboard })))
import { getApprovedTeachers, getCurrentAccount, initializePlatform, logoutAccount, mergeCloudAccounts, updateAccount } from './auth.js'
import { canViewTeacherDirectory, loadSiteSettings, publiclyListedTeachers, subscribeToCloudSiteSettings, subscribeToSiteSettings } from './siteSettings.js'
import { captureAttribution } from './attribution.js'
import { clearHashRoute, readHashRoute } from './hashRoute.js'
import { getBookings, mergeCloudBookings } from './bookings.js'
import { fetchCloudBookings } from './cloudBookings.js'
import { fetchPublicTeachers, subscribeToCloudProfiles } from './cloudProfiles.js'
import { currentVisitorLocale, isChineseVisitor, subscribeToVisitorLocale } from './visitorLocale.js'
import { WEEKDAYS } from './schedule.js'
import { IntroVideo, ProfilePhoto, SampleClassPlayer } from './ProfileMedia.jsx'
import ChinaSafeVideo from './ChinaSafeVideo.jsx'
import SupportChatWidget from './SupportChatWidget.jsx'
import TrustpilotWidget from './TrustpilotWidget.jsx'

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
      'The Weekly plan is designed for 1–3 classes a week and is paid weekly. The Monthly Package is for 4–7 25-minute classes a week, billed monthly, with priority scheduling and a dedicated tutor.',
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
    <a className={`logo ${light ? 'logo--light' : ''}`} href="#top" aria-label="TutorPro Online English home">
      <span className="logo__mark" aria-hidden="true">
        <img src={assetUrl('assets/tutorpro-panda-logo.webp')} alt="" />
      </span>
      <span className="logo__text">
        Tutor<span>Pro</span><small>English</small>
      </span>
    </a>
  )
}

function Header({ onBook, onLogin, onAccount, onLogout, onTeacherAccess, onAdminAccess, currentAccount, onOpenTeachers, showTeachersLink = true }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const accountName = currentAccount?.parentName || currentAccount?.fullName || 'TutorPro Online English user'
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
          {showTeachersLink && <a href="#teachers" onClick={(e) => { e.preventDefault(); closeMenu(); onOpenTeachers(); }}>Teachers</a>}
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
          <TrustpilotWidget variant="mini" theme="dark" className="hero__trustpilot" />
          <div className="hero__proof" aria-label="TutorPro Online English benefits">
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
    <section className="stats" aria-label="TutorPro Online English at a glance">
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
        <em>TutorPro Online English materials</em>
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

/**
 * The class video, served from somewhere we control.
 *
 * PASTE THE VIDEO LINK HERE. Two options, both fine:
 *   1. A Supabase storage link (recommended - no file size worries):
 *      https://losmkvvwzijipqrlelyt.supabase.co/storage/v1/object/public/site-media/tutorpro-class.mp4
 *   2. A file placed in public/assets/, referenced as 'assets/tutorpro-class.mp4'
 *
 * Leave it as '' and the section shows the Bilibili card instead - nothing
 * breaks either way.
 *
 * It must be a direct link to the video FILE (ending .mp4), not a link to a
 * page that plays it. YouTube and Bilibili page links will not work here.
 */
const CLASS_VIDEO_URL = 'https://losmkvvwzijipqrlelyt.supabase.co/storage/v1/object/public/site-media/TutorPro%20Class.mp4'

/**
 * A real class clip, high on the homepage where visitors actually reach it.
 *
 * The video is served from our own domain because YouTube — and its embedded
 * players on third-party sites — are blocked in mainland China. bilibili.tv is
 * deliberately NOT embedded: it publishes no external player endpoint and
 * geo-restricts uploads, so it can only ever be a link.
 */
function SeeAClass() {
  return (
    <section className="section see-a-class" id="see-a-class">
      <div className="container see-a-class__grid">
        <div className="see-a-class__copy">
          <span className="kicker">See a real class</span>
          <h2>One minute inside a TutorPro lesson.</h2>
          <p>Phonics, reading and speaking practice with a real teacher and a real student. No actors, no script — just an ordinary class.</p>
        </div>
        {/* The video is served from our own Supabase storage, so it plays in
            the page for everyone including mainland China - no YouTube, no
            Bilibili, no third-party branding. The Bilibili link stays only as
            shareUrl: a safety net shown if the file itself ever fails. */}
        <ChinaSafeVideo
          src={CLASS_VIDEO_URL}
          autoPlay
          loop
          poster={assetUrl('assets/online-english-lesson.jpg')}
          shareUrl="https://www.bilibili.tv/en/video/4800493496966144"
          title="A real TutorPro Online English class"
          className="see-a-class__player"
        />
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
    {
      icon: Star,
      title: 'Built for children',
      text: 'A star and reward system celebrates effort, and quick reaction buttons let younger learners say "I understand" or "please repeat" without interrupting.',
      color: 'gold',
    },
    {
      icon: Sparkles,
      title: 'AI speech coach',
      text: 'Our AI speech coach scores pronunciation word by word during practice, so your child hears exactly how they sound and can play back the correct pronunciation.',
      color: 'coral',
    },
    {
      icon: BadgeCheck,
      title: 'Teachers you can check',
      text: 'Every teacher completes a recorded teaching interview and a qualifications review. View their profile and introduction video before you book.',
      color: 'blue',
    },
  ]

  return (
    <section className="section why" id="why">
      <div className="container">
        <div className="section-heading section-heading--split">
          <div>
            <span className="kicker">Why TutorPro Online English</span>
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

function CurriculumFramework() {
  const [locale, setLocale] = useState(currentVisitorLocale())

  useEffect(() => {
    const unsubscribe = subscribeToVisitorLocale(setLocale)
    return () => unsubscribe()
  }, [])

  const country = (locale.country || '').toUpperCase()
  // Rule: still english in the philippines!
  const isPH = country === 'PH'
  const isZH = !isPH && /^zh/i.test(locale.language || '')

  const textMap = {
    en: {
      title: 'Structured English Curriculum Framework',
      subtitle: 'Aligned with international CEFR levels, US Common Core State Standards (CCSS), and Cambridge English testing frameworks.',
      age: 'Age',
      grade: 'Grade Level',
      cefr: 'CEFR Level',
      ccss: 'US CCSS',
      cambridge: 'Cambridge Prep',
      outcomes: 'Learning Outcomes',
      swipe: '👈 Swipe horizontally to view full framework columns (Lv.0 to Lv.11) 👉',
      outcomes0_2: [
        'Master 26 letters and 44 basic phonics sounds.',
        'Able to blend and spell simple words.',
        'Gradually build a strong foundation for English reading.',
        'Communicate in simple, daily English conversations.'
      ],
      outcomes3_5: [
        'Fully master phonics blends and diphthongs.',
        'Develop active independent reading comprehension.',
        'Write simple compositions of 2-3 sentences.',
        'Engage in fluent, simple daily dialogues.'
      ],
      outcomes6_8: [
        'Express personal views, preferences, and ideas fluently.',
        'Write paragraph essays of up to 100 words.',
        'Master different literary and semantic styles.',
        'Proficiently apply multiple reading strategies.'
      ],
      outcomes9_11: [
        'Communicate fluently and naturally with native speakers on various academic and social topics.',
        'Develop analytical skills for complex texts, reaching US junior high school reading standards.'
      ]
    },
    zh: {
      title: '結構化英語課程體系框架',
      subtitle: '對標歐盟 CEFR 標準、美國共同核心州立標準（CCSS）及劍橋少兒英語考試大綱。',
      age: '年齡 Age',
      grade: '年級對應 Grade',
      cefr: 'CEFR 歐洲標準',
      ccss: '美國CCSS標準',
      cambridge: '劍橋考試準備',
      outcomes: '能力達成 Outcomes',
      swipe: '👈 左右滑動查看完整課程體系 (Lv.0 至 Lv.11) 👉',
      outcomes0_2: [
        '熟練掌握26個字母及44個基本發音及拼讀',
        '能夠拼讀和拼寫簡單單詞',
        '逐漸建立英語閱讀基礎',
        '使用英語進行較為簡單的日常溝通'
      ],
      outcomes3_5: [
        '完全掌握自然拼讀，會單個字母及字母組合的發音',
        '培養學生閱讀能力',
        '使用英語進行兩三句的寫作',
        '可以進行日常簡單說話'
      ],
      outcomes6_8: [
        '使學生能自如地用英語表達自己的觀點、喜好、想法',
        '能進行段落和100詞以內的短小篇寫作',
        '掌握不同文學語義的特點',
        '熟練使用不同的閱讀策略'
      ],
      outcomes9_11: [
        '能夠流暢地與英語母語使用者進行全方位的交流和交際，並能對各種主題進行研討與創造性協作。',
        '培養學生對於各種複雜問題的解讀能力，達到美國教育部要求的美國中學生閱讀水準。'
      ]
    }
  }

  const t = isZH ? textMap.zh : textMap.en

  return (
    <section className="section curriculum-framework" id="curriculum" style={{ background: '#090510', padding: '80px 0', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
      <div className="container">
        <div className="section-heading section-heading--center" style={{ marginBottom: '50px', textAlign: 'center' }}>
          <span className="kicker" style={{ color: '#bce94e', fontWeight: '900', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Educational Pedigree</span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.02em', marginTop: '8px' }}>
            {t.title}
          </h2>
          <p style={{ color: '#b9adc7', fontSize: '1.15rem', maxWidth: '600px', margin: '12px auto 0', lineHeight: '1.6' }}>
            {t.subtitle}
          </p>
        </div>

        {/* Responsive Scrolling Container */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: '#110925', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', marginBottom: '30px' }}>
          <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', textAlign: 'center', fontFamily: '"Manrope", sans-serif' }}>
            <thead>
              {/* Header Title Row */}
              <tr style={{ background: '#1e3a8a', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                <th colSpan={13} style={{ padding: '16px', color: '#fff', fontSize: '1.344rem', fontWeight: '900' }}>
                  Tutorpro English Philippines
                  <small style={{ display: 'block', fontSize: '1.037rem', fontWeight: '500', marginTop: '4px', opacity: 0.8 }}>{t.title}</small>
                </th>
              </tr>
              {/* Column labels */}
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ padding: '12px', color: '#bce94e', fontSize: '1.037rem', fontWeight: 'bold', width: '150px', background: 'rgba(255,255,255,0.02)' }}>{t.age}</th>
                {Array.from({ length: 12 }).map((_, i) => (
                  <th key={i} style={{ padding: '12px', color: '#fff', fontSize: '1.037rem', fontWeight: '800', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>Lv.{i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Grade Row */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <td style={{ padding: '14px', color: '#fff', fontSize: '1.015rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.02)' }}>
                  {t.grade}
                </td>
                <td style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem' }}>K1</td>
                <td style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>K2</td>
                <td style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>K3</td>
                <td style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>Pre-school</td>
                <td style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>Grade 1</td>
                <td style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>Grade 2</td>
                <td style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>Grade 3</td>
                <td style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>Grade 4</td>
                <td style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>Grade 5</td>
                <td style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>Grade 6</td>
                <td style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>Grade 7</td>
                <td style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>Grade 8</td>
              </tr>

              {/* CEFR Row */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <td style={{ padding: '14px', color: '#10b981', fontSize: '1.015rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.02)' }}>
                  {t.cefr}
                </td>
                <td colSpan={3} style={{ padding: '14px', color: '#fff', fontSize: '1.015rem', fontWeight: 'bold' }}>pre-A1</td>
                <td colSpan={3} style={{ padding: '14px', color: '#fff', fontSize: '1.015rem', fontWeight: 'bold', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>A1</td>
                <td colSpan={2} style={{ padding: '14px', color: '#fff', fontSize: '1.015rem', fontWeight: 'bold', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>A2</td>
                <td style={{ padding: '14px', color: '#fff', fontSize: '1.015rem', fontWeight: 'bold', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>A2+</td>
                <td colSpan={2} style={{ padding: '14px', color: '#fff', fontSize: '1.015rem', fontWeight: 'bold', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>B1</td>
                <td style={{ padding: '14px', color: '#fff', fontSize: '1.015rem', fontWeight: 'bold', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>B1+</td>
              </tr>

              {/* US CCSS Row */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <td style={{ padding: '14px', color: '#f59e0b', fontSize: '1.015rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.02)' }}>
                  {t.ccss}
                </td>
                <td colSpan={3} style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem' }}>GK</td>
                <td colSpan={3} style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>G1</td>
                <td colSpan={2} style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>G2</td>
                <td style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>G3</td>
                <td style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>G4</td>
                <td style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>G5</td>
                <td style={{ padding: '14px', color: '#b9adc7', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>G6</td>
              </tr>

              {/* Cambridge Row */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <td style={{ padding: '14px', color: '#a855f7', fontSize: '1.015rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.02)' }}>
                  {t.cambridge}
                </td>
                <td colSpan={3} style={{ padding: '14px', color: '#fff', fontSize: '1.015rem' }}>Towards Starters</td>
                <td colSpan={3} style={{ padding: '14px', color: '#fff', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>YLE Starters</td>
                <td colSpan={2} style={{ padding: '14px', color: '#fff', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>Start to Movers</td>
                <td style={{ padding: '14px', color: '#fff', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>Movers to Flyers</td>
                <td colSpan={2} style={{ padding: '14px', color: '#fff', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>Movers to Flyers / KET</td>
                <td style={{ padding: '14px', color: '#fff', fontSize: '1.015rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>PET</td>
              </tr>

              {/* Learning Outcomes Row */}
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <td style={{ padding: '20px 14px', color: '#ef4444', fontSize: '1.015rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.02)', verticalAlign: 'middle' }}>
                  {t.outcomes}
                </td>
                {/* Column 1 */}
                <td colSpan={3} style={{ padding: '20px 16px', fontSize: '0.978rem', color: '#b9adc7', textAlign: 'left', verticalAlign: 'top', lineHeight: '1.6' }}>
                  <ul style={{ listStyleType: 'disc', paddingLeft: '16px', margin: 0 }}>
                    {t.outcomes0_2.map((item, idx) => (
                      <li key={idx} style={idx > 0 ? { marginTop: '6px' } : undefined}>{item}</li>
                    ))}
                  </ul>
                </td>
                {/* Column 2 */}
                <td colSpan={3} style={{ padding: '20px 16px', fontSize: '0.978rem', color: '#b9adc7', textAlign: 'left', verticalAlign: 'top', lineHeight: '1.6', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                  <ul style={{ listStyleType: 'disc', paddingLeft: '16px', margin: 0 }}>
                    {t.outcomes3_5.map((item, idx) => (
                      <li key={idx} style={idx > 0 ? { marginTop: '6px' } : undefined}>{item}</li>
                    ))}
                  </ul>
                </td>
                {/* Column 3 */}
                <td colSpan={3} style={{ padding: '20px 16px', fontSize: '0.978rem', color: '#b9adc7', textAlign: 'left', verticalAlign: 'top', lineHeight: '1.6', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                  <ul style={{ listStyleType: 'disc', paddingLeft: '16px', margin: 0 }}>
                    {t.outcomes6_8.map((item, idx) => (
                      <li key={idx} style={idx > 0 ? { marginTop: '6px' } : undefined}>{item}</li>
                    ))}
                  </ul>
                </td>
                {/* Column 4 */}
                <td colSpan={3} style={{ padding: '20px 16px', fontSize: '0.978rem', color: '#b9adc7', textAlign: 'left', verticalAlign: 'top', lineHeight: '1.6', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                  <ul style={{ listStyleType: 'disc', paddingLeft: '16px', margin: 0 }}>
                    {t.outcomes9_11.map((item, idx) => (
                      <li key={idx} style={idx > 0 ? { marginTop: '6px' } : undefined}>{item}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Mobile touch scroll indicator */}
        <div style={{ textAlign: 'center', color: '#bce94e', fontSize: '0.956rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} className="mobile-scroll-tip">
          <span>{t.swipe}</span>
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

/**
 * Real parent testimonials.
 *
 * Every quote here is verbatim from a real parent review. Do not add, edit or
 * invent entries: fabricated testimonials breach Google and Trustpilot policy
 * and mislead families. Source and date are kept for provenance.
 */
const parentReviews = [
  {
    quote: 'Great Teachers, admins and customer service. My Son is a naughty one and hard to teach but he can now identify and read words. I\u2019ve enrolled him again.',
    name: 'James King',
    source: 'Facebook recommendation',
    date: '2021-12-09',
  },
  {
    quote: 'Very good teacher. Good pronounciation. Always punctual. Keeping up to date with parent regarding students progress. My son enjoy learning the class with experienced teacher. Recommended.',
    name: 'Syafiqah Izzati',
    source: 'Facebook recommendation',
    date: '2021-07-28',
  },
  {
    quote: 'Very recommended teacher. The teacher is very patient and children communicate, very will drive the atmosphere. Getting the child moving also lets the child know how to pronounce it.',
    name: 'Snoopy Fen',
    source: 'Facebook recommendation',
    date: '2021-08-06',
  },
  {
    quote: 'My 6Yr old loves the classes as the teacher tought Reading, writing & Memorising. I as a parent, Love the method of their teaching.',
    name: 'Sharmila Maniam',
    source: 'Facebook recommendation',
    date: '2021-08-09',
  },
]

function ParentReviews() {
  if (!parentReviews.length) return null
  return (
    <section className="section parent-reviews" id="reviews">
      <div className="container">
        <div className="section-heading section-heading--center">
          <span className="kicker">Parent reviews</span>
          <h2>What families say.</h2>
          <p>Real reviews from parents whose children learn with TutorPro Online English.</p>
        </div>
        <div className="parent-reviews__grid">
          {parentReviews.map((review) => (
            <figure className="parent-review" key={review.name + review.date}>
              <div className="parent-review__stars" aria-label="5 out of 5">
                {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <blockquote>{review.quote}</blockquote>
              <figcaption>
                <strong>{review.name}</strong>
                <small>{review.source} · {new Date(review.date).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</small>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

function PublicTeacherCard({ teacher, onChooseTeacher, onViewProfile }) {
  const [activeMedia, setActiveMedia] = useState('schedule')
  const profile = teacher.teacher || {}
  const reviews = getBookings({ teacherId: teacher.id })
    .filter((booking) => booking.studentRating?.score)
    .sort((a, b) => (b.studentRating?.createdAt || '').localeCompare(a.studentRating?.createdAt || ''))
    .slice(0, 3)
  const reviewAverage = reviews.length
    ? Math.round((reviews.reduce((sum, booking) => sum + Number(booking.studentRating.score || 0), 0) / reviews.length) * 10) / 10
    : (profile.rating || 0)
  const displayRating = reviewAverage || profile.rating || 'New'
  const completedLessons = profile.lessonsCompleted || 0
  const experience = Number(profile.experience || 0)
  const firstName = teacher.fullName?.split(' ')[0] || 'Teacher'
  const parentReview = reviews[0]
  const availabilitySlots = Array.isArray(profile.availabilitySlots) ? profile.availabilitySlots : []
  const availabilityByDay = WEEKDAYS.map((day, dayIndex) => ({
    day,
    times: availabilitySlots
      .filter((slot) => String(slot).startsWith(`${dayIndex}-`))
      .map((slot) => String(slot).split('-').slice(1).join('-'))
      .sort(),
  })).filter((item) => item.times.length)

  return (
    <article className="teacher-dashboard-profile-card">
      <div className="teacher-dashboard-profile-card__main">
        <div className="teacher-dashboard-profile-card__identity">
          <ProfilePhoto accountId={teacher.id} name={teacher.fullName} className="teacher-dashboard-profile-card__photo" />
          <div className="teacher-dashboard-profile-card__name-block">
            <div className="teacher-dashboard-profile-card__name-row">
              <h3>{teacher.fullName}</h3>
              <BadgeCheck size={18} fill="#1877f2" color="#1877f2" />
            </div>
            <p>{profile.specialization || 'English Teacher'} · {profile.languages || 'English'}</p>
            {teacher.status === 'approved' && <span className="teacher-dashboard-profile-card__top-badge">TOP Tutor</span>}
          </div>
          <button type="button" className="teacher-dashboard-profile-card__save" aria-label={`Save ${teacher.fullName}`}>♡</button>
        </div>

        <div className="teacher-dashboard-profile-card__stats">
          <div><strong>{experience || 'New'}</strong><span>Years experience</span></div>
          <div><strong>{completedLessons}+</strong><span>Lessons completed</span></div>
          <div><strong>{profile.credentials?.length || profile.education ? 'Verified' : 'Ready'}</strong><span>Qualifications</span></div>
          <div><strong>1-to-1</strong><span>Online classes</span></div>
        </div>

        <p className="teacher-dashboard-profile-card__bio">
          {profile.bio || "Enhance your child’s English skills with a friendly, patient tutor. Lessons are personalised for speaking confidence, grammar, reading and school success."}
        </p>

        <div className="teacher-dashboard-profile-card__tabs" role="group" aria-label="Teacher profile sections">
          <button type="button" className={activeMedia === 'schedule' ? 'active' : ''} onClick={() => setActiveMedia('schedule')}>Schedule</button>
          <button type="button" className={activeMedia === 'courses' ? 'active' : ''} onClick={() => setActiveMedia('courses')}>Courses</button>
          <button type="button" className={activeMedia === 'resume' ? 'active' : ''} onClick={() => setActiveMedia('resume')}>Resume</button>
          <button type="button" className={activeMedia === 'lessons' ? 'active' : ''} onClick={() => setActiveMedia('lessons')}>Lessons</button>
        </div>

        <div className="teacher-dashboard-profile-card__media">
          {activeMedia === 'schedule' && (
            availabilityByDay.length ? <div className="teacher-dashboard-profile-card__schedule-preview teacher-dashboard-profile-card__schedule-preview--real">
              {availabilityByDay.slice(0, 5).map((item) => <div key={item.day}><span>Available</span><strong>{item.day.slice(0, 3)}</strong><small>{item.times.slice(0, 4).join(' · ')}{item.times.length > 4 ? ' +' : ''}</small></div>)}
            </div> : <div className="teacher-dashboard-profile-card__empty-panel"><strong>Schedule being prepared</strong><span>This teacher’s available times will appear here after availability is saved.</span></div>
          )}
          {activeMedia === 'courses' && <div className="teacher-dashboard-profile-card__course-panel"><div><strong>Cambridge English</strong><span>Primary and Secondary support</span></div><div><strong>Oxford English</strong><span>Grammar, reading and writing</span></div><div><strong>Speaking Confidence</strong><span>Conversation and pronunciation</span></div><div><strong>School Support</strong><span>Homework, exams and progress goals</span></div></div>}
          {activeMedia === 'resume' && <div className="teacher-dashboard-profile-card__resume-panel"><div><span>Education</span><strong>{profile.education || 'Education details being updated'}</strong></div><div><span>Experience</span><strong>{experience || 0} year{experience === 1 ? '' : 's'} teaching experience</strong></div><div><span>Languages</span><strong>{profile.languages || 'English'}</strong></div><div><span>Credentials</span><strong>{profile.credentials?.length || 0} file{profile.credentials?.length === 1 ? '' : 's'} submitted</strong></div></div>}
          {activeMedia === 'lessons' && <div className="teacher-dashboard-profile-card__lesson-panel"><IntroVideo accountId={teacher.id} compact={false} /><SampleClassPlayer url={profile.sampleClassUrl} /></div>}
        </div>

        <div className="teacher-dashboard-profile-card__actions">
          <button className="teacher-dashboard-profile-card__view" type="button" onClick={() => onViewProfile?.(teacher)}>
            View full profile <ArrowUpRight size={16} />
          </button>
          <button className="teacher-dashboard-profile-card__cta" onClick={() => onChooseTeacher(teacher)}>
            Book Free Trial with {firstName} <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <aside className="teacher-dashboard-profile-card__side">
        <div className="teacher-dashboard-profile-card__review-box">
          <div className="teacher-dashboard-profile-card__review-head">
            <strong>Review ({reviews.length || profile.ratingCount || 0})</strong>
            <span>View all</span>
          </div>
          <div className="teacher-dashboard-profile-card__score">
            <strong>{displayRating}</strong>
            <span>{'★'.repeat(Math.round(Number(reviewAverage || profile.rating || 0)) || 5)}</span>
            <small>{reviews.length || profile.ratingCount || 0} reviews</small>
          </div>
          {['Qualification', 'Expertise', 'Communication', 'Value'].map((label, index) => (
            <div className="teacher-dashboard-profile-card__bar" key={label}>
              <span>{label}</span><i><b style={{ width: `${Math.max(68, 92 - index * 8)}%` }} /></i><em>{(4.9 - index * 0.2).toFixed(1)}</em>
            </div>
          ))}
        </div>

        {parentReview ? (
          <blockquote className="teacher-dashboard-profile-card__testimonial">
            <div><ProfilePhoto accountId={`${parentReview.studentId}-${parentReview.learnerId || 'student'}`} name={parentReview.learnerName || 'Parent'} className="teacher-dashboard-profile-card__reviewer" /><strong>{parentReview.learnerName || 'TutorPro parent'}</strong></div>
            <span>{'★'.repeat(Number(parentReview.studentRating.score || 0))}{'☆'.repeat(5 - Number(parentReview.studentRating.score || 0))}</span>
            <p>{parentReview.studentRating.comment || `Parent rated this class ${parentReview.studentRating.score}/5.`}</p>
          </blockquote>
        ) : (
          <blockquote className="teacher-dashboard-profile-card__testimonial">
            <div><span className="teacher-dashboard-profile-card__reviewer teacher-dashboard-profile-card__reviewer--empty">★</span><strong>Parent feedback</strong></div>
            <span>★★★★★</span>
            <p>Parent reviews from completed classes will appear here once students rate lessons.</p>
          </blockquote>
        )}
      </aside>
    </article>
  )
}


function PublicTeacherProfileDetail({ teacher, onBack, onChooseTeacher }) {
  const [activeMedia, setActiveMedia] = useState('intro')
  const profile = teacher.teacher || {}
  const reviews = getBookings({ teacherId: teacher.id })
    .filter((booking) => booking.studentRating?.score)
    .sort((a, b) => (b.studentRating?.createdAt || '').localeCompare(a.studentRating?.createdAt || ''))
  const average = reviews.length
    ? Math.round((reviews.reduce((sum, booking) => sum + Number(booking.studentRating.score || 0), 0) / reviews.length) * 10) / 10
    : (profile.rating || 0)
  const availabilitySlots = Array.isArray(profile.availabilitySlots) ? profile.availabilitySlots : []
  const availabilityByDay = WEEKDAYS.map((day, dayIndex) => ({
    day,
    times: availabilitySlots
      .filter((slot) => String(slot).startsWith(`${dayIndex}-`))
      .map((slot) => String(slot).split('-').slice(1).join('-'))
      .sort(),
  })).filter((item) => item.times.length)
  const firstName = teacher.fullName?.split(' ')[0] || 'Teacher'

  return (
    <section className="section public-teacher-profile-detail-section">
      <div className="container">
        <button className="teacher-profile-detail-back" onClick={onBack}><ChevronLeft size={16} /> Back to teachers</button>
        <article className="public-teacher-profile-detail">
          <div className="public-teacher-profile-detail__cover">
            <span>TutorPro Online English Teacher</span>
            <button className="button button--primary" onClick={() => onChooseTeacher(teacher)}>Book Free Trial <ArrowRight size={16} /></button>
          </div>
          <div className="public-teacher-profile-detail__identity">
            <ProfilePhoto accountId={teacher.id} name={teacher.fullName} className="public-teacher-profile-detail__photo" />
            <div>
              <div className="public-teacher-profile-detail__name"><h1>{teacher.fullName}</h1><BadgeCheck size={24} fill="#1877f2" color="#1877f2" /></div>
              <p>{profile.specialization || 'Professional English Teacher'} · {profile.languages || 'English'}</p>
              <div className="public-teacher-profile-detail__badges"><span>1-to-1 classes</span><span>{Number(profile.experience || 0)} years experience</span><span>{profile.education || 'Education verified'}</span></div>
            </div>
            <div className="public-teacher-profile-detail__rating"><Star size={20} fill="#facc15" color="#facc15" /><strong>{average || 'New'}</strong><small>{reviews.length || profile.ratingCount || 0} reviews</small></div>
          </div>

          <div className="public-teacher-profile-detail__grid">
            <main>
              <section className="public-teacher-profile-panel">
                <div className="public-teacher-profile-panel__tabs">
                  <button className={activeMedia === 'intro' ? 'active' : ''} onClick={() => setActiveMedia('intro')}>Intro video</button>
                  <button className={activeMedia === 'sample' ? 'active' : ''} onClick={() => setActiveMedia('sample')}>Sample class</button>
                  <button className={activeMedia === 'schedule' ? 'active' : ''} onClick={() => setActiveMedia('schedule')}>Schedule</button>
                </div>
                <div className="public-teacher-profile-panel__media">
                  {activeMedia === 'intro' && <IntroVideo accountId={teacher.id} compact={false} />}
                  {activeMedia === 'sample' && <SampleClassPlayer url={profile.sampleClassUrl} />}
                  {activeMedia === 'schedule' && (availabilityByDay.length ? <div className="public-teacher-profile-schedule">{availabilityByDay.map((item) => <div key={item.day}><strong>{item.day}</strong><span>{item.times.slice(0, 8).join(' · ')}{item.times.length > 8 ? ' +' : ''}</span></div>)}</div> : <div className="public-teacher-profile-empty"><strong>Schedule being prepared</strong><span>This teacher’s available times will appear after approval and setup.</span></div>)}
                </div>
              </section>

              <section className="public-teacher-profile-panel">
                <span className="kicker">About the teacher</span>
                <h2>Teaching introduction</h2>
                <p className="public-teacher-profile-detail__bio">{profile.bio || 'A warm TutorPro Online English teacher ready to help your child build speaking confidence, grammar accuracy and reading fluency.'}</p>
              </section>

              <section className="public-teacher-profile-panel public-teacher-profile-resume">
                <span className="kicker">Resume</span>
                <h2>Qualifications and experience</h2>
                <div><span>Education</span><strong>{profile.education || 'To be updated'}</strong></div>
                <div><span>Experience</span><strong>{Number(profile.experience || 0)} year{Number(profile.experience || 0) === 1 ? '' : 's'}</strong></div>
                <div><span>Languages</span><strong>{profile.languages || 'English'}</strong></div>
                <div><span>Credentials</span><strong>{profile.credentials?.length || 0} submitted</strong></div>
              </section>
            </main>

            <aside>
              <section className="public-teacher-profile-panel public-teacher-profile-review-box">
                <div><span className="kicker">Parent reviews</span><a href="#teacher-reviews">View all</a></div>
                <strong>{average || 'New'}</strong>
                <p>{reviews.length ? `${reviews.length} parent review${reviews.length === 1 ? '' : 's'} from completed classes` : 'Reviews from completed classes will appear here.'}</p>
                {['Qualification', 'Expertise', 'Communication', 'Value'].map((label, index) => <div className="teacher-dashboard-profile-card__bar" key={label}><span>{label}</span><i><b style={{ width: `${Math.max(70, 95 - index * 7)}%` }} /></i><em>{(4.9 - index * 0.15).toFixed(1)}</em></div>)}
              </section>

              <section className="public-teacher-profile-panel public-teacher-profile-cta">
                <h2>Ready to meet {firstName}?</h2>
                <p>Book a free first class and see if this teacher is the right match for your child.</p>
                <button className="button button--primary button--full" onClick={() => onChooseTeacher(teacher)}>Book Free Trial <ArrowRight size={16} /></button>
              </section>
            </aside>
          </div>

          <section id="teacher-reviews" className="public-teacher-profile-panel public-teacher-profile-reviews-list">
            <span className="kicker">What parents say</span>
            <h2>Class reviews</h2>
            {reviews.length ? reviews.map((booking) => <blockquote key={booking.id}><span>{'★'.repeat(Number(booking.studentRating.score || 0))}{'☆'.repeat(5 - Number(booking.studentRating.score || 0))}</span><p>{booking.studentRating.comment || `Parent rated this class ${booking.studentRating.score}/5.`}</p><small>{booking.learnerName || 'TutorPro learner'} · {booking.studentRating.createdAt ? new Date(booking.studentRating.createdAt).toLocaleDateString('en') : 'recently'}</small></blockquote>) : <div className="public-teacher-profile-empty"><strong>No published reviews yet</strong><span>Parent reviews will appear after completed and rated lessons.</span></div>}
          </section>
        </article>
      </div>
    </section>
  )
}

function TeacherShowcase({ onChooseTeacher, onBack }) {
  // Teachers the admin has switched off in the dashboard never reach parents.
  const teachers = publiclyListedTeachers(getApprovedTeachers())
  const [selectedTeacherProfile, setSelectedTeacherProfile] = useState(null)

  if (selectedTeacherProfile) return <PublicTeacherProfileDetail teacher={selectedTeacherProfile} onBack={() => setSelectedTeacherProfile(null)} onChooseTeacher={onChooseTeacher} />

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
              fontSize: '1rem',
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
          <p style={{ color: '#b9adc7', fontSize: '1.135rem', lineHeight: '1.6', maxWidth: '480px' }}>
            Compare credentials, read friendly superpowers, and switch between their presentation video and a live sample class recording to find the perfect educator.
          </p>
        </div>
        <div className="public-teacher-grid public-teacher-grid--dashboard">
          {teachers.length ? teachers.map((teacher) => (
            <PublicTeacherCard key={teacher.id} teacher={teacher} onChooseTeacher={onChooseTeacher} onViewProfile={setSelectedTeacherProfile} />
          )) : <div className="public-teachers-empty" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <span style={{ display: 'inline-block', padding: '16px', background: 'rgba(120, 80, 201, 0.1)', color: '#bce94e', borderRadius: '50%', marginBottom: '12px' }}><Users size={32} /></span>
            <div>
              <h3 style={{ fontSize: '1.344rem', color: '#fff', marginBottom: '6px' }}>Teacher profiles are being prepared.</h3>
              <p style={{ color: '#b9adc7', fontSize: '1.037rem' }}>Approved TutorPro Online English teachers will appear here as soon as their profiles are ready.</p>
            </div>
          </div>}
        </div>
      </div>
    </section>
  )
}

function GlobalDiscovery({ onBook }) {
  const comparisonPoints = [
    '1-to-1 online English classes for kids and teens worldwide',
    'Cambridge and Oxford-aligned lessons for Primary and Secondary learners',
    'Flexible weekly plans and monthly packages for consistent progress',
    'A focused alternative for families comparing Novakid, 51Talk, Preply and other online English platforms',
  ]

  return (
    <section className="global-discovery" id="online-english-classes">
      <div className="container global-discovery__grid">
        <div className="global-discovery__content">
          <span className="kicker">Global online English classes</span>
          <h2>Looking for a Novakid, 51Talk or Preply alternative?</h2>
          <p>
            TutorPro Online English helps families around the world find personalised online English classes for children,
            with friendly 1-to-1 tutoring, school-aligned support and transparent lesson packages.
          </p>
          <ul>
            {comparisonPoints.map((point) => <li key={point}><Check size={16} /> {point}</li>)}
          </ul>
          <div className="global-discovery__actions">
            <button className="button button--primary" onClick={() => onBook('Global online English classes')}>
              Start online English classes <ArrowRight size={17} />
            </button>
            <a className="button button--outline" href="/online-english-alternatives.html">Compare alternatives <ArrowUpRight size={17} /></a>
          </div>
        </div>
        <div className="global-discovery__panel" aria-label="Popular search terms TutorPro Online English supports">
          <span>Popular searches</span>
          {[
            'online English classes for kids',
            'English tutor online for children',
            'Cambridge English tutor online',
            'Oxford English classes online',
            'Novakid alternative',
            '51Talk alternative',
            'Preply alternative for kids',
          ].map((term) => <strong key={term}>{term}</strong>)}
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
            <p className="price-card__cadence">4–7 classes per week · pay monthly</p>
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

function FacebookMessengerContact() {
  const [locale, setLocale] = useState(currentVisitorLocale)
  const chineseVisitor = isChineseVisitor(locale)

  useEffect(() => subscribeToVisitorLocale(setLocale), [])

  if (chineseVisitor) {
    return <SupportChatWidget />
  }

  return (
    <a className="messenger-float" href="https://m.me/526047974195321" target="_blank" rel="noreferrer" aria-label="Message TutorPro Online English on Facebook Messenger">
      <MessageCircle size={21} />
      <span><strong>Need help?</strong><small>Open Messenger</small></span>
    </a>
  )
}


function ChinaMobileStudentPrompt({ currentAccount }) {
  const [locale, setLocale] = useState(currentVisitorLocale)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches)
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('tutorpro_cn_mobile_prompt') === '1' } catch { return false }
  })

  useEffect(() => subscribeToVisitorLocale(setLocale), [])
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)')
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  if (currentAccount || dismissed || !isMobile || !isChineseVisitor(locale) || window.location.pathname.startsWith('/cn')) return null

  const close = () => {
    setDismissed(true)
    try { sessionStorage.setItem('tutorpro_cn_mobile_prompt', '1') } catch { /* ignore */ }
  }

  return (
    <aside className="china-mobile-student-prompt" aria-label="Open China mobile student website">
      <div><strong>中文学生手机版</strong><small>为中国家长优化：学生登录、免费试听、中文说明和 VooV 课堂指引。</small></div>
      <a href="/cn/">打开</a>
      <button type="button" onClick={close} aria-label="Close">×</button>
    </aside>
  )
}

function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem('tutorpro_pwa_dismissed') === '1' } catch { return false }
  })

  useEffect(() => {
    const handlePrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const install = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    await installPrompt.userChoice.catch(() => null)
    setInstallPrompt(null)
  }

  const dismiss = () => {
    setDismissed(true)
    try { sessionStorage.setItem('tutorpro_pwa_dismissed', '1') } catch { /* ignore */ }
  }

  if (!installPrompt || installed || dismissed) return null

  return (
    <aside className="pwa-install-card" aria-label="Install TutorPro Online English Classroom app">
      <div><span>📱</span><strong>Install TutorPro Classroom</strong><small>Add the website as an app on your laptop or phone.</small></div>
      <button type="button" onClick={install}>Install app</button>
      <button type="button" className="pwa-install-card__close" onClick={dismiss} aria-label="Dismiss install prompt">×</button>
    </aside>
  )
}

function Footer({ onRegister, onLogin, onAccount, onTeacherAccess, onAdminAccess, currentAccount, onOpenTeachers, showTeachersLink = true }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__main">
          <div className="footer__brand">
            <Logo light />
            <p>Personalised English tutoring for confident, capable learners.</p>
            <span>Cambridge & Oxford aligned</span>
            <TrustpilotWidget variant="mini" theme="dark" className="footer__trustpilot" />
          </div>
          <div className="footer__links">
            <div>
              <h3>Explore</h3>
              <a href="#why">Why TutorPro Online English</a>
              <a href="#programmes">Programmes</a>
              {showTeachersLink && <a href="#teachers" onClick={(e) => { e.preventDefault(); onOpenTeachers(); }}>Teachers</a>}
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
            <div>
              <h3>By age</h3>
              <a href="/pricing.html">Pricing &amp; plans</a>
              <a href="/english-for-kids-ages-4-7.html">English for ages 4–7</a>
              <a href="/english-for-kids-ages-8-11.html">English for ages 8–11</a>
              <a href="/english-for-teens-ages-12-16.html">English for teens 12–16</a>
            </div>
            <div>
              <h3>Company</h3>
              <a href="/about.html">About us</a>
              <a href="/is-tutorpro-legitimate.html">Are we legitimate?</a>
              <a href="/contact.html">Contact</a>
              <a href="/privacy-policy.html">Privacy policy</a>
              <a href="/terms.html">Terms of service</a>
              <a href="/refund-policy.html">Refund policy</a>
            </div>
            <div className="footer__contact">
              <h3>Contact us</h3>
              <a href="mailto:sejongenglish@yahoo.com"><Mail size={15} /> <span>sejongenglish@yahoo.com</span></a>
              <a href="tel:+639625284849"><Phone size={15} /> <span>+63 962 528 4849</span></a>
              <a href="https://www.facebook.com/tutorproenglish" target="_blank" rel="noreferrer"><MessageCircle size={15} /> <span>Facebook Page</span></a>
              <a className="footer__whatsapp" href="https://m.me/526047974195321" target="_blank" rel="noreferrer"><MessageCircle size={15} /> <span>Chat on Messenger</span></a>
              <a className="footer__whatsapp" href="https://wa.me/639625284849" target="_blank" rel="noreferrer"><MessageCircle size={15} /> <span>Chat on WhatsApp</span></a>
            </div>
          </div>
        </div>
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} TutorPro Online English · Registered with DTI, Reg. No. 5274092</span>
          <a className="footer__credit" href="https://www.pexels.com/photo/7014777/">Learning photo via Pexels</a>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  // Landing pages link back with ?book=1 so the registration form is already
  // open on arrival, instead of asking the parent to find the button again.
  // Resolved during the first render so there is no extra pass.
  const [authOpen, setAuthOpen] = useState(() => {
    try {
      return new URL(window.location.href).searchParams.get('book') === '1' && !getCurrentAccount()
    } catch { return false }
  })
  const [authMode, setAuthMode] = useState('register')
  const [roleAccess, setRoleAccess] = useState(null)
  const [activePortal, setActivePortal] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [preferredTeacher, setPreferredTeacher] = useState(null)
  const [teacherVersion, setTeacherVersion] = useState(0)
  const [showPublicTeachers, setShowPublicTeachers] = useState(false)
  const [settingsVersion, setSettingsVersion] = useState(0)
  const [incomingReferralCode] = useState(() => {
    try {
      const code = new URL(window.location.href).searchParams.get('ref') || localStorage.getItem('tutorpro_pending_referral_code') || ''
      if (code) localStorage.setItem('tutorpro_pending_referral_code', code.toUpperCase())
      return code.toUpperCase()
    } catch { return '' }
  })

  useEffect(() => {
    const url = new URL(window.location.href)
    const hashParams = new URLSearchParams((url.hash || '').replace(/^#/, ''))
    const isRecovery = url.searchParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery' || url.hash === '#reset-password'
    if (isRecovery) {
      setAuthMode('reset-password')
      setAuthOpen(true)
      setRoleAccess(null)
    }
  }, [])

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

  // Record which channel sent this visitor (UTM tags / referrer) so the admin
  // funnel can credit sign-ups to the post or ad that earned them.
  useEffect(() => { captureAttribution() }, [])


  // Website settings the admin controls (currently teacher-directory visibility).
  // Read from cache instantly, then refreshed from Supabase and kept live.
  useEffect(() => {
    const bump = () => setSettingsVersion((version) => version + 1)
    const unsubscribe = subscribeToSiteSettings(bump)
    const unsubscribeCloud = subscribeToCloudSiteSettings()
    loadSiteSettings().then(bump)
    return () => { unsubscribe(); unsubscribeCloud() }
  }, [])

  const [currentAccount, setCurrentAccount] = useState(() => {
    initializePlatform()
    return getCurrentAccount()
  })

  // Reopen the dashboard the URL points at (#/admin/funnel) after a refresh.
  // Previously the session was restored but activePortal stayed null, so a
  // logged-in user was dropped back on the public homepage on every reload.
  //
  // This must run AFTER currentAccount, because that initialiser is what calls
  // initializePlatform() and migrates stored accounts. Reading the session any
  // earlier returns null and the dashboard never reopens.
  //
  // The requested role is only honoured when it matches the signed-in
  // account's own role, so editing the hash cannot escalate a student to admin.
  useEffect(() => {
    if (activePortal || !currentAccount) return
    const route = readHashRoute()
    if (!route) return
    const role = String(currentAccount.role || 'student').toLowerCase()
    const wanted = route.role === 'parent' ? 'student' : route.role
    // setState in an effect is deliberate here and cannot be hoisted into
    // useState: this must run AFTER initializePlatform(), which only happens
    // inside the currentAccount initialiser above. Reading the session any
    // earlier returns null and the dashboard silently fails to reopen.
    // It runs at most once per load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (wanted === role) setActivePortal(role)
    else clearHashRoute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount])
  void teacherVersion

  // Admin setting: public / parents-only / hidden. Teachers and admins always
  // keep access so they can check exactly what parents will see.
  void settingsVersion
  const teachersVisible = canViewTeacherDirectory(currentAccount)

  useEffect(() => {
    let active = true
    const refreshTeachers = async () => {
      try {
        const [teachers, sharedBookings] = await Promise.all([fetchPublicTeachers(), fetchCloudBookings().catch(() => [])])
        if (!active) return
        mergeCloudAccounts(teachers)
        if (sharedBookings.length) mergeCloudBookings(sharedBookings)
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
    clearHashRoute()
  }

  if (activePortal && currentAccount) {
    const portalProps = {
      account: currentAccount,
      onHome: () => { clearHashRoute(); setActivePortal(null) },
      onLogout: logout,
    }
    const portalFallback = (
      <div className="portal-boot" role="status" aria-live="polite">
        <span className="portal-boot__spinner" aria-hidden="true" />
        <strong>Loading your dashboard…</strong>
      </div>
    )
    if (activePortal === 'admin') return <Suspense fallback={portalFallback}><AdminDashboard {...portalProps} /></Suspense>
    if (activePortal === 'teacher') return <Suspense fallback={portalFallback}><TeacherDashboard {...portalProps} onAccountChange={setCurrentAccount} /></Suspense>
    return <Suspense fallback={portalFallback}><StudentDashboard {...portalProps} onAccountChange={setCurrentAccount} /></Suspense>
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
        showTeachersLink={teachersVisible}
      />
      {!currentAccount && (
        <div className="mobile-guest-action-bar" aria-label="Student account actions">
          <button type="button" onClick={openLogin}>Student login</button>
          <button type="button" className="primary" onClick={() => openRegistration('Mobile quick registration')}>Book free class</button>
        </div>
      )}
      {showPublicTeachers && teachersVisible ? (
        <main>
          <TeacherShowcase onChooseTeacher={chooseTeacher} onBack={() => { setShowPublicTeachers(false); window.scrollTo(0, 0); }} />
        </main>
      ) : (
        <main>
          <Hero onBook={openRegistration} />
          <Stats />
          <SeeAClass />
          <CurriculumCarousel onBook={openRegistration} />
          <WhyTutorPro />
          <GlobalDiscovery onBook={openRegistration} />
          <Programmes />
          <CurriculumFramework />
          <HowItWorks onBook={openRegistration} />
          <ParentReviews />
          <Pricing onBook={openRegistration} />
          <FAQ onBook={openRegistration} />
          <FinalCTA onBook={openRegistration} />
        </main>
      )}
      {currentAccount && <FacebookMessengerContact />}
      <ChinaMobileStudentPrompt currentAccount={currentAccount} />
      <PWAInstallPrompt />
      <Footer
        onRegister={openRegistration}
        onLogin={openLogin}
        onAccount={openAccount}
        onTeacherAccess={() => openRoleAccess('teacher')}
        onAdminAccess={() => openRoleAccess('admin')}
        currentAccount={currentAccount}
        onOpenTeachers={() => setShowPublicTeachers(true)}
        showTeachersLink={teachersVisible}
      />
      {authOpen && (
        <AuthModal
          initialMode={authMode}
          selectedPlan={selectedPlan}
          preferredTeacher={preferredTeacher}
          referralCode={incomingReferralCode}
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
