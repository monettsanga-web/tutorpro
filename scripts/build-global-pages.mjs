/**
 * Global landing pages — the searches parents actually type worldwide.
 *
 * WHY THESE EXIST
 * ---------------
 * The site had 25 indexable pages and not one targeted the highest-volume
 * query in this market: "online English classes for kids". City pages covered
 * six specific cities, subject pages covered four subjects, age pages covered
 * three age bands — but a parent in Japan, Brazil, Poland or Saudi Arabia
 * typing the generic phrase had nothing to land on.
 *
 * A homepage cannot carry every intent. Google ranks pages, not sites, and it
 * needs the phrase in the title, the URL, the H1 and the structured data.
 *
 * WHY THESE PAGES AND NOT COUNTRY PAGES
 * -------------------------------------
 * Country pages only work where something genuinely differs: currency, time
 * zone, school system. Inventing thirty near-identical country pages is the
 * textbook way to earn a doorway-pages penalty. These target INTENT instead —
 * what the parent wants — which is what actually varies, and each answers a
 * different question.
 *
 * TIME ZONES ARE THE REAL GLOBAL DIFFERENTIATOR
 * ---------------------------------------------
 * The one honest, checkable advantage for a worldwide audience is when
 * lessons can happen. Teachers are in the Philippines (UTC+8), so the page
 * publishes a real table of what that means in other regions rather than
 * claiming vague "flexible scheduling".
 *
 * ACCURACY
 * --------
 * Pricing from planSessionRate() in src/Dashboards.jsx ($10 for 1-3/week, $8
 * for 4+). Free first class, 12-hour cancellation and 14-day refund from the
 * real booking rules. Only English claims Cambridge and Oxford alignment.
 * No invented reviews, ratings or student counts.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

const SITE = 'https://www.tutorpro.site'
const UPDATED = '11 September 2026'
const MESSENGER = 'https://m.me/526047974195321'
const WHATSAPP = 'https://wa.me/639625284849'

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/**
 * Real scheduling windows. Teachers are in the Philippines (UTC+8), and the
 * useful question for a parent abroad is "can my child have a lesson after
 * school". These are offsets, stated plainly, not a promise of 24/7 cover.
 */
const TIMEZONES = [
  ['United Kingdom, Ireland', 'UTC+0/+1', 'Manila is 7–8 hours ahead. Late-afternoon and early-evening UK lessons work well.'],
  ['Western Europe', 'UTC+1/+2', 'Manila is 6–7 hours ahead. After-school lessons from 15:00 onward fit comfortably.'],
  ['Middle East (UAE, Saudi Arabia)', 'UTC+3/+4', 'Manila is 4–5 hours ahead. Afternoon and evening lessons are straightforward.'],
  ['India', 'UTC+5:30', 'Manila is 2.5 hours ahead. Almost any after-school time works.'],
  ['Singapore, Malaysia, Hong Kong, Taiwan', 'UTC+8', 'Same time zone. Any time your child is free.'],
  ['Japan, South Korea', 'UTC+9', 'Manila is 1 hour behind. After-school and evening lessons are easy for both sides.'],
  ['Australia (eastern)', 'UTC+10/+11', 'Manila is 2–3 hours behind. Late-afternoon lessons work well.'],
  ['United States, Canada', 'UTC−5 to −8', 'The largest gap. Early-morning lessons before school are usually the practical option.'],
]

const PAGES = [
  {
    slug: 'online-english-classes-for-kids.html',
    label: 'Online English classes',
    title: 'Online English Classes for Kids — 1-to-1 Lessons Worldwide | TutorPro',
    description:
      'One-to-one online English classes for children aged 4–16, taught live by qualified teachers. Cambridge and Oxford-aligned lessons from $8. Free first class, no card required.',
    heading: 'Online English classes for kids, one-to-one',
    lede:
      'Live video lessons for children aged 4 to 16, with one teacher and one child. No group classes, no waiting for a turn to speak — your child talks for the whole lesson.',
    intent: 'the-basics',
    body: `
        <h2>What "one-to-one" actually changes</h2>
        <p>In a group class of six, a child speaks for roughly a fifth of the lesson. Over a year that difference compounds into something very visible. Speaking is a skill rather than a body of knowledge, so practice time is the single strongest predictor of progress.</p>
        <p>Every TutorPro lesson is one teacher and one child. The pace follows your child, mistakes are corrected privately rather than in front of classmates, and a shy child gets the thing they most need: permission to try without an audience.</p>

        <h2>Who these classes are for</h2>
        <div class="grid">
          <div class="card"><h3>Ages 4–7</h3><p>Phonics, first words, songs and games. The goal at this age is that English feels normal and enjoyable rather than a test.</p></div>
          <div class="card"><h3>Ages 8–11</h3><p>Reading fluency, grammar in context, speaking in full sentences, and support with whatever school is covering.</p></div>
          <div class="card"><h3>Ages 12–16</h3><p>Writing, comprehension, advanced grammar and exam-style speaking practice.</p></div>
        </div>

        <h2>What a lesson looks like</h2>
        <p>Lessons run 25 or 50 minutes in our own browser classroom — nothing to install, and no Zoom link to find. The teacher shares materials on screen and writes on them together with your child.</p>
        <p>A typical lesson opens with easy conversation to warm up, introduces new language, practises it through reading, listening or role-play, and finishes with the child using it freely. Pronunciation practice is supported by an AI coach that scores individual words and plays the correct sound back, so a child can self-correct between lessons.</p>

        <h2>Materials</h2>
        <p>English lessons follow published Cambridge and Oxford course books, including Power Up, Global English, Family and Friends, Oxford Phonics World and THiNK. The teacher chooses the level that fits your child. Materials are included in the lesson price — there is nothing extra to buy.</p>

        <h2>After every lesson</h2>
        <p>Teachers write feedback covering what was practised, what went well, what to work on, and the words worth revising at home. It is written in plain language, so you can follow your child's progress without knowing the subject yourself.</p>`,
    faqs: [
      ['How much do online English classes cost?', 'Classes are $10 each on a weekly plan of 1–3 lessons, or $8 each on a monthly package of 4 or more. There are no registration fees, materials fees or platform fees. The first class is free.'],
      ['Is the first class really free?', 'Yes, and no card is required. It is a full lesson with a real teacher, so you can see how your child responds before paying anything.'],
      ['What age can my child start?', 'We teach children from 4 to 16. Lessons for younger children are usually 25 minutes to match their concentration span.'],
      ['Do we need to install anything?', 'No. Lessons run in our own browser classroom. You click a link and the lesson opens.'],
      ['What if the time zones do not line up?', 'Teachers are in the Philippines (UTC+8), which suits Asia, the Middle East, Europe and Australia comfortably. For North America, early-morning lessons before school are the usual arrangement.'],
      ['Can we cancel or get a refund?', 'Cancelling at least 12 hours before a lesson returns the credit in full. Unused credits can be refunded within 14 days of purchase.'],
    ],
  },

  {
    slug: 'online-english-tutor-for-kids.html',
    label: 'Online English tutor',
    title: 'Online English Tutor for Children — Qualified, Vetted Teachers | TutorPro',
    description:
      'Find a qualified online English tutor for your child. Every teacher passes a recorded teaching interview and credential check. One-to-one lessons from $8, free first class.',
    heading: 'Finding an online English tutor you can actually trust',
    lede:
      'Choosing a tutor for your child online means trusting someone you have never met. Here is exactly how our teachers are selected, and how to judge any tutor you are considering.',
    intent: 'trust',
    body: `
        <h2>How our teachers are selected</h2>
        <p>Applicants submit a <strong>recorded demonstration lesson</strong>, which we review directly. We verify education and teaching experience, and we weight experience with children heavily — teaching adults and teaching an eight-year-old are different jobs. Only applicants who pass are assigned students.</p>
        <p>After lessons, parents can rate their teacher, and those ratings feed back into who gets assigned. A teacher who is not working out for your child can be changed without any awkwardness.</p>

        <h2>Where our teachers are based, stated plainly</h2>
        <p>TutorPro is a Philippine-registered business (DTI Business Name Registration 5274092) and our teachers live and teach in the Philippines. We are not a UK or US agency, and we do not present ourselves as one. English is an official language of the Philippines and university education is conducted in English, which is why the country is one of the largest providers of online English teaching in the world.</p>
        <p>If your priority is your child acquiring a specific British or American accent, a tutor from that country is the better match, and we would rather say so than take a booking that disappoints you.</p>

        <h2>What to check in any online tutor</h2>
        <div class="grid">
          <div class="card"><h3>How much does the child speak?</h3><p>In a trial lesson, time it. In a 25-minute lesson a child should be speaking for at least ten of them.</p></div>
          <div class="card"><h3>How are mistakes handled?</h3><p>A tutor who interrupts every error teaches a child to stop talking. Listening first, then correcting, works better.</p></div>
          <div class="card"><h3>Is there written feedback?</h3><p>Without it you have no way to know whether anything is improving.</p></div>
          <div class="card"><h3>Is pricing published?</h3><p>If prices are only available "on consultation", ask why.</p></div>
          <div class="card"><h3>Can you change tutor?</h3><p>Fit matters more than credentials at this age. Being locked to one person is a bad sign.</p></div>
          <div class="card"><h3>Is there a real free trial?</h3><p>A genuine trial does not require card details up front.</p></div>
        </div>

        <h2>Judging it yourself</h2>
        <p>The most reliable signal is not on any website: after the trial lesson, ask your child whether they would like to do it again. Their answer predicts long-term progress better than any qualification list.</p>`,
    faqs: [
      ['Are your teachers qualified?', 'Every teacher passes a recorded demonstration lesson reviewed by us, plus verification of their education and teaching experience. Experience teaching children is weighted heavily.'],
      ['Where are your teachers based?', 'In the Philippines. TutorPro is a Philippine-registered business, DTI Business Name Registration 5274092. English is an official language there and university teaching is in English.'],
      ['Can we change teacher if it is not working?', 'Yes. Fit matters more than credentials with children, and changing teacher is a normal request rather than a complaint.'],
      ['Will my child pick up an accent?', 'Filipino English is closest to American English but is not identical to it. If acquiring a specific national accent is your main goal, a tutor from that country suits you better.'],
      ['How do I know my child is progressing?', 'Teachers write feedback after every lesson covering what was practised, what went well and what to work on, plus words to revise at home.'],
    ],
  },

  {
    slug: 'online-english-class-schedule-time-zones.html',
    label: 'Time zones & scheduling',
    title: 'Online English Class Times by Country — Time Zone Guide | TutorPro',
    description:
      'When can your child have an online English lesson? A country-by-country guide to lesson times with Philippine-based teachers (UTC+8), from the UK and Europe to the US, Japan and Australia.',
    heading: 'What time can my child have a lesson?',
    lede:
      'The most practical question for a family abroad is not price — it is whether lessons can happen at a time that suits a tired child after school. Here are the real numbers.',
    intent: 'logistics',
    body: `
        <h2>Where our teachers are</h2>
        <p>Teachers are in the Philippines, which is <strong>UTC+8</strong>, and they teach during their own daytime and evening. That matters more than it sounds: a teacher working at 3am is not going to give your child a good lesson, so we would rather be honest about which time zones genuinely work well.</p>

        <h2>Lesson times by region</h2>
        <div class="table-scroll">
          <table>
            <tr><th>Where you are</th><th>Your time zone</th><th>What this means in practice</th></tr>
            ${TIMEZONES.map(([region, tz, note]) => `<tr><td><strong>${escapeHtml(region)}</strong></td><td>${escapeHtml(tz)}</td><td>${escapeHtml(note)}</td></tr>`).join('\n            ')}
          </table>
        </div>

        <h2>The honest position on North America</h2>
        <p>The Americas are the hardest fit. With a 12–16 hour difference, the workable window is usually an early-morning lesson before school, which suits some children and not others. If your child is not a morning person, a tutor closer to your own time zone may serve you better. We would rather say that now than have you find out after paying.</p>

        <h2>How scheduling works</h2>
        <div class="grid">
          <div class="card"><h3>You choose the slot</h3><p>Available times are shown in your own local time inside your account, so there is no mental arithmetic and no missed lessons.</p></div>
          <div class="card"><h3>Same slot each week, or not</h3><p>A fixed weekly time helps a routine form, but you can also book ad hoc if your family schedule is irregular.</p></div>
          <div class="card"><h3>Changing a lesson</h3><p>Cancelling at least 12 hours before returns the credit in full, so an unexpected school event does not cost you a lesson.</p></div>
          <div class="card"><h3>Lesson length</h3><p>25 minutes suits younger children, 50 minutes suits older ones. You can switch between them as your child grows.</p></div>
        </div>

        <h2>How often should lessons be?</h2>
        <p>For speaking, frequency matters more than duration. Two 25-minute lessons a week generally produce faster progress than one 50-minute lesson, because language is retained through repeated contact rather than long single sessions. Families aiming for noticeable improvement within a school term usually settle on two or three lessons a week.</p>`,
    faqs: [
      ['What time zone are the teachers in?', 'The Philippines, UTC+8. Teachers work their own daytime and evening hours, which keeps lesson quality consistent.'],
      ['Do lesson times show in my local time?', 'Yes. Available slots are displayed in your own time zone inside your account, so there is nothing to convert.'],
      ['Does this work for families in the United States?', 'It is the hardest fit, with a 12–16 hour difference. Early-morning lessons before school are the practical option, which suits some children and not others.'],
      ['Can we keep the same time every week?', 'Yes, and most families do because a routine helps. You can also book individual lessons if your schedule varies.'],
      ['What if we need to cancel?', 'Cancelling at least 12 hours before the lesson returns the credit in full.'],
      ['How many lessons a week do you recommend?', 'For speaking progress, two or three shorter lessons beat one long one. Frequency matters more than length.'],
    ],
  },
]

function faqSchema(page) {
  const url = `${SITE}/${page.slug}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Course',
        '@id': `${url}#course`,
        name: page.heading,
        description: page.description,
        url,
        inLanguage: 'en',
        // Explicitly worldwide: the whole point of these pages.
        audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'Children aged 4-16' },
        provider: {
          '@type': 'EducationalOrganization',
          name: 'TutorPro Online English',
          url: SITE,
          areaServed: 'Worldwide',
          identifier: { '@type': 'PropertyValue', propertyID: 'DTI Business Name Registration', value: '5274092' },
          address: { '@type': 'PostalAddress', addressCountry: 'PH' },
        },
        hasCourseInstance: [{
          '@type': 'CourseInstance',
          courseMode: 'online',
          courseWorkload: 'PT25M',
          location: { '@type': 'VirtualLocation', url: SITE },
          offers: { '@type': 'Offer', price: '8', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: SITE },
        }],
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: page.faqs.map(([q, a]) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumbs`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
          { '@type': 'ListItem', position: 2, name: page.label, item: url },
        ],
      },
    ],
  }
}

function globalNav(current) {
  return `<nav class="pagenav" aria-label="Related guides">
          ${PAGES.filter((p) => p.slug !== current).map((p) => `<a href="/${p.slug}">${escapeHtml(p.label)}</a>`).join('\n          ')}
          <a href="/pricing.html">Pricing</a>
          <a href="/is-tutorpro-legitimate.html">Are we legitimate?</a>
        </nav>`
}

function page(spec) {
  const url = `${SITE}/${spec.slug}`
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#321568" />
    <title>${escapeHtml(spec.title)}</title>
    <meta name="description" content="${escapeHtml(spec.description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="/assets/pwa-icon-192.png" />
    <link rel="alternate" hreflang="en" href="${url}" />
    <link rel="alternate" hreflang="x-default" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="TutorPro Online English" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${escapeHtml(spec.title)}" />
    <meta property="og:description" content="${escapeHtml(spec.description)}" />
    <meta property="og:image" content="${SITE}/assets/tutorpro-hero.webp" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${JSON.stringify(faqSchema(spec))}</script>
    <link rel="stylesheet" href="/assets/pages.css" />
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
        <h1>${escapeHtml(spec.heading)}</h1>
        <p class="lede">${escapeHtml(spec.lede)}</p>
        <p>
          <span class="pill">Ages 4–16</span>
          <span class="pill">One-to-one, always</span>
          <span class="pill">25 or 50 minute lessons</span>
          <span class="pill">From $8 per class</span>
          <span class="pill">Free first class</span>
        </p>
        <p>
          <a class="btn" href="/?book=1">Book a free first class</a>
          <a class="btn btn--quiet" href="${MESSENGER}" target="_blank" rel="noopener">Ask a question</a>
        </p>

        ${globalNav(spec.slug)}
${spec.body}

        <h2>Pricing</h2>
        <table>
          <tr><th>Plan</th><th>Classes per week</th><th>Price per class</th></tr>
          <tr><td>Weekly plan</td><td>1–3</td><td>$10</td></tr>
          <tr><td>Monthly package</td><td>4–7</td><td>$8</td></tr>
        </table>
        <p>No registration fee, no materials fee, no platform fee. The first class is free for every new family and no card is required. Cancelling at least 12 hours before a lesson returns the credit in full, and unused credits can be refunded within 14 days — the full terms are on our <a href="/refund-policy.html">refund policy</a> page.</p>

        <h2>Questions parents ask</h2>
        ${spec.faqs.map(([q, a]) => `<div class="card"><h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p></div>`).join('\n        ')}

        <h2>Try a free class</h2>
        <p>Every new family can take one free class before choosing a plan. It is a real lesson with a real teacher — the only reliable way to know whether this suits your child.</p>
        <p>
          <a class="btn" href="/?book=1">Book a free first class</a>
          <a class="btn btn--quiet" href="${WHATSAPP}" target="_blank" rel="noopener">Message us on WhatsApp</a>
        </p>
        <p><small>Last reviewed: ${UPDATED}</small></p>
      </div>
    </main>
    <footer>
      <div class="wrap">
        <a href="/">Home</a>
        ${PAGES.map((p) => `<a href="/${p.slug}">${escapeHtml(p.label)}</a>`).join('\n        ')}
        <a href="/pricing.html">Pricing</a>
        <a href="/about.html">About</a>
        <a href="/contact.html">Contact</a>
        <p>© ${new Date().getFullYear()} TutorPro Online English · DTI Business Name Registration 5274092 · One-to-one online classes for children worldwide, taught from the Philippines.</p>
      </div>
    </footer>
  </body>
</html>
`
}

async function run() {
  await mkdir(publicDir, { recursive: true })
  for (const spec of PAGES) {
    await writeFile(resolve(publicDir, spec.slug), page(spec), 'utf8')
    console.log(`[global] wrote public/${spec.slug}`)
  }
  console.log(`[global] ${PAGES.length} global pages generated.`)
}

run().catch((error) => {
  console.error('[global] failed:', error)
  process.exit(1)
})
