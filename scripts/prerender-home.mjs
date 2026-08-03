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
    body: 'Every TutorPro English class uses structured courseware aligned to Cambridge and Oxford English, with reading, speaking, grammar and vocabulary built into each lesson.',
  },
  {
    heading: 'Less pressure. More progress.',
    body: 'One-to-one attention means your child speaks for the whole lesson instead of waiting their turn in a group class. Tutors adapt the pace to the learner, not the other way round.',
  },
  {
    heading: 'Made for their school years.',
    body: 'Programmes cover Primary and Secondary learners, supporting school English, exam preparation, conversation confidence and writing skills.',
  },
  {
    heading: 'Looking for a Novakid, 51Talk or Preply alternative?',
    body: 'Families comparing online English schools choose TutorPro English for genuine one-to-one lessons, Cambridge and Oxford aligned courseware, transparent pricing from $8 per 25-minute class, and a free first class with no commitment.',
  },
  {
    heading: 'Choose your child’s rhythm.',
    body: 'The Weekly plan suits 1–3 classes a week and is paid weekly. The Monthly Package covers 4–7 classes of 25 minutes each week, billed monthly, with priority scheduling and a dedicated tutor.',
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
        <p>TutorPro English — online English classes for kids and teens worldwide. Cambridge and Oxford aligned tutors, flexible scheduling, free first class.</p>
        <p><a href="/about.html">About us</a> · <a href="/contact.html">Contact</a> · <a href="/privacy-policy.html">Privacy policy</a> · <a href="/terms.html">Terms of service</a> · <a href="/refund-policy.html">Refund policy</a></p>
      </footer>
    </div>`
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

  await writeFile(distIndex, html, 'utf8')

  const words = buildStaticHtml().replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length
  console.log(`[prerender] Injected ${words} words of crawlable homepage content + FAQPage schema.`)
}

run()
