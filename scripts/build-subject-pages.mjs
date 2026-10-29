/**
 * Generates one landing page per subject for TutorPro.
 *
 * WHY THESE EXIST
 * ---------------
 * The site now teaches English, Maths, Science and ICT, but every one of the
 * 21 indexable pages was about English. A parent searching "online science
 * tutor for kids" or "online maths class Philippines" had nothing to land on:
 * Google had no page to rank, because none existed.
 *
 * A homepage that merely mentions four subjects does not rank for any of them.
 * Ranking needs a page per intent, with the subject in the title, the URL, the
 * H1 and the structured data — which is exactly what the age pages already do
 * successfully for English, so this reuses their proven shape.
 *
 * ACCURACY
 * --------
 * Every claim is drawn from the real platform: pricing from planSessionRate()
 * in src/Dashboards.jsx ($8 for 1-3/wk, $6 for 4+), subjects and level copy
 * from src/subjects.js, lesson lengths and the free first class from the
 * booking rules. Only English claims Cambridge and Oxford alignment, because
 * that is the only published alignment we can evidence. Nothing here is
 * aspirational or invented.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

const SITE = 'https://www.tutorpro.site'
const UPDATED = '2 September 2026'
const MESSENGER = 'https://m.me/526047974195321'

/* English-only school (owner, 2026-10-29): the Maths, Science and ICT
   landing pages are gone; their old URLs 301 to the English classes page
   in vercel.json so no backlink or bookmark ever 404s. */
/* English-only school (owner, 2026-10-29): the Maths, Science and ICT
   landing pages are gone. Their old URLs 301 to the English classes page
   in vercel.json, so no backlink or bookmark ever 404s. */
const SUBJECTS = []

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character] || character)
}

function subjectNav(currentSlug) {
  const links = SUBJECTS
    .filter((subject) => subject.slug !== currentSlug)
    .map((subject) => `<a class="btn btn--quiet" href="/${subject.slug}">${escapeHtml(subject.label)}</a>`)
  links.push('<a class="btn btn--quiet" href="/english-for-kids-ages-8-11.html">English</a>')
  return `<p class="actions">Other subjects: ${links.join('\n          ')}</p>`
}

/**
 * Course + FAQPage + Breadcrumb, the same graph the age pages use.
 * Course markup is what lets Google show a lesson result rather than a plain
 * blue link, and FAQPage is what wins the expandable questions underneath.
 */
function buildSchema(subject) {
  const url = `${SITE}/${subject.slug}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Course',
        '@id': `${url}#course`,
        name: `Online ${subject.name} Lessons for Children and Teenagers`,
        description: subject.description,
        url,
        provider: {
          '@type': 'EducationalOrganization',
          name: 'TutorPro Online English',
          sameAs: SITE,
        },
        educationalLevel: 'Primary and Secondary, Ages 4–16',
        inLanguage: 'en',
        teaches: subject.focus.map(([topic]) => topic),
        audience: {
          '@type': 'EducationalAudience',
          educationalRole: 'student',
          audienceType: 'Children and teenagers aged 4–16',
        },
        hasCourseInstance: [{
          '@type': 'CourseInstance',
          courseMode: 'online',
          courseWorkload: 'PT25M',
          location: { '@type': 'VirtualLocation', url: SITE },
          courseSchedule: {
            '@type': 'Schedule', duration: 'PT25M', repeatFrequency: 'Weekly', repeatCount: 4,
          },
          offers: {
            '@type': 'Offer', category: 'Paid', price: '8.00', priceCurrency: 'USD',
            availability: 'https://schema.org/InStock', url: SITE,
          },
        }],
        offers: {
          '@type': 'Offer', category: 'Paid', price: '8.00', priceCurrency: 'USD',
          availability: 'https://schema.org/InStock', url: SITE,
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: subject.faqs.map(([question, answer]) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: subject.label, item: url },
        ],
      },
    ],
  }
}

function page(subject) {
  const url = `${SITE}/${subject.slug}`
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#321568" />
    <title>${escapeHtml(subject.title)}</title>
    <meta name="description" content="${escapeHtml(subject.description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="/assets/pwa-icon-192.png" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="TutorPro Online English" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${escapeHtml(subject.title)}" />
    <meta property="og:description" content="${escapeHtml(subject.description)}" />
    <meta property="og:image" content="${SITE}/assets/tutorpro-hero.webp" />
    <script type="application/ld+json">${JSON.stringify(buildSchema(subject))}</script>
    <link rel="stylesheet" href="/assets/fonts.css" /><link rel="stylesheet" href="/assets/pages.css" />
  </head>
  <body>
    <header class="site-head">
      <div class="wrap site-head__inner">
        <a class="brand" href="/"><img src="/assets/tutorpro-panda-logo.webp" alt="TutorPro Online English" />TutorPro Online English</a>
        <a class="btn btn--primary" href="/?book=1">Book a free first class</a>
      </div>
    </header>
    <main>
      <div class="wrap">
        <h1>${escapeHtml(subject.heading)}</h1>
        <p class="lede">${escapeHtml(subject.lede)}</p>
        <p>
          <span class="pill">${escapeHtml(subject.stage)}</span>
          <span class="pill">${escapeHtml(subject.accreditation)}</span>
          <span class="pill">25 or 50 minute lessons</span>
          <span class="pill">from $6 per class</span>
          <span class="pill">Free first class</span>
        </p>
        <p>
          <a class="btn" href="/?book=1">Book a free first class</a>
          <a class="btn btn--quiet" href="${MESSENGER}" target="_blank" rel="noopener">Ask a question</a>
        </p>

        ${subjectNav(subject.slug)}

        <h2>What your child works on in ${escapeHtml(subject.name)}</h2>
        <div class="grid">
          ${subject.focus.map(([t, d]) => `<div class="card"><h3>${escapeHtml(t)}</h3><p>${escapeHtml(d)}</p></div>`).join('\n          ')}
        </div>

        <h2>What a ${escapeHtml(subject.name)} lesson looks like</h2>
        <p>${escapeHtml(subject.lesson)}</p>
        <p>Lessons are one-to-one, so the pace follows your child rather than a class average. Teachers write feedback after every lesson covering what was practised, what went well and what to work on next, so you can see progress without having to ask.</p>

        <h2>Matched to your child’s school</h2>
        <p>Lessons follow whatever your child is covering in class rather than a separate syllabus of our own. Share a topic list, a textbook or this week’s homework in the free first class and the teacher plans around it. That is usually where the fastest progress comes from: fixing the specific thing that is not making sense right now.</p>

        <h2>For parents</h2>
        <p>${escapeHtml(subject.parentNote)}</p>
        <p>You do not need to know the subject yourself. The teacher leads everything, and the written feedback after each lesson is in plain language rather than jargon.</p>

        <h2>Pricing</h2>
        <table>
          <tr><th>Plan</th><th>Classes per week</th><th>Price per class</th></tr>
          <tr><td>Weekly plan</td><td>1–3</td><td>$8</td></tr>
          <tr><td>Monthly package</td><td>4–7</td><td>$6</td></tr>
        </table>
        <p>The first class is free for every new family and no card is required to try it. Unused lesson credits can be refunded within 14 days of purchase, and cancelling at least 12 hours before a lesson returns the credit in full. Full terms are on our <a href="/refund-policy.html">refund policy</a> page.</p>

        <h2>Questions parents ask about online ${escapeHtml(subject.name)} lessons</h2>
        ${subject.faqs.map(([q, a]) => `<div class="card"><h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p></div>`).join('\n        ')}

        <h2>Try a free ${escapeHtml(subject.name)} class</h2>
        <p>Every new family can take one free class before choosing a plan. It is a real lesson with a real teacher — a chance to see how your child responds before paying anything.</p>
        <p>
          <a class="btn" href="/?book=1">Book a free first class</a>
          <a class="btn btn--quiet" href="/is-tutorpro-legitimate.html">Is TutorPro legitimate?</a>
        </p>
        <p><small>Last reviewed: ${UPDATED}</small></p>
      </div>
    </main>
    <footer>
      <div class="wrap">
        <a href="/">Home</a>
        ${SUBJECTS.map((s) => `<a href="/${s.slug}">${escapeHtml(s.label)}</a>`).join('\n        ')}
        <a href="/pricing.html">Pricing</a>
        <a href="/about.html">About</a>
        <a href="/contact.html">Contact</a>
        <p>© ${new Date().getFullYear()} TutorPro Online English. One-to-one online classes in English, Maths, Science and ICT for children and teenagers worldwide.</p>
      </div>
    </footer>
  </body>
</html>
`
}

async function run() {
  await mkdir(publicDir, { recursive: true })
  for (const subject of SUBJECTS) {
    await writeFile(resolve(publicDir, subject.slug), page(subject), 'utf8')
    console.log(`[subject-pages] wrote public/${subject.slug}`)
  }
  console.log(`[subject-pages] ${SUBJECTS.length} subject pages generated.`)
}

run()

export { SUBJECTS }
