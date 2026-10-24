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
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$7 on 4 or more. No registration fee and no materials fee.',
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
    pay: 'Families in China can pay by QR code: RMB25 per 25-minute lesson plus an RMB5 processing fee per session. Send the receipt to the administrator and the credits are added once it is checked. Debit and credit cards, charged in US dollars, are also accepted.',
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
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$7 on 4 or more. Your bank converts at its own rate; there is no separate fee from us.',
    faqs: [
      ['Does the teacher speak Italian?', 'No. Teachers are Filipino and teach entirely in English, which is deliberate: a child who knows the teacher cannot switch to Italian stops waiting to be rescued and starts trying.'],
      ['What time are lessons available in Italy?', 'The earliest after-school slots are the most reliable. 15:00 to 17:00 Italian time is 21:00 to 23:00 in Manila, which teachers do cover; later Italian evenings are much harder.'],
      ['Can lessons prepare my child for a Cambridge exam?', 'Teachers can focus on the speaking and listening skills those exams test, using Cambridge course books. TutorPro is not a Cambridge exam centre and does not register candidates — your school or a local centre does that.'],
      ['Is this suitable for a complete beginner?', 'Yes. Lessons for younger children start with phonics, songs and first words, and the teacher begins from what your child can already do.'],
      ['How do I pay from Italy?', 'By debit or credit card, in US dollars. Prices are published on the site: US$8 per 25-minute lesson, or US$7 on four or more a week.'],
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
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$7 on 4 or more. Your bank converts at its own rate; we add nothing on top.',
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
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$7 on 4 or more. Your bank converts at its own rate.',
    faqs: [
      ['Does the teacher speak Turkish?', 'No. Teachers are Filipino and teach entirely in English, which pushes a child to produce the language rather than translate their way around it.'],
      ['Can lessons help with LGS English?', 'Teachers can work on the reading, vocabulary and grammar the exam tests, and on the speaking that the exam does not test but school and life do.'],
      ['What time are lessons available in Turkey?', 'Manila is 5 hours ahead. Early after-school times are best: 16:00 in Istanbul is 21:00 for the teacher.'],
      ['My child is shy about speaking. Will this help?', 'That is the most common reason families come to us. One-to-one means no classmates listening, and mistakes are corrected quietly as they go.'],
      ['How do I pay from Turkey?', 'By debit or credit card, in US dollars, at the published rates. There is no registration fee and no charge for books.'],
    ],
  },

  {
    slug: 'online-english-classes-germany',
    situations: ['A Grundschule child meeting English for the first time in class 3', 'A Gymnasium pupil whose grades slip as the texts get harder', 'A family replacing costly Nachhilfe hours with focused one-to-one time'],
    country: 'Germany',
    adjective: 'German',
    title: 'Online English Classes for Kids in Germany | TutorPro',
    description: 'Live one-to-one online English classes for children in Germany, aged 4-16. After-school slots in your time zone, card payment, free first class.',
    h1: 'Online English classes for children in Germany',
    lede: 'One teacher, one child, live on video. German after-school hours fall in the Philippine evening, which is exactly when our night-shift teachers work.',
    timezone: 'Germany runs on CET (UTC+1, UTC+2 in summer). Manila is 6-7 hours ahead, so a 16:00 lesson in Berlin is 22:00 or 23:00 for the teacher - precisely the window our night-shift teachers open, which is why European after-school slots exist at all.',
    school: 'English becomes a compulsory subject in most German states from class 3 or 5, and Gymnasium expectations rise quickly. Lessons can follow the school book, or build the speaking confidence German classrooms rarely have time to practise.',
    instead: 'Nachhilfe usually means a small group after an already long school day, with travel on top. These lessons are one-to-one, from home, and the whole 25 or 50 minutes belongs to your child.',
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$7 on 4 or more. No registration fee and no materials fee.',
    faqs: [
      ['How do I pay from Germany?', 'By debit or credit card, in US dollars, at the published rates: US$8 per 25-minute lesson on 1 to 3 lessons a week, US$7 on 4 or more. There is no registration fee.'],
      ['What time are lessons in German time?', 'After-school and early-evening slots. Every time is shown in your own zone when you book, and night-shift teachers cover the European evening on purpose.'],
      ['Is the first class really free?', 'Yes, and no card is required. It is a full lesson with a real teacher.'],
    ],
  },
  {
    slug: 'online-english-classes-france',
    situations: ['A CP or CE1 pupil starting English at primary school', 'A collégien whose spoken English lags far behind the written work', 'A family wanting real conversation beyond soutien scolaire'],
    country: 'France',
    adjective: 'French',
    title: 'Online English Classes for Kids in France | TutorPro',
    description: 'Live one-to-one online English classes for children in France, aged 4-16. Evening slots in French time, card payment, and a free first class.',
    h1: 'Online English classes for children in France',
    lede: 'One teacher, one child, live on video. French after-school hours sit in the Philippine evening, so night-shift teachers keep those slots open.',
    timezone: 'France runs on CET (UTC+1, UTC+2 in summer). Manila is 6-7 hours ahead, so a 17:00 lesson in Paris is late evening for the teacher - covered by teachers who choose the night shift.',
    school: 'English starts in primary school (CP) and counts heavily in the brevet and the lycée, where oral expression is usually the weakest skill. Lessons give the speaking time a thirty-pupil class cannot.',
    instead: 'Soutien scolaire and cours particuliers are usually groups or generalist tutors. These lessons are one-to-one with a specialist English teacher, from home, with written feedback after every class.',
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$7 on 4 or more. No registration fee and no materials fee.',
    faqs: [
      ['How do I pay from France?', 'By debit or credit card, in US dollars, at the published rates. Your bank converts at its own rate; we add nothing on top.'],
      ['What time are lessons in French time?', 'After-school and early-evening slots, shown in your own zone when you book. The European evening is our night shift, so the slots exist.'],
      ['Is the first class really free?', 'Yes, and no card is required. It is a full lesson with a real teacher.'],
    ],
  },
  {
    slug: 'online-english-classes-spain',
    situations: ['A Primaria child in a bilingual programme asked to do more in English', 'A Secundaria or Bachillerato student preparing B1 or B2 speaking exams', 'A family juggling academia schedules with everything else'],
    country: 'Spain',
    adjective: 'Spanish',
    title: 'Online English Classes for Kids in Spain | TutorPro',
    description: 'Live one-to-one online English classes for children in Spain, aged 4-16. After-school slots in peninsular time, card payment, free first class.',
    h1: 'Online English classes for children in Spain',
    lede: 'One teacher, one child, live on video. Peninsular after-school hours fall in the Philippine evening - the night-shift window our teachers open on purpose.',
    timezone: 'Peninsular Spain runs on CET (UTC+1, UTC+2 in summer); the Canary Islands one hour earlier. Manila is 6-7 hours ahead of the peninsula, so after-school slots sit in the Philippine evening and are bookable.',
    school: 'Many Spanish regions teach subjects bilingually from Primaria, and Cambridge-style B1 and B2 exams are common in Secundaria. Lessons can target the speaking papers those exams reward.',
    instead: 'An academia teaches in groups on a fixed timetable, with travel on top. These lessons are one-to-one, at your hour, and the whole session belongs to your child.',
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$7 on 4 or more. No registration fee and no materials fee.',
    faqs: [
      ['How do I pay from Spain?', 'By debit or credit card, in US dollars, at the published rates. There is no registration fee and no charge for books.'],
      ['What time are lessons in Spanish time?', 'After-school and early-evening slots, shown in your own zone when you book, including Canary Islands time.'],
      ['Is the first class really free?', 'Yes, and no card is required. It is a full lesson with a real teacher.'],
    ],
  },
  {
    slug: 'online-english-classes-portugal',
    situations: ['A 3rd or 4th year pupil starting English at school', 'A preparatory or secondary student whose oral work lags the written', 'A family outside Lisbon or Porto with few local options'],
    country: 'Portugal',
    adjective: 'Portuguese',
    title: 'Online English Classes for Kids in Portugal | TutorPro',
    description: 'Live one-to-one online English classes for children in Portugal, aged 4-16. After-school slots in Lisbon time, card payment, free first class.',
    h1: 'Online English classes for children in Portugal',
    lede: 'One teacher, one child, live on video. Lisbon after-school hours sit at the far edge of the Philippine evening - night-shift teachers keep them open.',
    timezone: 'Portugal runs on WET (UTC+0, UTC+1 in summer). Manila is 7-8 hours ahead, so a 17:00 lesson in Lisbon approaches midnight for the teacher - night-shift hours, and bookable.',
    school: 'English is compulsory from the 3rd year and continues through secondary, where oral exams count. One-to-one practice is the fastest way to close the gap between writing and speaking.',
    instead: 'Explicadores are often generalists shared between subjects and students. These lessons are specialist English, one child per session, from home.',
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$7 on 4 or more. No registration fee and no materials fee.',
    faqs: [
      ['How do I pay from Portugal?', 'By debit or credit card, in US dollars, at the published rates. Your bank converts at its own rate; we add nothing on top.'],
      ['What time are lessons in Lisbon time?', 'After-school and early-evening slots, shown in your own zone when you book.'],
      ['Is the first class really free?', 'Yes, and no card is required. It is a full lesson with a real teacher.'],
    ],
  },
  {
    slug: 'online-english-classes-netherlands',
    situations: ['A group 7 or 8 pupil starting English late but living in a fluent country', 'A VMBO, HAVO or VWO student who writes well yet hesitates to speak', 'An expat family keeping English strong alongside a Dutch school'],
    country: 'Netherlands',
    adjective: 'Dutch',
    title: 'Online English Classes for Kids: Netherlands | TutorPro',
    description: 'Live one-to-one online English classes for children in the Netherlands, aged 4-16. After-school slots in your time zone, card payment, free first class.',
    h1: 'Online English classes for children in the Netherlands',
    lede: 'One teacher, one child, live on video. Dutch after-school hours fall in the Philippine evening - the night-shift window our teachers open on purpose.',
    timezone: 'The Netherlands runs on CET (UTC+1, UTC+2 in summer). Manila is 6-7 hours ahead, so after-school slots sit in the Philippine evening and are bookable every week.',
    school: 'Dutch children start English around age 10 and quickly outgrow beginner material, so the real need is speaking confidence and exam-level precision rather than basics. Lessons pitch to that.',
    instead: 'Bijles helps with schoolwork but rarely gives sustained conversation. These lessons are speaking-first, one-to-one, with written feedback after every class.',
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$7 on 4 or more. No registration fee and no materials fee.',
    faqs: [
      ['How do I pay from the Netherlands?', 'By debit or credit card, in US dollars, at the published rates. There is no registration fee and no charge for books.'],
      ['What time are lessons in Dutch time?', 'After-school and early-evening slots, shown in your own zone when you book.'],
      ['Is the first class really free?', 'Yes, and no card is required. It is a full lesson with a real teacher.'],
    ],
  },
  {
    slug: 'online-english-classes-greece',
    situations: ['A primary pupil studying English alongside a frontistirio', 'A Gymnasio or Lykeio student preparing B1, B2 or Proficiency speaking', 'A family on an island with limited local choices'],
    country: 'Greece',
    adjective: 'Greek',
    title: 'Online English Classes for Kids in Greece | TutorPro',
    description: 'Live one-to-one online English classes for children in Greece, aged 4-16. After-school slots in Athens time, card payment, and a free first class.',
    h1: 'Online English classes for children in Greece',
    lede: 'One teacher, one child, live on video. Athens after-school hours sit in the Philippine late evening - night-shift teachers keep those slots open.',
    timezone: 'Greece runs on EET (UTC+2, UTC+3 in summer). Manila is 5-6 hours ahead, so a 17:00 lesson in Athens is 22:00 or 23:00 for the teacher - night-shift hours, and bookable.',
    school: 'Greek children often study English from a young age and sit international B1, B2 and Proficiency exams in their teens. Lessons target the speaking and writing those exams score.',
    instead: 'A frontistirio teaches in groups on a fixed schedule. These lessons are one-to-one, at your hour, and every minute is your child speaking or writing with feedback.',
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$7 on 4 or more. No registration fee and no materials fee.',
    faqs: [
      ['How do I pay from Greece?', 'By debit or credit card, in US dollars, at the published rates. Your bank converts at its own rate; we add nothing on top.'],
      ['What time are lessons in Greek time?', 'After-school and early-evening slots, shown in your own zone when you book.'],
      ['Is the first class really free?', 'Yes, and no card is required. It is a full lesson with a real teacher.'],
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
        <a class="btn btn--primary" href="/?book=1">Register now</a>
      </div>
    </header>

    <main>
      <nav class="crumbs" aria-label="Breadcrumb">
        <a href="/">Home</a> › <a href="/online-english-classes-for-kids">Online English classes</a> › <span>${escapeHtml(entry.country)}</span>
      </nav>

      <section class="page-hero page-hero--playful">
        <span class="ph-float ph-float--star1" aria-hidden="true">✦</span>
        <span class="ph-float ph-float--star2" aria-hidden="true">⭐</span>
        <span class="ph-float ph-float--book" aria-hidden="true">📚</span>
        <span class="ph-float ph-float--bubble" aria-hidden="true">💬</span>
        <span class="ph-float ph-float--rainbow" aria-hidden="true">🌈</span>
        <span class="ph-float ph-float--pencil" aria-hidden="true">✏️</span>
        <div class="wrap ph-grid">
          <div class="ph-copy">
            <span class="ph-kicker">For families in ${escapeHtml(entry.country)} · Ages 4–16</span>
            <h1>${escapeHtml(entry.h1)}</h1>
            <p class="lede">${escapeHtml(entry.lede)}</p>
            ${entry.nativeLink ? `<p><a class="text-link ph-native" href="${entry.nativeLink[0]}">${escapeHtml(entry.nativeLink[1])}</a></p>` : ''}
            <ul class="ph-badges">
              <li>✔ Qualified teachers</li>
              <li>✨ Interactive lessons</li>
              <li>🏠 Learn from home</li>
              <li>🎁 Free trial available</li>
            </ul>
            <p class="cta-row">
              <a class="btn btn--primary ph-cta" href="/?book=1">Register now →</a>
              <a class="btn ph-cta-ghost" href="/pricing.html">See prices in US dollars</a>
            </p>
          </div>
          <div class="ph-visual" aria-hidden="false">
            <img src="/assets/hero-filipino-classroom.png" alt="A happy Filipino teacher teaching an excited child on a laptop, surrounded by friendly animal mascots, books and stars" width="1024" height="1024" loading="eager" decoding="async" />
            <span class="ph-orbit ph-orbit--abc">ABC</span>
            <span class="ph-orbit ph-orbit--star">✦</span>
            <div class="ph-card">
              <strong>🎉 First class free!</strong>
              <span>No card · no commitment · your time zone</span>
            </div>
          </div>
        </div>
        <svg class="ph-wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0,40 C240,90 480,0 720,35 C960,70 1200,10 1440,45 L1440,90 L0,90 Z" fill="#ffffff"/></svg>
      </section>

      <section class="filipino-band">
        <div class="wrap wrap--narrow">
          <span class="kicker">Our teachers</span>
          <h2>Near-native Filipino English teachers</h2>
          <p>Every TutorPro class is taught live by a Filipino teacher who speaks English at a near-native level. English is an official language of the Philippines - used in its schools, government and business - so our teachers have learnt, studied and worked in English all their lives, and teach it with a clear, neutral accent that children around the world find easy to follow.</p>
          <ul class="filipino-band__points">
            <li><strong>Clear, near-native accent.</strong> Filipino English is known for being easy to understand - the reason families across Europe, the Middle East and Asia choose Filipino teachers for their children.</li>
            <li><strong>Warm, patient classrooms.</strong> Filipino teaching culture prizes patience and encouragement, which is exactly what a shy or beginner child needs before they will speak.</li>
            <li><strong>Checked before they meet your child.</strong> Every teacher passes a recorded teaching interview and a credential check before their first class.</li>
          </ul>
          <p class="cta-row"><a class="btn btn--primary" href="/teachers.html">Meet the teachers</a></p>
        </div>
      </section>

      <section class="trial-band" id="trial">
        <div class="wrap">
          <div class="trial-band__grid">
            <div class="trial-band__register">
              <span class="kicker">Register your child</span>
              <h2>Create your parent account</h2>
              <p>About two minutes: your name, a real email address, and your child's age and school year. Then you book the free first class yourself - in your own time zone, with no card and no commitment.</p>
              <ul class="trial-band__points">
                <li><strong>Free first class.</strong> A full lesson with a real teacher before you pay anything.</li>
                <li><strong>Your time zone, your slots.</strong> Every slot is shown in your local time when you book.</li>
                <li><strong>Feedback after every lesson.</strong> Written notes in your parent dashboard, plus homework and practice words.</li>
              </ul>
              <p class="cta-row"><a class="btn btn--primary" href="/?book=1">Register & book the free class</a></p>
            </div>
            <div class="trial-band__contact">
              <span class="kicker">Prefer to talk first?</span>
              <h2>Ask us to book the trial for you</h2>
              <form class="trial-form" id="trial-form">
                <label>Parent name<input name="parentName" required maxlength="80" placeholder="Your name" autocomplete="name" /></label>
                <label>Email address<input type="email" name="email" required maxlength="120" placeholder="you@example.com" autocomplete="email" /></label>
                <label>Child's age<select name="age">${Array.from({ length: 13 }, (_, i) => `<option value="${i + 4}">${i + 4} years old</option>`).join('')}</select></label>
                <label>Preferred days or times<input name="times" maxlength="120" placeholder="e.g. weekends after 4pm" /></label>
                <label>Anything we should know? (optional)<textarea name="message" maxlength="600" placeholder="Shy beginner, exam prep, sibling to schedule together…"></textarea></label>
                <button class="btn btn--primary" type="submit">Send trial request</button>
                <p class="trial-form__note" id="trial-note">Your request lands in our support inbox and we reply to your email, usually within one day. No mailing lists, ever.</p>
              </form>
            </div>
          </div>
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
            <a class="btn btn--primary" href="/?book=1">Register now</a>
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
      <section class="country-cloud">
        <div class="wrap wrap--narrow">
          <span class="kicker">Families join from</span>
          <h2>European and worldwide countries welcome</h2>
          <p>Wherever you are, lessons are shown in your own time zone, payment is by debit or credit card, and the first class is free.</p>
          <ul>
            ${COUNTRIES.filter((other) => other.slug !== entry.slug).map((other) => `<li><a href="/${other.slug}.html">${escapeHtml(other.country)}</a></li>`).join('\n            ')}
          </ul>
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

    <script>
      (function () {
        var form = document.getElementById('trial-form');
        if (!form) return;
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          var note = document.getElementById('trial-note');
          var button = form.querySelector('button[type="submit"]');
          var fields = new FormData(form);
          var parentName = String(fields.get('parentName') || '').trim();
          var email = String(fields.get('email') || '').trim();
          if (parentName.length < 2 || !/^\S+@\S+\.\S+$/.test(email)) {
            note.textContent = 'Please add your name and a valid email address so we can answer you.';
            return;
          }
          var times = String(fields.get('times') || '').trim() || 'flexible';
          var extra = String(fields.get('message') || '').trim();
          var firstMessage = 'Trial request from the ${escapeHtml(entry.country)} page. Child age ' + String(fields.get('age') || '') + '. Preferred times: ' + times + '.' + (extra ? ' Notes: ' + extra : '');
          button.disabled = true;
          note.textContent = 'Sending your request…';
          fetch('https://losmkvvwzijipqrlelyt.supabase.co/rest/v1/rpc/create_support_conversation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'sb_publishable_icTkeremuFxwHOy52_gXfQ_x3IibhLL',
              'Authorization': 'Bearer sb_publishable_icTkeremuFxwHOy52_gXfQ_x3IibhLL'
            },
            body: JSON.stringify({ parent_name: parentName, parent_email: email, visitor_language: 'en', first_message: firstMessage })
          }).then(function (response) {
            if (!response.ok) throw new Error('request failed');
            form.reset();
            button.disabled = false;
            note.textContent = 'Thank you - your trial request is in our inbox. We will reply to ' + email + ', usually within one day.';
          }).catch(function () {
            button.disabled = false;
            note.innerHTML = 'Sending failed. Email us directly at <a href="mailto:sejongenglish@yahoo.com">sejongenglish@yahoo.com</a>, or register above and book the free class yourself.';
          });
        });
      })();
    </script>
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
