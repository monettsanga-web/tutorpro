/**
 * Educational resource centre — the hub and its first articles.
 *
 * WHY THIS MATTERS MORE THAN ANOTHER LANDING PAGE
 * -----------------------------------------------
 * Every page on this site so far answers "why buy from us". That only
 * captures parents already shopping for a tutor. Most parents with a worried
 * child are not there yet: they type "how can I help my child speak English
 * at home" long before they type "online English tutor".
 *
 * Articles catch that earlier moment. They are also the only page type other
 * sites ever link to — nobody links to a pricing page, but a genuinely useful
 * guide occasionally earns a mention in a parents' group. Given this site has
 * zero external backlinks, that matters.
 *
 * DELIBERATELY FEW
 * ----------------
 * Five articles, each properly written, rather than the thirty the brief
 * suggests. Thin auto-generated articles are actively harmful under Google's
 * helpful-content system: a pile of shallow posts drags down the pages that
 * are good. These are written to be useful on their own terms, with the
 * advice a parent can act on tonight, not as keyword vehicles.
 *
 * ACCURACY
 * --------
 * Advice reflects mainstream literacy and language-teaching practice. No
 * invented statistics, no studies cited that were not checked, no claimed
 * outcomes. Where something is genuinely uncertain, it says so.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STANDARD, PACKAGE, PACKAGE_MIN } from './pricing.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')
const blogDir = resolve(publicDir, 'blog')

const SITE = 'https://www.tutorpro.site'
const UPDATED = '22 September 2026'
const PUBLISHED = '2026-09-22'
const MESSENGER = 'https://m.me/526047974195321'

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const ARTICLES = [
  {
    slug: 'help-child-speak-english-at-home',
    category: 'Parent guides',
    title: 'How to Help Your Child Speak English at Home | TutorPro English PH',
    h1: 'How to help your child speak English at home',
    description:
      'Practical ways to build your child\u2019s spoken English at home, including what to do if you do not speak English yourself. Written for parents, not teachers.',
    lede:
      'You do not need to speak good English yourself to make a real difference to your child\u2019s speaking. What matters far more is frequency, and removing the fear of being wrong.',
    body: `
        <h2>Short and often beats long and rare</h2>
        <p>Ten minutes of English most days does more than one hour at the weekend. Language lives in recall, and recall needs repetition spaced across days. One long session gives your child a lot of exposure and then five days to forget it.</p>
        <p>If you can only manage one thing from this page, make it this: pick a slot that already exists in your day — the walk to school, the meal, the ten minutes before bed — and attach English to it. A habit tied to an existing routine survives; a new slot in the calendar usually does not.</p>

        <h2>If you do not speak English well</h2>
        <p>This worries parents far more than it should. You are not the teacher, and trying to be one often backfires. What you can do instead:</p>
        <ul>
          <li><strong>Ask your child to teach you.</strong> Explaining something is the strongest form of practice there is, and it reverses the usual power balance in a way children enjoy.</li>
          <li><strong>Ask about the lesson, in your own language.</strong> "What word did you learn today? What does it mean?" The recall is what counts, not the language you asked in.</li>
          <li><strong>Let them hear English without pressure.</strong> Cartoons in English with English subtitles. No quiz afterwards.</li>
        </ul>

        <h2>Why children go quiet, and what actually helps</h2>
        <p>Most children who "cannot speak English" can produce far more than they show. What stops them is the risk of being wrong in front of someone. Two things help more than anything else:</p>
        <p><strong>Do not correct every mistake.</strong> This is the hardest advice for parents to follow and the most important. A child corrected on every sentence stops producing sentences. If you want to correct, repeat what they said back correctly as part of the conversation and move on — they hear the right form without being stopped.</p>
        <p><strong>Respond to the meaning, not the grammar.</strong> If your child says "I goed to the park", answer "Did you? Who did you go with?" They get the correct form and, more importantly, they learn that talking gets a real response.</p>

        <h2>Things that work, in rough order of value</h2>
        <div class="grid">
          <div class="card"><h3>Narrate what you are doing</h3><p>Cooking, tidying, walking. Ordinary running commentary in English attaches words to things happening in front of them, which is how vocabulary sticks.</p></div>
          <div class="card"><h3>Read aloud together</h3><p>Even for older children. Take turns by paragraph. If they stumble on a word, supply it and carry on — stopping to analyse kills the flow.</p></div>
          <div class="card"><h3>Give them a real reason to speak</h3><p>Ordering in a restaurant, asking a shop assistant. One genuine exchange is worth twenty exercises.</p></div>
          <div class="card"><h3>Revisit the lesson words</h3><p>Five minutes on the words from the last lesson\u2019s feedback. Ask what it means, then for a sentence. You do not need to judge the answer.</p></div>
        </div>

        <h2>What to expect, honestly</h2>
        <p>Speaking improves unevenly. Children go quiet for weeks and then produce a whole sentence out of nowhere. That silent period is usually not stalling — it is often the point where they are absorbing before producing. Judge progress over months, not weeks, and try not to let your child see you measuring.</p>`,
    faqs: [
      ['How can I help my child speak English if I do not speak it well?', 'Ask your child to teach you words, ask about their lesson in your own language, and let them hear English without quizzing them. Your language level matters far less than the frequency of practice.'],
      ['How much English practice should a child do each day?', 'Ten to fifteen minutes on most days beats one long weekly session. Language depends on repeated recall, which needs spacing across days.'],
      ['Should I correct my child\u2019s English mistakes?', 'Sparingly. Constant correction makes children stop speaking. Repeat what they said in the correct form as part of your reply, then carry on with the conversation.'],
      ['My child understands English but will not speak it. Why?', 'Usually fear of being wrong rather than lack of ability. Silent periods are common and often precede a jump in output. One-to-one settings help because there is no audience.'],
    ],
    related: [['english-reading-activities-primary', 'Reading activities for primary students'], ['common-english-grammar-mistakes-children', 'Common grammar mistakes children make']],
    cta: ['english-speaking.html', 'See how our speaking lessons work'],
  },

  {
    slug: 'english-reading-activities-primary',
    category: 'Reading',
    title: 'English Reading Activities for Primary Students | TutorPro English PH',
    h1: 'English reading activities for primary students',
    description:
      'Reading activities that work for primary-age children, matched to the three things that actually go wrong: decoding, fluency and comprehension.',
    lede:
      'Before choosing an activity, work out which of the three reading problems your child actually has. The wrong activity for the wrong problem wastes everyone\u2019s time.',
    body: `
        <h2>First, identify the problem</h2>
        <p>Ask your child to read a short passage aloud, then ask them what it was about. What happens next tells you most of what you need:</p>
        <div class="grid">
          <div class="card"><h3>Stumbles on words</h3><p>Guesses at unfamiliar ones, or substitutes a word that looks similar. This is <strong>decoding</strong>.</p></div>
          <div class="card"><h3>Reads accurately but slowly</h3><p>Every word is correct but it is laboured, word by word. This is <strong>fluency</strong>.</p></div>
          <div class="card"><h3>Reads fluently, cannot summarise</h3><p>Sounds fine aloud but cannot say what it meant. This is <strong>comprehension</strong>.</p></div>
        </div>

        <h2>Activities for decoding</h2>
        <p><strong>Sound it out, do not guess.</strong> When your child meets an unknown word, cover all but the first letters and reveal gradually. This forces decoding instead of guessing from the shape.</p>
        <p><strong>Word families.</strong> <em>cat, hat, mat, sat</em>. Changing one sound at a time makes the pattern visible in a way isolated words never do.</p>
        <p><strong>Find the sound.</strong> Pick a sound for the day — say <em>sh</em> — and hunt for it on signs, packets and book covers. Two minutes, no materials needed.</p>

        <h2>Activities for fluency</h2>
        <p><strong>Re-read the same passage.</strong> Counter-intuitive but effective: three readings of the same short text builds fluency far better than three different texts. The child can finally stop decoding and start reading.</p>
        <p><strong>Echo reading.</strong> You read a sentence, they read the same sentence back. They copy your pacing and expression, which is the part silent practice never teaches.</p>
        <p><strong>Choose easier books than you think.</strong> Fluency is built below frustration level. A book where they know almost every word is doing more good than a "challenging" one.</p>

        <h2>Activities for comprehension</h2>
        <p><strong>Stop and predict.</strong> Pause mid-page: what do you think happens next, and why? This forces active engagement rather than passive decoding.</p>
        <p><strong>Ask "how do you know?"</strong> after any answer. It pushes them back into the text for evidence, which is exactly what comprehension questions in school demand.</p>
        <p><strong>Retell in their own words.</strong> Harder than it sounds and a very honest test. If they can only repeat sentences verbatim, they have not understood it.</p>

        <h2>A note on reading level</h2>
        <p>Most parents pick books that are slightly too hard, out of a reasonable wish to stretch their child. For reading practice specifically, easier is usually better: a child reading comfortably builds speed, confidence and appetite. Save the harder book for when you read it <em>to</em> them.</p>`,
    faqs: [
      ['How do I know if my child has a reading problem?', 'Have them read a short passage aloud and then summarise it. Stumbling on words points to decoding, slow but accurate reading points to fluency, and fluent reading with no recall points to comprehension.'],
      ['Should my child read books that are challenging?', 'Not for reading practice. Fluency is built below frustration level, where they know nearly every word. Use harder books for reading aloud to them instead.'],
      ['How long should a child read each day?', 'Ten to fifteen minutes of reading aloud, most days, is more useful than a long session once a week.'],
      ['My child reads aloud well but does not understand it. What should I do?', 'Work on comprehension directly: stop and predict, ask "how do you know?", and ask them to retell in their own words. Vocabulary is usually the underlying limit.'],
    ],
    related: [['help-child-speak-english-at-home', 'Helping your child speak English at home'], ['build-english-vocabulary-children', 'Building English vocabulary']],
    cta: ['english-reading.html', 'See how our reading lessons work'],
  },

  {
    slug: 'common-english-grammar-mistakes-children',
    category: 'Grammar',
    title: 'Common English Grammar Mistakes Children Make | TutorPro English PH',
    h1: 'Common English grammar mistakes children make',
    description:
      'The grammar mistakes children make most often, why each happens, and which ones are worth correcting. Some are signs of progress rather than problems.',
    lede:
      'Most children make the same handful of mistakes, and several of them are evidence that learning is going well rather than badly.',
    body: `
        <h2>Mistakes that are actually good signs</h2>
        <p><strong>"I goed to school."</strong> This looks like a step backwards and is the opposite. The child has worked out that English past tense adds <em>-ed</em> and is applying the rule to a verb that breaks it. A child who says <em>went</em> may have memorised it; a child who says <em>goed</em> has understood the system. The irregular forms come with exposure.</p>
        <p><strong>"He hurted me."</strong> Same thing — the rule applied where the language is inconsistent. Supply the correct form in your reply and move on.</p>

        <h2>Mistakes that need real practice</h2>
        <div class="grid">
          <div class="card"><h3>Articles: a, an, the</h3><p>Genuinely difficult, especially if your first language has no articles. Rules exist but are riddled with exceptions, so this improves through volume of exposure rather than explanation.</p></div>
          <div class="card"><h3>He go / He goes</h3><p>The third-person <em>-s</em> carries almost no meaning, so the brain drops it under pressure. Children often know this rule perfectly and still get it wrong while speaking.</p></div>
          <div class="card"><h3>Question word order</h3><p>"Why you are late?" Inversion needs explicit practice — it rarely corrects itself through listening alone.</p></div>
          <div class="card"><h3>Prepositions</h3><p><em>in, on, at</em> are largely arbitrary. Best learned as whole phrases: "on Monday", "at night". Do not look for logic that is not there.</p></div>
          <div class="card"><h3>Present perfect</h3><p>"I have seen him yesterday." Hard for secondary learners, especially where the first language has no equivalent tense.</p></div>
          <div class="card"><h3>Plural agreement</h3><p>"Three book." Straightforward to fix, but persists because it rarely blocks understanding.</p></div>
        </div>

        <h2>Which mistakes to correct</h2>
        <p>Not all of them, and certainly not all at once. A useful filter: correct what blocks understanding, and leave what does not for now.</p>
        <p>"Why you are late?" is perfectly understandable and can wait. A wrong preposition that changes the meaning cannot. Children can absorb one or two corrections in a conversation; beyond that they stop talking, which costs more than the errors do.</p>

        <h2>How to correct without discouraging</h2>
        <p>Recast rather than interrupt. The child says "She don't like it"; you reply "She doesn't like it? Why not?" The correct form is supplied, the conversation continues, and nobody has been told they are wrong.</p>
        <p>This is slower than direct correction and works considerably better, because the child stays willing to speak — which is the thing that actually drives improvement.</p>

        <h2>When grammar should become explicit</h2>
        <p>Around age ten or eleven. Younger children learn grammar best implicitly, through use. Older learners benefit from naming structures, partly because it makes writing easier to fix and partly because school exams expect the terminology.</p>`,
    faqs: [
      ['Why does my child say "goed" instead of "went"?', 'Because they have internalised the rule that past tense adds -ed and are applying it to an irregular verb. It is a sign of understanding, not a problem, and resolves with exposure.'],
      ['What are the most common English grammar mistakes children make?', 'Articles, third-person -s, question word order, prepositions, the present perfect and plural agreement. Most are predictable and respond to focused practice.'],
      ['Should I correct every grammar mistake?', 'No. Correct what blocks understanding and let the rest wait. Children absorb one or two corrections in a conversation before they stop speaking altogether.'],
      ['At what age should children learn grammar rules explicitly?', 'Around ten or eleven. Younger children learn grammar better through use than through rules.'],
    ],
    related: [['help-child-speak-english-at-home', 'Helping your child speak English at home'], ['build-english-vocabulary-children', 'Building English vocabulary']],
    cta: ['english-grammar.html', 'See how our grammar lessons work'],
  },

  {
    slug: 'build-english-vocabulary-children',
    category: 'Vocabulary',
    title: 'How to Build Your Child\u2019s English Vocabulary | TutorPro English PH',
    h1: 'How parents can help children build English vocabulary',
    description:
      'Which English words are worth teaching, how many a child can absorb at once, and why spacing matters more than effort. Practical guidance for parents.',
    lede:
      'Vocabulary quietly limits everything else — reading, writing and speaking all stop at the edge of the words a child knows. It is also the easiest thing for a parent to help with.',
    body: `
        <h2>Which words are worth the effort</h2>
        <p>Not the unusual ones. The highest-value vocabulary is the band of words common in books but rare in conversation: <em>however, describe, increase, although, compare, suggest</em>.</p>
        <p>Children pick up everyday speech naturally from the world around them. They rarely pick up this written-register vocabulary without help, and it is exactly what school texts and exam questions are built from. A child who knows these reads with far less friction.</p>

        <h2>How many words at a time</h2>
        <p>Fewer than most people expect. Five to eight words properly learned and reused beats twenty met once. A long list feels productive and mostly is not — the words that survive are the ones met repeatedly in different contexts.</p>

        <h2>Why spacing beats effort</h2>
        <p>Reviewing a word today, then in three days, then next week, produces far better retention than the same total time spent in one sitting. This is one of the most consistently supported findings in learning research, and it is easy to use at home: keep reviews short and let a gap open between them.</p>
        <p>Practically, that means five minutes before each lesson on the words from the last one — not a half-hour session on Sunday.</p>

        <h2>What works, at home</h2>
        <div class="grid">
          <div class="card"><h3>Use the feedback list</h3><p>Every lesson\u2019s feedback names the words worth revising. Ask what each means, then ask for a sentence. You do not need English yourself to do this.</p></div>
          <div class="card"><h3>Reading, above all</h3><p>Books expose children to words conversation never will. This is the single largest source of vocabulary growth and nothing substitutes for it.</p></div>
          <div class="card"><h3>Use the word yourself</h3><p>If your child learned <em>enormous</em>, use it during the week. Hearing it in a real context is worth several drills.</p></div>
          <div class="card"><h3>Word families, not single words</h3><p><em>decide, decision, decisive</em>. Learning the family multiplies the return on one piece of effort.</p></div>
        </div>

        <h2>Recognising is not knowing</h2>
        <p>A child can recognise a word in a sentence long before they can produce it. Both matter, but production is the harder skill and the one that shows up in speaking and writing. Always push for a sentence rather than a definition — that is the difference between a word they have met and a word they own.</p>

        <h2>How long this takes</h2>
        <p>Vocabulary accumulates slowly and then becomes suddenly visible. There is no shortcut and no dramatic week. The children who end up with strong vocabularies are almost always the ones who read regularly over years, which is unglamorous advice but the honest kind.</p>`,
    faqs: [
      ['How many new English words should a child learn each week?', 'Around five to eight properly learned and reused beats twenty met once. Retention depends on repeated encounters, not list length.'],
      ['Which English words should I teach my child first?', 'Words common in books but rare in speech, such as however, describe, increase and although. Everyday conversational words are usually picked up naturally.'],
      ['Are flashcards useful for vocabulary?', 'They help for reviewing words already met in context, particularly if reviews are spaced out. They are much weaker as a first encounter with a word.'],
      ['My child forgets new words quickly. What helps?', 'Spacing. Short reviews at increasing intervals work far better than one long session, and using the word in conversation during the week helps more than re-reading it.'],
    ],
    related: [['english-reading-activities-primary', 'Reading activities for primary students'], ['common-english-grammar-mistakes-children', 'Common grammar mistakes children make']],
    cta: ['english-vocabulary.html', 'See how our vocabulary lessons work'],
  },

  {
    slug: 'online-english-classes-what-parents-should-know',
    category: 'Parent guides',
    title: 'Online English Classes: What Parents Should Know | TutorPro English PH',
    h1: 'Online English classes: what parents should know before booking',
    description:
      'What to check before booking online English lessons for your child: class size, teacher vetting, feedback, refund terms and the questions worth asking any school.',
    lede:
      'Online lessons vary enormously in quality and the differences are not obvious from a website. These are the things worth checking before you pay anyone, including us.',
    body: `
        <h2>Group or one-to-one</h2>
        <p>This is the biggest single difference and it is often buried in the pricing page. In a group of six, your child speaks for roughly a sixth of the lesson at best. One-to-one, they speak for most of it.</p>
        <p>Group classes are cheaper for a reason and can work well for older, confident learners. For a child who is shy or behind, the talk time gap is usually decisive.</p>

        <h2>How teachers are selected</h2>
        <p>Ask directly: <em>did anyone watch this teacher actually teach before listing them?</em> Many marketplaces verify documents and nothing else, which is a much weaker check than it sounds. A recorded teaching sample reviewed by a human tells you far more than a certificate.</p>

        <h2>Whether you get feedback</h2>
        <p>Written feedback after every lesson, automatically, is the difference between knowing how your child is doing and guessing. Ask to see a real example. Feedback that says "great lesson, well done" is worth nothing; useful feedback names what was practised, what went wrong and what to revise.</p>

        <h2>The refund and cancellation terms</h2>
        <p>Check before paying, not after. Reasonable terms look like: cancel a lesson with some notice and the credit returns; unused credits refundable within a stated window. Be wary of large upfront packages with no refund route — that is where most complaints about online schools originate.</p>

        <h2>Whether the trial is genuinely free</h2>
        <p>A free trial that requires card details is a subscription with a delay. A genuine trial takes no payment information at all.</p>

        <h2>Questions worth asking any school</h2>
        <ul>
          <li>Is the business registered, and can I see the registration number?</li>
          <li>Is every lesson one-to-one, or are some group classes?</li>
          <li>Did a person review this teacher teaching before approving them?</li>
          <li>Do I get written feedback after every lesson? Can I see an example?</li>
          <li>What happens if we need to cancel? What is the refund policy?</li>
          <li>Can we change teacher if the match is wrong?</li>
          <li>Do we need to install software, or does it run in a browser?</li>
        </ul>

        <h2>How we answer these</h2>
        <p>For transparency, our own answers: registered with the Philippine DTI under Business Name Registration 5274092; every lesson one-to-one; every teacher passes a recorded teaching interview reviewed by a person; written feedback after every lesson; cancel 12 hours ahead and the credit returns; unused credits refundable within 14 days; changing teacher is a routine request; lessons run in the browser with nothing to install. The first class is free and takes no card details.</p>
        <p>We publish our <a href="/refund-policy.html">refund policy</a> and a <a href="/is-tutorpro-legitimate.html">legitimacy page</a> precisely so these are checkable rather than claimed.</p>`,
    faqs: [
      ['Are online English classes as good as in-person lessons?', 'For one-to-one language practice the evidence is that they compare well, partly because a screen-shared lesson keeps materials in front of the child. Group online classes are weaker, mainly because talk time drops.'],
      ['How do I know if an online English school is legitimate?', 'Check for a published business registration number, a stated refund policy, a genuinely free trial that takes no card details, and whether they explain how teachers are vetted.'],
      ['Should I choose group or one-to-one lessons?', 'One-to-one if your child is shy, behind, or needs speaking practice specifically. Group classes can suit older, confident learners and cost less.'],
      ['What should good lesson feedback contain?', 'What was practised, what went well, what needs work, and specific words or structures to revise. "Great lesson" tells you nothing.'],
    ],
    related: [['help-child-speak-english-at-home', 'Helping your child speak English at home'], ['english-reading-activities-primary', 'Reading activities for primary students']],
    cta: ['how-it-works.html', 'See exactly how our lessons work'],
  },
]

const CATEGORIES = [...new Set(ARTICLES.map((a) => a.category))]

function articleSchema(a) {
  const url = `${SITE}/blog/${a.slug}.html`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: a.h1,
        description: a.description,
        url,
        inLanguage: 'en',
        datePublished: PUBLISHED,
        dateModified: PUBLISHED,
        articleSection: a.category,
        author: { '@type': 'Organization', name: 'TutorPro English PH', url: SITE },
        publisher: {
          '@type': 'EducationalOrganization',
          name: 'TutorPro English PH',
          url: SITE,
          identifier: { '@type': 'PropertyValue', propertyID: 'DTI Business Name Registration', value: '5274092' },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        image: `${SITE}/assets/tutorpro-hero.webp`,
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: a.faqs.map(([q, ans]) => ({
          '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: ans },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumbs`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Learning resources', item: `${SITE}/blog/` },
          { '@type': 'ListItem', position: 3, name: a.h1, item: url },
        ],
      },
    ],
  }
}

function shell({ title, description, url, schema, crumbs, bodyHtml }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#321568" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="/assets/pwa-icon-192.png" />
    <link rel="alternate" hreflang="en" href="${url}" />
    <link rel="alternate" hreflang="x-default" href="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="TutorPro English PH" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${SITE}/assets/tutorpro-hero.webp" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${SITE}/assets/tutorpro-hero.webp" />
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
    <link rel="stylesheet" href="/assets/pages.css" />
  </head>
  <body>
    <header class="site-head">
      <div class="wrap site-head__inner">
        <a class="brand" href="/"><img src="/assets/tutorpro-panda-logo.webp" alt="TutorPro English PH" width="40" height="40" />TutorPro English PH</a>
        <a class="btn btn--primary" href="/?book=1">Book a free first class</a>
      </div>
    </header>
    <main>
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb">${crumbs}</nav>
${bodyHtml}
        <p><small>Last reviewed: ${UPDATED}</small></p>
      </div>
    </main>
    <footer>
      <div class="wrap">
        <a href="/">Home</a>
        <a href="/blog/">Learning resources</a>
        <a href="/free-trial.html">Free trial</a>
        <a href="/how-it-works.html">How it works</a>
        <a href="/pricing.html">Pricing</a>
        <a href="/faq.html">FAQ</a>
        <a href="/contact.html">Contact</a>
        <p>© ${new Date().getFullYear()} TutorPro English PH · DTI Business Name Registration 5274092 · One-to-one online classes for children worldwide, taught from the Philippines.</p>
      </div>
    </footer>
  </body>
</html>
`
}

function renderArticle(a) {
  const url = `${SITE}/blog/${a.slug}.html`
  const body = `        <p class="pill">${escapeHtml(a.category)}</p>
        <h1>${escapeHtml(a.h1)}</h1>
        <p class="lede">${escapeHtml(a.lede)}</p>
${a.body}

        <h2>Questions parents ask</h2>
        ${a.faqs.map(([q, ans]) => `<div class="card"><h3>${escapeHtml(q)}</h3><p>${escapeHtml(ans)}</p></div>`).join('\n        ')}

        <h2>Read next</h2>
        <nav class="pagenav" aria-label="Related articles">
          ${a.related.map(([slug, label]) => `<a href="/blog/${slug}.html">${escapeHtml(label)}</a>`).join('\n          ')}
          <a href="/blog/">All learning resources</a>
        </nav>

        <h2>Lessons with a teacher</h2>
        <p>If your child would benefit from working on this with someone, every new family gets one free lesson. One-to-one, no card required, from $${PACKAGE} per lesson afterwards.</p>
        <p>
          <a class="btn" href="/?book=1">Book a free first class</a>
          <a class="btn btn--quiet" href="/${a.cta[0]}">${escapeHtml(a.cta[1])}</a>
        </p>`
  return shell({
    title: a.title,
    description: a.description,
    url,
    schema: articleSchema(a),
    crumbs: `<a href="/">Home</a> › <a href="/blog/">Learning resources</a> › <span>${escapeHtml(a.category)}</span>`,
    bodyHtml: body,
  })
}

function renderHub() {
  const url = `${SITE}/blog/`
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${url}#page`,
        name: 'English learning resources for parents',
        description: 'Practical guides for parents helping a child learn English: speaking, reading, grammar and vocabulary.',
        url,
        inLanguage: 'en',
        isPartOf: { '@type': 'WebSite', name: 'TutorPro English PH', url: SITE },
      },
      {
        '@type': 'ItemList',
        '@id': `${url}#list`,
        itemListElement: ARTICLES.map((a, i) => ({
          '@type': 'ListItem', position: i + 1, name: a.h1, url: `${SITE}/blog/${a.slug}.html`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumbs`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Learning resources', item: url },
        ],
      },
    ],
  }
  const cards = CATEGORIES.map((cat) => {
    const items = ARTICLES.filter((a) => a.category === cat)
    return `        <h2>${escapeHtml(cat)}</h2>
        <div class="grid">
          ${items.map((a) => `<div class="card"><h3><a href="/blog/${a.slug}.html">${escapeHtml(a.h1)}</a></h3><p>${escapeHtml(a.lede)}</p></div>`).join('\n          ')}
        </div>`
  }).join('\n\n')

  const body = `        <h1>English learning resources for parents</h1>
        <p class="lede">Practical guides for helping a child learn English at home. Written for parents rather than teachers, with advice you can use tonight — no jargon and nothing you need to buy.</p>

${cards}

        <h2>Where to start</h2>
        <p>If your child is reluctant to speak, start with <a href="/blog/help-child-speak-english-at-home.html">helping your child speak English at home</a>. If reading is the worry, <a href="/blog/english-reading-activities-primary.html">reading activities for primary students</a> begins by identifying which of the three reading problems you are actually dealing with.</p>

        <h2>Lessons with a teacher</h2>
        <p>These guides work on their own. If you would like a teacher involved, every new family gets one free one-to-one lesson — no card required, and lessons are $${STANDARD} each afterwards, or $${PACKAGE} for ${PACKAGE_MIN} or more a week.</p>
        <p>
          <a class="btn" href="/?book=1">Book a free first class</a>
          <a class="btn btn--quiet" href="${MESSENGER}" target="_blank" rel="noopener">Ask a question</a>
        </p>`

  return shell({
    title: 'English Learning Resources for Parents | TutorPro English PH',
    description: 'Practical guides for parents helping a child learn English at home: speaking, reading, grammar and vocabulary. Written for parents, not teachers.',
    url,
    schema,
    crumbs: '<a href="/">Home</a> › <span>Learning resources</span>',
    bodyHtml: body,
  })
}

async function run() {
  await mkdir(blogDir, { recursive: true })
  await writeFile(resolve(blogDir, 'index.html'), renderHub(), 'utf8')
  console.log('[blog] wrote public/blog/index.html')
  for (const a of ARTICLES) {
    await writeFile(resolve(blogDir, `${a.slug}.html`), renderArticle(a), 'utf8')
    console.log(`[blog] wrote public/blog/${a.slug}.html`)
  }
  console.log(`[blog] hub + ${ARTICLES.length} articles generated.`)
}

run().catch((error) => {
  console.error('[blog] failed:', error)
  process.exit(1)
})
