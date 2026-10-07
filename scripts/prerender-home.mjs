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
  // The H1 must carry the query, not a slogan. "English confidence, built one
  // lesson at a time" says nothing a parent would ever type into Google, and
  // the homepage is the highest-authority page on the site — wasting its H1
  // on a tagline is the single most expensive on-page mistake available.
  // The tagline still appears as the lede, so nothing is lost.
  // "Kids & Teens" was dropped from the H1 on purpose. Search Console shows
  // the page already ranking around position 6 for "english tutor" with no
  // clicks at all, so the job is relevance and a clearer promise, not more
  // words. Teens are still named in the lede and have their own page.
  heading: 'Online English Classes for Kids',
  tagline: 'Live one-to-one lessons for primary and secondary students.',
  lede: 'Looking for an online English tutor for your child? TutorPro teaches children and teens aged 4–16 one to one, so they speak for the whole lesson — building confidence in speaking, reading, grammar and writing with an experienced English teacher.',
  proof: ['No commitment', 'From $8 per class', 'Flexible times'],
}

const SECTIONS = [
  {
    heading: 'Live Online English Classes for Children',
    body: 'Every class is live. A real teacher and your child, talking to each other in real time — nothing is pre-recorded and nothing is automated. Classes run for 25 or 50 minutes inside our own browser classroom, so there is no Zoom link to find and nothing to install: your child clicks once from their dashboard and the lesson begins. The teacher shares interactive slides on a shared lesson board that both can write and draw on, and the whole session is speaking-led. Children join from wherever they live, on ordinary home internet, using a laptop, desktop or tablet.',
  },
  {
    heading: 'English Programs for Primary and Secondary Students',
    body: 'Programmes cover Primary and Secondary learners, supporting school English, exam preparation, conversation confidence and writing skills. Primary learners in Years 1 to 6 focus on phonics, reading fluency, everyday vocabulary and the confidence to speak in full sentences. Secondary learners in Years 7 to 11 move into structured writing, comprehension, analysis and the language skills needed for IGCSE-style English assessment. Children follow the same school with the same teachers as they grow up, rather than changing provider at eleven.',
  },
  {
    heading: 'Personalized One-on-One English Lessons',
    body: 'One-to-one attention means your child speaks for the whole lesson instead of waiting their turn in a group class. Tutors adapt the pace to the learner, not the other way round. A shy child is never talked over, and a confident child is never held back. Mistakes are corrected privately rather than in front of classmates, and if something is not working the teacher changes the approach in that same lesson rather than at the end of a term. Lessons stay one-to-one at every level — children are never moved into group speaking clubs as they progress.',
  },
  {
    heading: 'Experienced English Teachers',
    body: 'Every teacher applies through a structured process that includes a recorded teaching interview we watch in full and a review of their qualifications and teaching experience, with particular weight given to experience teaching children. Only teachers who pass are given students. You can view teacher profiles, qualifications and introduction videos before booking, so you know who will be teaching your child rather than being assigned an anonymous tutor.',
  },
  {
    heading: 'What Your Child Will Learn',
    body: 'Speaking: answering in full sentences, holding a conversation and saying what they mean without rehearsing it first. Listening: following instructions, understanding a story and picking out detail in natural speech at normal pace. Reading: decoding for younger children, then fluency and comprehension. Pronunciation: individual sounds, word stress and rhythm, supported by an AI speech coach that scores words during practice and plays the correct sound back. Grammar: taught inside real sentences your child is trying to say, not as isolated rules. Vocabulary: introduced in context, revisited in later lessons and sent home in the feedback. Communication: the confidence to use all of it with somebody who is not their teacher.',
  },
  {
    heading: 'Cambridge and Oxford English Learning Materials',
    body: 'Every TutorPro class uses structured courseware aligned to Cambridge and Oxford English, with reading, speaking, grammar and vocabulary built into each lesson. We teach from recognised published series including Cambridge Power Up, Power Up Academy, Global English and THiNK, Oxford Family and Friends, Everybody Up and Grammar Friends, plus dedicated phonics programmes for early readers. Your child is never working from improvised worksheets, and materials are included in the lesson price. TutorPro is an independent tutoring service: we are not a Cambridge exam centre and we have no affiliation with Oxford University Press.',
  },
  {
    heading: 'How TutorPro Online English Classes Work',
    body: 'One: create a parent account with a few details about your child — age, school year and what you would like them to work on. Two: choose a programme, whether that is general English, school support, phonics for an early reader or exam-style practice for a teenager. Three: book a lesson from the calendar, where every slot is shown in your own local time zone so there is nothing to convert. Four: meet the teacher online in the browser classroom at the time you chose. Five: read the feedback the teacher writes after every class and watch progress build from lesson to lesson. The first class is free and no card is required to book it.',
  },
  {
    heading: 'Why Parents Choose TutorPro',
    body: 'Experienced teachers, screened by recorded teaching interview before they are given a student. Personalised lessons built around one child. Live classes rather than recordings. Primary and secondary programmes under one roof. Flexible scheduling with evening and weekend slots shown in your own time zone. Written teacher feedback after every lesson. Learning from home with no travel. A free first class with no card required. Published prices from US$7 per lesson, and credits refundable within 14 days.',
  },
  {
    heading: 'Parents can see exactly what is happening.',
    body: 'After each class the teacher writes feedback covering what was practised, what went well and what to work on next, along with specific words to practise at home. Every practice word can be tapped to hear it pronounced correctly, with a slower option for tricky sounds. Parents also get homework assignments, attendance records, progress tracking and a digital library of reading and grammar resources, all in one dashboard. Lessons can be recorded so parents can watch them back later; recordings are private to your family and your teacher, and a clear red indicator shows whenever recording is active.',
  },
  {
    heading: 'Built for children, not repurposed from adult lessons.',
    body: 'The classroom includes a star and reward system that celebrates effort, quick reaction buttons so a younger child can signal "I understand" or "please repeat" without interrupting, and English learning games covering vocabulary, sentence building and grammar. An AI speech coach listens during practice and scores pronunciation word by word, so children get instant feedback on how they sound and can hear the correct pronunciation played back.',
  },
  {
    heading: 'Simple, honest pricing in US dollars.',
    body: 'All prices are in US dollars, so there is no guessing what a lesson costs. Classes are US$8 per 25-minute lesson on the Weekly plan of 1 to 3 classes a week, and US$7 per lesson on the Monthly Package of 4 or more classes a week, billed monthly with priority scheduling and a dedicated tutor. Fifty-minute lessons are available for older learners. The first class is free for every new family with no card required, prices are published on this page rather than hidden behind a sales call, unused lesson credits can be refunded within 14 days of purchase, and cancelling at least 12 hours before a lesson returns the credit in full.',
  },
  {
    heading: 'Families in any country, lesson times in your own.',
    body: 'TutorPro teaches families worldwide from our teaching base in the Philippines, which is UTC+8. Available slots are shown in your own local time inside your account, so there is no mental arithmetic and no missed lessons. The time difference suits Asia, the Middle East, Europe, Australia and New Zealand comfortably. For families in North America the practical option is an early-morning lesson before school, which suits some children and not others — we would rather say that now than after you have paid. There is no restriction on which country a student may join from.',
  },
  {
    heading: 'Looking for a Novakid, 51Talk or Preply alternative?',
    body: 'Families comparing online English schools choose TutorPro Online English for genuine one-to-one lessons, Cambridge and Oxford aligned courseware, transparent pricing from US$8 per 25-minute class, and a free first class with no commitment. Unlike platforms that move children into group speaking clubs as they progress, every TutorPro lesson stays one-to-one. Our published rate is lower than the entry price of most major online English schools for children, and there is no long contract to sign.',
  },
]


/**
 * Real parent testimonials, mirrored verbatim from `parentReviews` in src/App.jsx.
 * Keep both in sync. Never add a quote that a parent has not actually written.
 */
const REVIEWS = [
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

/* Mirrored from the `faqs` array in src/App.jsx. */
const FAQS = [
  {
    question: 'Can my child join TutorPro from another country?',
    answer: 'Yes. Lessons are online and there is no restriction on where a student lives. Children currently learn with us from Asia, Europe, the Middle East and the Americas, and all you need is an ordinary home internet connection.',
  },
  {
    question: 'What countries do you accept students from?',
    answer: 'Any country. Teachers are in the Philippines (UTC+8), which fits Asia, the Middle East, Europe, Australia and New Zealand comfortably. For North America the practical option is an early-morning lesson before school.',
  },
  {
    question: 'Are classes live or recorded?',
    answer: 'Every class is live, with a real teacher and your child talking to each other in real time. Lessons can also be recorded on request so parents can watch them back, but the teaching itself is never pre-recorded.',
  },
  {
    question: 'Are classes one-on-one?',
    answer: 'Yes, at every level. One teacher and one child, so your child speaks for the whole lesson. Children are never moved into group speaking clubs as they progress.',
  },
  {
    question: 'What ages do you teach?',
    answer: 'Children and teenagers from 4 to 16. Lessons for younger children are usually 25 minutes to match their concentration span; older learners often take 50 minutes.',
  },
  {
    question: 'Are beginners welcome?',
    answer: 'Yes. The teacher starts from what your child can actually do rather than from a syllabus. Many of our students speak another language at home and use English only at school.',
  },
  {
    question: 'What learning materials do you use?',
    answer: 'Published Cambridge and Oxford course books, including Power Up, Global English, THiNK, Family and Friends and Oxford Phonics World. Materials are included in the lesson price. TutorPro is an independent tutoring service, not a Cambridge exam centre.',
  },
  {
    question: 'How long is each lesson?',
    answer: 'Lessons are 25 or 50 minutes. You can switch between the two as your child grows. For speaking, two shorter lessons a week usually produce faster progress than one long one.',
  },
  {
    question: 'How do parents book a lesson?',
    answer: 'Create a parent account, choose a teacher and pick a time from the calendar. Slots are shown in your own local time zone, so there is nothing to convert. The first class is free and needs no card details.',
  },
  {
    question: 'How does the free trial work?',
    answer: 'It is a full lesson with a real teacher, not a sales call or a demo. You book it like any other class, with no card required, and decide afterwards whether to continue.',
  },
  {
    question: 'How do parents receive teacher feedback?',
    answer: 'In your dashboard after every lesson: what was practised, what went well, what to work on next, and the words worth revising at home, written in plain language.',
  },
  {
    question: 'What currency are prices in?',
    answer: 'US dollars. Classes are US$8 per 25-minute lesson on the Weekly plan, or US$7 per lesson on the Monthly Package of 4 or more classes a week. There are no registration or materials fees.',
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
        <p>${escapeHtml(HERO.tagline)}</p>
        <p>${escapeHtml(HERO.lede)}</p>
        <p>${HERO.proof.map(escapeHtml).join(' · ')}</p>
        <p><a href="/?action=book">Book a free first class</a> · <a href="#programmes">Explore programmes</a></p>
      </header>
${sections}
      <section>
        <h2>What families say.</h2>
${REVIEWS.map((r) => `
        <blockquote>
          <p>&ldquo;${escapeHtml(r.quote)}&rdquo;</p>
          <footer>${escapeHtml(r.name)} — ${escapeHtml(r.source)}, ${new Date(r.date).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</footer>
        </blockquote>`).join('')}
      </section>
      <section>
        <h2>Questions, answered.</h2>
${faqItems}
      </section>
      <footer>
        <p>TutorPro Online English — registered with the Philippine Department of Trade and Industry (DTI), Registration No. 5274092. Online English classes for kids and teens worldwide. Cambridge and Oxford aligned tutors, flexible scheduling, free first class.</p>
        <p><a href="/free-trial.html">Free trial class</a> · <a href="/how-it-works.html">How lessons work</a> · <a href="/pricing.html">Pricing and plans</a> · <a href="/teachers.html">Our teachers</a> · <a href="/faq.html">Questions and answers</a></p>
        <p><a href="/online-maths-tutor-for-kids.html">Online Maths tutor for kids</a> · <a href="/online-science-tutor-for-kids.html">Online Science tutor for kids</a> · <a href="/online-ict-computing-classes-for-kids.html">Online ICT and Computing classes</a></p>
        <p><a href="/english-tutor-quezon-city.html">English tutor in Quezon City</a> · <a href="/english-tutor-cebu-city.html">Cebu City</a> · <a href="/english-tutor-davao-city.html">Davao City</a> · <a href="/english-tutor-singapore.html">Singapore</a> · <a href="/english-tutor-hong-kong.html">Hong Kong</a> · <a href="/english-tutor-kuala-lumpur.html">Kuala Lumpur</a></p>
        <p><a href="/blog/">Learning resources for parents</a> · <a href="/blog/help-child-speak-english-at-home.html">Helping your child speak English at home</a> · <a href="/blog/english-reading-activities-primary.html">Reading activities for primary students</a> · <a href="/blog/common-english-grammar-mistakes-children.html">Common grammar mistakes children make</a></p>
        <p><a href="/cambridge-english.html">Cambridge English classes</a> · <a href="/oxford-english.html">Oxford English classes</a> · <a href="/english-reading.html">English reading</a> · <a href="/english-speaking.html">English speaking</a> · <a href="/english-grammar.html">English grammar</a> · <a href="/english-vocabulary.html">English vocabulary</a></p>
        <p><a href="/primary-english.html">Primary English for ages 4–11</a> · <a href="/secondary-english.html">Secondary English for ages 12–16</a> · <a href="/english-for-kids-ages-4-7.html">English classes for ages 4–7</a> · <a href="/english-for-kids-ages-8-11.html">English classes for ages 8–11</a> · <a href="/english-for-teens-ages-12-16.html">English for teenagers 12–16</a></p>
        <p><a href="/free-english-class.html">Free English class</a> · <a href="/english-tutor-for-shy-child.html">Help for a shy child</a> · <a href="/online-english-for-filipino-families.html">For Filipino families</a> · <a href="/cn/">中文学生版</a> · <a href="/kr/">한국 학부모 페이지</a> · <a href="/tw/">台灣家長專頁</a></p>
        <p><a href="/about.html">About us</a> · <a href="/is-tutorpro-legitimate.html">Are we legitimate?</a> · <a href="/contact.html">Contact</a> · <a href="/privacy-policy.html">Privacy policy</a> · <a href="/terms.html">Terms of service</a> · <a href="/refund-policy.html">Refund policy</a></p>
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
 * src/Dashboards.jsx ($8/class for 1-3 lessons a week, $7/class for 4 or more).
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
