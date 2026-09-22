/**
 * Curriculum and skill pages — the queries with no landing page.
 *
 * WHY THESE SIX
 * -------------
 * "Cambridge" and "Oxford" appear on roughly every page of this site, and
 * not one page targeted either in its title, URL or H1. A parent searching
 * "Cambridge English classes for kids" had nothing to land on: Google ranks
 * pages, not sites, and a phrase scattered through body copy does not
 * compete with a page built around it.
 *
 * The four skill pages cover the other half of how parents search. They do
 * not type "online English lessons" when they have a specific worry — they
 * type "help my child with English reading" or "English grammar for kids".
 * Each of those is a different problem with a different answer.
 *
 * WHY THESE ARE NOT DOORWAY PAGES
 * -------------------------------
 * The line between a topic cluster and a doorway farm is whether each page
 * answers a question the others do not. Reading is about decoding and
 * comprehension; speaking is about talk time and confidence; grammar is
 * about accuracy; vocabulary is about retention. They share a brand and a
 * price table and nothing else — the substance of each is genuinely
 * different, and they link to each other rather than sitting in isolation.
 *
 * ACCURACY
 * --------
 * Course book names are the ones already published elsewhere on the site:
 * Power Up, Global English, Family and Friends, Oxford Phonics World, THiNK.
 * We are not a Cambridge or Oxford examination centre and these pages say so
 * plainly, because implying accreditation we do not hold would be the single
 * most damaging claim on the site. Prices come from scripts/pricing.mjs.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STANDARD, PACKAGE, PACKAGE_MIN } from './pricing.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

const SITE = 'https://www.tutorpro.site'
const UPDATED = '22 September 2026'
const MESSENGER = 'https://m.me/526047974195321'
const WHATSAPP = 'https://wa.me/639625284849'

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const PAGES = [
  /* ---------------------------------------------------------------- */
  {
    slug: 'cambridge-english.html',
    label: 'Cambridge English',
    title: 'Cambridge English Classes for Kids Online | TutorPro English PH',
    description:
      `Online one-to-one lessons using Cambridge English course books for children aged 4\u201316, including Power Up and Global English. From $${PACKAGE} per lesson, free first class.`,
    heading: 'Cambridge English classes for children',
    lede:
      'Lessons built on published Cambridge course books, taught one-to-one and matched to your child\u2019s actual level rather than their school year.',
    body: `
        <h2>Which Cambridge materials we teach from</h2>
        <p>Our English lessons use two Cambridge primary and lower-secondary courses:</p>
        <div class="grid">
          <div class="card"><h3>Power Up</h3><p>A primary course built around activity and repetition. Strong on speaking practice and on making young learners comfortable producing language rather than only recognising it.</p></div>
          <div class="card"><h3>Global English</h3><p>Used with older primary and secondary learners. More reading, more extended writing, and topics that carry real content rather than only language drills.</p></div>
        </div>

        <h2>What a Cambridge-based lesson looks like</h2>
        <p>The teacher shares the course page on screen and works through it with your child, writing on it together. A typical lesson opens with warm-up conversation, introduces the unit's target language, practises it through reading or listening, then moves your child into using it freely — which is where the learning actually sticks.</p>
        <p>The course provides the backbone. The teacher adapts pace and emphasis to your child, which is the part a textbook alone cannot do.</p>

        <h2>How we choose the level</h2>
        <p>From what your child can currently do, not from their age or school year. The first lesson establishes this. A child placed a level too high spends the lesson lost; a level too low and they stop paying attention. Getting this right matters more than which course is used.</p>

        <h2>An honest note on what this is and is not</h2>
        <p>We teach <strong>from published Cambridge course books</strong>. We are not a Cambridge Assessment English examination centre, we are not an accredited Cambridge school, and we do not administer Cambridge exams such as Starters, Movers, Flyers, KET or PET.</p>
        <p>If your child needs to sit a Cambridge examination, you will need a registered exam centre for the test itself. Our lessons can support the English underneath it — the reading, speaking and grammar the exam assesses — but we would rather be clear about the distinction than let you assume otherwise.</p>

        <h2>Cambridge or Oxford?</h2>
        <p>Both are well-made and the difference matters less than most parents expect. We use whichever suits the child: Cambridge Power Up tends to suit learners who need more speaking repetition, while Oxford Family and Friends has a stronger phonics spine. Many children work across both. See our <a href="/oxford-english.html">Oxford English page</a> for the comparison.</p>`,
    faqs: [
      ['Do you offer Cambridge English classes for kids?', 'Yes. Our English lessons use published Cambridge course books, mainly Power Up for primary learners and Global English for older primary and secondary students.'],
      ['Are you an accredited Cambridge exam centre?', 'No. We teach from Cambridge course books but we are not a Cambridge Assessment English examination centre and we do not administer Cambridge exams. A registered centre is needed for the test itself.'],
      ['Can you prepare my child for Starters, Movers or Flyers?', 'We can build the underlying English those exams assess — reading, speaking, listening and grammar — as part of normal lessons. We do not run a dedicated exam preparation course or administer the exams.'],
      ['Which Cambridge course book will my child use?', 'Usually Power Up for primary learners or Global English for older primary and secondary. The teacher chooses the level after seeing what your child can already do.'],
      ['Do I need to buy the Cambridge books?', `No. Materials are included in the lesson price and shared on screen during the lesson. There is nothing extra to buy.`],
      ['How much do Cambridge-based lessons cost?', `The same as all our English lessons: $${STANDARD} per 25-minute lesson for 1\u20133 a week, or $${PACKAGE} each for ${PACKAGE_MIN} or more. The first class is free.`],
    ],
    related: [['oxford-english.html', 'Oxford English'], ['primary-english.html', 'Primary English'], ['secondary-english.html', 'Secondary English']],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'oxford-english.html',
    label: 'Oxford English',
    title: 'Oxford English Classes for Kids Online | TutorPro English PH',
    description:
      `Online one-to-one lessons using Oxford English course books for children aged 4\u201316, including Family and Friends, Oxford Phonics World and THiNK. From $${PACKAGE}.`,
    heading: 'Oxford English classes for children',
    lede:
      'Lessons built on published Oxford course books, taught one-to-one, with a strong phonics foundation for younger learners.',
    body: `
        <h2>Which Oxford materials we teach from</h2>
        <div class="grid">
          <div class="card"><h3>Oxford Phonics World</h3><p>Our starting point for the youngest children. Letter sounds, blending and decoding — the groundwork that makes reading feel automatic later rather than effortful.</p></div>
          <div class="card"><h3>Family and Friends</h3><p>A primary course with an unusually strong phonics and reading spine. Good for children who can speak a little but stall when they see the words written down.</p></div>
          <div class="card"><h3>THiNK</h3><p>For secondary learners. Discussion-led, with topics substantial enough that a teenager engages with the content rather than only the language.</p></div>
        </div>

        <h2>Why phonics matters more than it sounds</h2>
        <p>A child who has not been taught to decode is memorising word shapes, which works until roughly the point where texts get long. Then reading slows, comprehension drops, and it is often misread as a comprehension problem when it is a decoding one.</p>
        <p>Oxford Phonics World and the Family and Friends phonics strand address that directly, which is why we reach for them with children who guess at unfamiliar words rather than sounding them out.</p>

        <h2>How we choose the level</h2>
        <p>From what your child can actually do. The first lesson establishes it. School year is a poor guide — children arrive at wildly different points, especially in reading.</p>

        <h2>An honest note on what this is and is not</h2>
        <p>We teach <strong>from published Oxford University Press course books</strong>. We are not an Oxford-accredited school, we have no formal affiliation with Oxford University Press, and we do not administer Oxford examinations.</p>
        <p>The materials are excellent and widely used worldwide. Using them is not the same as being endorsed by their publisher, and we would rather say so.</p>

        <h2>Oxford or Cambridge?</h2>
        <p>Less different than most parents expect, and we choose by child rather than by brand. Oxford's Family and Friends has the stronger phonics backbone; Cambridge's Power Up leans harder on speaking repetition. Plenty of our learners use both. See the <a href="/cambridge-english.html">Cambridge English page</a>.</p>`,
    faqs: [
      ['Do you use Oxford English materials?', 'Yes. We teach from Oxford Phonics World, Family and Friends and THiNK, depending on the child\u2019s age and level.'],
      ['Are you affiliated with Oxford University Press?', 'No. We teach from published Oxford course books but we have no formal affiliation with Oxford University Press, and we are not an Oxford-accredited school.'],
      ['Which Oxford book suits a beginner?', 'Oxford Phonics World for the youngest or earliest readers, then Family and Friends as they move into reading sentences and short texts.'],
      ['Do you use Oxford materials for teenagers?', 'Yes. THiNK is our main Oxford course for secondary learners, with discussion-led topics suited to older students.'],
      ['Do I need to buy the Oxford books?', 'No. Materials are included in the lesson price and shared on screen during the lesson.'],
      ['Should I choose Oxford or Cambridge materials?', 'We choose based on your child rather than the brand. Oxford Family and Friends has a stronger phonics spine; Cambridge Power Up has more speaking repetition. Many children work across both.'],
    ],
    related: [['cambridge-english.html', 'Cambridge English'], ['english-reading.html', 'Reading'], ['primary-english.html', 'Primary English']],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'english-reading.html',
    label: 'Reading',
    title: 'English Reading Lessons for Children Online | TutorPro English PH',
    description:
      `One-to-one online English reading lessons for children aged 4\u201316: phonics, decoding, fluency and comprehension. Oxford and Cambridge materials from $${PACKAGE} per lesson.`,
    heading: 'English reading lessons for children',
    lede:
      'From letter sounds to understanding a full passage. Reading problems usually have a specific cause, and the fix depends on which one it is.',
    body: `
        <h2>Three different reading problems</h2>
        <p>Parents often describe the same symptom — "my child struggles with reading" — for three unrelated causes. Telling them apart is most of the work.</p>
        <div class="grid">
          <div class="card"><h3>Decoding</h3><p>The child cannot reliably turn letters into sounds, so unfamiliar words become guesses. Phonics is the fix, regardless of the child's age.</p></div>
          <div class="card"><h3>Fluency</h3><p>They can decode but it is slow and effortful. So much attention goes on the words that none is left for the meaning. Repeated reading of manageable text fixes this.</p></div>
          <div class="card"><h3>Comprehension</h3><p>They read accurately and fluently but cannot say what it meant. Usually a vocabulary gap or unfamiliarity with how questions are asked.</p></div>
        </div>

        <h2>How lessons address each</h2>
        <p><strong>Decoding.</strong> Oxford Phonics World and the Family and Friends phonics strand, taught in short focused bursts. A child who guesses at new words needs this even at ten years old.</p>
        <p><strong>Fluency.</strong> Reading aloud with the teacher at a level slightly below frustration point, repeated. Fluency comes from volume at the right level, not from struggling through hard text.</p>
        <p><strong>Comprehension.</strong> Reading passages together, then talking about them: what happened, why, and what the writer assumed you already knew. Question types are taught explicitly, because exam questions have patterns.</p>

        <h2>Why one-to-one helps reading specifically</h2>
        <p>Reading aloud in front of classmates is where many children learn to hate reading. One teacher, no audience, and a mistake that gets quietly corrected rather than publicly noticed — for a self-conscious reader that difference is often the whole problem.</p>

        <h2>What you will see at home</h2>
        <p>Written feedback after every lesson notes what was read, how fluently, and which words caused trouble. Those words are worth ten minutes at home before the next lesson — that small repetition is what moves reading forward fastest.</p>`,
    faqs: [
      ['My child can speak English but cannot read it. Is that normal?', 'Very common, especially for children who learned English by listening. It usually means decoding was never explicitly taught, and phonics work fixes it.'],
      ['At what age should reading lessons start?', 'Letter sounds can begin around 4 to 5. There is no upper limit — we regularly teach decoding to children of nine or ten who were never taught it properly.'],
      ['My child reads aloud well but does not understand it. Why?', 'That is a comprehension gap rather than a reading one, usually caused by unfamiliar vocabulary or not knowing how questions are structured. Both are teachable.'],
      ['Which reading materials do you use?', 'Oxford Phonics World and Family and Friends for early reading, and Cambridge Global English or Oxford THiNK for older learners working on comprehension.'],
      ['How long before reading improves?', 'It depends on the cause and on practice between lessons. Decoding often shows visible change within a few weeks; comprehension is slower because it depends on vocabulary, which accumulates.'],
      ['How much do reading lessons cost?', `$${STANDARD} per 25-minute lesson for 1\u20133 a week, or $${PACKAGE} each for ${PACKAGE_MIN} or more. The first class is free.`],
    ],
    related: [['english-speaking.html', 'Speaking'], ['english-vocabulary.html', 'Vocabulary'], ['oxford-english.html', 'Oxford English']],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'english-speaking.html',
    label: 'Speaking',
    title: 'English Speaking Classes for Kids Online | TutorPro English PH',
    description:
      `One-to-one online English speaking classes for children aged 4\u201316. Your child speaks for the whole lesson, not a fraction of it. From $${PACKAGE} per lesson, free first class.`,
    heading: 'English speaking classes for children',
    lede:
      'Speaking improves with talk time, and talk time is exactly what a group class cannot give. One teacher, one child, the whole lesson.',
    body: `
        <h2>The arithmetic of talk time</h2>
        <p>In a group class of six, a child speaks for roughly a sixth of the lesson at best — realistically less, because the teacher is also talking. One-to-one, they speak for most of it.</p>
        <p>Over a year that gap compounds into something very visible. Speaking is a skill rather than a body of knowledge: it improves with production, not with exposure. This is the clearest argument for one-to-one at any age.</p>

        <h2>The confidence problem</h2>
        <p>Most children who "cannot speak English" can, in fact, produce more than they show. What stops them is the risk of being wrong in front of other children. Remove the audience and a surprising amount of language turns out to be already there.</p>
        <p>Our teachers correct by recasting: the child says something imperfect, the teacher repeats it correctly as part of the conversation, and the lesson moves on. The child hears the right form without the interruption of being corrected.</p>

        <h2>What speaking practice actually involves</h2>
        <div class="grid">
          <div class="card"><h3>Warm-up conversation</h3><p>Every lesson opens with easy talk, so speaking starts before the child has time to get self-conscious about it.</p></div>
          <div class="card"><h3>Role-play and scenarios</h3><p>Ordering food, asking directions, describing a picture. Concrete situations produce more language than abstract prompts.</p></div>
          <div class="card"><h3>Extended answers</h3><p>Moving beyond yes and no. Giving a reason, then a second one — the skill most speaking exams actually test.</p></div>
          <div class="card"><h3>Pronunciation</h3><p>An AI coach scores individual words and plays the correct sound back, so your child can practise alone between lessons without needing you to judge it.</p></div>
        </div>

        <h2>Between lessons</h2>
        <p>Speaking needs frequency more than duration. Ten minutes of talking most days beats an hour once a week. The pronunciation practice in your child's dashboard is designed for exactly that, and needs no supervision from you.</p>`,
    faqs: [
      ['My child is too shy to speak. Will this work?', 'Shy children are the strongest case for one-to-one. Most of the fear is about other children hearing a mistake. With one teacher and no audience, most children start talking within a lesson or two.'],
      ['How is this different from a group speaking class?', 'Talk time. In a group of six, your child speaks for a fraction of the lesson. One-to-one, they speak for most of it, and speaking improves mainly through speaking.'],
      ['Do you correct every mistake?', 'No. Constant correction makes children stop talking. Teachers recast — repeating the sentence correctly as part of the conversation — so the right form is heard without the flow breaking.'],
      ['Can my child practise speaking between lessons?', 'Yes. The dashboard includes pronunciation practice that scores words and plays back the correct sound, so your child can work alone without needing you to assess it.'],
      ['What age can speaking lessons start?', 'From 4. Early lessons are mostly songs, games and single words, which is exactly the right form of speaking practice at that age.'],
      ['How much do speaking classes cost?', `$${STANDARD} per 25-minute lesson for 1\u20133 a week, or $${PACKAGE} each for ${PACKAGE_MIN} or more a week. The first class is free.`],
    ],
    related: [['english-reading.html', 'Reading'], ['english-tutor-for-shy-child.html', 'Help for a shy child'], ['english-vocabulary.html', 'Vocabulary']],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'english-grammar.html',
    label: 'Grammar',
    title: 'English Grammar Lessons for Kids Online | TutorPro English PH',
    description:
      `One-to-one online English grammar lessons for children aged 4\u201316. Tenses, articles and sentence structure taught in context, not as rules to memorise. From $${PACKAGE}.`,
    heading: 'English grammar lessons for children',
    lede:
      'Grammar taught through use rather than recitation. A child who can state the rule and still says it wrong has not learned it.',
    body: `
        <h2>Why memorising rules does not work</h2>
        <p>Plenty of children can recite when to use the present perfect and still say it wrong in conversation. Knowing a rule and using it under the pressure of real speech are different abilities, and only the second one matters.</p>
        <p>So grammar is taught in context: the structure appears in something being read or discussed, the teacher draws attention to it, and the child then uses it repeatedly in their own sentences. The rule is named, briefly — but the practice is where it becomes automatic.</p>

        <h2>Mistakes we see most often</h2>
        <div class="grid">
          <div class="card"><h3>Articles</h3><p><em>a</em>, <em>an</em> and <em>the</em> are genuinely hard, especially for children whose first language has no articles. Fixed with volume of exposure, not with rules.</p></div>
          <div class="card"><h3>Past tense forms</h3><p><em>goed</em> for <em>went</em>. This is actually a good sign — the child has internalised the regular rule and is over-applying it. Irregular forms need repetition.</p></div>
          <div class="card"><h3>Subject-verb agreement</h3><p><em>He go</em> instead of <em>He goes</em>. Very common, and usually persists long after the child can explain the rule.</p></div>
          <div class="card"><h3>Word order in questions</h3><p><em>Why you are late?</em> Question inversion needs explicit practice; it rarely fixes itself through exposure alone.</p></div>
          <div class="card"><h3>Prepositions</h3><p><em>in</em>, <em>on</em>, <em>at</em>. Largely arbitrary, so these are learned as phrases rather than derived from principles.</p></div>
          <div class="card"><h3>Present perfect</h3><p>Often the hardest for secondary learners, because many languages have no direct equivalent.</p></div>
        </div>

        <h2>Grammar by age</h2>
        <p><strong>Primary.</strong> Almost entirely implicit. Correct forms are modelled and practised; the terminology stays minimal. A seven-year-old does not need the words "auxiliary verb".</p>
        <p><strong>Secondary.</strong> More explicit. Older learners benefit from naming structures, especially when writing, and school exams expect the vocabulary.</p>

        <h2>Grammar for writing</h2>
        <p>Grammar errors matter most in writing, where they are permanent and visible. Secondary lessons work on sentence structure, linking ideas, and editing — reading your own work back and finding the errors yourself, which is the skill that outlasts any individual rule.</p>`,
    faqs: [
      ['Do you teach grammar rules directly?', 'Only as much as helps. Structures are taught in context and practised in the child\u2019s own sentences. Older learners get more explicit terminology because school and exams expect it.'],
      ['My child knows the rules but still makes mistakes. Why?', 'Knowing a rule and applying it in real time are different skills. The second only comes from repeated use, which is what lessons focus on.'],
      ['What are the most common grammar mistakes children make?', 'Articles, irregular past tense forms, subject-verb agreement, question word order and prepositions. Most are predictable and respond well to focused practice.'],
      ['At what age should grammar lessons start?', 'Grammar is present from the first lesson, but it is taught implicitly for younger children. Explicit grammar work usually suits learners from around 10 upwards.'],
      ['Can you help with school grammar homework?', 'Yes. Bring the homework or the school material and the teacher can work directly from it.'],
      ['How much do grammar lessons cost?', `$${STANDARD} per 25-minute lesson for 1\u20133 a week, or $${PACKAGE} each for ${PACKAGE_MIN} or more. The first class is free.`],
    ],
    related: [['english-vocabulary.html', 'Vocabulary'], ['secondary-english.html', 'Secondary English'], ['english-reading.html', 'Reading']],
  },

  /* ---------------------------------------------------------------- */
  {
    slug: 'english-vocabulary.html',
    label: 'Vocabulary',
    title: 'English Vocabulary Lessons for Kids Online | TutorPro English PH',
    description:
      `One-to-one online English vocabulary lessons for children aged 4\u201316. Themed word sets, spaced repetition and words met in context. From $${PACKAGE} per lesson.`,
    heading: 'English vocabulary lessons for children',
    lede:
      'Vocabulary is the quiet limiter on everything else — reading, writing and speaking all stall at the edge of the words a child knows.',
    body: `
        <h2>Why vocabulary determines comprehension</h2>
        <p>A reader who meets too many unknown words in a passage loses the thread, no matter how well they decode. This is why reading problems in older children so often turn out to be vocabulary problems wearing a disguise.</p>
        <p>The same limit applies to speaking. A child with ideas but not the words to express them sounds less capable than they are, which is discouraging in a way that compounds.</p>

        <h2>How words actually stick</h2>
        <div class="grid">
          <div class="card"><h3>Met in context</h3><p>Words learned inside a sentence that meant something are retained far better than words from a list.</p></div>
          <div class="card"><h3>Met repeatedly</h3><p>A word encountered once is a word forgotten. Our themed sets recur deliberately across lessons rather than moving on after one exposure.</p></div>
          <div class="card"><h3>Used, not just recognised</h3><p>Recognising a word is easy; producing it is the harder skill and the one that matters. Children are pushed to use new words in their own sentences the same lesson.</p></div>
          <div class="card"><h3>Spaced out</h3><p>Short review after a gap beats one long session. Words reappear in later lessons on purpose.</p></div>
        </div>

        <h2>Which words are worth teaching</h2>
        <p>Not the most exotic ones. The highest value sits in words that are common in books but rare in conversation — <em>however</em>, <em>describe</em>, <em>increase</em>, <em>although</em>. Children pick up everyday speech naturally; it is this written-register vocabulary that rarely arrives on its own and that school work depends on.</p>
        <p>For secondary students we add subject vocabulary: the words that recur across science, history and exam questions.</p>

        <h2>What you can do at home</h2>
        <p>Every lesson's feedback lists the words worth revising. Five minutes on those before the next lesson is the single highest-return thing a parent can do, and it needs no English knowledge from you — just ask your child what the word means and to use it in a sentence.</p>`,
    faqs: [
      ['How can I help my child build English vocabulary?', 'Review the words listed in each lesson\u2019s feedback for a few minutes before the next lesson. Ask what the word means and for a sentence using it. You do not need to speak English yourself to do this.'],
      ['Is it better to learn word lists or read more?', 'Both, but reading matters more. Words met in context are retained far better than words from a list. Lists help for deliberate review of words already encountered.'],
      ['How many new words should a child learn per lesson?', 'Fewer than most people expect. Around five to eight properly learned and reused beats twenty met once and forgotten.'],
      ['My child forgets words quickly. What helps?', 'Spacing. Short reviews at increasing intervals work far better than one long session, which is why our themed sets deliberately recur across later lessons.'],
      ['Do you teach subject vocabulary for school?', 'Yes, particularly for secondary students — the words that recur in science, history and exam questions.'],
      ['How much do vocabulary lessons cost?', `$${STANDARD} per 25-minute lesson for 1\u20133 a week, or $${PACKAGE} each for ${PACKAGE_MIN} or more. The first class is free.`],
    ],
    related: [['english-reading.html', 'Reading'], ['english-grammar.html', 'Grammar'], ['english-speaking.html', 'Speaking']],
  },
]

function schema(spec) {
  const url = `${SITE}/${spec.slug}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Course',
        '@id': `${url}#course`,
        name: spec.heading,
        description: spec.description,
        url,
        inLanguage: 'en',
        audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'Children aged 4-16' },
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
    ],
  }
}

function topicNav(current) {
  return `<nav class="pagenav" aria-label="Related topics">
          ${PAGES.filter((p) => p.slug !== current).map((p) => `<a href="/${p.slug}">${escapeHtml(p.label)}</a>`).join('\n          ')}
          <a href="/primary-english.html">Primary English</a>
          <a href="/secondary-english.html">Secondary English</a>
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
        <a class="btn btn--primary" href="/?book=1">Book a free first class</a>
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
          <a class="btn" href="/?book=1">Book a free first class</a>
          <a class="btn btn--quiet" href="${MESSENGER}" target="_blank" rel="noopener">Ask a question</a>
        </p>

        ${topicNav(spec.slug)}
${spec.body}

        <h2>Pricing</h2>
        <table>
          <tr><th>Plan</th><th>Classes per week</th><th>Price per class</th></tr>
          <tr><td>Weekly plan</td><td>1–3</td><td>$${STANDARD}</td></tr>
          <tr><td>Monthly package</td><td>${PACKAGE_MIN}–7</td><td>$${PACKAGE}</td></tr>
        </table>
        <p>A 50-minute lesson costs exactly double a 25-minute one. No registration fee, no materials fee, no platform fee. The first class is free and no card is required. See the <a href="/pricing.html">full pricing page</a>.</p>

        <h2>Questions parents ask</h2>
        ${spec.faqs.map(([q, a]) => `<div class="card"><h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p></div>`).join('\n        ')}

        <h2>Read next</h2>
        <nav class="pagenav" aria-label="Related pages">
          ${spec.related.map(([href, label]) => `<a href="/${href}">${escapeHtml(label)}</a>`).join('\n          ')}
        </nav>

        <h2>Start with a free class</h2>
        <p>Every new family gets one free lesson before choosing a plan. No card, no obligation.</p>
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
        <a href="/faq.html">FAQ</a>
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
    console.log(`[topic] wrote public/${spec.slug}`)
  }
  console.log(`[topic] ${PAGES.length} topic pages generated.`)
}

run().catch((error) => {
  console.error('[topic] failed:', error)
  process.exit(1)
})
