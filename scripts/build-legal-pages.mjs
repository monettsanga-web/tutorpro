/**
 * Generates the static trust and legal pages for TutorPro English.
 *
 * WHY: the site had no Privacy Policy, Terms, Refund Policy, About or Contact
 * page. Every one of those URLs returned 404, which is a major trust red flag
 * for parents, for AI assistants evaluating the site, for PayPal merchant
 * requirements, and for GDPR compliance when advertising into the EU.
 *
 * These are plain static HTML files in /public so they are fully crawlable
 * without JavaScript, unlike the React app.
 *
 * NOTE ON ACCURACY: TutorPro English operates as a sole proprietorship based
 * in the Philippines. Nothing here claims a company registration number or
 * corporate status that has not been provided. Update CONTACT below if a
 * public support email or registered business number is added later.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

const SITE = 'https://www.tutorpro.site'
const UPDATED = '4 August 2026'

const CONTACT = {
  messenger: 'https://m.me/526047974195321',
  facebook: 'https://www.facebook.com/tutorproenglish',
  // Published contact address, matching the one shown in the site footer.
  email: 'sejongenglish@yahoo.com',
}

const contactLinksHtml = `
  <p>
    <a class="btn" href="${CONTACT.messenger}" target="_blank" rel="noopener">Message us on Messenger</a>
    <a class="btn btn--ghost" href="${CONTACT.facebook}" target="_blank" rel="noopener">Facebook page</a>
  </p>
  ${CONTACT.email ? `<p>Email: <a href="mailto:${CONTACT.email}">${CONTACT.email}</a></p>` : `<p class="muted">You can also use the live support chat inside the TutorPro English website, bottom-right of any page.</p>`}
`

const STYLE = `
  :root { color-scheme: dark; --bg:#090510; --violet:#7048df; --lime:#bce94e; --text:#fff; --muted:#c9bddb; --card:rgba(255,255,255,.07); --line:rgba(255,255,255,.14); }
  * { box-sizing: border-box; }
  body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at 15% 5%, rgba(188,233,78,.14), transparent 30%), linear-gradient(135deg, #090510 0%, #25104d 54%, #111827 100%); color:var(--text); line-height:1.65; }
  a { color: var(--lime); }
  .container { width:min(880px, calc(100% - 32px)); margin:auto; }
  header { position:sticky; top:0; z-index:10; backdrop-filter: blur(18px); background:rgba(9,5,16,.74); border-bottom:1px solid var(--line); }
  nav { min-height:72px; display:flex; align-items:center; justify-content:space-between; gap:20px; }
  .brand { display:flex; align-items:center; gap:11px; font-weight:950; text-decoration:none; color:#fff; }
  .brand img { width:42px; height:42px; border-radius:13px; }
  main { padding:44px 0 70px; }
  h1 { font-size:clamp(1.9rem,4vw,2.7rem); letter-spacing:-.03em; line-height:1.12; margin:0 0 8px; }
  h2 { font-size:1.2rem; margin:32px 0 10px; color:#fff; }
  h3 { font-size:1rem; margin:20px 0 6px; color:var(--lime); }
  p, li { color:var(--muted); }
  .updated { display:inline-block; border-radius:999px; padding:6px 13px; background:var(--card); border:1px solid var(--line); font-size:.78rem; color:var(--muted); margin-bottom:22px; }
  .card { border:1px solid var(--line); border-radius:18px; padding:20px 22px; background:var(--card); margin:18px 0; }
  .btn { display:inline-flex; align-items:center; gap:8px; border-radius:999px; padding:12px 18px; background:var(--lime); color:#140a29; font-weight:900; text-decoration:none; margin:4px 6px 4px 0; }
  .btn--ghost { background:transparent; border:1px solid var(--line); color:#fff; }
  .muted { font-size:.9rem; }
  footer { border-top:1px solid var(--line); padding:26px 0; font-size:.84rem; color:var(--muted); }
  footer a { margin-right:14px; display:inline-block; }
  ul { padding-left:20px; }
`

const FOOTER_LINKS = [
  ['/', 'Home'],
  ['/about.html', 'About'],
  ['/contact.html', 'Contact'],
  ['/privacy-policy.html', 'Privacy'],
  ['/terms.html', 'Terms'],
  ['/refund-policy.html', 'Refunds'],
]

function page({ slug, title, description, heading, body, schema }) {
  const url = `${SITE}/${slug}`
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#321568" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="/assets/pwa-icon-192.png" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="TutorPro English" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${SITE}/assets/tutorpro-hero.webp" />
    ${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ''}
    <style>${STYLE}</style>
  </head>
  <body>
    <header>
      <div class="container">
        <nav>
          <a class="brand" href="/"><img src="/assets/tutorpro-panda-logo.webp" alt="TutorPro English" />TutorPro English</a>
          <a class="btn" href="/">Book a free first class</a>
        </nav>
      </div>
    </header>
    <main>
      <div class="container">
        <h1>${heading}</h1>
        <span class="updated">Last updated: ${UPDATED}</span>
        ${body}
      </div>
    </main>
    <footer>
      <div class="container">
        ${FOOTER_LINKS.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}
        <p>© ${new Date().getFullYear()} TutorPro English. Online English classes for children and teenagers worldwide.</p>
      </div>
    </footer>
  </body>
</html>
`
}

/* ------------------------------------------------------------------ */

const PAGES = [
  {
    slug: 'privacy-policy.html',
    title: 'Privacy Policy — TutorPro English',
    description: 'How TutorPro English collects, uses and protects personal data for parents, students and teachers, including GDPR rights and children’s privacy.',
    heading: 'Privacy Policy',
    body: `
      <p>TutorPro English ("we", "us") provides online one-to-one English tutoring. This policy explains what personal information we collect, why we collect it, and the rights you have over it. TutorPro English is operated as a sole proprietorship based in the Philippines.</p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account details:</strong> parent name, email address, and login credentials.</li>
        <li><strong>Learner profile:</strong> the child's first name, year level, curriculum and learning goals. We ask for the minimum needed to teach effectively.</li>
        <li><strong>Booking and lesson data:</strong> lesson times, attendance, teacher feedback and progress notes.</li>
        <li><strong>Payment data:</strong> payments are processed by PayPal. We receive confirmation of payment and never see or store your full card details.</li>
        <li><strong>Approximate country:</strong> estimated from your IP address at sign-up so we can show the right language, timezone and currency. <strong>We store only the two-letter country code, never your IP address.</strong></li>
        <li><strong>Classroom content:</strong> chat messages, uploaded lesson files, and lesson recordings where recording is used (see below).</li>
      </ul>

      <h2>Children's privacy</h2>
      <p>TutorPro English is purchased and managed by a parent or legal guardian. Accounts are held by the adult, not the child. We do not knowingly allow children to register independently, and we do not use children's data for advertising or profiling. A parent may request deletion of their child's data at any time.</p>

      <h2>Lesson recordings</h2>
      <p>Some lessons may be recorded so parents can review progress. When recording is active, a clearly visible red "REC" indicator is shown to everyone in the classroom. Recordings are stored privately and are accessible only to the teacher of that class, the parent of the student in it, and administrators. They are served through short-lived signed links and are never publicly listed.</p>

      <h2>How we use your information</h2>
      <ul>
        <li>To deliver, schedule and improve lessons.</li>
        <li>To process payments and manage lesson credits.</li>
        <li>To send booking confirmations, reminders and service announcements.</li>
        <li>To keep the platform secure and prevent misuse.</li>
      </ul>

      <h2>Sharing</h2>
      <p>We do not sell personal data. We share it only with service providers that make the platform work: Supabase (database, authentication and file storage), Vercel (website hosting) and PayPal (payments). Each processes data on our behalf under their own security obligations.</p>

      <h2>Your rights</h2>
      <p>You may request access to, correction of, or deletion of your personal data, and you may withdraw consent at any time. If you are in the European Economic Area or the United Kingdom, you also have the right to data portability and the right to lodge a complaint with your local data protection authority. Philippine users have equivalent rights under the Data Privacy Act of 2012 (Republic Act No. 10173).</p>
      <p>To exercise any of these rights, contact us using the details below and we will respond within 30 days.</p>

      <h2>Data retention</h2>
      <p>We keep account and lesson records for as long as your account is active. If you close your account, we delete or anonymise personal data except where we must keep records for tax or legal reasons.</p>

      <h2>Cookies and local storage</h2>
      <p>We use browser storage to keep you signed in, remember your language and timezone preference, and operate the classroom. We do not use third-party advertising cookies on the platform itself.</p>

      <h2>Contact</h2>
      ${contactLinksHtml}
    `,
  },

  {
    slug: 'terms.html',
    title: 'Terms of Service — TutorPro English',
    description: 'The terms that apply when you book and attend online English lessons with TutorPro English, including scheduling, conduct and payment terms.',
    heading: 'Terms of Service',
    body: `
      <p>These terms apply when you create an account or book lessons with TutorPro English. By using the service you agree to them.</p>

      <h2>Who may use TutorPro English</h2>
      <p>Accounts must be created and managed by a parent or legal guardian aged 18 or over. The account holder is responsible for all activity on the account and for supervising their child's use of the classroom.</p>

      <h2>Lessons and scheduling</h2>
      <ul>
        <li>Lessons are delivered one-to-one through our browser-based classroom. No third-party meeting software is required.</li>
        <li>Lesson lengths are 25 or 50 minutes as selected at booking.</li>
        <li>Lesson times displayed in your dashboard are shown in your own local timezone. Our teaching base is Manila time (UTC+8).</li>
        <li>Please arrive on time. If a student is more than 15 minutes late without notice, the teacher may end the session and it may count as delivered.</li>
      </ul>

      <h2>Rescheduling and cancellations</h2>
      <ul>
        <li>You may cancel or reschedule a booked lesson from your dashboard.</li>
        <li>Cancellations made at least <strong>12 hours</strong> before the lesson return the credit to your account in full.</li>
        <li>Cancellations inside 12 hours, or non-attendance, may consume the lesson credit.</li>
        <li>If a teacher must cancel, you always receive the credit back in full, and we will help you rebook at a convenient time.</li>
      </ul>

      <h2>Payments and credits</h2>
      <p>Lessons are purchased as credits through PayPal before booking. Prices are shown before payment. Where a local currency figure is displayed alongside the price it is an approximate conversion for guidance only; the actual charge is made in US dollars.</p>

      <h2>Free first class</h2>
      <p>New families may take one free trial class. It is limited to one per family and is intended for genuine evaluation of the service.</p>

      <h2>Acceptable conduct</h2>
      <p>We ask everyone in the classroom to be respectful. We may suspend or close an account for abusive behaviour toward a teacher or student, for sharing account access with others, or for recording or redistributing lesson content without permission.</p>

      <h2>Teaching materials</h2>
      <p>Courseware, worksheets and lesson materials provided by TutorPro English are for your child's personal learning use. Please do not redistribute or resell them.</p>

      <h2>Service availability</h2>
      <p>We work to keep the classroom available and reliable, but we cannot guarantee uninterrupted service. Internet quality on either side can affect a lesson. If a lesson cannot proceed because of a failure on our side, we will credit it back.</p>

      <h2>Changes to these terms</h2>
      <p>We may update these terms as the service develops. Material changes will be announced in your dashboard. Continuing to use the service after a change means you accept the updated terms.</p>

      <h2>Contact</h2>
      ${contactLinksHtml}
    `,
  },

  {
    slug: 'refund-policy.html',
    title: 'Refund Policy — TutorPro English',
    description: 'Clear refund and lesson credit terms for TutorPro English, including the free trial, unused credits, technical failures and how to request a refund.',
    heading: 'Refund Policy',
    body: `
      <p>We want families to feel safe trying TutorPro English. This page sets out exactly when a refund or lesson credit applies. It is written to be read before you pay, not after.</p>

      <div class="card">
        <h3>The short version</h3>
        <p>Try your first class free. If a lesson fails because of us, you get the credit back. Unused credits can be refunded within 14 days of purchase. Cancel at least 12 hours ahead and your credit is returned in full.</p>
      </div>

      <h2>Free first class</h2>
      <p>New families receive one free trial lesson. No payment is required to take it, and there is no obligation to continue afterwards.</p>

      <h2>Unused lesson credits</h2>
      <p>You may request a refund of <strong>unused</strong> lesson credits within <strong>14 days</strong> of purchase. Refunds are issued to the original PayPal account. Lessons already delivered are not refundable.</p>

      <h2>Cancelling a booked lesson</h2>
      <ul>
        <li><strong>12 or more hours before the lesson:</strong> the credit returns to your account automatically.</li>
        <li><strong>Less than 12 hours before, or no-show:</strong> the credit is normally consumed. If something urgent happened, contact us — we review these case by case and are reasonable about genuine emergencies such as illness.</li>
      </ul>

      <h2>Technical problems</h2>
      <p>If a lesson cannot go ahead or is significantly disrupted because of a problem on our side — teacher connection failure, classroom outage, or teacher no-show — the credit is <strong>always</strong> returned in full. If the disruption was on the student's side, contact us and we will try to find a fair outcome.</p>

      <h2>Unhappy with a lesson</h2>
      <p>If a lesson genuinely did not meet a reasonable standard, tell us within 48 hours. We will review what happened, and where we agree, we will re-credit the lesson or arrange a replacement class with another teacher.</p>

      <h2>Credit expiry</h2>
      <p>Weekly plan credits are intended for use within that week. Monthly package credits are intended for use within the billing month. If you need to pause because of illness, exams or travel, contact us before the credits lapse and we will do our best to extend them.</p>

      <h2>How to request a refund</h2>
      <p>Contact us through Messenger, our Facebook page, or the live support chat inside the site. Please include the parent account email and the lesson dates concerned. We aim to acknowledge every request within 2 business days and to process approved refunds within 7 business days.</p>

      ${contactLinksHtml}
    `,
  },

  {
    slug: 'about.html',
    title: 'About TutorPro English — Who We Are',
    description: 'TutorPro English provides one-to-one online English lessons for children and teenagers, with Cambridge and Oxford aligned courseware and vetted teachers.',
    heading: 'About TutorPro English',
    body: `
      <p>TutorPro English is an online English school for children and teenagers. Every lesson is one-to-one, so your child speaks for the whole class instead of waiting their turn in a group.</p>

      <h2>What we do</h2>
      <p>We teach Primary and Secondary learners in live, browser-based classes. Lessons are aligned with Cambridge and Oxford English curricula and adapted to each child's year level, school work and confidence.</p>

      <h2>How we teach</h2>
      <ul>
        <li><strong>One-to-one only.</strong> No group classes, no shared attention.</li>
        <li><strong>Our own classroom.</strong> Lessons run inside our website — no Zoom, no downloads, no separate meeting links.</li>
        <li><strong>Structured courseware.</strong> Interactive slides, reading materials, pronunciation practice and speaking drills built into every class.</li>
        <li><strong>Visible progress.</strong> Parents get written teacher feedback after lessons, plus attendance, homework and progress tracking in their dashboard.</li>
      </ul>

      <h2>Our teachers</h2>
      <p>Teachers apply through a structured process that includes a recorded teaching interview and a review of their qualifications and experience. Parents can view teacher profiles, qualifications and introduction videos before booking.</p>

      <h2>Where we operate</h2>
      <p>TutorPro English is run as a sole proprietorship based in the Philippines and teaches families worldwide. Our teaching base is Manila time (UTC+8), and lesson times shown in your dashboard are automatically converted to your own local timezone.</p>

      <h2>Pricing you can see up front</h2>
      <p>Our rates are published on the website, not hidden behind a sales call. Classes start from $8 per 25-minute lesson, and every new family can take a free first class before paying anything. Full terms are on our <a href="/refund-policy.html">Refund Policy</a> page.</p>

      <h2>Talk to us</h2>
      ${contactLinksHtml}
    `,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About TutorPro English',
      url: `${SITE}/about.html`,
      mainEntity: {
        '@type': 'EducationalOrganization',
        name: 'TutorPro English',
        url: SITE,
        logo: `${SITE}/assets/tutorpro-panda-logo.webp`,
        areaServed: 'Worldwide',
        sameAs: [CONTACT.facebook],
      },
    },
  },

  {
    slug: 'contact.html',
    title: 'Contact TutorPro English — Support for Parents and Teachers',
    description: 'Contact TutorPro English about lessons, bookings, refunds or teaching opportunities. Reach us on Messenger, Facebook or live chat inside the site.',
    heading: 'Contact us',
    body: `
      <p>Questions about lessons, bookings, payments or teaching with us? We are happy to help — and you will always be talking to a real person.</p>

      <div class="card">
        <h3>Parents and students</h3>
        <p>Ask about the free first class, choosing a plan, rescheduling, or anything about your child's progress.</p>
        ${contactLinksHtml}
      </div>

      <div class="card">
        <h3>Teachers</h3>
        <p>Interested in teaching with TutorPro English? Apply through the teacher registration on our <a href="/">homepage</a>. Applications include a short recorded teaching interview.</p>
      </div>

      <div class="card">
        <h3>Refunds and billing</h3>
        <p>Please read our <a href="/refund-policy.html">Refund Policy</a> first — it covers most situations. If you still need help, message us with your parent account email and the lesson dates concerned.</p>
      </div>

      <h2>Response times</h2>
      <p>We aim to reply to messages within 1 business day, and to acknowledge refund requests within 2 business days.</p>

      <h2>Our details</h2>
      <p>TutorPro English is operated as a sole proprietorship based in the Philippines, delivering online English lessons to families worldwide. Teaching base: Manila time (UTC+8).</p>
    `,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact TutorPro English',
      url: `${SITE}/contact.html`,
      mainEntity: {
        '@type': 'Organization',
        name: 'TutorPro English',
        url: SITE,
        sameAs: [CONTACT.facebook],
        contactPoint: [{
          '@type': 'ContactPoint',
          contactType: 'customer support',
          availableLanguage: ['English', 'Filipino'],
          areaServed: 'Worldwide',
          url: CONTACT.messenger,
        }],
      },
    },
  },
]

async function run() {
  await mkdir(publicDir, { recursive: true })
  for (const spec of PAGES) {
    await writeFile(resolve(publicDir, spec.slug), page(spec), 'utf8')
    console.log(`[legal] wrote public/${spec.slug}`)
  }
  console.log(`[legal] ${PAGES.length} trust pages generated.`)
}

run()
