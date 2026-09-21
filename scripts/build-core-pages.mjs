/**
 * The six pages parents look for by name, and Google expects a site to have.
 *
 * WHY THESE SIX
 * -------------
 * The site already covered intent well (ages, cities, subjects, countries)
 * but had no page for the questions every parent asks before paying:
 *
 *   /free-trial        — "is the trial really free, what's the catch"
 *   /how-it-works      — "what actually happens in a lesson"
 *   /faq               — the long tail of practical questions
 *   /teachers          — "who exactly will teach my child"
 *   /primary-english   — the brief's core programme split
 *   /secondary-english —
 *
 * Each targets a distinct query with its own title, H1, FAQ set and schema.
 * None is a thin keyword page: every one answers a question the others do
 * not, which is the line between a content hub and a doorway farm.
 *
 * ACCURACY RULES FOLLOWED HERE
 * ----------------------------
 * Prices come from scripts/pricing.mjs, which is asserted against the code
 * that actually charges the card. No invented teacher names, counts,
 * qualifications, reviews or ratings — the teachers page describes the
 * VETTING PROCESS, which is real and checkable, rather than listing people.
 * No AggregateRating anywhere. Claims are limited to what the booking rules
 * and curriculum genuinely support.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STANDARD, PACKAGE, STANDARD_50, PACKAGE_50, PACKAGE_MIN } from './pricing.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

const SITE = 'https://www.tutorpro.site'
const UPDATED = '21 September 2026'
const MESSENGER = 'https://m.me/526047974195321'
const WHATSAPP = 'https://wa.me/639625284849'

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const PAGES = [
  /* ---------------------------------------------------------------- */
  {
    slug: 'free-trial.html',
    label: 'Free trial',
    title: 'Free Trial English Class for Kids — No Card Required | TutorPro English PH',
    description:
      `Book a free trial English class for your child. A full one-to-one lesson with a real teacher, no card required and no obligation. Lessons from $${PACKAGE} after the trial.`,
    heading: 'Book a free trial English class',
    lede:
      'One full lesson, one real teacher, no card and no obligation. It is the only honest way to find out whether online lessons suit your child.',
    cta: 'Book the free class',
    body: `
        <h2>What the free trial actually is</h2>
        <p>It is a complete lesson, not a sales call and not a shortened demo. Your child meets a teacher, works through real material at their level, and you receive the same written feedback that paying families get.</p>
        <p>We ask for no card details to book it. If you decide not to continue, nothing happens — there is no trial that quietly converts into a subscription.</p>

        <h2>How to book, step by step</h2>
        <ol>
          <li><strong>Create a parent account.</strong> Your name, your child's name, their age and school year. It takes about a minute.</li>
          <li><strong>Choose a time that suits you.</strong> The calendar shows available slots already converted into your own time zone, so there is no arithmetic to do.</li>
          <li><strong>Submit the booking.</strong> You will see it confirmed in your dashboard straight away.</li>
          <li><strong>We assign the teacher.</strong> Our administration team matches your child to a teacher based on age, level and the goal you described. Teacher assignment is handled by us rather than chosen from a list — this is deliberate, and explained below.</li>
          <li><strong>Attend the lesson.</strong> It opens in your browser. Nothing to install, no meeting link to hunt for.</li>
          <li><strong>Read the feedback.</strong> The teacher writes up what was covered, what went well and what to work on.</li>
          <li><strong>Decide.</strong> Continue with a plan, or not. Either is fine.</li>
        </ol>

        <h2>Why we assign the teacher instead of letting you browse</h2>
        <p>Marketplaces put the matching work on the parent: dozens of profiles, and no way to judge which suits a seven-year-old who is nervous about speaking. We ask what your child needs and match them ourselves, because we know which of our teachers is good with reluctant speakers and which is better with exam preparation.</p>
        <p>If the match is wrong, tell us and we will change it. That is a normal request, not a complaint.</p>

        <h2>What happens after the trial</h2>
        <p>Nothing automatic. If you want to continue, you choose a plan and pay for the lessons you want. Lessons are $${STANDARD} each for 1–3 a week, or $${PACKAGE} each when your child takes ${PACKAGE_MIN} or more. Cancelling a lesson at least 12 hours ahead returns the credit, and unused credits can be refunded within 14 days.</p>`,
    faqs: [
      ['How does the free trial work?', `You create a parent account, pick a time, and we assign a teacher. Your child attends one full one-to-one lesson and you receive written feedback afterwards. No card is required and there is no obligation to continue.`],
      ['Is the trial really free, or is there a catch?', 'It is genuinely free and no payment details are collected. There is no automatic subscription and nothing to cancel if you decide against continuing.'],
      ['What age groups can join the trial?', 'Children aged 4 to 16. The teacher adapts the material to your child\u2019s age and current level.'],
      ['How long is the trial lesson?', 'Usually 25 minutes, which matches most children\u2019s concentration span. A 50-minute trial can be arranged for older learners on request.'],
      ['Can parents choose the teacher?', 'For the trial, our administration team assigns the teacher based on your child\u2019s age, level and goals. If the match is not right, tell us and we will change it.'],
      ['What do we need for the lesson?', 'A laptop, tablet or phone with a camera and a reasonable internet connection. Lessons run in the browser, so there is nothing to install.'],
      ['What happens after the trial?', `Nothing unless you choose to continue. If you do, lessons are $${STANDARD} each for 1\u20133 a week or $${PACKAGE} each for ${PACKAGE_MIN} or more.`],
    ],
    related: [['how-it-works.html', 'How lessons work'], ['pricing.html', 'Pricing'], ['faq.html', 'All questions']],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'how-it-works.html',
    label: 'How it works',
    title: 'How Our Online English Classes Work | TutorPro English PH',
    description:
      'See exactly how TutorPro online English lessons work: booking, the browser classroom, lesson structure, written feedback, and how parents follow progress.',
    heading: 'How online English lessons work at TutorPro',
    lede:
      'From booking to feedback, here is exactly what happens — so you know what you are signing your child up for before you book anything.',
    cta: 'Book a free first class',
    body: `
        <h2>The learning pathway</h2>
        <p>Every child follows the same simple cycle, repeated each lesson:</p>
        <table>
          <tr><th>Stage</th><th>What happens</th></tr>
          <tr><td><strong>Level</strong></td><td>The first lesson establishes what your child can already do, so material is neither babyish nor overwhelming.</td></tr>
          <tr><td><strong>Skills</strong></td><td>Speaking, reading, listening, grammar and vocabulary — weighted towards whatever your child most needs.</td></tr>
          <tr><td><strong>Lesson</strong></td><td>25 or 50 minutes, one teacher and one child, in our browser classroom.</td></tr>
          <tr><td><strong>Practice</strong></td><td>Short follow-up work, plus pronunciation practice your child can do alone between lessons.</td></tr>
          <tr><td><strong>Feedback</strong></td><td>Written notes after every lesson, in plain language for parents.</td></tr>
          <tr><td><strong>Progress</strong></td><td>Feedback accumulates in your dashboard so you can see movement over months, not just single lessons.</td></tr>
        </table>

        <h2>Inside the classroom</h2>
        <p>Lessons run in our own browser classroom. There is no app to install and no meeting link to find — you open your dashboard and click into the lesson.</p>
        <p>The teacher shares course material on screen and both of them write on it together. Younger children get games and songs woven through; older ones get discussion, reading passages and writing.</p>

        <h2>The materials</h2>
        <p>English lessons follow published Cambridge and Oxford course books, including Power Up, Global English, Family and Friends, Oxford Phonics World and THiNK. The teacher selects the level. Materials are included — there is nothing extra to buy.</p>

        <h2>How teachers support young learners</h2>
        <p>Children are not small adults, and a lesson that works for a fifteen-year-old will lose a five-year-old in four minutes. Younger lessons move in short bursts with frequent changes of activity. Mistakes get recast rather than corrected bluntly — the teacher repeats the sentence properly and moves on, so the child hears the right form without feeling caught out.</p>

        <h2>How parents follow progress</h2>
        <p>Your dashboard shows upcoming lessons, past lessons, the teacher's written feedback, and any audio feedback recorded for pronunciation. You do not need to speak the language yourself to follow it; the notes are written for parents, not for teachers.</p>

        <h2>Scheduling across time zones</h2>
        <p>Teachers are in the Philippines (UTC+8). Lesson times in your dashboard are automatically converted to your own local time, so you never have to work out the offset. Asia, the Middle East, Europe and Australia fit comfortably; families in North America usually book early-morning lessons before school.</p>`,
    faqs: [
      ['Are lessons live or recorded?', 'Every lesson is live with a real teacher. Nothing is pre-recorded.'],
      ['Are lessons one-to-one?', 'Yes, always one teacher and one child. There are no group classes.'],
      ['How long is each class?', 'Lessons are 25 or 50 minutes. Younger children usually do better with 25.'],
      ['What platform do lessons use?', 'Our own browser classroom. There is nothing to download, and it works on a laptop, tablet or phone.'],
      ['How do I book a class?', 'From your parent dashboard. Available times are shown in your own time zone, and you can book or cancel there.'],
      ['How are teachers assigned?', 'Our administration team matches your child to a teacher based on age, level and goals. Tell us if the match is not working and we will change it.'],
      ['How does class feedback work?', 'The teacher writes notes after every lesson covering what was practised, what went well, what to work on, and vocabulary worth revising. It appears in your dashboard.'],
    ],
    related: [['free-trial.html', 'Free trial'], ['teachers.html', 'Our teachers'], ['pricing.html', 'Pricing']],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'faq.html',
    label: 'FAQ',
    title: 'Frequently Asked Questions | TutorPro English PH',
    description:
      'Answers to the questions parents ask most about TutorPro online English classes: ages, lesson length, pricing, the free trial, teachers, booking, refunds and support.',
    heading: 'Frequently asked questions',
    lede:
      'The practical questions parents actually ask, answered plainly. If yours is not here, message us and a real person will reply.',
    cta: 'Book a free first class',
    body: `
        <h2>About TutorPro</h2>
        <div class="card"><h3>What is TutorPro English PH?</h3><p>An online school offering one-to-one English lessons to children aged 4 to 16, taught live by teachers based in the Philippines. It is registered with the Philippine DTI under Business Name Registration 5274092. We also teach Maths, Science and ICT.</p></div>
        <div class="card"><h3>Which students do you teach?</h3><p>Primary and secondary learners, roughly ages 4 to 16. We do not currently run adult classes or IELTS preparation.</p></div>
        <div class="card"><h3>Where are your students?</h3><p>Worldwide. Families in Asia, the Middle East, Europe and Australia are the most common, with some in North America taking early-morning lessons.</p></div>

        <h2>Lessons</h2>
        <div class="card"><h3>Are classes live?</h3><p>Yes. Every lesson is live with a real teacher — nothing is pre-recorded.</p></div>
        <div class="card"><h3>Are lessons one-to-one?</h3><p>Always. One teacher, one child, for the whole lesson.</p></div>
        <div class="card"><h3>How long is each class?</h3><p>25 or 50 minutes. Younger children usually concentrate better in 25.</p></div>
        <div class="card"><h3>Do you use Cambridge English materials?</h3><p>Yes. English lessons follow published Cambridge course books including Power Up and Global English.</p></div>
        <div class="card"><h3>Do you use Oxford English materials?</h3><p>Yes, including Family and Friends, Oxford Phonics World and THiNK. The teacher chooses the level that fits your child.</p></div>
        <div class="card"><h3>What online classroom do you use?</h3><p>Our own browser-based classroom. Nothing to install, and it runs on a laptop, tablet or phone.</p></div>

        <h2>Pricing and payment</h2>
        <div class="card"><h3>How much do lessons cost?</h3><p>$${STANDARD} per 25-minute lesson for 1–3 lessons a week, or $${PACKAGE} per lesson when your child takes ${PACKAGE_MIN} or more a week. A 50-minute lesson is exactly double, so $${STANDARD_50} or $${PACKAGE_50}. No registration, materials or platform fees.</p></div>
        <div class="card"><h3>Can I get a refund?</h3><p>Cancelling at least 12 hours before a lesson returns the credit in full. Unused credits can be refunded within 14 days of purchase. Full details are on the <a href="/refund-policy.html">refund policy</a> page.</p></div>

        <h2>Booking and teachers</h2>
        <div class="card"><h3>How do I book a class?</h3><p>From your parent dashboard. Times are shown in your own time zone.</p></div>
        <div class="card"><h3>Can parents choose a teacher?</h3><p>Our administration team assigns teachers based on your child's age, level and goals. If the match is not right, tell us and we will change it.</p></div>
        <div class="card"><h3>How are teachers assigned?</h3><p>By our administration team, matching the child's needs to the teacher's strengths — some are better with nervous beginners, others with exam preparation.</p></div>

        <h2>Accounts and support</h2>
        <div class="card"><h3>What if I forget my password?</h3><p>Use the password reset link on the login screen. If the reset email does not arrive, message us and we will sort it out manually.</p></div>
        <div class="card"><h3>How can I contact support?</h3><p>Messenger, WhatsApp, WeChat or KakaoTalk — all listed on the <a href="/contact.html">contact page</a>. A real person replies, usually within one business day.</p></div>`,
    faqs: [
      ['What is TutorPro English PH?', 'An online school offering one-to-one English lessons to children aged 4 to 16, taught live by teachers in the Philippines. Registered with the Philippine DTI, Business Name Registration 5274092.'],
      ['What age students can join?', 'Children aged 4 to 16, covering primary and secondary learners.'],
      ['Are lessons one-to-one?', 'Yes. Every lesson is one teacher and one child, with no group classes.'],
      ['Do you offer Cambridge English?', 'Yes. English lessons follow published Cambridge course books including Power Up and Global English.'],
      ['Do you use Oxford English materials?', 'Yes, including Family and Friends, Oxford Phonics World and THiNK.'],
      ['How much do lessons cost?', `$${STANDARD} per 25-minute lesson for 1\u20133 a week, or $${PACKAGE} per lesson for ${PACKAGE_MIN} or more a week. A 50-minute lesson is double. There are no registration, materials or platform fees.`],
      ['How do I book a class?', 'From your parent dashboard, where available times are shown converted into your own time zone.'],
      ['Can parents choose a teacher?', 'Teachers are assigned by our administration team based on your child\u2019s age, level and goals. If the match is not right, we will change it.'],
      ['What if I forget my password?', 'Use the reset link on the login screen. If the email does not arrive, message us and we will help directly.'],
      ['How can I contact TutorPro support?', 'Through Messenger, WhatsApp, WeChat or KakaoTalk, all listed on the contact page. A real person replies, usually within one business day.'],
    ],
    related: [['how-it-works.html', 'How lessons work'], ['pricing.html', 'Pricing'], ['free-trial.html', 'Free trial']],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'teachers.html',
    label: 'Our teachers',
    title: 'Our Online English Teachers — How We Vet Them | TutorPro English PH',
    description:
      'Every TutorPro teacher passes a recorded teaching interview and credential check before meeting a child. See exactly how our online English teachers are selected.',
    heading: 'The teachers who will teach your child',
    lede:
      'You are trusting someone you have never met with your child. Here is precisely how our teachers are selected — and how to judge any online tutor you are considering.',
    cta: 'Book a free first class',
    body: `
        <h2>How a teacher joins TutorPro</h2>
        <p>Applying is not the same as being accepted. Every teacher goes through the same sequence before they are put in front of a child:</p>
        <ol>
          <li><strong>Credential check.</strong> Teaching qualifications and identity documents are reviewed and held on file.</li>
          <li><strong>Recorded teaching interview.</strong> Candidates teach a real segment, recorded, so we watch them teach rather than watch them talk about teaching.</li>
          <li><strong>Assessment of the recording.</strong> We look for clear pronunciation, patience, whether they let a child finish a sentence, and whether they correct without deflating.</li>
          <li><strong>Administrative approval.</strong> A teacher only becomes bookable after explicit approval — no automatic listing.</li>
          <li><strong>Ongoing feedback review.</strong> Lesson feedback is monitored. Teachers who stop writing useful notes stop getting bookings.</li>
        </ol>

        <h2>What our teachers have in common</h2>
        <div class="grid">
          <div class="card"><h3>Experience with children</h3><p>Teaching a seven-year-old is a different craft from teaching an adult. Our teachers are selected for the former.</p></div>
          <div class="card"><h3>International online teaching</h3><p>Our teachers have taught children in other countries online, which means handling a shaky connection or a shy child is familiar ground.</p></div>
          <div class="card"><h3>Clear, neutral pronunciation</h3><p>Assessed from the recorded interview rather than claimed on a CV.</p></div>
          <div class="card"><h3>Written feedback discipline</h3><p>Every lesson ends with notes a parent can actually read and act on.</p></div>
        </div>

        <h2>How your child is matched</h2>
        <p>Our administration team assigns the teacher, based on your child's age, level and what you have told us you want. We do this rather than handing you a wall of profiles because we know which teacher is patient with a reluctant speaker and which is stronger on exam technique — information a profile page cannot convey.</p>
        <p>If the match is not working, tell us. Changing teacher is a routine request and not a complaint.</p>

        <h2>How to judge any online tutor</h2>
        <p>Whether or not you choose us, these are worth asking of any school:</p>
        <ul>
          <li>Is the business registered, and can you see the registration number?</li>
          <li>Did anyone watch this teacher actually teach before listing them?</li>
          <li>Do you get written feedback after every lesson, or only on request?</li>
          <li>Can you cancel and get your money back, and is that policy published?</li>
          <li>Is the first lesson free without card details?</li>
        </ul>
        <p>We publish our DTI registration (5274092), our <a href="/refund-policy.html">refund policy</a> and our <a href="/is-tutorpro-legitimate.html">legitimacy page</a> for exactly this reason.</p>`,
    faqs: [
      ['Who will teach my child?', 'A teacher assigned by our administration team based on your child\u2019s age, level and goals. Every teacher has passed a credential check and a recorded teaching interview.'],
      ['Are your teachers qualified?', 'Teaching qualifications and identity documents are checked and held on file before a teacher is approved. We assess them teaching a recorded segment, not just their paperwork.'],
      ['Can I choose or change my child\u2019s teacher?', 'Teachers are assigned by our team. If the match is not right, tell us and we will change it — it is a routine request.'],
      ['Are teachers native English speakers?', 'Our teachers are based in the Philippines, where English is an official language and the medium of instruction in schools. Pronunciation is assessed from a recorded interview before approval.'],
      ['Will my child have the same teacher each week?', 'Usually yes. Continuity matters, especially for younger children, so we keep the same teacher unless you ask for a change or a schedule makes it impossible.'],
    ],
    related: [['how-it-works.html', 'How lessons work'], ['is-tutorpro-legitimate.html', 'Are we legitimate?'], ['free-trial.html', 'Free trial']],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'primary-english.html',
    label: 'Primary English',
    title: 'Primary English Classes for Kids Online | TutorPro English PH',
    description:
      `Online primary English lessons for children aged 4\u201311. Phonics, reading, speaking, grammar and vocabulary, one-to-one with Cambridge and Oxford materials. From $${PACKAGE}.`,
    heading: 'Primary English classes for children aged 4–11',
    lede:
      'Phonics to fluent reading, one teacher and one child. Lessons follow published Cambridge and Oxford primary courses and adapt to where your child actually is.',
    cta: 'Book a free first class',
    body: `
        <h2>What primary learners work on</h2>
        <div class="grid">
          <div class="card"><h3>Phonics and early reading</h3><p>Letter sounds, blending and decoding — the foundation that makes later reading feel effortless rather than exhausting.</p></div>
          <div class="card"><h3>Speaking and listening</h3><p>Full sentences, questions and answers, and enough repetition that speaking stops feeling like a performance.</p></div>
          <div class="card"><h3>Reading comprehension</h3><p>Moving from reading words to understanding a passage and answering questions about it.</p></div>
          <div class="card"><h3>Grammar in context</h3><p>Tenses and sentence structure taught through use, not through rules recited in isolation.</p></div>
          <div class="card"><h3>Vocabulary</h3><p>Themed word sets that recur across lessons, because a word met once is a word forgotten.</p></div>
          <div class="card"><h3>Confidence</h3><p>For many primary children this is the real blocker. One-to-one removes the audience.</p></div>
        </div>

        <h2>By age</h2>
        <p><strong>Ages 4–7.</strong> Short, playful lessons. Phonics, songs, games and first words. The aim is that English feels normal and enjoyable rather than a test. See our <a href="/english-for-kids-ages-4-7.html">ages 4–7 page</a>.</p>
        <p><strong>Ages 8–11.</strong> Reading fluency, grammar in context, longer speaking turns, and support with whatever school is covering. See our <a href="/english-for-kids-ages-8-11.html">ages 8–11 page</a>.</p>

        <h2>Materials</h2>
        <p>Primary lessons draw on Cambridge Power Up and Global English, and Oxford Family and Friends and Oxford Phonics World. The teacher picks the level after seeing what your child can already do — not from the school year on a form.</p>

        <h2>Lesson length</h2>
        <p>25 minutes suits most primary children, matching their concentration span. Some older primary learners manage 50 minutes comfortably. A 50-minute lesson costs exactly double.</p>

        <h2>What you see afterwards</h2>
        <p>Written feedback after every lesson: what was practised, what went well, what to work on, and the words worth revising at home. Audio feedback for pronunciation where the teacher records it.</p>`,
    faqs: [
      ['What age is primary English for?', 'Children roughly aged 4 to 11, covering the primary school years.'],
      ['My child cannot read English yet. Is that a problem?', 'No. Phonics and pre-reading work is exactly where many of our youngest learners start.'],
      ['How long should a primary lesson be?', 'Usually 25 minutes, which matches most primary children\u2019s concentration. Older primary learners sometimes do 50.'],
      ['Which course books do you use for primary?', 'Cambridge Power Up and Global English, and Oxford Family and Friends and Oxford Phonics World. The teacher chooses the level.'],
      ['How much do primary lessons cost?', `$${STANDARD} per 25-minute lesson for 1\u20133 a week, or $${PACKAGE} each for ${PACKAGE_MIN} or more a week. The first class is free.`],
      ['Can lessons support my child\u2019s school work?', 'Yes. Tell us what school is covering and the teacher can align lessons with it.'],
    ],
    related: [['secondary-english.html', 'Secondary English'], ['english-for-kids-ages-4-7.html', 'Ages 4–7'], ['english-for-kids-ages-8-11.html', 'Ages 8–11']],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'secondary-english.html',
    label: 'Secondary English',
    title: 'Secondary English Classes for Students Online | TutorPro English PH',
    description:
      `Online secondary English lessons for students aged 12\u201316. Writing, comprehension, advanced grammar and exam-style speaking, one-to-one. Cambridge and Oxford materials from $${PACKAGE}.`,
    heading: 'Secondary English classes for students aged 12–16',
    lede:
      'Writing, comprehension and confident speaking for older learners, one-to-one. Lessons follow published Cambridge and Oxford secondary courses.',
    cta: 'Book a free first class',
    body: `
        <h2>What secondary learners work on</h2>
        <div class="grid">
          <div class="card"><h3>Writing</h3><p>Structuring a paragraph, then an essay. Planning, linking ideas, and editing their own work rather than hoping it is right.</p></div>
          <div class="card"><h3>Reading comprehension</h3><p>Longer and harder texts, inference, and answering the question that was actually asked.</p></div>
          <div class="card"><h3>Advanced grammar</h3><p>Conditionals, passives, reported speech and the tenses that separate adequate English from precise English.</p></div>
          <div class="card"><h3>Exam-style speaking</h3><p>Extended answers, giving reasons, and holding a position under follow-up questions.</p></div>
          <div class="card"><h3>Academic vocabulary</h3><p>The words that appear in school subjects and formal writing, not just conversation.</p></div>
          <div class="card"><h3>Fluency under pressure</h3><p>Speaking at length without rehearsing every sentence first.</p></div>
        </div>

        <h2>Why one-to-one matters more at this age</h2>
        <p>Teenagers are acutely aware of being watched. A student who will not risk a wrong answer in front of thirty classmates will often try it readily with one teacher and no audience. That single difference is frequently what unlocks progress at secondary level.</p>

        <h2>Materials</h2>
        <p>Secondary lessons draw on Cambridge Global English and Oxford THiNK, with the level chosen after the teacher sees the student's current work. Lessons can also follow whatever the student's own school is covering — bring the homework.</p>

        <h2>Lesson length</h2>
        <p>Most secondary students do better with 50 minutes, which allows time for extended writing and longer discussion. 25-minute lessons are available and cost half as much.</p>

        <h2>A note on exams</h2>
        <p>We support exam-style speaking and writing practice as part of general English teaching. We do not currently run dedicated IELTS or other formal exam preparation courses, and we would rather say so than sell you something we do not specialise in.</p>`,
    faqs: [
      ['What age is secondary English for?', 'Students roughly aged 12 to 16.'],
      ['Can lessons follow my child\u2019s school syllabus?', 'Yes. Bring the school material or homework and the teacher can work from it.'],
      ['Do you prepare students for IELTS?', 'We support exam-style speaking and writing practice within general English lessons, but we do not currently offer a dedicated IELTS preparation course.'],
      ['How long should a secondary lesson be?', 'Most secondary students benefit from 50 minutes, which leaves room for extended writing and discussion. A 50-minute lesson costs exactly double a 25-minute one.'],
      ['Which course books do you use for secondary?', 'Cambridge Global English and Oxford THiNK, with the level set after the teacher reviews the student\u2019s current work.'],
      ['How much do secondary lessons cost?', `$${STANDARD} per 25-minute lesson for 1\u20133 a week, or $${PACKAGE} each for ${PACKAGE_MIN} or more. A 50-minute lesson is $${STANDARD_50} or $${PACKAGE_50}.`],
    ],
    related: [['primary-english.html', 'Primary English'], ['english-for-teens-ages-12-16.html', 'Ages 12–16'], ['pricing.html', 'Pricing']],
  },
]

/** Structured data. No ratings, no reviews — none exist, so none are claimed. */
function schema(spec) {
  const url = `${SITE}/${spec.slug}`
  const graph = [
    {
      '@type': 'WebPage',
      '@id': `${url}#page`,
      name: spec.title,
      description: spec.description,
      url,
      inLanguage: 'en',
      isPartOf: { '@type': 'WebSite', name: 'TutorPro English PH', url: SITE },
    },
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: spec.faqs.map(([q, a]) => ({
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
        { '@type': 'ListItem', position: 2, name: spec.label, item: url },
      ],
    },
  ]
  // Only the two programme pages are genuinely a Course.
  if (spec.slug === 'primary-english.html' || spec.slug === 'secondary-english.html') {
    graph.unshift({
      '@type': 'Course',
      '@id': `${url}#course`,
      name: spec.heading,
      description: spec.description,
      url,
      inLanguage: 'en',
      audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
      provider: {
        '@type': 'EducationalOrganization',
        name: 'TutorPro English PH',
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
        offers: { '@type': 'Offer', price: String(STANDARD), priceCurrency: 'USD', availability: 'https://schema.org/InStock', url },
      }],
    })
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

function nav(current) {
  return `<nav class="pagenav" aria-label="Main sections">
          ${PAGES.filter((p) => p.slug !== current).map((p) => `<a href="/${p.slug}">${escapeHtml(p.label)}</a>`).join('\n          ')}
          <a href="/pricing.html">Pricing</a>
          <a href="/online-english-classes-for-kids.html">Online English classes</a>
        </nav>`
}

function render(spec) {
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
    <meta property="og:site_name" content="TutorPro English PH" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${escapeHtml(spec.title)}" />
    <meta property="og:description" content="${escapeHtml(spec.description)}" />
    <meta property="og:image" content="${SITE}/assets/tutorpro-hero.webp" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(spec.title)}" />
    <meta name="twitter:description" content="${escapeHtml(spec.description)}" />
    <meta name="twitter:image" content="${SITE}/assets/tutorpro-hero.webp" />
    <script type="application/ld+json">${JSON.stringify(schema(spec))}</script>
    <link rel="stylesheet" href="/assets/pages.css" />
  </head>
  <body>
    <header class="site-head">
      <div class="wrap site-head__inner">
        <a class="brand" href="/"><img src="/assets/tutorpro-panda-logo.webp" alt="TutorPro English PH" width="40" height="40" />TutorPro English PH</a>
        <a class="btn btn--primary" href="/?book=1">${escapeHtml(spec.cta)}</a>
      </div>
    </header>
    <main>
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span>${escapeHtml(spec.label)}</span></nav>
        <h1>${escapeHtml(spec.heading)}</h1>
        <p class="lede">${escapeHtml(spec.lede)}</p>
        <p>
          <span class="pill">Ages 4–16</span>
          <span class="pill">One-to-one, always</span>
          <span class="pill">Cambridge &amp; Oxford materials</span>
          <span class="pill">from $${PACKAGE} per class</span>
          <span class="pill">Free first class</span>
        </p>
        <p>
          <a class="btn" href="/?book=1">${escapeHtml(spec.cta)}</a>
          <a class="btn btn--quiet" href="${MESSENGER}" target="_blank" rel="noopener">Ask a question</a>
        </p>

        ${nav(spec.slug)}
${spec.body}

        <h2>Questions parents ask</h2>
        ${spec.faqs.map(([q, a]) => `<div class="card"><h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p></div>`).join('\n        ')}

        <h2>Read next</h2>
        <nav class="pagenav" aria-label="Related pages">
          ${spec.related.map(([href, label]) => `<a href="/${href}">${escapeHtml(label)}</a>`).join('\n          ')}
        </nav>

        <h2>Start with a free class</h2>
        <p>Every new family gets one free lesson before choosing a plan. No card, no obligation — it is the only reliable way to know whether this suits your child.</p>
        <p>
          <a class="btn" href="/?book=1">${escapeHtml(spec.cta)}</a>
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
        <a href="/contact.html">Contact</a>
        <p>© ${new Date().getFullYear()} TutorPro English PH · DTI Business Name Registration 5274092 · One-to-one online classes for children worldwide, taught from the Philippines.</p>
      </div>
    </footer>
  </body>
</html>
`
}

async function run() {
  await mkdir(publicDir, { recursive: true })
  for (const spec of PAGES) {
    await writeFile(resolve(publicDir, spec.slug), render(spec), 'utf8')
    console.log(`[core] wrote public/${spec.slug}`)
  }
  console.log(`[core] ${PAGES.length} core pages generated.`)
}

run().catch((error) => {
  console.error('[core] failed:', error)
  process.exit(1)
})
