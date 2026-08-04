/**
 * Generates age-tier landing pages for TutorPro Online English.
 *
 * WHY THESE EXIST
 * ---------------
 * All three ranking competitors (Novakid, Allright, Cambly Kids) segment by age.
 * Allright alone has ten age pages. A parent searching "English lessons for 7 year old"
 * needs a page written for exactly that child, not a generic homepage.
 *
 * These are static HTML in /public so they are fully crawlable without JavaScript,
 * matching the approach used for the legal pages.
 *
 * ACCURACY: every claim below is drawn from the real platform —
 *  - coursebooks come from the curriculum list in src/App.jsx
 *  - pricing comes from planSessionRate() in src/Dashboards.jsx ($10 for 1-3/wk, $8 for 4+)
 *  - lesson lengths, free trial, recordings and the AI speech coach are shipped features
 * Nothing here is aspirational or invented.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

const SITE = 'https://www.tutorpro.site'
const UPDATED = '4 August 2026'
const MESSENGER = 'https://m.me/526047974195321'

const STYLE = `
  :root { color-scheme: dark; --bg:#090510; --violet:#7048df; --lime:#bce94e; --text:#fff; --muted:#c9bddb; --card:rgba(255,255,255,.07); --line:rgba(255,255,255,.14); }
  * { box-sizing: border-box; }
  body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at 15% 5%, rgba(188,233,78,.14), transparent 30%), linear-gradient(135deg, #090510 0%, #25104d 54%, #111827 100%); color:var(--text); line-height:1.65; }
  a { color: var(--lime); }
  .container { width:min(920px, calc(100% - 32px)); margin:auto; }
  header { position:sticky; top:0; z-index:10; backdrop-filter: blur(18px); background:rgba(9,5,16,.74); border-bottom:1px solid var(--line); }
  nav { min-height:72px; display:flex; align-items:center; justify-content:space-between; gap:20px; }
  .brand { display:flex; align-items:center; gap:11px; font-weight:950; text-decoration:none; color:#fff; }
  .brand img { width:42px; height:42px; border-radius:13px; }
  main { padding:40px 0 70px; }
  h1 { font-size:clamp(1.9rem,4vw,2.8rem); letter-spacing:-.03em; line-height:1.12; margin:0 0 10px; }
  h2 { font-size:1.25rem; margin:34px 0 10px; color:#fff; }
  h3 { font-size:1rem; margin:18px 0 6px; color:var(--lime); }
  p, li { color:var(--muted); }
  .lede { font-size:1.05rem; color:#e6dff5; }
  .pill { display:inline-block; border-radius:999px; padding:6px 13px; background:var(--card); border:1px solid var(--line); font-size:.78rem; color:var(--muted); margin:0 6px 18px 0; }
  .card { border:1px solid var(--line); border-radius:18px; padding:18px 20px; background:var(--card); margin:16px 0; }
  .btn { display:inline-flex; align-items:center; gap:8px; border-radius:999px; padding:13px 20px; background:var(--lime); color:#140a29; font-weight:900; text-decoration:none; margin:6px 8px 6px 0; }
  .btn--ghost { background:transparent; border:1px solid var(--line); color:#fff; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:14px; }
  .agenav { display:flex; flex-wrap:wrap; gap:8px; margin:22px 0; }
  .agenav a { border:1px solid var(--line); border-radius:999px; padding:9px 14px; background:var(--card); text-decoration:none; font-size:.85rem; font-weight:700; }
  .agenav a[aria-current="page"] { background:var(--lime); color:#140a29; border-color:var(--lime); }
  footer { border-top:1px solid var(--line); padding:26px 0; font-size:.84rem; color:var(--muted); }
  footer a { margin-right:14px; display:inline-block; }
  ul { padding-left:20px; }
  table { width:100%; border-collapse:collapse; margin:14px 0; font-size:.9rem; }
  th, td { text-align:left; padding:9px 10px; border-bottom:1px solid var(--line); color:var(--muted); }
  th { color:#fff; font-size:.8rem; text-transform:uppercase; letter-spacing:.04em; }
`

const AGES = [
  {
    slug: 'english-for-kids-ages-4-7.html',
    range: '4–7',
    label: 'Ages 4–7',
    title: 'Online English Classes for Kids Ages 4–7 | TutorPro Online English',
    description: 'One-to-one online English lessons for children aged 4–7. Phonics, first words and speaking confidence in 25-minute classes. Free first class, from $8 per lesson.',
    heading: 'Online English classes for children aged 4–7',
    lede: 'Short, playful one-to-one lessons that build first words, phonics and the confidence to speak out loud — before your child ever worries about getting it wrong.',
    stage: 'Early years and lower Primary',
    focus: [
      ['Phonics and letter sounds', 'Recognising sounds, blending them into words and reading their first simple sentences.'],
      ['First vocabulary', 'Colours, numbers, family, animals, food and everyday objects, learned through pictures and games rather than word lists.'],
      ['Listening and copying', 'Following simple instructions in English and repeating short phrases until they feel natural.'],
      ['Speaking without fear', 'Answering simple questions out loud in a lesson where nobody else is watching or waiting for a turn.'],
    ],
    books: ['Ready, Set, Sing! (A-List)', 'Phonics Monster (A-List)', 'Best Phonics (A-List)', 'Power Up Academy (Cambridge)'],
    lesson: '25 minutes is the right length at this age. It matches how long a four to seven year old can genuinely concentrate, and it keeps lessons feeling like something they look forward to rather than a chore. Teachers use songs, picture cards, drawing on the shared lesson board and short games to keep the pace moving.',
    parentNote: 'At this age children usually do best sitting with a parent nearby for the first few lessons. You do not need to speak English yourself — the teacher leads everything.',
    faqs: [
      ['Is 4 too young to start English lessons?', 'No. Children aged four learn language mainly by listening and copying, which is exactly how these lessons work. There is no reading or writing pressure at this stage, just sounds, words and simple speaking.'],
      ['My child cannot read yet. Is that a problem?', 'Not at all. Lessons for this age group start from listening and speaking, and phonics is introduced gradually so reading grows naturally out of sounds your child already knows.'],
      ['How long can a 5 year old concentrate in an online lesson?', 'Around 25 minutes, which is why that is our standard lesson length for this age. Teachers change activity every few minutes to hold attention.'],
    ],
  },
  {
    slug: 'english-for-kids-ages-8-11.html',
    range: '8–11',
    label: 'Ages 8–11',
    title: 'Online English Classes for Kids Ages 8–11 | TutorPro Online English',
    description: 'One-to-one online English lessons for children aged 8–11. Reading fluency, grammar and speaking confidence aligned to Cambridge and Oxford Primary. Free first class.',
    heading: 'Online English classes for children aged 8–11',
    lede: 'One-to-one lessons that turn school English into real confidence — reading fluently, writing clearly and speaking in full sentences without translating in their head first.',
    stage: 'Primary, Years 3–6',
    focus: [
      ['Reading fluency', 'Moving from decoding individual words to reading whole passages smoothly and understanding them.'],
      ['Grammar that makes sense', 'Tenses, articles, plurals and sentence structure taught through use, not memorised rules.'],
      ['Writing short texts', 'Descriptions, short stories and simple opinion writing with clear paragraph structure.'],
      ['Conversation confidence', 'Answering open questions, giving reasons and holding a short conversation on a familiar topic.'],
    ],
    books: ['Power Up (Cambridge)', 'Global English (Cambridge)', 'Family and Friends (Oxford)', 'Everybody Up (Oxford)', 'Grammar Friends (Oxford)', 'Wonderful World (National Geographic Learning)'],
    lesson: 'Most children in this age group take 25-minute lessons, though 50 minutes suits learners who are already comfortable and want to go deeper. A typical lesson opens with conversation, introduces new vocabulary or a grammar point, practises it in a reading or listening task, then finishes with free speaking so your child uses the new language themselves.',
    parentNote: 'This is the age where school English and confidence often diverge. A child can score well on written tests and still freeze when asked to speak. One-to-one lessons fix that gap directly.',
    faqs: [
      ['My child learns English at school already. Will this just repeat it?', 'No. School English is usually written and grammar-heavy with little speaking time. These lessons are speaking-led and adapt to whatever your child is covering at school, filling the gaps rather than duplicating them.'],
      ['How do you help a child who is shy about speaking?', 'One-to-one means there is no audience. Teachers start with questions your child can answer easily, build up gradually, and use the classroom reaction buttons so a child can say "please repeat" without feeling embarrassed.'],
      ['Can lessons help with school exams?', 'Yes. Lessons align with Cambridge and Oxford Primary English, and teachers can focus on the specific reading, writing or speaking skills your child is being assessed on.'],
    ],
  },
  {
    slug: 'english-for-teens-ages-12-16.html',
    range: '12–16',
    label: 'Ages 12–16',
    title: 'Online English Classes for Teens Ages 12–16 | TutorPro Online English',
    description: 'One-to-one online English lessons for teenagers aged 12–16. Exam preparation, essay writing, comprehension and fluent speaking. Cambridge and Oxford aligned. Free first class.',
    heading: 'Online English lessons for teenagers aged 12–16',
    lede: 'Focused one-to-one lessons for Secondary students — structured writing, comprehension, analysis and the fluency to speak confidently under exam conditions.',
    stage: 'Secondary, Years 7–11',
    focus: [
      ['Structured writing', 'Essays, opinion pieces, formal and informal registers, and organising an argument across paragraphs.'],
      ['Reading comprehension', 'Analysing texts, inferring meaning and answering exam-style comprehension questions accurately.'],
      ['Advanced grammar', 'Conditionals, passive voice, reported speech and the complex structures Secondary assessment expects.'],
      ['Exam-ready speaking', 'Extended answers, giving and defending opinions, and speaking fluently under time pressure.'],
    ],
    books: ['THiNK (Cambridge)', 'Global English (Cambridge)', 'Grammar Friends (Oxford)', 'Wonderful World (National Geographic Learning)'],
    lesson: 'Teenagers often prefer 50-minute lessons, which allow time for an extended writing or comprehension task within the session. Lessons are practical and exam-aware: the teacher works on the specific skills being assessed rather than general conversation, while still keeping a substantial speaking element in every class.',
    parentNote: 'Teenagers are usually independent in lessons and do not need a parent present. Parents still receive written feedback after each class and can review recorded lessons.',
    faqs: [
      ['Can you help prepare for IGCSE or Cambridge English exams?', 'Yes. Lessons align with Cambridge and Oxford Secondary English and teachers can focus on the reading, writing and speaking components your teenager is being assessed on.'],
      ['My teenager understands English but will not speak it. Can this help?', 'This is one of the most common reasons families come to us. One-to-one lessons remove the fear of speaking in front of classmates, and every lesson is speaking-led so there is nowhere to hide behind written work.'],
      ['Are 50-minute lessons better for teenagers?', 'Often yes. A 50-minute lesson gives time for a full writing or comprehension task plus discussion. Both 25 and 50 minute options are available.'],
    ],
  },
]

const escapeHtml = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function ageNav(currentSlug) {
  return `<nav class="agenav" aria-label="Choose your child's age">
    ${AGES.map((a) => `<a href="/${a.slug}"${a.slug === currentSlug ? ' aria-current="page"' : ''}>${a.label}</a>`).join('\n    ')}
  </nav>`
}

function buildSchema(age) {
  const url = `${SITE}/${age.slug}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Course',
        '@id': `${url}#course`,
        name: `Online English Lessons for Ages ${age.range}`,
        description: age.description,
        url,
        provider: {
          '@type': 'EducationalOrganization',
          name: 'TutorPro Online English',
          sameAs: SITE,
        },
        educationalLevel: age.stage,
        inLanguage: 'en',
        teaches: age.focus.map(([t]) => t),
        audience: {
          '@type': 'EducationalAudience',
          educationalRole: 'student',
          audienceType: `Children aged ${age.range}`,
        },
        hasCourseInstance: [{
          '@type': 'CourseInstance',
          courseMode: 'online',
          courseWorkload: 'PT25M',
          location: { '@type': 'VirtualLocation', url: SITE },
          courseSchedule: { '@type': 'Schedule', duration: 'PT25M', repeatFrequency: 'Weekly', repeatCount: 4 },
          offers: { '@type': 'Offer', category: 'Paid', price: '8.00', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: SITE },
        }],
        offers: { '@type': 'Offer', category: 'Paid', price: '8.00', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: SITE },
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: age.faqs.map(([q, a]) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: age.label, item: url },
        ],
      },
    ],
  }
}

function page(age) {
  const url = `${SITE}/${age.slug}`
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#321568" />
    <title>${escapeHtml(age.title)}</title>
    <meta name="description" content="${escapeHtml(age.description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="/assets/pwa-icon-192.png" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="TutorPro Online English" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${escapeHtml(age.title)}" />
    <meta property="og:description" content="${escapeHtml(age.description)}" />
    <meta property="og:image" content="${SITE}/assets/tutorpro-hero.webp" />
    <script type="application/ld+json">${JSON.stringify(buildSchema(age))}</script>
    <style>${STYLE}</style>
  </head>
  <body>
    <header>
      <div class="container">
        <nav>
          <a class="brand" href="/"><img src="/assets/tutorpro-panda-logo.webp" alt="TutorPro Online English" />TutorPro Online English</a>
          <a class="btn" href="/">Book a free first class</a>
        </nav>
      </div>
    </header>
    <main>
      <div class="container">
        <h1>${escapeHtml(age.heading)}</h1>
        <p class="lede">${escapeHtml(age.lede)}</p>
        <p>
          <span class="pill">${escapeHtml(age.stage)}</span>
          <span class="pill">25 or 50 minute lessons</span>
          <span class="pill">From $8 per class</span>
          <span class="pill">Free first class</span>
        </p>
        <p>
          <a class="btn" href="/">Book a free first class</a>
          <a class="btn btn--ghost" href="${MESSENGER}" target="_blank" rel="noopener">Ask a question</a>
        </p>

        ${ageNav(age.slug)}

        <h2>What children aged ${age.range} work on</h2>
        <div class="grid">
          ${age.focus.map(([t, d]) => `<div class="card"><h3>${escapeHtml(t)}</h3><p>${escapeHtml(d)}</p></div>`).join('\n          ')}
        </div>

        <h2>What a lesson looks like</h2>
        <p>${escapeHtml(age.lesson)}</p>
        <p>Lessons run inside our own browser-based classroom. There is no Zoom link and nothing to install: your child clicks once from their dashboard and the class begins. The teacher shares interactive slides on a lesson board that both can draw and write on together, and the whole session is speaking-led.</p>

        <h2>Coursebooks we teach from at this age</h2>
        <p>Lessons follow recognised published series rather than improvised worksheets. For ages ${age.range} these typically include:</p>
        <ul>
          ${age.books.map((b) => `<li>${escapeHtml(b)}</li>`).join('\n          ')}
        </ul>
        <p>Your teacher chooses the right series and level for your child after the first class, and adapts it to the English they are already doing at school.</p>

        <h2>For parents</h2>
        <p>${escapeHtml(age.parentNote)}</p>
        <p>After every class the teacher writes feedback covering what was practised, what went well and what to work on next, along with specific words to practise at home. Each practice word can be tapped to hear it pronounced correctly, with a slower option for tricky sounds. Lessons can also be recorded so you can watch them back later — a clear indicator shows in the classroom whenever recording is active.</p>

        <h2>Pricing</h2>
        <table>
          <tr><th>Plan</th><th>Classes per week</th><th>Price per class</th></tr>
          <tr><td>Weekly plan</td><td>1–3</td><td>$10</td></tr>
          <tr><td>Monthly package</td><td>4–7</td><td>$8</td></tr>
        </table>
        <p>The first class is free for every new family and no card is required to try it. Unused lesson credits can be refunded within 14 days of purchase, and cancelling at least 12 hours before a lesson returns the credit in full. Full terms are on our <a href="/refund-policy.html">refund policy</a> page.</p>

        <h2>Questions parents ask about ages ${age.range}</h2>
        ${age.faqs.map(([q, a]) => `<div class="card"><h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p></div>`).join('\n        ')}

        <h2>Try a free class</h2>
        <p>Every new family can take one free class before choosing a plan. It is a real lesson with a real teacher — a chance to see how your child responds before paying anything.</p>
        <p>
          <a class="btn" href="/">Book a free first class</a>
          <a class="btn btn--ghost" href="/about.html">About TutorPro</a>
        </p>
        <p><small>Last reviewed: ${UPDATED}</small></p>
      </div>
    </main>
    <footer>
      <div class="container">
        <a href="/">Home</a>
        ${AGES.map((a) => `<a href="/${a.slug}">${a.label}</a>`).join('\n        ')}
        <a href="/about.html">About</a>
        <a href="/contact.html">Contact</a>
        <a href="/refund-policy.html">Refunds</a>
        <p>© ${new Date().getFullYear()} TutorPro Online English. One-to-one online English classes for children and teenagers worldwide.</p>
      </div>
    </footer>
  </body>
</html>
`
}

async function run() {
  await mkdir(publicDir, { recursive: true })
  for (const age of AGES) {
    await writeFile(resolve(publicDir, age.slug), page(age), 'utf8')
    console.log(`[age-pages] wrote public/${age.slug}`)
  }
  console.log(`[age-pages] ${AGES.length} age-tier pages generated.`)
}

run()

export { AGES }
