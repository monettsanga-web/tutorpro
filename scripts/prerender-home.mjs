/**
 * Pre-render crawlable homepage content into dist/index.html.
 *
 * WHY THIS EXISTS
 * ---------------
 * TutorPro is a Vite single-page app, so the shipped HTML body was literally
 * `<div id="root"></div>`. Search engines, social scrapers, and Google Ads
 * quality checks that read the raw HTML saw zero words of content.
 *
 * This script injects a static, accurate copy of the homepage's key content
 * into that root div at build time. React then hydrates over it and replaces
 * it with the live app, so users see no difference at all.
 *
 * IMPORTANT: the text below must stay in sync with src/App.jsx. Serving
 * different content to crawlers than to users is cloaking and can get a site
 * penalised. Everything here is copied verbatim from the real homepage.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const distIndex = resolve(here, '..', 'dist', 'index.html')

/* Copy mirrored from src/App.jsx — keep these in sync. */
const HERO = {
  eyebrow: 'Cambridge & Oxford aligned',
  heading: 'English confidence, built one lesson at a time.',
  lede: 'Personalised 1-to-1 online tutoring that helps Primary and Secondary students speak up, write clearly and thrive at school.',
  proof: ['No commitment', 'From $8 per class', 'Flexible times'],
}

const SECTIONS = [
  {
    heading: 'Great lessons start with brilliant materials.',
    body: 'Every TutorPro class uses structured courseware aligned to Cambridge and Oxford English, with reading, speaking, grammar and vocabulary built into each lesson. We teach from recognised published series including Cambridge Power Up, Power Up Academy, Global English and THiNK, Oxford Family and Friends, Everybody Up and Grammar Friends, plus dedicated phonics programmes for early readers. Your child is never working from improvised worksheets.',
  },
  {
    heading: 'Less pressure. More progress.',
    body: 'One-to-one attention means your child speaks for the whole lesson instead of waiting their turn in a group class. Tutors adapt the pace to the learner, not the other way round. A shy child is never talked over, and a confident child is never held back. If something is not working, the teacher changes the approach in that same lesson rather than at the end of a term.',
  },
  {
    heading: 'What actually happens in a lesson.',
    body: 'Classes run for 25 or 50 minutes inside our own browser-based classroom. There is no Zoom link, no download and no separate meeting software: your child clicks once from their dashboard and the lesson begins. The teacher shares interactive slides on a shared lesson board, both can write and draw on it together, and the whole session is speaking-led. Lessons typically move through a warm-up conversation, new vocabulary, guided practice, a reading or listening task, then free speaking to consolidate what was learned.',
  },
  {
    heading: 'Built for children, not repurposed from adult lessons.',
    body: 'The classroom includes a star and reward system that celebrates effort, quick reaction buttons so a younger child can signal "I understand" or "please repeat" without interrupting, and English learning games covering vocabulary, sentence building and grammar. An AI speech coach listens during practice and scores pronunciation word by word, so children get instant feedback on how they sound and can hear the correct pronunciation played back.',
  },
  {
    heading: 'Made for their school years.',
    body: 'Programmes cover Primary and Secondary learners, supporting school English, exam preparation, conversation confidence and writing skills. Primary learners in Years 1 to 6 focus on phonics, reading fluency, everyday vocabulary and the confidence to speak in full sentences. Secondary learners in Years 7 to 11 move into structured writing, comprehension, analysis and the language skills needed for IGCSE-style English assessment.',
  },
  {
    heading: 'Parents can see exactly what is happening.',
    body: 'After each class the teacher writes feedback covering what was practised, what went well and what to work on next, along with specific words to practise at home. Every practice word can be tapped to hear it pronounced correctly, with a slower option for tricky sounds. Parents also get homework assignments, attendance records, progress tracking and a digital library of reading and grammar resources, all in one dashboard.',
  },
  {
    heading: 'Lessons can be recorded so you never miss a class.',
    body: 'Teachers can record a lesson so parents can watch it back later. Recordings are private to your family and your teacher, and a clear red indicator shows in the classroom whenever recording is active. This is useful for revising new vocabulary, for parents who could not sit in on the class, or for showing a child their own progress over time.',
  },
  {
    heading: 'Teachers you can check before you book.',
    body: 'Every teacher applies through a structured process that includes a recorded teaching interview and a review of their qualifications and teaching experience. You can view teacher profiles, qualifications and introduction videos before booking, so you know who will be teaching your child rather than being assigned an anonymous tutor.',
  },
  {
    heading: 'Looking for a Novakid, 51Talk or Preply alternative?',
    body: 'Families comparing online English schools choose TutorPro Online English for genuine one-to-one lessons, Cambridge and Oxford aligned courseware, transparent pricing from $8 per 25-minute class, and a free first class with no commitment. Unlike platforms that move children into group speaking clubs as they progress, every TutorPro lesson stays one-to-one. Our published rate is lower than the entry price of most major online English schools for children, and there is no long contract to sign.',
  },
  {
    heading: 'Choose your child’s rhythm.',
    body: 'The Weekly plan suits 1–3 classes a week at $10 per class and is paid weekly. The Monthly Package covers 4–7 classes of 25 minutes each week at $8 per class, billed monthly, with priority scheduling and a dedicated tutor. Lesson times shown in your dashboard are automatically converted to your own local timezone, so there is no mental arithmetic when booking from another country.',
  },
  {
    heading: 'Simple, honest pricing.',
    body: 'Classes start from $8 per 25-minute lesson, with 50-minute lessons available for older learners. The first class is free for every new family, with no card required to try it. Prices are published on this page rather than hidden behind a sales call, unused lesson credits can be refunded within 14 days of purchase, and cancelling at least 12 hours before a lesson returns the credit in full.',
  },
  {
    heading: 'Learning from anywhere in the world.',
    body: 'TutorPro Online English teaches families worldwide from our teaching base in the Philippines. The site detects your language and shows lesson times in your local timezone automatically, and the classroom is designed to work on ordinary home internet connections on a laptop, desktop or tablet.',
  },
]

/* Mirrored from the `faqs` array in src/App.jsx. */
const FAQS = [
  {
    question: 'What curricula do you follow?',
    answer: 'Lessons are aligned with Cambridge and Oxford English curricula for Primary and Secondary students. Your tutor will adapt each class to your child’s year level, current goals and schoolwork.',
  },
  {
    question: 'Is the first class really free?',
    answer: 'Yes. New students can take a free first class before choosing a plan. It is a chance to meet the tutor, discuss goals and experience the teaching approach with no commitment.',
  },
  {
    question: 'What is the difference between the plans?',
    answer: 'The Weekly plan is designed for 1–3 classes a week and is paid weekly. The Monthly Package is for 4–7 25-minute classes a week, billed monthly, with priority scheduling and a dedicated tutor.',
  },
  {
    question: 'Can I change plans later?',
    answer: 'Yes. You can start with the rhythm that works now and change as your child’s schedule or learning goals evolve.',
  },
  {
    question: 'How do online classes work?',
    answer: 'Create a family account, complete your child’s learning profile and choose a lesson rhythm. We use those details to prepare the right one-to-one support and track progress from class to class.',
  },
  {
    question: 'How much do online English classes for kids cost?',
    answer: 'Classes start from $8 per 25-minute one-to-one lesson on the Monthly Package (4–7 classes a week), or $10 per class on the Weekly plan (1–3 classes a week). The first class is free and no card is required to try it.',
  },
  {
    question: 'What age should my child start learning English?',
    answer: 'Children can start as early as four, when lessons focus on listening, phonics and simple spoken words through songs and games. There is no age that is too late: Primary learners build reading fluency and everyday vocabulary, while Secondary learners work on writing, comprehension and exam preparation.',
  },
  {
    question: 'How long is each lesson?',
    answer: 'Lessons are 25 or 50 minutes. Most younger children do best with 25 minutes, which matches their natural attention span, while older learners preparing for exams often prefer 50-minute sessions.',
  },
  {
    question: 'Do I need Zoom or any software to join?',
    answer: 'No. Lessons run inside our own browser-based classroom. Your child clicks once from their dashboard and the class begins, with no downloads, no meeting links and no separate accounts.',
  },
  {
    question: 'Can I watch or review my child’s lesson?',
    answer: 'Yes. Teachers can record lessons so parents can watch them back later. Recordings stay private to your family and the teacher, and a clear indicator shows in the classroom whenever a lesson is being recorded.',
  },
  {
    question: 'What if we need to cancel a lesson?',
    answer: 'Cancel at least 12 hours before the lesson and the credit returns to your account in full. If a teacher ever has to cancel, or a lesson fails because of a problem on our side, you always get the credit back.',
  },
  {
    question: 'Are the teachers qualified?',
    answer: 'Every teacher goes through a structured application that includes a recorded teaching interview and a review of their qualifications and experience. You can view teacher profiles, qualifications and introduction videos before booking a class.',
  },
  {
    question: 'What time are lessons available in my country?',
    answer: 'Our teaching base is Manila time (UTC+8), and lesson times in your dashboard are automatically converted to your own local timezone. Weekend slots are available and are often the most convenient option for families in Europe.',
  },
]

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

/**
 * The markup lives inside #root. React's hydration replaces it on mount,
 * so this is what crawlers and no-JS visitors see, and nothing more.
 */
function buildStaticHtml() {
  const sections = SECTIONS.map((section) => `
        <section>
          <h2>${escapeHtml(section.heading)}</h2>
          <p>${escapeHtml(section.body)}</p>
        </section>`).join('')

  const faqItems = FAQS.map((faq) => `
          <div>
            <h3>${escapeHtml(faq.question)}</h3>
            <p>${escapeHtml(faq.answer)}</p>
          </div>`).join('')

  return `
    <div id="prerendered-home">
      <header>
        <p>${escapeHtml(HERO.eyebrow)}</p>
        <h1>${escapeHtml(HERO.heading)}</h1>
        <p>${escapeHtml(HERO.lede)}</p>
        <p>${HERO.proof.map(escapeHtml).join(' · ')}</p>
        <p><a href="/?action=book">Book a free first class</a> · <a href="#programmes">Explore programmes</a></p>
      </header>
${sections}
      <section>
        <h2>Questions, answered.</h2>
${faqItems}
      </section>
      <footer>
        <p>TutorPro Online English — online English classes for kids and teens worldwide. Cambridge and Oxford aligned tutors, flexible scheduling, free first class.</p>
        <p><a href="/english-for-kids-ages-4-7.html">English classes for ages 4–7</a> · <a href="/english-for-kids-ages-8-11.html">English classes for ages 8–11</a> · <a href="/english-for-teens-ages-12-16.html">English for teenagers 12–16</a></p>
        <p><a href="/about.html">About us</a> · <a href="/contact.html">Contact</a> · <a href="/privacy-policy.html">Privacy policy</a> · <a href="/terms.html">Terms of service</a> · <a href="/refund-policy.html">Refund policy</a></p>
      </footer>
    </div>`
}

/**
 * Course schema for the four programmes.
 *
 * WHY Course AND NOT AggregateRating ON THE ORGANISATION:
 * Google's self-serving review policy (2019, restated Dec 2025) makes pages using
 * Organization / LocalBusiness schema — including EducationalOrganization — ineligible
 * for star rich results when the business controls its own reviews. Course is one of the
 * few types still eligible, so this is the correct home for ratings.
 *
 * Ratings are deliberately NOT included yet: no lessons have been rated. When real
 * ratings exist from rateCompletedBooking(), add an aggregateRating block to the
 * matching course below. Never publish a rating that is not genuinely earned.
 *
 * Content mirrors the `programmes` object in src/App.jsx and the pricing helpers in
 * src/Dashboards.jsx ($10/class for 1-3 lessons a week, $8/class for 4 or more).
 */
const COURSES = [
  {
    name: 'Cambridge Primary English',
    description: 'One-to-one online English lessons for Years 1–6, building strong foundations in reading, writing, speaking and comprehension using the Cambridge Primary English curriculum.',
    level: 'Primary (Years 1–6)',
  },
  {
    name: 'Oxford Primary English',
    description: 'One-to-one online English lessons for Years 1–6 that grow literacy and a love of language through clear, engaging Oxford Primary lessons.',
    level: 'Primary (Years 1–6)',
  },
  {
    name: 'Cambridge Secondary English',
    description: 'One-to-one online English lessons for Years 7–11, developing the analysis and writing skills students need for IGCSE English.',
    level: 'Secondary (Years 7–11)',
  },
  {
    name: 'Oxford Secondary English',
    description: 'One-to-one online English lessons for Years 7–11, mastering advanced language and literature with structured Oxford Secondary support.',
    level: 'Secondary (Years 7–11)',
  },
]

function buildCourseSchema() {
  const provider = {
    '@type': 'EducationalOrganization',
    name: 'TutorPro Online English',
    sameAs: 'https://www.tutorpro.site/',
  }
  const payload = {
    '@context': 'https://schema.org',
    '@graph': COURSES.map((course, index) => ({
      '@type': 'Course',
      '@id': `https://www.tutorpro.site/#course-${index + 1}`,
      name: course.name,
      description: course.description,
      provider,
      educationalLevel: course.level,
      inLanguage: 'en',
      teaches: ['Speaking', 'Reading', 'Writing', 'Grammar', 'Vocabulary'],
      // Google requires at least one CourseInstance carrying courseMode and offers.
      hasCourseInstance: [
        {
          '@type': 'CourseInstance',
          courseMode: 'online',
          courseWorkload: 'PT25M',
          location: { '@type': 'VirtualLocation', url: 'https://www.tutorpro.site/' },
          courseSchedule: {
            '@type': 'Schedule',
            duration: 'PT25M',
            repeatFrequency: 'Weekly',
            repeatCount: 4,
          },
          offers: {
            '@type': 'Offer',
            category: 'Paid',
            price: '8.00',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            url: 'https://www.tutorpro.site/',
          },
        },
      ],
      offers: {
        '@type': 'Offer',
        category: 'Paid',
        price: '8.00',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: 'https://www.tutorpro.site/',
      },
    })),
  }
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`
}

/** FAQPage schema makes the answers eligible for rich results in Google. */
function buildFaqSchema() {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': 'https://www.tutorpro.site/#faq',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`
}

async function run() {
  let html
  try {
    html = await readFile(distIndex, 'utf8')
  } catch {
    console.error('[prerender] dist/index.html not found — run "vite build" first.')
    process.exitCode = 1
    return
  }

  if (html.includes('id="prerendered-home"')) {
    console.log('[prerender] Content already present, skipping.')
    return
  }

  const rootPattern = /<div id="root">\s*<\/div>/
  if (!rootPattern.test(html)) {
    console.error('[prerender] Could not find an empty <div id="root"></div>. Homepage markup changed?')
    process.exitCode = 1
    return
  }

  html = html.replace(rootPattern, `<div id="root">${buildStaticHtml()}\n    </div>`)

  // Add FAQ structured data if it is not already in the document.
  if (!html.includes('"@type":"FAQPage"') && !html.includes('"@type": "FAQPage"')) {
    html = html.replace('</head>', `    ${buildFaqSchema()}\n  </head>`)
  }

  // Course schema: eligible for rich results, and the correct place to attach
  // real lesson ratings later (Organization schema is not eligible).
  if (!html.includes('"@type":"Course"') && !html.includes('"@type": "Course"')) {
    html = html.replace('</head>', `    ${buildCourseSchema()}\n  </head>`)
  }

  await writeFile(distIndex, html, 'utf8')

  const words = buildStaticHtml().replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length
  console.log(`[prerender] Injected ${words} words of crawlable content + FAQPage + ${COURSES.length} Course entities.`)
}

run()
