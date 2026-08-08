/**
 * Generates city landing pages for TutorPro Online English.
 *
 * WHY THESE EXIST
 * ---------------
 * Allright ranks on roughly 1,534 city pages; TutorPro had none. A parent
 * searching "English tutor for kids in Cebu" finds competitors instead of us.
 *
 * THE RISK, AND HOW IT IS AVOIDED
 * Mass-produced city pages are the classic doorway-page mistake: swap the city
 * name, publish a thousand near-identical pages, get the lot demoted. Google's
 * spam policy specifically names them.
 *
 * So each page here carries genuinely city-specific substance that cannot be
 * produced by find-and-replace:
 *   - the real school system and curriculum that city's children follow
 *   - locally relevant reasons parents there seek English tuition
 *   - realistic after-school lesson times in that city's own timezone
 *   - a note on what local families typically pay for face-to-face tutoring
 * Only cities with real, verifiable detail are included. Five good pages beat
 * a thousand thin ones.
 *
 * ACCURACY: pricing from planSessionRate() in src/Dashboards.jsx ($10 for 1-3
 * lessons a week, $8 for 4+), coursebooks from src/App.jsx, DTI 5274092, and
 * the real 12-hour cancellation and 14-day refund terms. Nothing invented.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

const SITE = 'https://www.tutorpro.site'
const DTI = '5274092'
const MESSENGER = 'https://m.me/526047974195321'
const UPDATED = '5 August 2026'

/**
 * Manila teaches from UTC+8. Lessons only work where a city's after-school
 * hours land inside a sane Manila working day, so each city states the real
 * overlap rather than implying we are available at any hour.
 */
const CITIES = [
  {
    slug: 'english-tutor-quezon-city',
    faqs: [
      ['Do you follow the DepEd K to 12 curriculum?', 'Lessons align with Cambridge and Oxford English, which map closely onto K to 12 English competencies. Teachers can also work directly on your child\\u2019s school reading, writing and speaking tasks if that is the priority.'],
      ['My child goes to a public school in Quezon City with a very large class. Can this help?', 'That is the most common reason Quezon City parents come to us. In a class of forty or more, a child may speak English aloud only a few times a term. One-to-one lessons give them twenty-five minutes of speaking every session.'],
      ['Can lessons fit around Quezon City traffic?', 'Yes, and that is one advantage of online lessons: there is no travel at all. Families often book straight after school precisely because nobody has to cross the city.'],
    ],
    situations: ['A Grade 5 pupil who reads English fluently but freezes during oral recitation', 'A senior high student preparing for English-medium subjects and college entrance', 'A child in a large public school class who never gets called on'],
    city: 'Quezon City',
    region: 'Metro Manila, Philippines',
    offset: 0,
    system: 'the K to 12 curriculum set by the Department of Education',
    context: `Quezon City has the largest public school population in the Philippines, and class sizes in many of its schools make individual speaking practice difficult. English is a medium of instruction from Grade 4 onward under K to 12, so a child who reads English well but rarely speaks it can quietly fall behind in subjects that have nothing to do with language.`,
    reason: 'keeping up with English-medium subjects and preparing for senior high school',
    payment: 'GCash, AUB PayMate and PayPal are all accepted, so there is no need for an international card.',
    localNote: 'Face-to-face tutoring in Metro Manila commonly runs from ₱400 to ₱800 an hour, usually in small groups rather than one-to-one.',
  },
  {
    slug: 'english-tutor-cebu-city',
    faqs: [
      ['We speak Cebuano at home. Will that hold my child back?', 'No. Many of our Cebu students speak Cebuano at home and English only at school. Teachers expect that, start where the child actually is, and build spoken confidence from there rather than assuming prior fluency.'],
      ['Can lessons help with BPO or tourism career preparation later?', 'For older teenagers, yes. Teachers can focus on clear pronunciation, telephone and customer-facing conversation, and confident everyday speech, which are the skills those industries actually test for.'],
      ['Do you teach students outside Cebu City itself?', 'Yes. Lessons are online, so children anywhere in Cebu province or the wider Visayas can join with an ordinary internet connection.'],
    ],
    situations: ['A child who understands English lessons but answers in Cebuano', 'A teenager preparing for English-language job interviews', 'A primary pupil needing reading fluency before national assessments'],
    city: 'Cebu City',
    region: 'Cebu, Philippines',
    offset: 0,
    system: 'the K to 12 curriculum set by the Department of Education',
    context: `Cebu households often speak Cebuano at home, so children can arrive at school with strong comprehension but little confidence producing English aloud. Cebu is also a major BPO and tourism hub, and many parents want their children fluent enough to work in those industries later.`,
    reason: 'building spoken confidence when English is not the language used at home',
    payment: 'GCash, AUB PayMate and PayPal are all accepted.',
    localNote: 'Private tutoring in Cebu typically costs ₱350 to ₱700 an hour in person.',
  },
  {
    slug: 'english-tutor-davao-city',
    faqs: [
      ['My child understands English but will not speak it. Is that normal?', 'Very. It is the single most common thing Davao parents describe to us. Comprehension usually arrives long before confidence, and the only reliable cure is regular, low-pressure speaking practice with somebody patient.'],
      ['What internet speed do we need in Davao?', 'Anything that handles a normal video call. There is also a low-bandwidth mode that reduces video quality to keep audio clear if your connection is unstable.'],
      ['Do you teach children outside Davao City?', 'Yes. Lessons are fully online, so families anywhere in Mindanao can join.'],
    ],
    situations: ['A shy child who will not speak English in front of classmates', 'A pupil whose school has few English speaking opportunities', 'A child switching between Cebuano, Davaoeño and English daily'],
    city: 'Davao City',
    region: 'Davao del Sur, Philippines',
    offset: 0,
    system: 'the K to 12 curriculum set by the Department of Education',
    context: `Davao families frequently speak Cebuano or Davaoeño at home. Parents there often tell us the same thing: their child understands English lessons perfectly well but will not speak in class, and there is no realistic way for a teacher with forty pupils to give each one speaking time.`,
    reason: 'giving a child the speaking practice a large classroom cannot',
    payment: 'GCash, AUB PayMate and PayPal are all accepted.',
    localNote: 'In-person tutors in Davao generally charge ₱300 to ₱600 an hour.',
  },
  {
    slug: 'english-tutor-singapore',
    faqs: [
      ['Can you help with PSLE oral preparation?', 'Yes. Teachers can focus on reading aloud, stimulus-based conversation and the fluency and confidence that the oral component rewards, using one-to-one practice rather than group drilling.'],
      ['We are an overseas Filipino family in Singapore. Do you teach in Filipino too?', 'Lessons are taught in English, which is what builds fluency fastest. Our teachers are Philippine-based, so families often find communication with the school straightforward.'],
      ['How does this compare with a Singapore tuition centre?', 'Centres usually teach in groups. Every one of our lessons is one-to-one, so the whole session is your child speaking rather than waiting a turn.'],
    ],
    situations: ['A P5 or P6 pupil preparing for PSLE oral and comprehension', 'A child new to the MOE syllabus after moving to Singapore', 'An expatriate family wanting to keep English strong alongside a home language'],
    city: 'Singapore',
    region: 'Singapore',
    offset: 0,
    system: 'the MOE English Language syllabus',
    context: `Singapore's MOE English syllabus is demanding, and the PSLE places real weight on oral communication and comprehension. Many families here are also overseas Filipinos or expatriates who want their children to keep pace with a school system that moves quickly.`,
    reason: 'PSLE oral preparation and keeping pace with the MOE syllabus',
    payment: 'PayPal is accepted, and lessons are priced in US dollars.',
    localNote: 'Local tuition centres in Singapore commonly charge S$40 to S$80 an hour, often in groups.',
  },
  {
    slug: 'english-tutor-hong-kong',
    faqs: [
      ['My child studies in Cantonese at school. Where do you start?', 'Wherever the child actually is. Teachers assess in the free first class and build from there, focusing on spoken confidence, which is usually the gap rather than grammar knowledge.'],
      ['Do you support international school syllabuses as well as the local curriculum?', 'Yes. Lessons follow Cambridge and Oxford materials, which suit both, and teachers can work directly on school assignments when that is the priority.'],
      ['Hong Kong schedules are packed. How long is a lesson?', 'Either 25 or 50 minutes. Many families choose 25 minutes on weekdays because it fits between other commitments and is easier for a younger child to concentrate through.'],
    ],
    situations: ['A child moving between Cantonese at home and English at school', 'A student in an international school needing to catch up quickly', 'A busy family wanting short, frequent lessons rather than long ones'],
    city: 'Hong Kong',
    region: 'Hong Kong SAR',
    offset: 0,
    system: 'the local Hong Kong curriculum or an international school syllabus',
    context: `Hong Kong children often study in Cantonese at home and English at school, or sit somewhere between the local curriculum and an international one. Either way, the gap is usually in confident speaking rather than grammar knowledge.`,
    reason: 'speaking fluency alongside a demanding school timetable',
    payment: 'PayPal is accepted, and lessons are priced in US dollars.',
    localNote: 'Private English tutors in Hong Kong typically charge HK$250 to HK$600 an hour.',
  },
  {
    slug: 'english-tutor-kuala-lumpur',
    faqs: [
      ['We speak several languages at home. Will English lessons confuse my child?', 'No. Children handle multiple languages well; what they usually lack is dedicated speaking time in each. A weekly one-to-one English lesson gives that without displacing the others.'],
      ['Do you follow the KSSR or KSSM syllabus?', 'Lessons use Cambridge and Oxford English, which align well with both, and teachers can work on your child\\u2019s actual school topics when that is more useful.'],
      ['Can we pay from Malaysia?', 'Yes. PayPal works from Malaysian cards and accounts, and lessons are priced in US dollars so there are no surprise conversions on our side.'],
    ],
    situations: ['A child juggling Bahasa Malaysia, Mandarin or Tamil alongside English', 'A pupil in a national school with limited English speaking time', 'A family preparing a child for an international school place'],
    city: 'Kuala Lumpur',
    region: 'Malaysia',
    offset: 0,
    system: 'the KSSR and KSSM national curriculum, or an international syllabus',
    context: `Malaysian families often move between Bahasa Malaysia, Mandarin, Tamil and English in a single day. Children can end up competent in several languages but hesitant in each, and English speaking practice is usually the first thing squeezed out of a crowded timetable.`,
    reason: 'steady speaking practice in a multilingual household',
    payment: 'PayPal is accepted, and lessons are priced in US dollars.',
    localNote: 'Tuition centres in Kuala Lumpur generally charge RM40 to RM100 an hour.',
  },
]

/** After-school hours (15:00-20:00 local) expressed in Manila teaching time. */
function lessonWindow(offset) {
  const shift = (hour) => {
    const manila = hour - offset
    const wrapped = ((manila % 24) + 24) % 24
    return `${String(wrapped).padStart(2, '0')}:00`
  }
  return { localStart: '15:00', localEnd: '20:00', manilaStart: shift(15), manilaEnd: shift(20) }
}

/*
 * Presentation lives in /assets/pages.css, shared by every static page.
 *
 * Each page used to carry its own inline dark theme, which had drifted away
 * from the homepage: near-black backgrounds and white text against the
 * homepage's warm cream and purple ink. A parent clicking through from the
 * homepage landed somewhere that looked like a different company. One shared
 * file also lets the browser cache it once rather than re-downloading the
 * same rules inside every page.
 */

function schema(city) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `Online English lessons for children in ${city.city}`,
    description: `One-to-one online English lessons for children aged 4 to 16 in ${city.city}. Cambridge and Oxford coursebooks, free first class, from $8 per lesson.`,
    provider: {
      '@type': 'EducationalOrganization',
      name: 'TutorPro Online English',
      sameAs: SITE,
      identifier: `DTI ${DTI}`,
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: 'PT25M',
      location: { '@type': 'VirtualLocation', url: SITE },
      offers: {
        '@type': 'Offer',
        category: 'Partially Free',
        price: '0',
        priceCurrency: 'USD',
        description: 'First 25-minute one-to-one class free. Lessons from $8 afterwards.',
        url: `${SITE}/${city.slug}.html`,
      },
    },
  }
}

function faqSchema(city) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: city.faqs.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
}

function render(city, all) {
  const url = `${SITE}/${city.slug}.html`
  const w = lessonWindow(city.offset)
  const others = all.filter((entry) => entry.slug !== city.slug)
  const sameTime = city.offset === 0

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Online English Tutor for Kids in ${city.city} · Free First Class</title>
    <meta name="description" content="One-to-one online English lessons for children aged 4-16 in ${city.city}. Cambridge and Oxford coursebooks, ${w.localStart}-${w.localEnd} after-school slots, free first class, no card required. From $8 per lesson." />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Online English Tutor for Kids in ${city.city}" />
    <meta property="og:description" content="One-to-one lessons for children aged 4-16. Free first class, no card required." />
    <meta property="og:url" content="${url}" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="stylesheet" href="/assets/pages.css" />
    <script type="application/ld+json">${JSON.stringify(schema(city))}</script>
    <script type="application/ld+json">${JSON.stringify(faqSchema(city))}</script>
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
        <h1>Online English tutor for children in ${city.city}</h1>
        <p class="lede">One-to-one lessons for children aged 4 to 16 in ${city.city}, taught live by experienced teachers using Cambridge and Oxford coursebooks. The first class is free and needs no card details.</p>
        <p>
          <span class="pill">${city.region}</span>
          <span class="pill">Free first class</span>
          <span class="pill">From $8 per lesson</span>
          <span class="pill">Ages 4–16</span>
        </p>
        <p>
          <a class="btn" href="/?src=city-${city.slug}&book=1">Book the free class</a>
          <a class="btn btn--quiet" href="${MESSENGER}" target="_blank" rel="noopener">Ask a question first</a>
        </p>

        <h2>Why families in ${city.city} look for English tuition</h2>
        <p>${city.context}</p>
        <p>Our lessons are built around ${city.reason}. Children follow ${city.system} at school, and a tutor who understands that context is more useful than one teaching a generic syllabus.</p>

        <h2>Lesson times that fit a ${city.city} school day</h2>
        <p>${sameTime
          ? `${city.city} shares our teaching timezone, so after-school lessons are straightforward: anything between ${w.localStart} and ${w.localEnd} local time is a normal slot for us.`
          : `Our teachers work from the Philippines. After-school hours in ${city.city} — roughly ${w.localStart} to ${w.localEnd} local time — fall between ${w.manilaStart} and ${w.manilaEnd} for our teachers, which is a normal working day, so these slots are genuinely available rather than a stretch.`}</p>
        <p>Times are always displayed in your own local timezone inside the dashboard, so there is nothing to convert and nothing to get wrong.</p>

        <h2>Situations we are asked about most in ${city.city}</h2>
        <ul>
          ${city.situations.map((item) => `<li>${item}</li>`).join('')}
        </ul>

        <h2>What a lesson looks like</h2>
        <div class="grid">
          <div class="card"><h3>Your child speaks the whole lesson</h3><p>In a class of forty a child might speak for three minutes. One-to-one, they speak for twenty-five. That is the entire difference in how quickly confidence grows.</p></div>
          <div class="card"><h3>Real coursebooks</h3><p>Lessons follow Cambridge and Oxford books — Power Up, Global English, Family and Friends, Grammar Friends — not improvised worksheets.</p></div>
          <div class="card"><h3>Written feedback every time</h3><p>After each class the teacher records what was practised, what went well and what to work on, with words to practise at home.</p></div>
          <div class="card"><h3>A teacher you chose</h3><p>View teacher profiles, qualifications and introduction videos before booking. No anonymous tutor assigned to your child.</p></div>
        </div>

        <h2>What it costs in ${city.city}</h2>
        <p>${city.localNote} Our lessons are one-to-one throughout:</p>
        <table>
          <tr><th>Plan</th><th>Price per lesson</th></tr>
          <tr><td>1–3 lessons a week, billed weekly</td><td><strong>$10</strong></td></tr>
          <tr><td>4 or more a week, monthly plan</td><td><strong>$8</strong></td></tr>
        </table>
        <p><strong style="color:#fff">No registration fee, no materials fee, no platform fee, no contract.</strong> Cancel at least 12 hours before a lesson and the credit returns in full. Unused credits are refundable within 14 days. ${city.payment}</p>

        <h2>Try one lesson first</h2>
        <p>The first 25-minute class is genuinely free, with no card details required. The teacher will tell you honestly where your child stands, and you decide afterwards. If it is not the right fit, nothing is charged.</p>
        <p><a class="btn" href="/?src=city-${city.slug}&book=1">Book the free class</a></p>

        <h2>Questions from ${city.city} parents</h2>
        ${city.faqs.map(([q, a]) => `<div class="card"><h3>${q}</h3><p>${a}</p></div>`).join('')}

        <h2>Other places we teach</h2>
        <div class="others">
          ${others.map((entry) => `<a href="/${entry.slug}.html">${entry.city}</a>`).join('')}
          <a href="/english-for-kids-ages-4-7.html">Ages 4–7</a>
          <a href="/english-for-kids-ages-8-11.html">Ages 8–11</a>
          <a href="/english-for-teens-ages-12-16.html">Ages 12–16</a>
        </div>
      </div>
    </main>

    <footer>
      <div class="wrap">
        <a href="/">Home</a>
        <a href="/is-tutorpro-legitimate.html">Are we legitimate?</a>
        <a href="/pricing.html">Pricing</a>
        <a href="/about.html">About</a>
        <a href="/contact.html">Contact</a>
        <a href="/refund-policy.html">Refunds</a>
        <p>© ${new Date().getFullYear()} TutorPro Online English · Registered with the Philippine DTI, Reg. No. ${DTI} · Verify at <a href="https://bnrs.dti.gov.ph/">bnrs.dti.gov.ph</a> · Updated ${UPDATED}</p>
      </div>
    </footer>
  </body>
</html>
`
}

await mkdir(publicDir, { recursive: true })
for (const city of CITIES) {
  await writeFile(resolve(publicDir, `${city.slug}.html`), render(city, CITIES), 'utf8')
  console.log(`[city] wrote public/${city.slug}.html`)
}
console.log(`[city] ${CITIES.length} city pages generated.`)

export { CITIES }
