/**
 * Country pages, in English, for parents searching from abroad.
 *
 * WHY THESE AND NOT A COUNTRY LIST
 * --------------------------------
 * The brief is explicit: a country page only earns its place when there
 * is genuinely local content to put on it, and must never be the
 * homepage with a country name swapped in. Thin duplicates are how a
 * site teaches Google to ignore it.
 *
 * So each page here answers questions that are only true in that
 * country: what the school system is called and when English starts in
 * it, which exam the child is heading towards, what the time difference
 * from Manila actually means for an after-school lesson, and how
 * families there usually pay. Nothing is shared between them except the
 * shell.
 *
 * WHAT IS NOT CLAIMED
 * -------------------
 * No student numbers, no local partnerships, no "most popular in X", no
 * invented prices for local competitors. Where the time difference is
 * awkward - Europe, where an after-school slot is late evening in
 * Manila - the page says so, because a parent discovering that after
 * paying is worse than losing the booking.
 *
 * /kr/ and /cn/ already exist in Korean and Chinese. These are the
 * English-language equivalents the brief named, and each links to its
 * native-language section rather than competing with it.
 *
 * Run: node scripts/build-country-pages.mjs   (wired into npm run build)
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')
const SITE = 'https://www.tutorpro.site'
const DTI = '5274092'

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const COUNTRIES = [
  {
    slug: 'online-english-classes-korea',
    situations: ["A 초등학교 pupil who scores well on written tests and will not answer aloud", "A 중학교 student whose school English suddenly got harder this year", "A family cutting back on hagwon hours but not on English"],
    country: 'South Korea',
    adjective: 'Korean',
    title: 'Online English Classes for Kids in South Korea | TutorPro',
    description: 'Live one-to-one online English classes for Korean children aged 4-16. Only one hour from Seoul time, taught by experienced teachers. Free first class.',
    h1: 'Online English classes for children in South Korea',
    lede: 'One teacher, one child, live on video. Seoul is one hour ahead of our teachers, so an after-school lesson is an after-school lesson for everybody.',
    nativeLink: ['/kr/', 'Read this page in Korean (한국어)'],
    timezone: 'KST is UTC+9, one hour ahead of Manila. A 17:00 lesson in Seoul is 16:00 for the teacher — ordinary working hours on both sides, which is why Korean families can book the 16:00–21:00 slots that are hardest to get elsewhere.',
    school: 'English is a compulsory subject from 3rd grade of 초등학교 (elementary school), and the jump in difficulty at 중학교 (middle school) is where many families start looking for help. Lessons can follow your child\u2019s school textbook directly, or work on speaking, which school classes rarely have time for.',
    instead: 'A 학원 (hagwon) class usually means one teacher and a roomful of children, where a quiet child can go a whole session without speaking English aloud. Travel is on top. These lessons are one-to-one, from home, and the whole 25 or 50 minutes belongs to your child.',
    pay: 'Payment is by PayPal in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$7 on 4 or more. No registration fee and no materials fee.',
    faqs: [
      ['Is the teacher Korean or a native English speaker?', 'Teachers are Filipino and teach entirely in English. Many have taught Korean children for years and are used to starting from a learner who reads well but hesitates to speak.'],
      ['Can lessons follow my child\u2019s school textbook?', 'Yes. Teachers can work directly from the school book and homework, alongside the Cambridge and Oxford course books, if keeping up at school is the priority.'],
      ['What time are lessons available in Korean time?', 'Seoul is one hour ahead of Manila, so after-school and early-evening Korean times are normal working hours for the teacher. Slots are shown in your own time zone when you book.'],
      ['How does this compare with a hagwon?', 'The lesson is one-to-one rather than a group, there is no travel, and you can see written feedback after every class. We publish our prices; you can compare them with what you pay locally.'],
      ['Is the first class really free?', 'Yes, and no card is required. It is a full lesson with a real teacher.'],
    ],
  },
  {
    slug: 'online-english-classes-china',
    situations: ["A primary pupil who needs phonics and reading before the pressure of 初中", "A child whose school English is strong on paper and thin in conversation", "A family who wants an English teacher without a cross-border video that freezes"],
    country: 'China',
    adjective: 'Chinese',
    title: 'Online English Classes for Kids in China | TutorPro',
    description: 'Live one-to-one online English classes for children in China. Same time zone, VooV backup, QR payment in RMB. Experienced teachers, free first class.',
    h1: 'Online English classes for children in China',
    lede: 'One teacher, one child, live on video — in the same time zone as your family, with a Tencent Meeting fallback when cross-border video is unstable.',
    nativeLink: ['/cn/', 'Read this page in Chinese (中文)'],
    timezone: 'China and the Philippines are both UTC+8. There is no time difference at all, so any slot that suits your child after school suits the teacher too.',
    school: 'English is part of the curriculum from primary school and the pressure rises through 初中. Lessons can support the school book and the speaking practice that large classes make difficult, or work separately on reading, phonics and conversation.',
    instead: 'Classes run in our own browser classroom with a low-bandwidth mode. If cross-border video is unstable, ask the administrator for a VooV / 腾讯会议 link instead — the lesson is the same either way.',
    pay: 'Families in China can pay by QR code: RMB25 per 25-minute lesson plus an RMB5 processing fee per session. Send the receipt to the administrator and the credits are added once it is checked. PayPal in US dollars is also accepted.',
    faqs: [
      ['Will the video connection work from China?', 'The classroom has a low-bandwidth mode built in, and a VooV / Tencent Meeting link is available as a backup. Families who have trouble with one usually find the other works.'],
      ['Can we pay in RMB?', 'Yes. QR payment is RMB25 per 25-minute lesson plus an RMB5 processing fee per session. Send the receipt and the credits are added after the administrator verifies it.'],
      ['Can we communicate in Chinese?', 'Yes. The support chat on the site answers in Chinese, and the administrator replies in Chinese. The lessons themselves are taught in English.'],
      ['Is there a Chinese version of this website?', 'Yes — the Chinese pages are at /cn/, with the same information in Simplified Chinese.'],
      ['What time are lessons available?', 'China and the Philippines share UTC+8, so there is no time difference and any after-school slot works.'],
    ],
  },
  {
    slug: 'online-english-classes-italy',
    situations: ["A scuola primaria pupil who is losing confidence in English before it has started", "A ragazzo preparing for a Cambridge qualification who needs speaking practice, not more grammar drills", "A family whose local private tutor costs more per hour than four lessons here"],
    country: 'Italy',
    adjective: 'Italian',
    title: 'Online English Classes for Kids in Italy | TutorPro',
    description: 'Live one-to-one online English classes for Italian children aged 4-16. Speaking practice, Cambridge-aligned books, experienced teachers. Free first class.',
    h1: 'Online English classes for children in Italy',
    lede: 'One teacher, one child, live on video. Built around the thing Italian school English gives children least of: time actually speaking.',
    nativeLink: null,
    timezone: 'Italy is UTC+1 in winter and UTC+2 in summer, so Manila is 6 to 7 hours ahead. In practice the earliest after-school slots work best: a 15:00 lesson in Rome is 21:00 for the teacher, and later Italian times become late-night ones in Manila. We would rather say that plainly than have you find out when you try to book 19:00.',
    school: 'English is taught from scuola primaria and continues through scuola secondaria, but class sizes mean a child can read and write English far better than they can speak it. Many Italian families also prepare for Cambridge English qualifications, and lessons can be pointed at the speaking and listening parts of those.',
    instead: 'A private tutor at home in Italy means travel, a fixed local rate and whatever times that tutor has left. These lessons are one-to-one from home, 25 or 50 minutes, booked when it suits your family.',
    pay: 'Payment is by PayPal in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$7 on 4 or more. Your bank converts at its own rate; there is no separate fee from us.',
    faqs: [
      ['Does the teacher speak Italian?', 'No. Teachers are Filipino and teach entirely in English, which is deliberate: a child who knows the teacher cannot switch to Italian stops waiting to be rescued and starts trying.'],
      ['What time are lessons available in Italy?', 'The earliest after-school slots are the most reliable. 15:00 to 17:00 Italian time is 21:00 to 23:00 in Manila, which teachers do cover; later Italian evenings are much harder.'],
      ['Can lessons prepare my child for a Cambridge exam?', 'Teachers can focus on the speaking and listening skills those exams test, using Cambridge course books. TutorPro is not a Cambridge exam centre and does not register candidates — your school or a local centre does that.'],
      ['Is this suitable for a complete beginner?', 'Yes. Lessons for younger children start with phonics, songs and first words, and the teacher begins from what your child can already do.'],
      ['How do I pay from Italy?', 'PayPal, in US dollars. Prices are published on the site: US$8 per 25-minute lesson, or US$7 on four or more a week.'],
    ],
  },
  {
    slug: 'online-english-classes-poland',
    situations: ["A szkoła podstawowa pupil heading for the egzamin ósmoklasisty", "A child with good grammar marks who cannot hold a conversation", "A family who wants regular speaking practice without driving anywhere"],
    country: 'Poland',
    adjective: 'Polish',
    title: 'Online English Classes for Kids in Poland | TutorPro',
    description: 'Live one-to-one online English classes for Polish children aged 4-16. Speaking practice and exam support with experienced teachers. Free first class.',
    h1: 'Online English classes for children in Poland',
    lede: 'One teacher, one child, live on video — speaking practice for children who already know the grammar and freeze when they have to use it.',
    nativeLink: null,
    timezone: 'Poland is UTC+1 in winter and UTC+2 in summer, so Manila is 6 to 7 hours ahead. The earliest after-school slots are the ones we cover most reliably: a 15:00 lesson in Warsaw is 21:00 for the teacher. Later Polish evenings are much harder to staff, and it is better to know that before you book.',
    school: 'English is taught from the early years of szkoła podstawowa, and the egzamin ósmoklasisty at the end of it includes a modern foreign language, which for most pupils is English. Lessons can work on the speaking and listening that classroom time rarely stretches to, or support directly what the school is covering.',
    instead: 'Group courses and school lessons give a child a few sentences of speaking each week. One-to-one means the whole lesson is theirs, with mistakes corrected privately instead of in front of classmates.',
    pay: 'Payment is by PayPal in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$7 on 4 or more. Your bank converts at its own rate; we add nothing on top.',
    faqs: [
      ['Does the teacher speak Polish?', 'No. Teachers are Filipino and teach entirely in English. For a child who understands more than they will say, that is usually the point.'],
      ['Can lessons help with the egzamin ósmoklasisty?', 'Teachers can work on the language skills the exam tests — reading, listening, writing and the grammar it rests on — using the exam-style practice your child brings and Cambridge and Oxford course books.'],
      ['What time are lessons available in Poland?', 'Early after-school times work best: 15:00 to 17:00 in Poland is 21:00 to 23:00 in Manila. Later evenings are harder to cover.'],
      ['How long is a lesson?', '25 or 50 minutes. Younger children usually do better with 25, and two shorter lessons a week beat one long one for speaking.'],
      ['Is the first class free?', 'Yes, with no card required. It is a full lesson with a real teacher, after which you decide.'],
    ],
  },
  {
    slug: 'online-english-classes-turkey',
    situations: ["An ortaokul student working towards LGS English", "A child who learned English rules thoroughly and never had to use them", "A family looking for one-to-one practice instead of a dershane group"],
    country: 'Turkey',
    adjective: 'Turkish',
    title: 'Online English Classes for Kids in Turkey | TutorPro',
    description: 'Live one-to-one online English classes for Turkish children aged 4-16. Speaking confidence and exam support with experienced teachers. Free first class.',
    h1: 'Online English classes for children in Turkey',
    lede: 'One teacher, one child, live on video. For children who can answer an English question on paper and go quiet when asked it out loud.',
    nativeLink: null,
    timezone: 'Turkey is UTC+3 all year, so Manila is 5 hours ahead. A 16:00 lesson in Istanbul is 21:00 for the teacher, and the earlier after-school slots are the ones we can cover most reliably.',
    school: 'English begins in ilkokul and continues through ortaokul, where the LGS exam at the end includes English. Classroom English leans heavily on grammar and vocabulary, so speaking is usually where a child needs the practice, and that is what a one-to-one lesson is for.',
    instead: 'A dershane or private course is a group, with travel on top. Here your child speaks for the whole lesson, from home, and you get written feedback afterwards saying exactly what was covered.',
    pay: 'Payment is by PayPal in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$7 on 4 or more. Your bank converts at its own rate.',
    faqs: [
      ['Does the teacher speak Turkish?', 'No. Teachers are Filipino and teach entirely in English, which pushes a child to produce the language rather than translate their way around it.'],
      ['Can lessons help with LGS English?', 'Teachers can work on the reading, vocabulary and grammar the exam tests, and on the speaking that the exam does not test but school and life do.'],
      ['What time are lessons available in Turkey?', 'Manila is 5 hours ahead. Early after-school times are best: 16:00 in Istanbul is 21:00 for the teacher.'],
      ['My child is shy about speaking. Will this help?', 'That is the most common reason families come to us. One-to-one means no classmates listening, and mistakes are corrected quietly as they go.'],
      ['How do I pay from Turkey?', 'PayPal, in US dollars, at the published rates. There is no registration fee and no charge for books.'],
    ],
  },
]

function schema(entry) {
  const url = `${SITE}/${entry.slug}.html`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Course',
        '@id': `${url}#course`,
        name: `Online English classes for children in ${entry.country}`,
        description: entry.description,
        url,
        inLanguage: 'en',
        audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'Children aged 4-16' },
        provider: {
          '@type': 'EducationalOrganization',
          name: 'TutorPro Online English',
          url: SITE,
          areaServed: entry.country,
          identifier: { '@type': 'PropertyValue', propertyID: 'DTI Business Name Registration', value: DTI },
          address: { '@type': 'PostalAddress', addressCountry: 'PH' },
        },
        hasCourseInstance: [{
          '@type': 'CourseInstance',
          courseMode: 'online',
          courseWorkload: 'PT25M',
          location: { '@type': 'VirtualLocation', url: SITE },
          offers: {
            '@type': 'Offer', price: '8', priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            description: 'First 25-minute one-to-one class free. Lessons from US$7 afterwards.',
            url,
          },
        }],
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: entry.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumbs`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Online English classes', item: `${SITE}/online-english-classes-for-kids` },
          { '@type': 'ListItem', position: 3, name: entry.country, item: url },
        ],
      },
    ],
  }
}

function render(entry, all) {
  const url = `${SITE}/${entry.slug}.html`
  const others = all.filter((item) => item.slug !== entry.slug)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(entry.title)}</title>
    <meta name="description" content="${escapeHtml(entry.description)}" />
    <link rel="canonical" href="${url}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="TutorPro Online English" />
    <meta property="og:title" content="${escapeHtml(entry.title)}" />
    <meta property="og:description" content="${escapeHtml(entry.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${SITE}/assets/tutorpro-hero.webp" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="/assets/pwa-icon-192.png" />
    <link rel="stylesheet" href="/assets/fonts.css" />
    <link rel="stylesheet" href="/assets/pages.css" />
    <script type="application/ld+json">${JSON.stringify(schema(entry))}</script>
  </head>
  <body>
    <header class="site-head">
      <div class="wrap site-head__inner">
        <a class="brand" href="/"><img src="/assets/tutorpro-panda-logo.webp" alt="TutorPro Online English" width="40" height="40" />TutorPro Online English</a>
        <a class="btn btn--primary" href="/free-trial.html">Book a free trial</a>
      </div>
    </header>

    <main>
      <nav class="crumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> › <a href="/online-english-classes-for-kids">Online English classes</a> › <span>${escapeHtml(entry.country)}</span>
      </nav>

      <section class="page-hero">
        <div class="wrap wrap--narrow">
          <span class="kicker">For families in ${escapeHtml(entry.country)}</span>
          <h1>${escapeHtml(entry.h1)}</h1>
          <p class="lede">${escapeHtml(entry.lede)}</p>
          ${entry.nativeLink ? `<p><a class="text-link" href="${entry.nativeLink[0]}">${escapeHtml(entry.nativeLink[1])}</a></p>` : ''}
          <p class="cta-row">
            <a class="btn btn--primary" href="/free-trial.html">Book a free trial class</a>
            <a class="btn" href="/pricing.html">See prices in US dollars</a>
          </p>
        </div>
      </section>

      <section>
        <div class="wrap wrap--narrow">
          <h2>Lesson times from ${escapeHtml(entry.country)}</h2>
          <p>${escapeHtml(entry.timezone)}</p>
          <p>Slots appear in your own local time when you book. <a href="/online-english-class-schedule-time-zones.html">How scheduling works across time zones</a>.</p>

          <h2>English at school in ${escapeHtml(entry.country)}</h2>
          <p>${escapeHtml(entry.school)}</p>

          <h2>How this differs from what you have locally</h2>
          <p>${escapeHtml(entry.instead)}</p>

          <h2>Who we are usually asked to help in ${escapeHtml(entry.country)}</h2>
          <ul class="ticks">
            ${entry.situations.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n            ')}
          </ul>
          <p>Lessons cover speaking, listening, reading, pronunciation, grammar and vocabulary, weighted towards whichever of those your child actually needs. <a href="/online-english-classes-for-kids">How the classes work</a>.</p>

          <h2>Who teaches your child</h2>
          <p>Teachers live in the Philippines and teach in English. Every applicant records a teaching interview we watch in full, and their credentials are checked before they are given a student — <a href="/teachers.html">their profiles and introduction videos are public</a>. TutorPro Online English is registered in the Philippines, DTI ${DTI}. We say so plainly rather than implying a presence in ${escapeHtml(entry.country)} that we do not have.</p>

          <h2>Paying from ${escapeHtml(entry.country)}</h2>
          <p>${escapeHtml(entry.pay)} First class free, no card. <a href="/refund-policy.html">Cancellation and refunds</a>.</p>
        </div>
      </section>

      <section class="faq alt">
        <div class="wrap wrap--narrow">
          <h2>Questions from ${escapeHtml(entry.adjective)} parents</h2>
          ${entry.faqs.map(([q, a], index) => `<details${index === 0 ? ' open' : ''}><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`).join('\n          ')}
          <p class="cta-row">
            <a class="btn btn--primary" href="/free-trial.html">Book a free trial class</a>
            <a class="btn" href="/contact.html">Ask us a question first</a>
          </p>
        </div>
      </section>

      <section>
        <div class="wrap wrap--narrow">
          <h2>Other countries we teach from the Philippines</h2>
          <nav class="pagenav" aria-label="Other countries">
            ${others.map((item) => `<a href="/${item.slug}.html">${escapeHtml(item.country)}</a>`).join('\n            ')}
          </nav>
        </div>
      </section>
    </main>

    <footer class="site-foot">
      <div class="wrap">
        <nav>
          <a href="/">Home</a>
          <a href="/online-english-classes-for-kids">Online English classes</a>
          <a href="/pricing.html">Pricing</a>
          <a href="/teachers.html">Teachers</a>
          <a href="/faq.html">FAQ</a>
          <a href="/contact.html">Contact</a>
        </nav>
        <p>© ${new Date().getFullYear()} TutorPro Online English · DTI Business Name Registration ${DTI} · One-to-one online classes for children worldwide, taught from the Philippines.</p>
      </div>
    </footer>
  </body>
</html>
`
}

await mkdir(publicDir, { recursive: true })
for (const entry of COUNTRIES) {
  await writeFile(resolve(publicDir, `${entry.slug}.html`), render(entry, COUNTRIES), 'utf8')
  console.log(`[country] wrote public/${entry.slug}.html`)
}
console.log(`[country] ${COUNTRIES.length} country pages generated.`)

export { COUNTRIES }
