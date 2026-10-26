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

/* UI STRINGS ------------------------------------------------------------
   Every label the template writes, in English and in Simplified Chinese.
   A country entry opts into a language with `ui: 'zh'`; everything else
   stays exactly as it was. The owner's reason: Chinese parents should
   not have to read English to enrol their child. */
const UI = {
  en: {
    lang: 'en',
    visitorLang: 'en',
    registerNow: 'Register now',
    crumbHome: 'Home',
    crumbClasses: 'Online English classes',
    kicker: (c) => `For families in ${c} · Ages 4–16`,
    badges: ['✔ Qualified teachers', '✨ Interactive lessons', '🏠 Learn from home', '🎁 Free trial available'],
    ctaRegister: 'Register now →',
    ctaPrices: 'See prices in US dollars',
    heroAlt: 'A happy Filipino teacher teaching an excited child on a laptop, surrounded by friendly animal mascots, books and stars',
    cardTitle: '🎉 First class free!',
    cardSub: 'No card · no commitment · your time zone',
    teachKicker: 'Our teachers',
    teachH2: 'Near-native Filipino English teachers',
    teachP: 'Every TutorPro class is taught live by a Filipino teacher who speaks English at a near-native level. English is an official language of the Philippines - used in its schools, government and business - so our teachers have learnt, studied and worked in English all their lives, and teach it with a clear, neutral accent that children around the world find easy to follow.',
    teachPts: [
      ['Clear, near-native accent.', 'Filipino English is known for being easy to understand - the reason families across Europe, the Middle East and Asia choose Filipino teachers for their children.'],
      ['Warm, patient classrooms.', 'Filipino teaching culture prizes patience and encouragement, which is exactly what a shy or beginner child needs before they will speak.'],
      ['Checked before they meet your child.', 'Every teacher passes a recorded teaching interview and a credential check before their first class.'],
    ],
    teachCta: 'Meet the teachers',
    regKicker: 'Register your child',
    regH2: 'Create your parent account',
    regP: 'About two minutes: your name, a real email address, and your child\'s age and school year. Then you book the free first class yourself - in your own time zone, with no card and no commitment.',
    regPts: [
      ['Free first class.', 'A full lesson with a real teacher before you pay anything.'],
      ['Your time zone, your slots.', 'Every slot is shown in your local time when you book.'],
      ['Feedback after every lesson.', 'Written notes in your parent dashboard, plus homework and practice words.'],
    ],
    regCta: 'Register & book the free class',
    talkKicker: 'Prefer to talk first?',
    talkH2: 'Ask us to book the trial for you',
    fName: 'Parent name', fNamePh: 'Your name',
    fEmail: 'Email address',
    fAge: "Child's age", fAgeSuf: 'years old',
    fTimes: 'Preferred days or times', fTimesPh: 'e.g. weekends after 4pm',
    fNotes: 'Anything we should know? (optional)', fNotesPh: 'Shy beginner, exam prep, sibling to schedule together…',
    fSubmit: 'Send trial request',
    fNote: 'Your request lands in our support inbox and we reply to your email, usually within one day. No mailing lists, ever.',
    hTimes: (c) => `Lesson times from ${c}`,
    schedP: 'Slots appear in your own local time when you book.',
    schedLink: 'How scheduling works across time zones',
    hSchool: (c) => `English at school in ${c}`,
    hDiff: 'How this differs from what you have locally',
    hWho: (c) => `Who we are usually asked to help in ${c}`,
    coverP: 'Lessons cover speaking, listening, reading, pronunciation, grammar and vocabulary, weighted towards whichever of those your child actually needs.',
    coverLink: 'How the classes work',
    hTeach: 'Who teaches your child',
    teachWhoP: 'Teachers live in the Philippines and teach in English. Every applicant records a teaching interview we watch in full, and their credentials are checked before they are given a student — ',
    teachWhoLink: 'their profiles and introduction videos are public',
    teachWhoP2: (c, dti) => `. TutorPro Online English is registered in the Philippines, DTI ${dti}. We say so plainly rather than implying a presence in ${c} that we do not have.`,
    hPay: (c) => `Paying from ${c}`,
    payExtra: ' First class free, no card. ',
    payLink: 'Cancellation and refunds',
    faqH: (a) => `Questions from ${a} parents`,
    faqCta2: 'Ask us a question first',
    hOther: 'Other countries we teach from the Philippines',
    cloudKicker: 'Families join from',
    cloudH2: 'European and worldwide countries welcome',
    cloudP: 'Wherever you are, lessons are shown in your own time zone, payment is by debit or credit card, and the first class is free.',
    foot: ['Home', 'Online English classes', 'Pricing', 'Teachers', 'FAQ', 'Contact'],
    footCopy: (y, dti) => `© ${y} TutorPro Online English · DTI Business Name Registration ${dti} · One-to-one online classes for children worldwide, taught from the Philippines.`,
    jsInvalid: 'Please add your name and a valid email address so we can answer you.',
    jsSending: 'Sending your request…',
    jsFirst: (c) => `Trial request from the ${c} page. Child age `,
    jsTimes: '. Preferred times: ',
    jsNotes: ' Notes: ',
    jsOk1: 'Thank you - your trial request is in our inbox. We will reply to ',
    jsOk2: ', usually within one day.',
    jsFail: 'Sending failed. Email us directly at ',
    jsFail2: ', or register above and book the free class yourself.',
    courseName: (c) => `Online English classes for children in ${c}`,
    offerDesc: 'First 25-minute one-to-one class free. Lessons from US$6 afterwards.',
  },
  zh: {
    lang: 'zh-Hans',
    visitorLang: 'zh',
    registerNow: '立即注册',
    crumbHome: '首页',
    crumbClasses: '在线英语课',
    kicker: (c) => `面向${c}家庭 · 4–16岁`,
    badges: ['✔ 持证教师', '✨ 互动课堂', '🏠 在家上课', '🎁 免费试听'],
    ctaRegister: '立即注册 →',
    ctaPrices: '查看美元价格',
    heroAlt: '一位开心的菲律宾老师正通过笔记本电脑教一个兴奋的孩子,周围是友好的动物吉祥物、书本和星星',
    cardTitle: '🎉 首节课免费!',
    cardSub: '无需绑卡 · 无需合约 · 您的时区',
    teachKicker: '我们的老师',
    teachH2: '接近母语水平的菲律宾英语老师',
    teachP: 'TutorPro 的每一节课都由菲律宾老师实时视频授课,他们的英语接近母语水平。英语是菲律宾的官方语言——学校、政府和商业都使用英语——因此我们的老师从小到大用英语学习、工作和生活,口音清晰中立,世界各地的孩子都容易听懂。',
    teachPts: [
      ['清晰、接近母语的口音。', '菲律宾英语以易懂著称——这正是欧洲、中东和亚洲家庭为孩子选择菲律宾老师的原因。'],
      ['温暖、耐心的课堂。', '菲律宾教学文化重视耐心与鼓励,这正是害羞或零基础的孩子敢于开口之前最需要的。'],
      ['见到您的孩子之前先过筛查。', '每位老师在带第一个学生之前,都要通过录制试讲面试和资质审查。'],
    ],
    teachCta: '认识我们的老师',
    regKicker: '为孩子注册',
    regH2: '创建家长账户',
    regP: '大约两分钟:您的姓名、真实邮箱、孩子的年龄和年级。之后您就可以用自己的时区自行预约免费首节课——无需绑卡、无需承诺。',
    regPts: [
      ['免费首节课。', '在您付费之前,先上一节有真实老师的完整课。'],
      ['您的时区,您的时段。', '预约时所有时段都显示为您的本地时间。'],
      ['每节课后都有反馈。', '家长仪表盘里有书面反馈,外加作业和练习词。'],
    ],
    regCta: '注册并预约免费课',
    talkKicker: '想先沟通一下?',
    talkH2: '让我们帮您预约试听',
    fName: '家长姓名', fNamePh: '您的姓名',
    fEmail: '邮箱地址',
    fAge: '孩子年龄', fAgeSuf: '岁',
    fTimes: '期望的上课时间', fTimesPh: '例如:周末下午4点后',
    fNotes: '还有其他想告诉我们的吗?(选填)', fNotesPh: '害羞零基础、备考、兄弟姐妹一起排课……',
    fSubmit: '发送试听申请',
    fNote: '您的申请会进入我们的支持收件箱,我们会回复您的邮箱,通常在一天之内。绝不发送营销邮件。',
    hTimes: (c) => `来自${c}的上课时间`,
    schedP: '预约时,时段会显示为您的本地时间。',
    schedLink: '跨时区排课是如何工作的',
    hSchool: (c) => `${c}学校的英语课`,
    hDiff: '与您本地辅导班的不同',
    hWho: (c) => `在${c},我们通常帮助这样的孩子`,
    coverP: '课程覆盖说、听、读、发音、语法和词汇,并侧重您的孩子真正需要的那几项。',
    coverLink: '课程如何进行',
    hTeach: '谁教您的孩子',
    teachWhoP: '老师居住在菲律宾,用英语授课。每位申请者都要录制一段我们会完整观看的试讲面试,资质审查通过后才会被分配学生——',
    teachWhoLink: '他们的简介和介绍视频公开可看',
    teachWhoP2: (c, dti) => `。TutorPro Online English 注册于菲律宾,DTI 登记号 ${dti}。我们如实说明,而不是暗示在${c}设有我们并不存在的机构。`,
    hPay: (c) => `从${c}如何付款`,
    payExtra: ' 首节课免费,无需绑卡。 ',
    payLink: '取消与退款',
    faqH: (a, c) => `${c}家长常见问题`,
    faqCta2: '先问我们一个问题',
    hOther: '我们从菲律宾授课的其他国家',
    cloudKicker: '学员来自',
    cloudH2: '欢迎欧洲及世界各国的家庭',
    cloudP: '无论您在哪里,课程都显示为您的本地时间,付款支持借记卡或信用卡,第一节课免费。',
    foot: ['首页', '在线英语课', '价格', '老师', '常见问题', '联系我们'],
    footCopy: (y, dti) => `© ${y} TutorPro Online English · 菲律宾 DTI 商业登记 ${dti} · 面向全球儿童的一对一在线课程,由菲律宾授课。`,
    jsInvalid: '请填写您的姓名和有效邮箱,以便我们回复您。',
    jsSending: '正在发送……',
    jsFirst: (c) => `来自${c}页面的试听申请。孩子年龄 `,
    jsTimes: '。期望时间: ',
    jsNotes: ' 备注: ',
    jsOk1: '谢谢您——试听申请已进入我们的收件箱。我们会回复 ',
    jsOk2: ',通常在一天之内。',
    jsFail: '发送失败。请直接发邮件至 ',
    jsFail2: ',或在上方注册并自行预约免费课。',
    courseName: (c) => `${c}儿童在线英语一对一课程`,
    offerDesc: '首节25分钟一对一课程免费,之后每节最低6美元。',
  },
}

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const COUNTRIES = [
  {
    slug: 'online-english-classes-korea',
    situations: ["A 초등학교 pupil who scores well on written tests and will not answer aloud", "A 중학교 student whose school English suddenly got harder this year", "A family cutting back on hagwon hours but not on English"],
    country: 'South Korea',
    countryZh: '韩国',
    adjective: 'Korean',
    title: 'Online English Classes for Kids in South Korea | TutorPro',
    description: 'Live one-to-one online English classes for Korean children aged 4-16. Only one hour from Seoul time, taught by experienced teachers. Free first class.',
    h1: 'Online English classes for children in South Korea',
    lede: 'One teacher, one child, live on video. Seoul is one hour ahead of our teachers, so an after-school lesson is an after-school lesson for everybody.',
    nativeLink: ['/kr/', 'Read this page in Korean (한국어)'],
    timezone: 'KST is UTC+9, one hour ahead of Manila. A 17:00 lesson in Seoul is 16:00 for the teacher — ordinary working hours on both sides, which is why Korean families can book the 16:00–21:00 slots that are hardest to get elsewhere.',
    school: 'English is a compulsory subject from 3rd grade of 초등학교 (elementary school), and the jump in difficulty at 중학교 (middle school) is where many families start looking for help. Lessons can follow your child\u2019s school textbook directly, or work on speaking, which school classes rarely have time for.',
    instead: 'A 학원 (hagwon) class usually means one teacher and a roomful of children, where a quiet child can go a whole session without speaking English aloud. Travel is on top. These lessons are one-to-one, from home, and the whole 25 or 50 minutes belongs to your child.',
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$6 on 4 or more. No registration fee and no materials fee.',
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
    ui: 'zh',
    situations: ['需要拼音和阅读打底、还没面对初中压力的小学生', '书面英语强、开口交流弱的孩子', '想要一位跨境视频不卡顿的英语老师的家庭'],
    country: 'China',
    countryZh: '中国',
    adjective: 'Chinese',
    title: '中国儿童在线英语一对一课程 | TutorPro',
    description: '面向中国4–16岁孩子的实时一对一在线英语课。同时区、腾讯会议备用、人民币二维码付款。经验丰富的老师,首节课免费。',
    h1: '中国儿童在线英语一对一课程',
    lede: '一位老师、一个孩子、实时视频——与您家庭处于同一时区;跨境视频不稳定时,可切换腾讯会议。',
    nativeLink: ['/cn/', 'Read this page in Chinese (中文)'],
    timezone: '中国和菲律宾同为 UTC+8,完全没有时差。孩子放学后方便的任何时段,老师也正好方便。',
    school: '英语从小学起就是必修课,进入初中后压力逐渐加大。课程可以配合课本,补充大班课难以做到的口语练习,也可以单独训练阅读、拼音和会话。',
    instead: '课程在我们自己的浏览器教室中进行,内置低带宽模式。如果跨境视频不稳定,可向管理员索取 VooV / 腾讯会议 链接——课程内容完全相同。',
    pay: '中国家庭可用二维码付款:每节25分钟课 RMB25,另加每次 RMB5 手续费。把回执发给管理员,核验后即加课时。也接受以美元结算的借记卡和信用卡。',
    faqs: [
      ['从中国上课,视频连接稳定吗?', '教室内置低带宽模式,并备用 VooV / 腾讯会议 链接。一种不顺畅的家庭,通常另一种就没问题。'],
      ['可以用人民币付款吗?', '可以。二维码付款为每节25分钟课 RMB25,另加每次 RMB5 手续费。发送回执后,管理员核验即加课时。'],
      ['可以用中文沟通吗?', '可以。网站的支持聊天用中文回复,管理员也用中文回复。课程本身用英语授课。'],
      ['网站有中文版吗?', '有——中文页面在 /cn/,信息相同,为简体中文。'],
      ['上课时间有哪些?', '中国与菲律宾同为 UTC+8,没有时差,放学后的任何时段都可以。'],
    ],
  },
  {
    slug: 'online-english-classes-italy',
    situations: ["A scuola primaria pupil who is losing confidence in English before it has started", "A ragazzo preparing for a Cambridge qualification who needs speaking practice, not more grammar drills", "A family whose local private tutor costs more per hour than four lessons here"],
    country: 'Italy',
    countryZh: '意大利',
    adjective: 'Italian',
    title: 'Online English Classes for Kids in Italy | TutorPro',
    description: 'Live one-to-one online English classes for Italian children aged 4-16. Speaking practice, Cambridge-aligned books, experienced teachers. Free first class.',
    h1: 'Online English classes for children in Italy',
    lede: 'One teacher, one child, live on video. Built around the thing Italian school English gives children least of: time actually speaking.',
    nativeLink: null,
    timezone: 'Italy is UTC+1 in winter and UTC+2 in summer, so Manila is 6 to 7 hours ahead. In practice the earliest after-school slots work best: a 15:00 lesson in Rome is 21:00 for the teacher, and later Italian times become late-night ones in Manila. We would rather say that plainly than have you find out when you try to book 19:00.',
    school: 'English is taught from scuola primaria and continues through scuola secondaria, but class sizes mean a child can read and write English far better than they can speak it. Many Italian families also prepare for Cambridge English qualifications, and lessons can be pointed at the speaking and listening parts of those.',
    instead: 'A private tutor at home in Italy means travel, a fixed local rate and whatever times that tutor has left. These lessons are one-to-one from home, 25 or 50 minutes, booked when it suits your family.',
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$6 on 4 or more. Your bank converts at its own rate; there is no separate fee from us.',
    faqs: [
      ['Does the teacher speak Italian?', 'No. Teachers are Filipino and teach entirely in English, which is deliberate: a child who knows the teacher cannot switch to Italian stops waiting to be rescued and starts trying.'],
      ['What time are lessons available in Italy?', 'The earliest after-school slots are the most reliable. 15:00 to 17:00 Italian time is 21:00 to 23:00 in Manila, which teachers do cover; later Italian evenings are much harder.'],
      ['Can lessons prepare my child for a Cambridge exam?', 'Teachers can focus on the speaking and listening skills those exams test, using Cambridge course books. TutorPro is not a Cambridge exam centre and does not register candidates — your school or a local centre does that.'],
      ['Is this suitable for a complete beginner?', 'Yes. Lessons for younger children start with phonics, songs and first words, and the teacher begins from what your child can already do.'],
      ['How do I pay from Italy?', 'By debit or credit card, in US dollars. Prices are published on the site: US$8 per 25-minute lesson, or US$6 on four or more a week.'],
    ],
  },
  {
    slug: 'online-english-classes-poland',
    situations: ["A szkoła podstawowa pupil heading for the egzamin ósmoklasisty", "A child with good grammar marks who cannot hold a conversation", "A family who wants regular speaking practice without driving anywhere"],
    country: 'Poland',
    countryZh: '波兰',
    adjective: 'Polish',
    title: 'Online English Classes for Kids in Poland | TutorPro',
    description: 'Live one-to-one online English classes for Polish children aged 4-16. Speaking practice and exam support with experienced teachers. Free first class.',
    h1: 'Online English classes for children in Poland',
    lede: 'One teacher, one child, live on video — speaking practice for children who already know the grammar and freeze when they have to use it.',
    nativeLink: null,
    timezone: 'Poland is UTC+1 in winter and UTC+2 in summer, so Manila is 6 to 7 hours ahead. The earliest after-school slots are the ones we cover most reliably: a 15:00 lesson in Warsaw is 21:00 for the teacher. Later Polish evenings are much harder to staff, and it is better to know that before you book.',
    school: 'English is taught from the early years of szkoła podstawowa, and the egzamin ósmoklasisty at the end of it includes a modern foreign language, which for most pupils is English. Lessons can work on the speaking and listening that classroom time rarely stretches to, or support directly what the school is covering.',
    instead: 'Group courses and school lessons give a child a few sentences of speaking each week. One-to-one means the whole lesson is theirs, with mistakes corrected privately instead of in front of classmates.',
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$6 on 4 or more. Your bank converts at its own rate; we add nothing on top.',
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
    countryZh: '土耳其',
    adjective: 'Turkish',
    title: 'Online English Classes for Kids in Turkey | TutorPro',
    description: 'Live one-to-one online English classes for Turkish children aged 4-16. Speaking confidence and exam support with experienced teachers. Free first class.',
    h1: 'Online English classes for children in Turkey',
    lede: 'One teacher, one child, live on video. For children who can answer an English question on paper and go quiet when asked it out loud.',
    nativeLink: null,
    timezone: 'Turkey is UTC+3 all year, so Manila is 5 hours ahead. A 16:00 lesson in Istanbul is 21:00 for the teacher, and the earlier after-school slots are the ones we can cover most reliably.',
    school: 'English begins in ilkokul and continues through ortaokul, where the LGS exam at the end includes English. Classroom English leans heavily on grammar and vocabulary, so speaking is usually where a child needs the practice, and that is what a one-to-one lesson is for.',
    instead: 'A dershane or private course is a group, with travel on top. Here your child speaks for the whole lesson, from home, and you get written feedback afterwards saying exactly what was covered.',
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$6 on 4 or more. Your bank converts at its own rate.',
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
    countryZh: '德国',
    adjective: 'German',
    title: 'Online English Classes for Kids in Germany | TutorPro',
    description: 'Live one-to-one online English classes for children in Germany, aged 4-16. After-school slots in your time zone, card payment, free first class.',
    h1: 'Online English classes for children in Germany',
    lede: 'One teacher, one child, live on video. German after-school hours fall in the Philippine evening, which is exactly when our night-shift teachers work.',
    timezone: 'Germany runs on CET (UTC+1, UTC+2 in summer). Manila is 6-7 hours ahead, so a 16:00 lesson in Berlin is 22:00 or 23:00 for the teacher - precisely the window our night-shift teachers open, which is why European after-school slots exist at all.',
    school: 'English becomes a compulsory subject in most German states from class 3 or 5, and Gymnasium expectations rise quickly. Lessons can follow the school book, or build the speaking confidence German classrooms rarely have time to practise.',
    instead: 'Nachhilfe usually means a small group after an already long school day, with travel on top. These lessons are one-to-one, from home, and the whole 25 or 50 minutes belongs to your child.',
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$6 on 4 or more. No registration fee and no materials fee.',
    faqs: [
      ['How do I pay from Germany?', 'By debit or credit card, in US dollars, at the published rates: US$8 per 25-minute lesson on 1 to 3 lessons a week, US$6 on 4 or more. There is no registration fee.'],
      ['What time are lessons in German time?', 'After-school and early-evening slots. Every time is shown in your own zone when you book, and night-shift teachers cover the European evening on purpose.'],
      ['Is the first class really free?', 'Yes, and no card is required. It is a full lesson with a real teacher.'],
    ],
  },
  {
    slug: 'online-english-classes-france',
    situations: ['A CP or CE1 pupil starting English at primary school', 'A collégien whose spoken English lags far behind the written work', 'A family wanting real conversation beyond soutien scolaire'],
    country: 'France',
    countryZh: '法国',
    adjective: 'French',
    title: 'Online English Classes for Kids in France | TutorPro',
    description: 'Live one-to-one online English classes for children in France, aged 4-16. Evening slots in French time, card payment, and a free first class.',
    h1: 'Online English classes for children in France',
    lede: 'One teacher, one child, live on video. French after-school hours sit in the Philippine evening, so night-shift teachers keep those slots open.',
    timezone: 'France runs on CET (UTC+1, UTC+2 in summer). Manila is 6-7 hours ahead, so a 17:00 lesson in Paris is late evening for the teacher - covered by teachers who choose the night shift.',
    school: 'English starts in primary school (CP) and counts heavily in the brevet and the lycée, where oral expression is usually the weakest skill. Lessons give the speaking time a thirty-pupil class cannot.',
    instead: 'Soutien scolaire and cours particuliers are usually groups or generalist tutors. These lessons are one-to-one with a specialist English teacher, from home, with written feedback after every class.',
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$6 on 4 or more. No registration fee and no materials fee.',
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
    countryZh: '西班牙',
    adjective: 'Spanish',
    title: 'Online English Classes for Kids in Spain | TutorPro',
    description: 'Live one-to-one online English classes for children in Spain, aged 4-16. After-school slots in peninsular time, card payment, free first class.',
    h1: 'Online English classes for children in Spain',
    lede: 'One teacher, one child, live on video. Peninsular after-school hours fall in the Philippine evening - the night-shift window our teachers open on purpose.',
    timezone: 'Peninsular Spain runs on CET (UTC+1, UTC+2 in summer); the Canary Islands one hour earlier. Manila is 6-7 hours ahead of the peninsula, so after-school slots sit in the Philippine evening and are bookable.',
    school: 'Many Spanish regions teach subjects bilingually from Primaria, and Cambridge-style B1 and B2 exams are common in Secundaria. Lessons can target the speaking papers those exams reward.',
    instead: 'An academia teaches in groups on a fixed timetable, with travel on top. These lessons are one-to-one, at your hour, and the whole session belongs to your child.',
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$6 on 4 or more. No registration fee and no materials fee.',
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
    countryZh: '葡萄牙',
    adjective: 'Portuguese',
    title: 'Online English Classes for Kids in Portugal | TutorPro',
    description: 'Live one-to-one online English classes for children in Portugal, aged 4-16. After-school slots in Lisbon time, card payment, free first class.',
    h1: 'Online English classes for children in Portugal',
    lede: 'One teacher, one child, live on video. Lisbon after-school hours sit at the far edge of the Philippine evening - night-shift teachers keep them open.',
    timezone: 'Portugal runs on WET (UTC+0, UTC+1 in summer). Manila is 7-8 hours ahead, so a 17:00 lesson in Lisbon approaches midnight for the teacher - night-shift hours, and bookable.',
    school: 'English is compulsory from the 3rd year and continues through secondary, where oral exams count. One-to-one practice is the fastest way to close the gap between writing and speaking.',
    instead: 'Explicadores are often generalists shared between subjects and students. These lessons are specialist English, one child per session, from home.',
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$6 on 4 or more. No registration fee and no materials fee.',
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
    countryZh: '荷兰',
    adjective: 'Dutch',
    title: 'Online English Classes for Kids: Netherlands | TutorPro',
    description: 'Live one-to-one online English classes for children in the Netherlands, aged 4-16. After-school slots in your time zone, card payment, free first class.',
    h1: 'Online English classes for children in the Netherlands',
    lede: 'One teacher, one child, live on video. Dutch after-school hours fall in the Philippine evening - the night-shift window our teachers open on purpose.',
    timezone: 'The Netherlands runs on CET (UTC+1, UTC+2 in summer). Manila is 6-7 hours ahead, so after-school slots sit in the Philippine evening and are bookable every week.',
    school: 'Dutch children start English around age 10 and quickly outgrow beginner material, so the real need is speaking confidence and exam-level precision rather than basics. Lessons pitch to that.',
    instead: 'Bijles helps with schoolwork but rarely gives sustained conversation. These lessons are speaking-first, one-to-one, with written feedback after every class.',
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$6 on 4 or more. No registration fee and no materials fee.',
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
    countryZh: '希腊',
    adjective: 'Greek',
    title: 'Online English Classes for Kids in Greece | TutorPro',
    description: 'Live one-to-one online English classes for children in Greece, aged 4-16. After-school slots in Athens time, card payment, and a free first class.',
    h1: 'Online English classes for children in Greece',
    lede: 'One teacher, one child, live on video. Athens after-school hours sit in the Philippine late evening - night-shift teachers keep those slots open.',
    timezone: 'Greece runs on EET (UTC+2, UTC+3 in summer). Manila is 5-6 hours ahead, so a 17:00 lesson in Athens is 22:00 or 23:00 for the teacher - night-shift hours, and bookable.',
    school: 'Greek children often study English from a young age and sit international B1, B2 and Proficiency exams in their teens. Lessons target the speaking and writing those exams score.',
    instead: 'A frontistirio teaches in groups on a fixed schedule. These lessons are one-to-one, at your hour, and every minute is your child speaking or writing with feedback.',
    pay: 'Payment is by debit or credit card, in US dollars — US$8 per 25-minute lesson on 1 to 3 lessons a week, US$6 on 4 or more. No registration fee and no materials fee.',
    faqs: [
      ['How do I pay from Greece?', 'By debit or credit card, in US dollars, at the published rates. Your bank converts at its own rate; we add nothing on top.'],
      ['What time are lessons in Greek time?', 'After-school and early-evening slots, shown in your own zone when you book.'],
      ['Is the first class really free?', 'Yes, and no card is required. It is a full lesson with a real teacher.'],
    ],
  },
]

function schema(entry) {
  const url = `${SITE}/${entry.slug}.html`
  const t = UI[entry.ui || 'en']
  const cname = t.lang === 'zh' ? (entry.countryZh || entry.country) : entry.country
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Course',
        '@id': `${url}#course`,
        name: t.courseName(cname),
        description: entry.description,
        url,
        inLanguage: t.lang === 'zh' ? 'zh-Hans' : 'en',
        audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'Children aged 4-16' },
        provider: {
          '@type': 'EducationalOrganization',
          name: 'TutorPro Online English',
          url: SITE,
          areaServed: cname,
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
            description: t.offerDesc,
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
          { '@type': 'ListItem', position: 1, name: t.crumbHome, item: SITE },
          { '@type': 'ListItem', position: 2, name: t.crumbClasses, item: `${SITE}/online-english-classes-for-kids` },
          { '@type': 'ListItem', position: 3, name: cname, item: url },
        ],
      },
    ],
  }
}

function render(entry, all) {
  const url = `${SITE}/${entry.slug}.html`
  const others = all.filter((item) => item.slug !== entry.slug)
  const t = UI[entry.ui || 'en']
  const cname = t.lang === 'zh' ? (entry.countryZh || entry.country) : entry.country
  const localName = (item) => (t.lang === 'zh' ? (item.countryZh || item.country) : item.country)

  return `<!doctype html>
<html lang="${t.lang}">
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
        <a class="btn btn--primary" href="/?book=1">${t.registerNow}</a>
      </div>
    </header>

    <main>
      <nav class="crumbs" aria-label="Breadcrumb">
        <a href="/">${t.crumbHome}</a> › <a href="/online-english-classes-for-kids">${t.crumbClasses}</a> › <span>${escapeHtml(cname)}</span>
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
            <span class="ph-kicker">${escapeHtml(t.kicker(cname))}</span>
            <h1>${escapeHtml(entry.h1)}</h1>
            <p class="lede">${escapeHtml(entry.lede)}</p>
            ${entry.nativeLink && t.lang === 'en' ? `<p><a class="text-link ph-native" href="${entry.nativeLink[0]}">${escapeHtml(entry.nativeLink[1])}</a></p>` : ''}
            <ul class="ph-badges">
              ${t.badges.map((badge) => `<li>${badge}</li>`).join('\n              ')}
            </ul>
            <p class="cta-row">
              <a class="btn btn--primary ph-cta" href="/?book=1">${t.ctaRegister}</a>
              <a class="btn ph-cta-ghost" href="/pricing.html">${t.ctaPrices}</a>
            </p>
          </div>
          <div class="ph-visual" aria-hidden="false">
            <img src="/assets/hero-filipino-classroom.png" alt="${t.heroAlt}" width="1024" height="1024" loading="eager" decoding="async" />
            <span class="ph-orbit ph-orbit--abc">ABC</span>
            <span class="ph-orbit ph-orbit--star">✦</span>
            <div class="ph-card">
              <strong>${t.cardTitle}</strong>
              <span>${t.cardSub}</span>
            </div>
          </div>
        </div>
        <svg class="ph-wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0,40 C240,90 480,0 720,35 C960,70 1200,10 1440,45 L1440,90 L0,90 Z" fill="#ffffff"/></svg>
      </section>

      <section class="filipino-band">
        <div class="wrap wrap--narrow">
          <span class="kicker">${t.teachKicker}</span>
          <h2>${t.teachH2}</h2>
          <p>${t.teachP}</p>
          <ul class="filipino-band__points">
            <li><strong>${t.teachPts[0][0]}</strong> ${t.teachPts[0][1]}</li>
            <li><strong>${t.teachPts[1][0]}</strong> ${t.teachPts[1][1]}</li>
            <li><strong>${t.teachPts[2][0]}</strong> ${t.teachPts[2][1]}</li>
          </ul>
          <p class="cta-row"><a class="btn btn--primary" href="/teachers.html">${t.teachCta}</a></p>
        </div>
      </section>

      <section class="trial-band" id="trial">
        <div class="wrap">
          <div class="trial-band__grid">
            <div class="trial-band__register">
              <span class="kicker">${t.regKicker}</span>
              <h2>${t.regH2}</h2>
              <p>${t.regP}</p>
              <ul class="trial-band__points">
                <li><strong>${t.regPts[0][0]}</strong> ${t.regPts[0][1]}</li>
                <li><strong>${t.regPts[1][0]}</strong> ${t.regPts[1][1]}</li>
                <li><strong>${t.regPts[2][0]}</strong> ${t.regPts[2][1]}</li>
              </ul>
              <p class="cta-row"><a class="btn btn--primary" href="/?book=1">${t.regCta}</a></p>
            </div>
            <div class="trial-band__contact">
              <span class="kicker">${t.talkKicker}</span>
              <h2>${t.talkH2}</h2>
              <form class="trial-form" id="trial-form">
                <label>${t.fName}<input name="parentName" required maxlength="80" placeholder="${t.fNamePh}" autocomplete="name" /></label>
                <label>${t.fEmail}<input type="email" name="email" required maxlength="120" placeholder="you@example.com" autocomplete="email" /></label>
                <label>${t.fAge}<select name="age">${Array.from({ length: 13 }, (_, i) => `<option value="${i + 4}">${i + 4} ${t.fAgeSuf}</option>`).join('')}</select></label>
                <label>${t.fTimes}<input name="times" maxlength="120" placeholder="${t.fTimesPh}" /></label>
                <label>${t.fNotes}<textarea name="message" maxlength="600" placeholder="${t.fNotesPh}"></textarea></label>
                <button class="btn btn--primary" type="submit">${t.fSubmit}</button>
                <p class="trial-form__note" id="trial-note">${t.fNote}</p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div class="wrap wrap--narrow">
          <h2>${escapeHtml(t.hTimes(cname))}</h2>
          <p>${escapeHtml(entry.timezone)}</p>
          <p>${t.schedP} <a href="/online-english-class-schedule-time-zones.html">${t.schedLink}</a></p>

          <h2>${escapeHtml(t.hSchool(cname))}</h2>
          <p>${escapeHtml(entry.school)}</p>

          <h2>${t.hDiff}</h2>
          <p>${escapeHtml(entry.instead)}</p>

          <h2>${escapeHtml(t.hWho(cname))}</h2>
          <ul class="ticks">
            ${entry.situations.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n            ')}
          </ul>
          <p>${t.coverP} <a href="/online-english-classes-for-kids">${t.coverLink}</a></p>

          <h2>${t.hTeach}</h2>
          <p>${t.teachWhoP}<a href="/teachers.html">${t.teachWhoLink}</a>${t.teachWhoP2(cname, DTI)}</p>

          <h2>${escapeHtml(t.hPay(cname))}</h2>
          <p>${escapeHtml(entry.pay)}${t.payExtra}<a href="/refund-policy.html">${t.payLink}</a></p>
        </div>
      </section>

      <section class="faq alt">
        <div class="wrap wrap--narrow">
          <h2>${escapeHtml(t.faqH(entry.adjective, cname))}</h2>
          ${entry.faqs.map(([q, a], index) => `<details${index === 0 ? ' open' : ''}><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`).join('\n          ')}
          <p class="cta-row">
            <a class="btn btn--primary" href="/?book=1">${t.registerNow}</a>
            <a class="btn" href="/contact.html">${t.faqCta2}</a>
          </p>
        </div>
      </section>

      <section>
        <div class="wrap wrap--narrow">
          <h2>${t.hOther}</h2>
          <nav class="pagenav" aria-label="Other countries">
            ${others.map((item) => `<a href="/${item.slug}.html">${escapeHtml(localName(item))}</a>`)}.join('\n            ')}
          </nav>
        </div>
      </section>
      <section class="country-cloud">
        <div class="wrap wrap--narrow">
          <span class="kicker">${t.cloudKicker}</span>
          <h2>${t.cloudH2}</h2>
          <p>${t.cloudP}</p>
          <ul>
            ${COUNTRIES.filter((other) => other.slug !== entry.slug).map((other) => `<li><a href="/${other.slug}.html">${escapeHtml(localName(other))}</a></li>`)}.join('\n            ')}
          </ul>
        </div>
      </section>
    </main>

    <footer class="site-foot">
      <div class="wrap">
        <nav>
          <a href="/">${t.foot[0]}</a>
          <a href="/online-english-classes-for-kids">${t.foot[1]}</a>
          <a href="/pricing.html">${t.foot[2]}</a>
          <a href="/teachers.html">${t.foot[3]}</a>
          <a href="/faq.html">${t.foot[4]}</a>
          <a href="/contact.html">${t.foot[5]}</a>
        </nav>
        <p>${t.footCopy(new Date().getFullYear(), DTI)}</p>
      </div>
    </footer>

    <script>
      var t_js = ${JSON.stringify({ jsInvalid: t.jsInvalid, jsSending: t.jsSending, jsFirst: t.jsFirst(cname), jsTimes: t.jsTimes, jsNotes: t.jsNotes, jsOk1: t.jsOk1, jsOk2: t.jsOk2, jsFail: t.jsFail, jsFail2: t.jsFail2, visitorLang: t.visitorLang })};
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
            note.textContent = t_js.jsInvalid;
            return;
          }
          var times = String(fields.get('times') || '').trim() || 'flexible';
          var extra = String(fields.get('message') || '').trim();
          var firstMessage = t_js.jsFirst + String(fields.get('age') || '') + t_js.jsTimes + times + '.' + (extra ? t_js.jsNotes + extra : '');
          button.disabled = true;
          note.textContent = t_js.jsSending;
          fetch('https://losmkvvwzijipqrlelyt.supabase.co/rest/v1/rpc/create_support_conversation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'sb_publishable_icTkeremuFxwHOy52_gXfQ_x3IibhLL',
              'Authorization': 'Bearer sb_publishable_icTkeremuFxwHOy52_gXfQ_x3IibhLL'
            },
            body: JSON.stringify({ parent_name: parentName, parent_email: email, visitor_language: t_js.visitorLang, first_message: firstMessage })
          }).then(function (response) {
            if (!response.ok) throw new Error('request failed');
            form.reset();
            button.disabled = false;
            note.textContent = t_js.jsOk1 + email + t_js.jsOk2;
          }).catch(function () {
            button.disabled = false;
            note.innerHTML = t_js.jsFail + '<a href="mailto:sejongenglish@yahoo.com">sejongenglish@yahoo.com</a>' + t_js.jsFail2;
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
