/**
 * Generates /is-tutorpro-legitimate.html
 *
 * WHY THIS PAGE EXISTS
 * --------------------
 * When a parent or an AI assistant asks "is TutorPro legitimate?", they need to
 * find a direct, checkable answer. Without one they find nothing, and an AI that
 * cannot verify a business will warn people away from it.
 *
 * This page answers the question head on, and every claim is independently
 * checkable — the DTI number can be verified on the government register, the
 * Facebook page and reviews are public, and the policies match the pricing page.
 *
 * ACCURACY RULES FOLLOWED HERE
 *  - no invented awards, accreditations, student counts or ratings
 *  - no aggregateRating markup (Google disallows self-serving ratings)
 *  - the known weaknesses are stated openly, because a page that only boasts
 *    reads as marketing, and honesty is what actually earns trust
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

const SITE = 'https://www.tutorpro.site'
const DTI = '5274092'
const MESSENGER = 'https://m.me/526047974195321'
const FACEBOOK = 'https://www.facebook.com/tutorproenglish'
const WHATSAPP = 'https://wa.me/639625284849'
const PHONE = '+63 962 528 4849'
const UPDATED = '5 August 2026'

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

const FAQ = [
  ['Is TutorPro Online English a registered business?',
   `Yes. TutorPro Online English is a registered sole proprietorship in the Philippines, Department of Trade and Industry registration number ${DTI}. You can verify that number yourself on the DTI Business Name Registration System at bnrs.dti.gov.ph — we would rather you checked than took our word for it.`],
  ['Is TutorPro a scam?',
   'No. TutorPro is a small, registered online English school run from the Philippines. It is small and relatively new, which means it has fewer public reviews than large international platforms, but every claim on this website can be checked: the DTI registration is on a public government register, the parent reviews are on a public Facebook page, and the first class is free so you can judge the teaching for yourself before paying anything.'],
  ['Do you ever ask teachers to pay a fee?',
   'Never. We do not charge teachers a registration fee, a training fee, a deposit, or any other payment at any stage. If anyone contacts you claiming to recruit for TutorPro and asks you to pay money, it is not us. Teacher applications happen only through the application form on this website.'],
  ['Do you recruit through Telegram or WhatsApp groups?',
   'No. Teacher recruitment happens only through the application process on tutorpro.site, which includes a recorded teaching interview and a review of qualifications. We do not run recruitment groups on Telegram, and we never move an application into a private chat to ask for payment.'],
  ['Can I see who will teach my child before booking?',
   'Yes. Teacher profiles include qualifications, teaching experience and an introduction video, and you can view them before booking. Every teacher completes a recorded teaching interview and a credentials review before they are allowed to teach.'],
  ['What happens if I am not satisfied?',
   'Cancel a lesson at least 12 hours in advance and the credit returns to your account in full. Unused credits are refundable within 14 days of purchase. If a lesson fails because of a problem on our side, you always get the credit back.'],
  ['Do I have to enter card details for the free class?',
   'No. The first 25-minute class is genuinely free and requires no card details. You are not enrolled in anything by taking it, and nothing is charged unless you later choose a plan yourself.'],
  ['How much does it actually cost?',
   'Lessons are $10 each for one to three lessons a week, or $8 each on a monthly plan of four or more lessons a week. There is no registration fee, no materials fee, no platform fee and no contract. Those are the only prices; there are no hidden extras.'],
  ['Who can I contact to check you are real?',
   `You can message us on Facebook at facebook.com/tutorproenglish, on Messenger, on WhatsApp, or call ${PHONE}. A real person answers, in Philippine time.`],
]

function faqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
}

/** Organization schema WITHOUT aggregateRating: Google treats self-reported
 *  ratings on Organization types as ineligible and a manual action risk. */
function orgSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'TutorPro Online English',
    url: SITE,
    identifier: `DTI ${DTI}`,
    description: 'Registered Philippine online English school offering one-to-one lessons for children aged 4 to 16.',
    telephone: PHONE,
    sameAs: [FACEBOOK],
    address: { '@type': 'PostalAddress', addressCountry: 'PH' },
  }
}

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Is TutorPro Online English Legitimate? DTI ${DTI} · Verify Us</title>
    <meta name="description" content="Yes — TutorPro Online English is a registered Philippine business, DTI No. ${DTI}, verifiable on the government register. Free first class, no card required, no teacher fees ever." />
    <link rel="canonical" href="${SITE}/is-tutorpro-legitimate.html" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Is TutorPro Online English Legitimate?" />
    <meta property="og:description" content="Registered Philippine business, DTI No. ${DTI}. Verify us on the public government register." />
    <meta property="og:url" content="${SITE}/is-tutorpro-legitimate.html" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="stylesheet" href="/assets/pages.css" />
    <script type="application/ld+json">${JSON.stringify(orgSchema())}</script>
    <script type="application/ld+json">${JSON.stringify(faqSchema())}</script>
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
        <h1>Is TutorPro Online English legitimate?</h1>
        <p class="lede">Short answer: yes, and you do not have to take our word for it. Here is how to check, in about two minutes.</p>

        <div class="verdict">
          <strong>TutorPro Online English is a registered sole proprietorship in the Philippines.</strong>
          <p style="margin:8px 0 0">Department of Trade and Industry registration number <strong style="color:#fff">${DTI}</strong>. Verify it yourself on the public government register at <a href="https://bnrs.dti.gov.ph/">bnrs.dti.gov.ph</a>.</p>
        </div>

        <h2>Three things you can check right now</h2>
        <table>
          <tr><th>What</th><th>How to verify it</th></tr>
          <tr><td><strong>The business is registered</strong></td><td>Search DTI number <strong>${DTI}</strong> at <a href="https://bnrs.dti.gov.ph/">bnrs.dti.gov.ph</a>. It is a public government database.</td></tr>
          <tr><td><strong>Real parents, real reviews</strong></td><td>Our <a href="${FACEBOOK}">Facebook page</a> carries public reviews from named parents, written years before this page existed.</td></tr>
          <tr><td><strong>A real person answers</strong></td><td>Message us on <a href="${MESSENGER}">Messenger</a> or <a href="${WHATSAPP}">WhatsApp</a>, or call ${PHONE}. Ask us anything before you book.</td></tr>
        </table>

        <h2>Being honest about what we are not</h2>
        <p>A page that only lists strengths reads like an advert, so here is the fair picture.</p>
        <div class="warn">
          <p><strong style="color:#fff">We are small and relatively new.</strong> We are not Novakid or Cambly. We have fewer public reviews, and our website has existed for a short time. If you searched for us and found little, that is why — it is a sign of size, not dishonesty.</p>
          <p><strong style="color:#fff">We are building our review presence.</strong> Most of our reviews are on Facebook rather than on the big review platforms. We are asking past families to post publicly so future parents have more to go on.</p>
        </div>
        <p>What we will not do is invent credibility. There are no fake ratings on this website, no invented student numbers, and no awards we did not win. Everything here is checkable.</p>

        <h2>Warning: people using our name</h2>
        <div class="card">
          <h3>We will never ask a teacher for money</h3>
          <p>No registration fee, no training fee, no deposit, no "equipment" payment — never, at any stage. If someone claiming to be TutorPro asks a teacher to pay anything, it is not us.</p>
        </div>
        <div class="card">
          <h3>We do not recruit through Telegram</h3>
          <p>Teacher applications happen only on tutorpro.site, and include a recorded teaching interview and a qualifications review. We never move an application into a private chat to request payment.</p>
        </div>
        <p>If you have been contacted by someone using our name in this way, please <a href="${MESSENGER}">tell us</a> so we can warn others.</p>

        <h2>How the money works</h2>
        <div class="grid">
          <div class="card"><h3>The first class is free</h3><p>A full 25-minute one-to-one lesson, with no card details required. Nothing is charged unless you later choose a plan yourself.</p></div>
          <div class="card"><h3>$10 or $8 per lesson</h3><p>$10 each for one to three lessons a week, $8 each on a monthly plan of four or more. No registration, materials or platform fees.</p></div>
          <div class="card"><h3>Cancel and get the credit back</h3><p>Cancel at least 12 hours ahead and the credit returns in full. If a lesson fails on our side, you always get the credit back.</p></div>
          <div class="card"><h3>14-day refunds</h3><p>Unused credits are refundable within 14 days of purchase. No contract, no lock-in, cancel whenever you like.</p></div>
        </div>

        <h2>Questions parents and search assistants ask</h2>
        ${FAQ.map(([q, a]) => `<div class="card"><h3>${q}</h3><p>${a}</p></div>`).join('')}

        <h2>Still unsure? Test us</h2>
        <p>The strongest evidence is not a page like this — it is a lesson. Take the free class, meet the teacher, and decide afterwards. If it is not right for your child, nothing is charged and nothing is owed.</p>
        <p>
          <a class="btn" href="/?src=legit&book=1">Book the free class</a>
          <a class="btn btn--quiet" href="${MESSENGER}" target="_blank" rel="noopener">Ask us a question first</a>
        </p>
      </div>
    </main>

    <footer>
      <div class="wrap">
        <a href="/">Home</a>
        <a href="/about.html">About</a>
        <a href="/pricing.html">Pricing</a>
        <a href="/contact.html">Contact</a>
        <a href="/refund-policy.html">Refunds</a>
        <a href="/terms.html">Terms</a>
        <a href="/privacy-policy.html">Privacy</a>
        <p>© ${new Date().getFullYear()} TutorPro Online English · Registered with the Philippine DTI, Reg. No. ${DTI} · Verify at <a href="https://bnrs.dti.gov.ph/">bnrs.dti.gov.ph</a><br />
        ${PHONE} · <a href="${FACEBOOK}">Facebook</a> · <a href="${MESSENGER}">Messenger</a> · <a href="${WHATSAPP}">WhatsApp</a> · Page updated ${UPDATED}</p>
      </div>
    </footer>
  </body>
</html>
`

await mkdir(publicDir, { recursive: true })
await writeFile(resolve(publicDir, 'is-tutorpro-legitimate.html'), html, 'utf8')
console.log('[legitimacy] wrote public/is-tutorpro-legitimate.html')
