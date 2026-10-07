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
 * Pricing from planSessionRate() in src/Dashboards.jsx ($8 for 1-3/week, $8
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
    /* Served at the extensionless URL. The .html file is still what gets
       built and deployed; vercel.json redirects the old address to the
       clean one and rewrites the clean one back to the file, so the
       canonical, the schema and the sitemap all name a single URL. */
    cleanUrl: 'online-english-classes-for-kids',
    label: 'Online English classes',
    /* NOT "Online English Classes for Kids | TutorPro English" - that is
       the homepage's title now. Two pages competing for one query split
       the signal and Search Console reports duplicate titles as a fault.
       This page takes the variants the homepage does not: "for children",
       "one-to-one", "lessons". */
    title: 'Online English Classes for Children | One-to-One Lessons',
    description:
      'Live one-to-one online English classes for children aged 4-16, taught by experienced teachers. Speaking, reading, grammar and pronunciation. Free first class.',
    heading: 'Online English classes for children, one to one',
    lede:
      'Live video lessons for children aged 4 to 16, with one teacher and one child. No group classes and no waiting for a turn to speak - your child talks for the whole lesson.',
    intent: 'the-basics',
    body: `
        <p class="cta-row">
          <a class="btn btn--primary" href="/free-trial.html">Book a free trial class</a>
          <a class="btn" href="/primary-english.html">Explore our English programmes</a>
        </p>

        <h2>Personalised online English classes for children</h2>
        <p>Every class is built around one child. The teacher sees what your child can already do, where they hesitate, and what they are being asked to do at school, then teaches to that. A child who reads well but will not speak needs a different lesson from one who chats happily but cannot write a paragraph, and in a one-to-one class they get it.</p>
        <p>In a group of six, a child speaks for roughly a fifth of the lesson. Speaking is a skill rather than a body of knowledge, so practice time is the strongest predictor of progress - which is why the whole lesson belongs to your child.</p>

        <h2>Experienced English tutors for kids</h2>
        <p>Every teacher applies through a structured process: a recorded teaching interview that we watch in full, plus a review of their qualifications and teaching experience, with particular weight given to experience teaching children. Only teachers who pass are given students.</p>
        <p>You can <a href="/teachers.html">read our teachers' profiles and watch their introduction videos</a> before you book, so you know who will be teaching your child rather than being assigned an anonymous tutor.</p>

        <h2>What your child can learn</h2>
        <div class="grid">
          <div class="card"><h3>Speaking and conversation</h3><p>Answering in full sentences, holding a conversation, and saying what they mean without rehearsing it first.</p></div>
          <div class="card"><h3>Reading</h3><p>Decoding for younger children, then fluency, comprehension and reading for meaning rather than word by word.</p></div>
          <div class="card"><h3>Pronunciation</h3><p>Individual sounds, word stress and rhythm. An AI speech coach scores words during practice and plays the correct sound back.</p></div>
          <div class="card"><h3>Grammar</h3><p>Taught inside real sentences your child is trying to say, not as isolated rules to memorise.</p></div>
          <div class="card"><h3>Vocabulary</h3><p>Words introduced in context, revisited in later lessons, and sent home in the lesson feedback to practise.</p></div>
          <div class="card"><h3>Listening</h3><p>Following instructions, understanding a story, and picking out detail in natural speech at normal pace.</p></div>
          <div class="card"><h3>Confidence</h3><p>The quiet one. Mistakes are corrected privately rather than in front of classmates, which is often what unlocks the rest.</p></div>
        </div>

        <h2>One-on-one English lessons for kids</h2>
        <p>Because there is only one child in the room, the teacher can change course inside the lesson rather than at the end of a term. If a task is too easy, it gets harder immediately. If a child is tired after a long school day, the teacher switches to speaking practice instead of writing. If something was forgotten since last week, it is retaught on the spot.</p>
        <p>Lessons are 25 or 50 minutes. Younger children usually do better with 25, older ones with 50, and you can switch as your child grows. For speaking, two shorter lessons a week generally beat one long one.</p>

        <h2>Cambridge and Oxford English learning materials</h2>
        <p>Lessons follow published course books rather than improvised worksheets: Cambridge Power Up, Power Up Academy, Global English and THiNK, and Oxford Family and Friends, Everybody Up, Grammar Friends and Phonics World. The teacher picks the level that matches your child and moves them up when they are ready. Materials are included - there is nothing extra to buy.</p>
        <p>To be clear about what that means: we teach from these published series because they are well-sequenced and widely used. TutorPro is an independent tutoring service. We are not a Cambridge exam centre and we have no affiliation with Oxford University Press.</p>

        <h2>English classes for primary and secondary students</h2>
        <div class="grid">
          <div class="card"><h3>Ages 4-7</h3><p>Phonics, first words, songs and games. The goal at this age is that English feels normal and enjoyable rather than a test.</p></div>
          <div class="card"><h3>Ages 8-11</h3><p>Reading fluency, grammar in context, speaking in full sentences, and support with whatever school is covering. See our <a href="/primary-english.html">primary English programme</a>.</p></div>
          <div class="card"><h3>Ages 12-16</h3><p>Writing, comprehension, advanced grammar and exam-style speaking practice. See our <a href="/secondary-english.html">secondary English programme</a>.</p></div>
        </div>

        <h2>How TutorPro online English classes work</h2>
        <div class="grid">
          <div class="card"><h3>1. Create a parent account</h3><p>A few details about your child - age, school year and what you would like them to work on. No card is needed to start.</p></div>
          <div class="card"><h3>2. Book a lesson</h3><p>Choose a teacher and a time. Slots are shown in your own time zone, so there is nothing to convert. <a href="/how-it-works.html">See how booking works step by step</a>.</p></div>
          <div class="card"><h3>3. Meet the teacher online</h3><p>The lesson opens in our own browser classroom. Nothing to install, no meeting link to hunt for - your child clicks once from their dashboard.</p></div>
          <div class="card"><h3>4. Read the feedback</h3><p>After every class the teacher writes what was practised, what went well, what to work on, and the words to revise at home.</p></div>
        </div>

        <h2>Why parents choose TutorPro</h2>
        <ul class="ticks">
          <li><strong>Experienced teachers</strong>, screened by recorded teaching interview before they are given a student.</li>
          <li><strong>Genuinely one-to-one</strong>, every lesson, at every level - children are never moved into group speaking clubs as they progress.</li>
          <li><strong>Primary and secondary programmes</strong>, so a child can stay with the same school as they grow up.</li>
          <li><strong>Lesson times in your own time zone</strong>, with evening and weekend slots.</li>
          <li><strong>Written feedback after every class</strong>, in plain language a parent can act on.</li>
          <li><strong>Learning from home</strong>, on an ordinary laptop or tablet, with no travel.</li>
          <li><strong>A free first class</strong> with no card required, and <a href="/pricing.html">published prices from $7 per lesson</a>.</li>
          <li><strong>Refundable credits</strong> - cancel 12 hours ahead and the credit returns in full.</li>
        </ul>

        <p class="cta-row">
          <a class="btn btn--primary" href="/free-trial.html">Book a free trial class</a>
          <a class="btn" href="/faq.html">Read the parent FAQ</a>
        </p>

        <p>Families in the Philippines may also want our page on finding a <a href="/english-tutor-rizal.html">private English tutor in Rizal</a>, or <a href="/contact.html">a direct conversation with us</a> before booking.</p>`,
    faqs: [
      ['What age can children start online English classes?', 'From four years old. Lessons for younger children are 25 minutes, which matches their concentration span, and are built around phonics, songs, games and first words rather than desk work.'],
      ['Are TutorPro classes one-on-one?', 'Yes, every lesson, at every level. One teacher and one child, so your child speaks for the whole class instead of a fraction of it. Children are never moved into group classes as they progress.'],
      ['Are the lessons suitable for beginners?', 'Yes. The teacher starts from what your child can actually do rather than from a syllabus, and many of our students speak another language at home and use English only at school.'],
      ['What English skills will my child learn?', 'Speaking and conversation, reading, pronunciation, grammar, vocabulary and listening - and, for most families, the confidence to use them. The balance is set by what your child needs most.'],
      ['Do you teach primary and secondary students?', 'Both. Primary lessons focus on phonics, reading fluency and speaking in full sentences; secondary lessons move into writing, comprehension, advanced grammar and exam-style speaking practice.'],
      ['What learning materials do you use?', 'Published Cambridge and Oxford course books, including Power Up, Global English, THiNK, Family and Friends and Oxford Phonics World. Materials are included in the lesson price. We are an independent tutoring service, not a Cambridge exam centre.'],
      ['How do parents book a lesson?', 'Create a parent account, choose a teacher and pick a time from the calendar. Slots appear in your own time zone. The first class is free and no card is required to book it.'],
      ['How can parents receive teacher feedback?', 'It appears in your dashboard after every lesson: what was practised, what went well, what to work on next, and the words worth revising at home. Lessons can also be recorded so you can watch them back.'],
      ['How does the free trial work?', 'It is a full lesson with a real teacher, not a sales call or a demo. You book it like any other class, without entering card details, and decide afterwards whether to continue.'],
    ],
  },
  {
    slug: 'online-english-tutor-for-kids.html',
    label: 'Online English tutor',
    title: 'Online English Tutor for Children | TutorPro',
    description:
      'Find a qualified online English tutor for your child. Every teacher passes a recorded interview and credential check. From $7 per lesson.',
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
    title: 'Online English Class Times by Country | TutorPro',
    description:
      'A country-by-country guide to online English lesson times with Philippine-based teachers (UTC+8), from the UK and Europe to the US and Japan.',
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
  /* `cleanUrl` wins where a page has one: the canonical, the schema and
     the sitemap must all name the same single address, or Google picks
     one itself and the other becomes "Alternate page with proper
     canonical tag" in Search Console. */
  const url = `${SITE}/${page.cleanUrl || page.slug}`
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
          ${PAGES.filter((p) => p.slug !== current).map((p) => `<a href="/${p.cleanUrl || p.slug}">${escapeHtml(p.label)}</a>`).join('\n          ')}
          <a href="/pricing.html">Pricing</a>
          <a href="/is-tutorpro-legitimate.html">Are we legitimate?</a>
        </nav>`
}

function page(spec) {
  const url = `${SITE}/${spec.cleanUrl || spec.slug}`
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
        <h1>${escapeHtml(spec.heading)}</h1>
        <p class="lede">${escapeHtml(spec.lede)}</p>
        <p>
          <span class="pill">Ages 4–16</span>
          <span class="pill">One-to-one, always</span>
          <span class="pill">25 or 50 minute lessons</span>
          <span class="pill">from $7 per class</span>
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
          <tr><td>Weekly plan</td><td>1–3</td><td>$8</td></tr>
          <tr><td>Monthly package</td><td>4–7</td><td>$7</td></tr>
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
