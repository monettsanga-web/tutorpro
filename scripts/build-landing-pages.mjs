/**
 * Generates single-goal landing pages for TutorPro Online English.
 *
 * WHY THESE ARE DIFFERENT FROM THE AGE PAGES
 * ------------------------------------------
 * The age pages are for search engines: lots of detail, full navigation,
 * many internal links. These are for PAID AND SOCIAL TRAFFIC, where every
 * extra link is a way to leave without booking. So each landing page has:
 *   - one goal (book the free class) and no navigation menu
 *   - the offer, the proof, the objection handling, then the same CTA again
 *   - a tagged CTA link so the funnel dashboard credits the right channel
 *
 * ACCURACY: every claim is verified against the live platform —
 *   - pricing from planSessionRate() in src/Dashboards.jsx ($10 for 1-3/wk, $8 for 4+)
 *   - the four testimonials are real, from Facebook, quoted verbatim including typos
 *   - DTI 5274092 is the real registration number
 *   - free first class, 12-hour cancellation and 14-day refund are real policy
 * Nothing here is aspirational or invented.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

const SITE = 'https://www.tutorpro.site'
const MESSENGER = 'https://m.me/526047974195321'
const WHATSAPP = 'https://wa.me/639625284849'
const UPDATED = '4 August 2026'

/** Real parent reviews, verbatim from Facebook. Typos deliberately preserved. */
const REVIEWS = [
  { name: 'James King', date: 'December 2021', quote: 'Great Teachers, admins and customer service. My Son is a naughty one and hard to teach but he can now identify and read words. I’ve enrolled him again.' },
  { name: 'Syafiqah Izzati', date: 'July 2021', quote: 'Very good teacher. Good pronounciation. Always punctual. Keeping up to date with parent regarding students progress. My son enjoy learning the class with experienced teacher. Recommended.' },
  { name: 'Sharmila Maniam', date: 'August 2021', quote: 'My 6Yr old loves the classes as the teacher tought Reading, writing & Memorising. I as a parent, Love the method of their teaching.' },
]

const STYLE = `
  :root { color-scheme: dark; --bg:#090510; --violet:#7048df; --lime:#bce94e; --pink:#ff4f87; --text:#fff; --muted:#c9bddb; --card:rgba(255,255,255,.07); --line:rgba(255,255,255,.14); }
  * { box-sizing: border-box; }
  body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at 12% 4%, rgba(188,233,78,.15), transparent 32%), linear-gradient(135deg, #090510 0%, #25104d 55%, #111827 100%); color:var(--text); line-height:1.65; }
  a { color: var(--lime); }
  .container { width:min(880px, calc(100% - 32px)); margin:auto; }
  header { border-bottom:1px solid var(--line); background:rgba(9,5,16,.7); }
  .brandbar { min-height:66px; display:flex; align-items:center; gap:11px; }
  .brandbar img { width:40px; height:40px; border-radius:12px; }
  .brandbar strong { font-weight:950; font-size:.98rem; }
  main { padding:38px 0 60px; }
  h1 { font-size:clamp(2rem,5vw,3rem); letter-spacing:-.03em; line-height:1.1; margin:0 0 14px; }
  h2 { font-size:clamp(1.3rem,3vw,1.6rem); margin:40px 0 12px; letter-spacing:-.02em; }
  h3 { font-size:1rem; margin:0 0 6px; color:var(--lime); }
  p, li { color:var(--muted); }
  .lede { font-size:clamp(1.02rem,2.2vw,1.18rem); color:#e9e2f7; margin-bottom:22px; }
  .pill { display:inline-block; border-radius:999px; padding:6px 13px; background:var(--card); border:1px solid var(--line); font-size:.78rem; color:var(--muted); margin:0 6px 10px 0; }
  .cta-row { margin:26px 0 10px; }
  .btn { display:inline-flex; align-items:center; gap:8px; border-radius:999px; padding:15px 26px; background:var(--lime); color:#140a29; font-weight:950; font-size:1.02rem; text-decoration:none; margin:6px 10px 6px 0; box-shadow:0 12px 30px rgba(188,233,78,.22); }
  .btn:hover { transform:translateY(-1px); }
  .btn--ghost { background:transparent; border:1px solid var(--line); color:#fff; box-shadow:none; font-size:.92rem; padding:13px 20px; }
  .reassure { font-size:.85rem; color:#a99dbd; margin:4px 0 0; }
  .card { border:1px solid var(--line); border-radius:18px; padding:20px 22px; background:var(--card); margin:16px 0; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(232px,1fr)); gap:14px; }
  .price { font-size:1.9rem; font-weight:950; color:var(--lime); margin:0; letter-spacing:-.02em; }
  .review { border-left:3px solid var(--lime); padding:4px 0 4px 16px; margin:16px 0; }
  .review p { margin:0 0 6px; color:#e2dbef; font-style:italic; }
  .review span { font-size:.82rem; color:#a99dbd; font-weight:700; }
  .steps { counter-reset:step; list-style:none; padding:0; }
  .steps li { counter-increment:step; position:relative; padding:0 0 16px 44px; }
  .steps li::before { content:counter(step); position:absolute; left:0; top:0; width:30px; height:30px; display:grid; place-items:center; border-radius:50%; background:var(--violet); color:#fff; font-weight:900; font-size:.85rem; }
  .steps strong { color:#fff; display:block; }
  .trust { display:flex; flex-wrap:wrap; gap:10px; margin:18px 0; }
  .trust span { border:1px solid var(--line); border-radius:12px; padding:9px 13px; background:var(--card); font-size:.82rem; color:var(--muted); }
  .faq { border:1px solid var(--line); border-radius:14px; padding:14px 18px; background:var(--card); margin:10px 0; }
  .faq strong { color:#fff; display:block; margin-bottom:5px; }
  .final { border:1px solid var(--lime); border-radius:22px; padding:30px 26px; background:linear-gradient(140deg, rgba(188,233,78,.12), rgba(112,72,223,.16)); margin:40px 0 0; text-align:center; }
  .final h2 { margin-top:0; }
  footer { border-top:1px solid var(--line); padding:24px 0; font-size:.82rem; color:#9d92b0; }
  footer a { margin-right:14px; display:inline-block; }
  ul { padding-left:20px; }
  @media (max-width:640px){ .btn{width:100%;justify-content:center;margin-right:0;} }
`

/** The CTA carries the channel tag so the funnel credits the right source. */
function cta(page, label = 'Book the free class') {
  return `<a class="btn" href="/?src=${page.tag}&book=1">${label}</a>`
}

function reviewsBlock() {
  return REVIEWS.map((review) => `
        <div class="review">
          <p>“${review.quote}”</p>
          <span>${review.name} · ${review.date}</span>
        </div>`).join('')
}

function faqBlock(faqs) {
  return faqs.map(([question, answer]) => `
        <div class="faq"><strong>${question}</strong><span>${answer}</span></div>`).join('')
}

const PAGES = [
  {
    slug: 'free-english-class',
    tag: 'lp-free',
    title: 'Free English Class for Your Child · TutorPro Online English',
    description: 'Book a free 25-minute one-to-one online English class for your child. No card required, no contract. Cambridge and Oxford aligned teachers. From $8 per lesson after.',
    h1: 'A free English class for your child. No card, no catch.',
    lede: 'One-to-one online lessons with real teachers, built around Cambridge and Oxford coursebooks. Try a full 25-minute class for free and decide afterwards.',
    pills: ['Free first class', 'No card required', 'Ages 4–16', 'From $8 per lesson'],
    body: `
        <h2>Why parents choose one-to-one</h2>
        <div class="grid">
          <div class="card"><h3>Your child speaks the whole lesson</h3><p>In a group class a child might speak for three minutes. One-to-one, they speak for twenty-five. That is the entire difference in how fast confidence grows.</p></div>
          <div class="card"><h3>Real coursebooks, not worksheets</h3><p>Lessons follow Cambridge and Oxford books — Power Up, Global English, Family and Friends, Grammar Friends — the same materials used in good schools.</p></div>
          <div class="card"><h3>You see what happened</h3><p>After every class the teacher writes what was practised, what went well and what to work on. Lessons can be recorded so you can watch them back.</p></div>
          <div class="card"><h3>A teacher you chose</h3><p>You can view teacher profiles, qualifications and introduction videos before booking. No anonymous tutor assigned to your child.</p></div>
        </div>

        <h2>How the free class works</h2>
        <ol class="steps">
          <li><strong>Tell us about your child</strong>Age, level and what you would like them to get better at. Takes about a minute.</li>
          <li><strong>Pick a time that suits you</strong>Times are shown in your own local time zone, so there is nothing to convert.</li>
          <li><strong>Join from your browser</strong>No app, no Zoom link, no download. One click from your dashboard.</li>
          <li><strong>Decide afterwards</strong>The teacher tells you honestly where your child is at. If you want to continue, you choose a plan. If not, nothing happens.</li>
        </ol>

        <h2>What it costs if you continue</h2>
        <div class="card">
          <p class="price">$10 per lesson</p>
          <p>One to three lessons a week, billed weekly.</p>
          <p class="price" style="margin-top:16px">$8 per lesson</p>
          <p>Four or more lessons a week on a monthly plan.</p>
          <p style="margin-top:14px"><strong style="color:#fff">No registration fee. No materials fee. No platform fee. No contract.</strong> Cancel at least 12 hours before a lesson and the credit returns in full. Unused credits are refundable for 14 days.</p>
        </div>

        <h2>What parents say</h2>${reviewsBlock()}

        <h2>Questions parents ask first</h2>
        ${faqBlock([
          ['Is the first class really free?', 'Yes. A full 25-minute one-to-one lesson, no card details required. You are not signed up to anything by taking it.'],
          ['What ages do you teach?', 'Children from 4 to 16. Younger children usually do 25-minute lessons; older students often prefer 50 minutes.'],
          ['What if my child is very shy?', 'One-to-one suits shy children better than group classes, because nobody talks over them and the teacher can move at their pace. Tell us when you book and we will match the teacher accordingly.'],
          ['Do you teach complete beginners?', 'Yes. Teachers start with phonics and simple spoken English and build from there.'],
          ['What do I need?', 'A laptop, tablet or phone with a camera, and an internet connection. Everything runs in the browser — there is nothing to install.'],
          ['Who is behind TutorPro?', 'A registered Philippine sole proprietorship, DTI Reg. No. 5274092, which you can verify at bnrs.dti.gov.ph.'],
        ])}`,
  },
  {
    slug: 'english-tutor-for-shy-child',
    tag: 'lp-shy',
    title: 'English Lessons for Shy Children · TutorPro Online English',
    description: 'One-to-one online English lessons designed for quiet and shy children aged 4-16. No group pressure, no being talked over. Free first class, no card required.',
    h1: 'English lessons for the child who never puts their hand up.',
    lede: 'If your child understands English but will not speak it, the problem is usually not ability. It is the twenty-nine other children in the room.',
    pills: ['One-to-one only', 'No group pressure', 'Free first class', 'Ages 4–16'],
    body: `
        <h2>Why quiet children stay quiet in group classes</h2>
        <p>In a class of thirty, a shy child can go a whole term without speaking a full sentence in English. The confident children answer first, the lesson moves on, and the quiet ones learn that staying silent is safe. They fall further behind — not because they cannot do it, but because they never get the practice.</p>
        <p>One-to-one removes the audience. There is no one to be embarrassed in front of, no one to interrupt, and no reason to rush.</p>

        <h2>What we do differently</h2>
        <div class="grid">
          <div class="card"><h3>Nobody talks over them</h3><p>Your child has the teacher's full attention for the entire lesson. Silence is allowed — the teacher waits rather than moving on.</p></div>
          <div class="card"><h3>The same teacher each week</h3><p>Shy children open up once they trust someone. Keeping the same teacher matters more for them than for anyone else.</p></div>
          <div class="card"><h3>Pace set by your child</h3><p>If something is not working, the teacher changes approach inside that same lesson rather than at the end of a term.</p></div>
          <div class="card"><h3>You can watch it back</h3><p>Lessons can be recorded, so you can see your child speaking English even if they will not do it in front of you yet.</p></div>
        </div>

        <h2>What usually happens</h2>
        <ol class="steps">
          <li><strong>First lesson: mostly listening</strong>That is completely normal and expected. The teacher does more of the talking and keeps the pressure low.</li>
          <li><strong>Next few lessons: short answers</strong>Single words, then short phrases. The teacher builds on whatever the child offers.</li>
          <li><strong>Then: they start volunteering</strong>This is the moment parents notice at home — the child says something in English without being asked.</li>
        </ol>
        <p>How long this takes varies enormously from child to child. Anyone who promises you a fixed timeline has not met many shy children.</p>

        <h2>What parents say</h2>${reviewsBlock()}

        <h2>Common worries</h2>
        ${faqBlock([
          ['My child refuses to talk to strangers on video.', 'Tell us when you book. The teacher will start with games and pictures rather than questions, and will not push for speech in the first lesson.'],
          ['Can I sit with my child during the lesson?', 'Yes, especially at the start. Many parents sit nearby for the first few lessons and then step back once the child settles.'],
          ['What if the teacher is not a good match?', 'Tell us and we will change them. Fit matters more than anything else for a quiet child.'],
          ['Is the first class really free?', 'Yes — a full 25-minute lesson, no card required. If your child hates it, you have lost nothing.'],
          ['What does it cost afterwards?', '$10 per lesson for one to three a week, or $8 per lesson on a monthly plan of four or more. No registration, materials or platform fees.'],
        ])}`,
  },
  {
    slug: 'online-english-for-filipino-families',
    tag: 'lp-ph',
    title: 'Online English Classes for Filipino Families · TutorPro Online English',
    description: 'One-to-one online English lessons for children in the Philippines. DTI registered, Cambridge and Oxford aligned, GCash and PayPal accepted. Free first class.',
    h1: 'English classes for Filipino families, run from the Philippines.',
    lede: 'A DTI-registered Philippine school teaching children one-to-one online, with Cambridge and Oxford materials and payment options that actually work here.',
    pills: ['DTI Reg. No. 5274092', 'GCash & PayPal', 'Philippine time zone', 'Free first class'],
    body: `
        <h2>Why local matters</h2>
        <div class="grid">
          <div class="card"><h3>A registered Philippine business</h3><p>TutorPro Online English is a registered sole proprietorship, DTI Reg. No. 5274092. You can verify that yourself at bnrs.dti.gov.ph — we would rather you did.</p></div>
          <div class="card"><h3>Payment that works here</h3><p>GCash and AUB PayMate QR alongside PayPal. No requirement for an international card.</p></div>
          <div class="card"><h3>Real Philippine time slots</h3><p>Lessons after school and at weekends in Philippine time, not the leftovers of a European timetable.</p></div>
          <div class="card"><h3>Reach a real person</h3><p>Messenger, WhatsApp or phone — and you get an answer from someone in the same time zone.</p></div>
        </div>

        <h2>What your child learns</h2>
        <p>Lessons follow real Cambridge and Oxford coursebooks — Power Up, Global English, Family and Friends, Grammar Friends, Everybody Up — chosen for your child's level, not a generic script. Teachers can also focus specifically on schoolwork, reading comprehension, or speaking confidence if that is what your child needs most.</p>
        <div class="trust">
          <span>Ages 4–16</span><span>25 or 50 minute lessons</span><span>One-to-one only</span><span>Lesson recordings</span><span>Written feedback after every class</span>
        </div>

        <h2>Simple pricing</h2>
        <div class="card">
          <p class="price">$10 per lesson</p>
          <p>One to three lessons a week, billed weekly.</p>
          <p class="price" style="margin-top:16px">$8 per lesson</p>
          <p>Four or more lessons a week on a monthly plan.</p>
          <p style="margin-top:14px"><strong style="color:#fff">No registration fee, no materials fee, no platform fee, no contract.</strong> Cancel 12 hours ahead and the credit returns in full. Unused credits refundable for 14 days.</p>
        </div>

        <h2>What parents say</h2>${reviewsBlock()}

        <h2>Questions</h2>
        ${faqBlock([
          ['Can I pay with GCash?', 'Yes. GCash and AUB PayMate QR are both accepted, as well as PayPal. Send the receipt through the dashboard and an administrator verifies it.'],
          ['Are the teachers Filipino?', 'Our teachers are experienced English teachers who go through a recorded teaching interview and a qualifications review before they can teach. You can view their profiles and introduction videos before you book.'],
          ['Is the first class free?', 'Yes — a full 25-minute one-to-one lesson with no card required.'],
          ['What internet speed do I need?', 'Anything that handles a normal video call. There is a low-bandwidth mode if your connection is unstable.'],
          ['Can lessons help with school English?', 'Yes. Teachers can work directly on your child\u2019s schoolwork, reading comprehension, essays or exam preparation.'],
        ])}`,
  },
]

function render(page) {
  const url = `${SITE}/${page.slug}.html`
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: page.h1,
    description: page.description,
    provider: {
      '@type': 'EducationalOrganization',
      name: 'TutorPro Online English',
      sameAs: SITE,
      identifier: 'DTI 5274092',
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: 'PT25M',
      offers: {
        '@type': 'Offer',
        category: 'Partially Free',
        price: '0',
        priceCurrency: 'USD',
        description: 'First 25-minute one-to-one class is free. Lessons from $8 afterwards.',
        url,
      },
    },
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${page.title}</title>
    <meta name="description" content="${page.description}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${page.title}" />
    <meta property="og:description" content="${page.description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${SITE}/assets/tutorpro-hero.webp" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="/assets/pwa-icon-192.png" />
    <style>${STYLE}</style>
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
  </head>
  <body>
    <header>
      <div class="container brandbar">
        <img src="/assets/tutorpro-panda-logo.webp" alt="" />
        <strong>TutorPro Online English</strong>
      </div>
    </header>

    <main>
      <div class="container">
        <h1>${page.h1}</h1>
        <p class="lede">${page.lede}</p>
        <p>${page.pills.map((pill) => `<span class="pill">${pill}</span>`).join('')}</p>
        <div class="cta-row">
          ${cta(page)}
          <a class="btn btn--ghost" href="${MESSENGER}" target="_blank" rel="noopener">Ask a question first</a>
          <p class="reassure">Takes about a minute. No card details, and nothing charged.</p>
        </div>
${page.body}

        <div class="final">
          <h2>Try one class and see</h2>
          <p>A full 25-minute one-to-one lesson, free. If it is not right for your child, that is genuinely fine — you will at least know where they stand.</p>
          ${cta(page, 'Book the free class')}
          <p class="reassure">No card required · Cancel any time · DTI Reg. No. 5274092</p>
        </div>
      </div>
    </main>

    <footer>
      <div class="container">
        <a href="/">Home</a>
        <a href="/pricing.html">Pricing</a>
        <a href="/about.html">About</a>
        <a href="/contact.html">Contact</a>
        <a href="/refund-policy.html">Refunds</a>
        <a href="/privacy-policy.html">Privacy</a>
        <p>© ${new Date().getFullYear()} TutorPro Online English · Registered with the Philippine DTI, Reg. No. 5274092 · Verify at <a href="https://bnrs.dti.gov.ph/">bnrs.dti.gov.ph</a><br />
        Contact: <a href="${MESSENGER}">Messenger</a> · <a href="${WHATSAPP}">WhatsApp</a> · +63 962 528 4849 · Updated ${UPDATED}</p>
      </div>
    </footer>
  </body>
</html>
`
}

await mkdir(publicDir, { recursive: true })
for (const page of PAGES) {
  await writeFile(resolve(publicDir, `${page.slug}.html`), render(page), 'utf8')
  console.log(`[landing] wrote public/${page.slug}.html`)
}
console.log(`[landing] ${PAGES.length} landing pages generated.`)

export { PAGES }
