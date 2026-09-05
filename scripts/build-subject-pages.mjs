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
 * in src/Dashboards.jsx ($10 for 1-3/wk, $8 for 4+), subjects and level copy
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

const SUBJECTS = [
  {
    slug: 'online-maths-tutor-for-kids.html',
    name: 'Maths',
    label: 'Maths',
    title: 'Online Maths Tutor for Kids & Teens | 1-to-1 Classes | TutorPro',
    description: 'One-to-one online maths lessons for children aged 4–16. Times tables, fractions, algebra and exam preparation, matched to your child’s school curriculum. Free first class, from $8.',
    heading: 'Online maths tutoring for children and teenagers',
    lede: 'One-to-one maths lessons that go at your child’s pace — the steps worked through slowly until the idea actually clicks, not just the answer copied down.',
    stage: 'Primary and Secondary · Ages 4–16',
    accreditation: 'Follows your child’s school curriculum',
    focus: [
      ['Number and place value', 'Counting, place value, times tables and mental methods that make everything later easier.'],
      ['Fractions, decimals and percentages', 'The topic most children get stuck on, taught with visual models before any rules or shortcuts.'],
      ['Algebra and equations', 'Letters standing for numbers, solving step by step, and why the method works rather than memorising it.'],
      ['Word problems and reasoning', 'Reading a question, working out what it is actually asking, and showing the working an examiner wants.'],
    ],
    lesson: 'Maths lessons are worked, not lectured. The teacher and your child solve problems together on a shared lesson board they can both write on, so the teacher sees exactly where a method breaks down rather than only seeing a wrong answer. When a step does not land, they go back a step rather than pressing on.',
    parentNote: 'Bring your child’s actual homework or textbook to the first class. Lessons follow what they are covering at school, so the fastest progress usually comes from working on the exact topic they are stuck on this week.',
    faqs: [
      ['My child says they are "bad at maths". Can tutoring help?', 'Usually yes, and usually quickly. Most children who believe this have one or two missing foundations — often times tables or fractions — that make everything built on top feel impossible. One-to-one lessons can go back and fix the gap, which is very hard to do in a class of thirty.'],
      ['Do you follow the same maths curriculum as my child’s school?', 'Lessons are matched to whatever your child is covering at school rather than following a separate syllabus. Share their textbook, topic list or homework in the first class and the teacher plans around it.'],
      ['Can you help with exam preparation?', 'Yes. Teachers work through past-paper style questions, focus on the topics being assessed, and practise showing working clearly, which is where marks are most often lost.'],
      ['How long are maths lessons?', '25 or 50 minutes. Younger children usually do better with 25; secondary students working through longer problems often prefer 50.'],
    ],
  },
  {
    slug: 'online-science-tutor-for-kids.html',
    name: 'Science',
    label: 'Science',
    title: 'Online Science Tutor for Kids & Teens | 1-to-1 Classes | TutorPro',
    description: 'One-to-one online science lessons for children aged 4–16. Biology, chemistry and physics explained clearly, matched to your child’s school curriculum. Free first class, from $8.',
    heading: 'Online science tutoring for children and teenagers',
    lede: 'Biology, chemistry and physics explained in plain language — with the reasoning made visible, so your child understands why an answer is right instead of memorising it.',
    stage: 'Primary and Secondary · Ages 4–16',
    accreditation: 'Follows your child’s school curriculum',
    focus: [
      ['Living things and the human body', 'Plants, animals, habitats, cells and body systems, built up from what your child can already observe.'],
      ['Materials and chemistry', 'States of matter, changes, mixtures and reactions, explained with everyday examples before the formal vocabulary.'],
      ['Forces, energy and physics', 'Forces, light, sound, electricity and energy, worked through with diagrams rather than definitions to memorise.'],
      ['Investigations and writing up', 'Fair tests, variables, drawing conclusions and writing a method the way an examiner expects to read it.'],
    ],
    lesson: 'Science lessons are explanation-led and question-heavy. The teacher draws diagrams on a shared lesson board, asks your child to predict what will happen and why, then works through it with them. Understanding the reasoning is the goal, because that is what transfers to a question they have not seen before.',
    parentNote: 'No equipment or home experiments are needed. Everything is taught through explanation, diagrams and discussion, using whatever topic your child is currently covering at school.',
    faqs: [
      ['Which science subjects do you cover?', 'Biology, chemistry and physics, at both primary and secondary level. For younger children it is taught as one combined subject, matching how schools teach it.'],
      ['My child understands the lesson but freezes in tests. Can you help?', 'Yes, and it is common. It usually means the ideas are understood but not yet expressed in the form a mark scheme expects. Teachers practise answering in exam language and showing reasoning clearly.'],
      ['Do you need lab equipment for online science?', 'No. Lessons focus on understanding concepts, interpreting results and writing up investigations, all of which work well one-to-one online.'],
      ['Can lessons cover a specific topic my child is struggling with?', 'Yes. Tell the teacher the topic — photosynthesis, forces, the periodic table — and the lesson is built entirely around it.'],
    ],
  },
  {
    slug: 'online-ict-computing-classes-for-kids.html',
    name: 'ICT',
    label: 'ICT & Computing',
    title: 'Online ICT & Computing Classes for Kids | 1-to-1 | TutorPro',
    description: 'One-to-one online ICT and computing lessons for children aged 4–16. Typing, spreadsheets, coding, algorithms and online safety. Free first class, from $8 per lesson.',
    heading: 'Online ICT and computing classes for children',
    lede: 'The digital skills school and homework now assume your child already has — taught properly, one-to-one, from first typing to real coding.',
    stage: 'Primary and Secondary · Ages 4–16',
    accreditation: 'Follows your child’s school curriculum',
    focus: [
      ['Computer basics and typing', 'Confident keyboard and file skills, so schoolwork stops being slowed down by the computer itself.'],
      ['Documents, slides and spreadsheets', 'Producing the documents, presentations and data work that homework increasingly expects.'],
      ['Coding and algorithms', 'From block-based first steps to writing real code, with the thinking behind an algorithm rather than copied snippets.'],
      ['Online safety and digital literacy', 'Judging whether a source is trustworthy, protecting personal information, and behaving safely online.'],
    ],
    lesson: 'ICT lessons are hands-on. Your child works on their own screen while the teacher guides them step by step and watches what they are actually doing, so a mistake is caught as it happens rather than at the end. Skills are practised on real tasks, not demonstrations to watch.',
    parentNote: 'Your child needs a computer or laptop for ICT lessons rather than a tablet or phone, because the skills involve a real keyboard, files and software. A basic machine is fine — nothing powerful is required.',
    faqs: [
      ['What age can a child start ICT lessons?', 'Around 4–6 for typing, mouse skills and safe internet use. Coding usually starts from about 7, beginning with block-based tools before moving to written code.'],
      ['Which coding languages do you teach?', 'Younger children start with block-based coding such as Scratch. Older students move on to text-based programming, matched to whatever their school uses.'],
      ['Is this the same as the ICT my child does at school?', 'It follows the same curriculum, but one-to-one. School computing lessons often mean sharing machines and limited time; here your child works the whole lesson with the teacher watching their screen.'],
      ['Do you cover online safety?', 'Yes, and it is built into lessons rather than treated as a separate talk — judging sources, protecting personal information and recognising scams.'],
    ],
  },
]

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
        <h1>${escapeHtml(subject.heading)}</h1>
        <p class="lede">${escapeHtml(subject.lede)}</p>
        <p>
          <span class="pill">${escapeHtml(subject.stage)}</span>
          <span class="pill">${escapeHtml(subject.accreditation)}</span>
          <span class="pill">25 or 50 minute lessons</span>
          <span class="pill">From $8 per class</span>
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
          <tr><td>Weekly plan</td><td>1–3</td><td>$10</td></tr>
          <tr><td>Monthly package</td><td>4–7</td><td>$8</td></tr>
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
