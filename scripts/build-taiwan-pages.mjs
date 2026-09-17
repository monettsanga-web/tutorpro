/**
 * Taiwan pages — Traditional Chinese, for families in 台灣.
 *
 * WHY A SEPARATE SECTION FROM /cn/
 * --------------------------------
 * /cn/ is Simplified Chinese (zh-CN). Taiwan reads Traditional Chinese
 * (zh-Hant-TW). They are not interchangeable: serving Simplified text to a
 * Taiwanese parent reads as foreign at best and mainland-oriented at worst,
 * and Google treats them as distinct languages for ranking. Vocabulary
 * differs too, not just characters — Taiwan says 影片 not 视频, 網路 not 网络,
 * 一對一 not 一对一.
 *
 * WHY TAIWAN IS WORTH BUILDING FOR
 * --------------------------------
 * Unlike mainland China, there is no firewall, no ICP licence and no ban on
 * teaching English to minors. Unlike Korea, Google is the dominant search
 * engine, so ordinary SEO works rather than needing a Naver presence.
 * Taiwan is UTC+8 — the same time zone as the teachers — so there is no
 * scheduling compromise at all, which is a genuine advantage over every
 * US and UK competitor.
 *
 * ACCURACY
 * --------
 * Pricing mirrors the real rates: $10 per lesson on 1–3 a week, $8 on 4+.
 * NT$ figures are given as approximate conversions and labelled as such,
 * because the platform charges in USD and an exact NT$ price would be a
 * claim we cannot honour. Free first class, 12-hour cancellation and 14-day
 * refund all come from the real booking rules. No invented reviews, ratings
 * or student numbers.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')
const SITE = 'https://www.tutorpro.site'

const CONTACT = {
  facebook: 'https://www.facebook.com/tutorproenglish',
  messenger: 'https://m.me/526047974195321',
  whatsapp: 'https://wa.me/639625284849',
  whatsappLabel: '+63 962 528 4849',
  email: 'sejongenglish@yahoo.com',
  // LINE is what Taiwanese families actually use. Set this once a LINE
  // Official Account exists and it appears on every Taiwan page at once.
  line: '',
}

/** Shared head. The stylesheet is the Korean one: same light brand, same
 *  CJK typography needs (keep-all line breaking, generous line height). */
function head({ title, description, keywords, url, schema }) {
  return `    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#fffef9" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="keywords" content="${keywords}" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="/assets/pwa-icon-192.png" />
    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="en" href="${SITE}/" />
    <link rel="alternate" hreflang="zh-Hans" href="${SITE}/cn/" />
    <link rel="alternate" hreflang="zh-Hant-TW" href="${SITE}/tw/" />
    <link rel="alternate" hreflang="ko" href="${SITE}/kr/" />
    <link rel="alternate" hreflang="x-default" href="${SITE}/" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="zh_TW" />
    <meta property="og:site_name" content="TutorPro 線上英語" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${SITE}/assets/tutorpro-hero.webp" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="stylesheet" href="/assets/kr.css" />
    <script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
    </script>`
}

function siteHeader() {
  return `    <header class="site-head">
      <div class="wrap site-head__inner">
        <a class="brand" href="/tw/"><img src="/assets/tutorpro-panda-logo.webp" alt="TutorPro 線上英語" width="42" height="42" />TutorPro 線上英語</a>
        <div class="head-actions">
          <a class="head-lang" href="/">English</a>
          <a class="btn btn--sm" href="/">免費體驗課</a>
        </div>
      </div>
    </header>`
}

function contactSection() {
  const line = CONTACT.line
    ? `<a class="channel" href="${CONTACT.line}" target="_blank" rel="noopener"><span class="channel__dot" style="background:#06c755"></span>LINE 諮詢</a>`
    : ''
  return `    <section class="tight">
      <div class="wrap">
        <div class="contact-card">
          <span class="kicker">聯絡我們</span>
          <h2>有任何問題，歡迎直接詢問</h2>
          <p class="section-lede">由真人回覆，不是機器人。詢問後不需要一定要報名，如果我們判斷不適合您的孩子，也會直接說明。</p>
          <div class="channels">
            ${line}
            <a class="channel" href="${CONTACT.messenger}" target="_blank" rel="noopener"><span class="channel__dot" style="background:#1877f2"></span>Facebook Messenger</a>
            <a class="channel" href="${CONTACT.whatsapp}" target="_blank" rel="noopener"><span class="channel__dot" style="background:#25d366"></span>WhatsApp ${CONTACT.whatsappLabel}</a>
            <a class="channel" href="${CONTACT.facebook}" target="_blank" rel="noopener"><span class="channel__dot" style="background:#1877f2"></span>Facebook 粉絲專頁</a>
            <a class="channel" href="mailto:${CONTACT.email}"><span class="channel__dot" style="background:#716981"></span>電子郵件</a>
          </div>
          <p class="fine">菲律賓 DTI 商業登記字號 5274092．我們不會在對話中詢問信用卡資料。</p>
        </div>
      </div>
    </section>`
}

function relatedSection(currentSlug) {
  const all = [
    { slug: 'tw/', title: '台灣家長專頁', note: '課程費用、師資與上課方式' },
    { slug: 'tw/xianshang-yingyu.html', title: '什麼是線上英語？', note: '和補習班、團體班的差別' },
    { slug: 'tw/guoxiao-yingyu.html', title: '國小英語線上家教', note: '各年級學習重點與做法' },
  ].filter((p) => p.slug !== currentSlug)
  return `    <section class="tight alt">
      <div class="wrap">
        <span class="kicker">延伸閱讀</span>
        <h2>其他說明</h2>
        <div class="related">
          ${all.map((p) => `<a href="/${p.slug}">${p.title}<span>${p.note}</span></a>`).join('\n          ')}
        </div>
      </div>
    </section>`
}

function finalCta() {
  return `    <section>
      <div class="wrap">
        <div class="final">
          <h2>第一堂課完全免費</h2>
          <p>不需要綁約，也不需要先填信用卡。先讓孩子實際上一堂課，再決定要不要繼續。</p>
          <p style="margin-top:22px"><a class="btn" href="/">預約免費體驗課</a></p>
        </div>
      </div>
    </section>`
}

function siteFooter() {
  return `    <footer class="site-foot">
      <div class="wrap">
        <p>
          <a href="/tw/">台灣家長專頁</a>
          <a href="/">English site</a>
          <a href="/pricing.html">課程費用</a>
          <a href="/about.html">關於我們</a>
          <a href="/contact.html">聯絡方式</a>
        </p>
        <p>© ${new Date().getFullYear()} TutorPro Online English．菲律賓 DTI 商業登記字號 5274092．由菲律賓師資線上授課。</p>
      </div>
    </footer>
    <div class="sticky-cta">
      <a class="btn" href="/">免費體驗課</a>
      <a class="btn btn--ghost" href="${CONTACT.messenger}" target="_blank" rel="noopener">聯絡我們</a>
    </div>`
}

function page({ slug, file, title, description, keywords, heading, lede, hero, body, schema }) {
  const url = `${SITE}/${slug}`
  return `<!doctype html>
<html lang="zh-Hant-TW">
  <head>
${head({ title, description, keywords, url, schema })}
  </head>
  <body>
${siteHeader()}
    <main>
      <section class="hero">
        <div class="wrap">
          <div class="hero__grid">
            <div>
              <span class="eyebrow">${hero.eyebrow}</span>
              <h1>${heading}</h1>
              <p class="hero__lede">${lede}</p>
              <div class="hero__cta">
                <a class="btn" href="/">預約免費體驗課</a>
                <a class="btn btn--ghost" href="#pricing">查看課程費用</a>
              </div>
              <p class="hero__note">25 分鐘 US$10．50 分鐘 US$20．不需填信用卡．不綁約</p>
            </div>
            <div class="hero__art">
              <img src="/assets/tutorpro-hero.webp" alt="孩子在線上學英語" width="800" height="600" loading="eager" />
            </div>
          </div>
          <div class="trust">
            <div><strong>一對一</strong><span>沒有團體班</span></div>
            <div><strong>免費</strong><span>第一堂體驗課</span></div>
            <div><strong>零時差</strong><span>與台灣同時區</span></div>
            <div><strong>DTI 登記</strong><span>字號 5274092</span></div>
          </div>
        </div>
      </section>
${body}
${contactSection()}
${relatedSection(slug)}
${finalCta()}
    </main>
${siteFooter()}
  </body>
</html>
`
}

const faqSchema = (url, qa) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Course',
      '@id': `${url}#course`,
      name: '兒童一對一線上英語課程',
      description: '依劍橋與牛津教材規劃的兒童、青少年一對一線上英語課程，每堂 25 或 50 分鐘。',
      url,
      inLanguage: 'zh-Hant',
      provider: {
        '@type': 'EducationalOrganization',
        name: 'TutorPro Online English',
        url: SITE,
        areaServed: 'TW',
        identifier: { '@type': 'PropertyValue', propertyID: 'DTI Business Name Registration', value: '5274092' },
        address: { '@type': 'PostalAddress', addressCountry: 'PH' },
      },
      hasCourseInstance: [{
        '@type': 'CourseInstance',
        courseMode: 'online',
        courseWorkload: 'PT25M',
        location: { '@type': 'VirtualLocation', url: SITE },
        offers: { '@type': 'Offer', price: '10', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: SITE },
      }],
    },
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      inLanguage: 'zh-Hant',
      mainEntity: qa.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ],
})

const PRICING_BLOCK = `      <section class="alt" id="pricing">
        <div class="wrap">
          <span class="kicker">課程費用</span>
          <h2>公開透明，沒有額外費用</h2>
          <p class="section-lede">沒有報名費、沒有教材費、沒有平台使用費。教材與學習資料都已包含在課程費用中。</p>
          <div class="price-grid">
            <div class="price-card price-card--feature">
              <span class="price-card__tag">幼兒與國小低年級推薦</span>
              <h3>25 分鐘</h3>
              <span class="price-card__amount">US$10 <small>／堂</small></span>
              <p>約新台幣 320 元，依當日匯率而定。配合孩子的專注時間。</p>
            </div>
            <div class="price-card">
              <h3>50 分鐘</h3>
              <span class="price-card__amount">US$20 <small>／堂</small></span>
              <p>約新台幣 640 元，依當日匯率而定。適合國小高年級與國高中生。</p>
            </div>
          </div>
          <p class="price-note">✓ 每週上 4 堂以上，每堂降為 <strong>US$8</strong>．<strong>第一堂免費，不需填信用卡</strong>．課前 12 小時取消可全額保留點數</p>
          <p class="fine" style="margin-top:12px">課程以美元計價，新台幣金額為換算參考值，實際扣款金額依當日匯率為準。</p>
        </div>
      </section>`

const PAGES = [
  {
    slug: 'tw/',
    file: 'tw/index.html',
    title: 'TutorPro 線上英語 — 兒童一對一線上英語 | 首堂免費',
    description:
      '專為台灣家庭設計的兒童一對一線上英語課程。劍橋與牛津教材，25 分鐘 US$10 起，與台灣零時差。第一堂免費體驗，不需填信用卡。',
    keywords: '線上英語, 兒童線上英語, 國小英語, 一對一英語, 線上英文家教, 兒童英文, 菲律賓線上英語, 英文會話',
    hero: { eyebrow: '台灣家長專頁' },
    heading: '讓孩子<br />真正開口說英語',
    lede: '不必在團體班裡排隊等著發言。整堂課只有您的孩子在說。依劍橋與牛津教材規劃的一對一線上英語課程。',
    body: `      <section>
        <div class="wrap">
          <span class="kicker">為什麼選 TutorPro</span>
          <h2>六個明確的差別</h2>
          <div class="grid grid--3">
            <div class="card card--lift"><h3>完全一對一</h3><p>沒有團體班。任何程度都是一位老師對一位學生，整堂課孩子都在用英語表達。</p></div>
            <div class="card card--lift"><h3>劍橋與牛津教材</h3><p>使用 Power Up、Global English、Family and Friends、THiNK 等正式出版教材。</p></div>
            <div class="card card--lift"><h3>與台灣零時差</h3><p>菲律賓與台灣同為 UTC+8。放學後與晚上的時段完全不需要遷就時差。</p></div>
            <div class="card card--lift"><h3>不必安裝軟體</h3><p>不需要 Zoom 或其他應用程式。點開連結就直接進入我們自己開發的線上教室。</p></div>
            <div class="card card--lift"><h3>課後家長回報</h3><p>每堂課後，老師會記錄學了什麼、孩子表現好的地方、需要加強的部分與練習單字。</p></div>
            <div class="card card--lift"><h3>課程可錄影</h3><p>課程可以錄影，家長事後可以重看。錄影期間畫面上會明確顯示。</p></div>
          </div>
        </div>
      </section>

${PRICING_BLOCK}

      <section>
        <div class="wrap">
          <span class="kicker">上課流程</span>
          <h2>一堂課是這樣進行的</h2>
          <p class="section-lede">課程為 25 或 50 分鐘，在我們自己開發的瀏覽器教室中進行。老師會把教材投影在畫面上，和孩子一起在上面書寫。</p>
          <div class="steps">
            <div class="step"><h3>暖身</h3><p>從簡單的對話開始，讓孩子放鬆開口。</p></div>
            <div class="step"><h3>新內容</h3><p>學習新的單字與句型，並實際唸出來練習。</p></div>
            <div class="step"><h3>活動</h3><p>透過閱讀、聽力與角色扮演實際運用。</p></div>
            <div class="step"><h3>自由表達</h3><p>用剛學到的內容自由說一段話。</p></div>
          </div>
          <p style="margin-top:20px">發音練習有 AI 發音教練協助，會針對每個單字評分並播放正確發音，讓孩子可以自己修正。</p>
        </div>
      </section>

      <section class="alt">
        <div class="wrap">
          <span class="kicker">分齡課程</span>
          <h2>依年齡調整教法</h2>
          <div class="grid grid--3">
            <div class="card"><h3>4～7 歲</h3><p>自然發音、初階單字，用歌曲與遊戲讓孩子不排斥英語。</p></div>
            <div class="card"><h3>8～11 歲</h3><p>閱讀流暢度、文法、用完整句子表達，並銜接學校進度。</p></div>
            <div class="card"><h3>12～16 歲</h3><p>寫作、閱讀理解、進階文法與口說練習。</p></div>
          </div>
        </div>
      </section>

      <section>
        <div class="wrap wrap--narrow">
          <span class="kicker">師資</span>
          <h2>關於我們的老師</h2>
          <p>所有老師都必須通過結構化的甄選流程：繳交<strong>錄影試教</strong>由我們親自審核，並查核學歷與教學經歷，特別重視兒童教學經驗。通過審核的老師才會被分配學生。</p>
          <p>老師居住於菲律賓並在菲律賓授課。TutorPro 不是台灣的補習班，而是在菲律賓登記的公司（DTI 字號 5274092）。這一點我們不會隱瞞。</p>
          <p><a href="/tw/xianshang-yingyu.html">了解線上英語和補習班的差別 →</a></p>
        </div>
      </section>

      <section class="faq alt">
        <div class="wrap wrap--narrow">
          <span class="kicker">常見問題</span>
          <h2>家長常問的問題</h2>
          <details open><summary>第一堂課真的免費嗎？</summary><p>是的，而且不需要填寫信用卡。是由真人老師上的完整課程，上完再決定要不要繼續。</p></details>
          <details><summary>課程費用是多少？</summary><p>25 分鐘 US$10，50 分鐘 US$20。每週上 4 堂以上，每堂降為 US$8。沒有報名費與教材費。</p></details>
          <details><summary>幾歲可以開始上課？</summary><p>我們的學生從 4 歲到 16 歲，會依年齡與程度調整課程內容與教材。</p></details>
          <details><summary>上課時間怎麼安排？</summary><p>菲律賓與台灣同為 UTC+8，完全沒有時差，放學後與晚上時段都很順暢。</p></details>
          <details><summary>需要安裝什麼軟體嗎？</summary><p>不需要。課程在我們自己開發的瀏覽器教室進行，點開連結就能上課。</p></details>
          <details><summary>可以取消或退費嗎？</summary><p>課前 12 小時以上取消，點數全額保留。未使用的點數可在購買後 14 天內申請退款。</p></details>
        </div>
      </section>`,
    schema: faqSchema(`${SITE}/tw/`, [
      ['第一堂課真的免費嗎？', '是的，而且不需要填寫信用卡。是由真人老師上的完整課程，上完再決定要不要繼續。'],
      ['課程費用是多少？', '25 分鐘 US$10，50 分鐘 US$20。每週上 4 堂以上，每堂降為 US$8。沒有報名費與教材費。'],
      ['幾歲可以開始上課？', '我們的學生從 4 歲到 16 歲，會依年齡與程度調整課程內容與教材。'],
      ['上課時間怎麼安排？', '菲律賓與台灣同為 UTC+8，完全沒有時差，放學後與晚上時段都很順暢。'],
      ['需要安裝什麼軟體嗎？', '不需要。課程在我們自己開發的瀏覽器教室進行，點開連結就能上課。'],
    ]),
  },

  {
    slug: 'tw/xianshang-yingyu.html',
    file: 'tw/xianshang-yingyu.html',
    title: '線上英語是什麼？和補習班差在哪裡 | TutorPro',
    description:
      '線上英語和補習班、團體班有什麼不同？整理一對一線上英語的優點與限制、費用與開始方式，也說明哪些情況不適合。',
    keywords: '線上英語, 線上英語是什麼, 兒童線上英語, 一對一線上英語, 英文會話, 線上英文家教, 補習班比較',
    hero: { eyebrow: '初次了解的家長' },
    heading: '線上英語是什麼？<br />適合我的孩子嗎？',
    lede: '線上英語就是透過視訊進行的英語課程。概念很單純，但課程形式不同，效果差距很大。以下把優點和限制一起整理出來。',
    body: `      <section>
        <div class="wrap wrap--narrow">
          <span class="kicker">基本概念</span>
          <h2>線上英語的基本概念</h2>
          <p class="section-lede">線上英語是老師與學生透過畫面進行的英語課程。省去往返補習班的交通時間，孩子在家中比較放鬆，也比較容易專注。</p>
          <p>真正的重點不在於「線上」，而在於「上課方式」。即使透過畫面上課，如果是團體班，孩子開口的機會一樣很少。</p>
        </div>
      </section>

      <section class="alt">
        <div class="wrap">
          <span class="kicker">最大的差別</span>
          <h2>團體班與一對一的實際差異</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th></th><th>團體班（4～6 人）</th><th>一對一</th></tr></thead>
              <tbody>
                <tr><td><strong>孩子開口的時間</strong></td><td>約全堂的五分之一以下</td><td class="yes">整堂課</td></tr>
                <tr><td><strong>上課節奏</strong></td><td>配合全班平均</td><td class="yes">配合孩子程度</td></tr>
                <tr><td><strong>說錯的時候</strong></td><td>在其他同學面前</td><td class="yes">只有老師知道</td></tr>
                <tr><td><strong>進度調整</strong></td><td>不容易</td><td class="yes">可即時調整</td></tr>
              </tbody>
            </table>
          </div>
          <p style="margin-top:18px">如果目標是口說，這個差別是關鍵。個性安靜、怕說錯的孩子，在一對一的環境下通常開口得更快。</p>
        </div>
      </section>

      <section>
        <div class="wrap">
          <span class="kicker">適合度</span>
          <h2>這些情況特別適合</h2>
          <div class="grid grid--3">
            <div class="card card--lift"><h3>沒有開口的機會</h3><p>在學校學英語，但幾乎沒有實際開口說的機會。</p></div>
            <div class="card card--lift"><h3>會讀不會說</h3><p>閱讀與寫作還可以，唯獨口說特別吃力。</p></div>
            <div class="card card--lift"><h3>通勤時間是負擔</h3><p>往返補習班太花時間，或孩子的行程不固定。</p></div>
            <div class="card card--lift"><h3>在同學面前會害羞</h3><p>在其他孩子面前用英語說話特別不自在。</p></div>
            <div class="card card--lift"><h3>需要真實對話</h3><p>需要有實際用英語對話的機會。</p></div>
            <div class="card card--lift"><h3>想在家學習</h3><p>在熟悉的環境中學習對這個孩子比較有效。</p></div>
          </div>
        </div>
      </section>

      <section class="alt">
        <div class="wrap wrap--narrow">
          <span class="kicker">誠實說明</span>
          <h2>這些情況請再考慮</h2>
          <p class="section-lede">線上英語不是每個孩子的答案。報名了不適合的課程，浪費的是孩子的時間，所以我們先說清楚。</p>
          <div class="grid grid--2" style="margin-top:20px">
            <div class="card"><h3>專注時間非常短的幼兒</h3><p>連 25 分鐘都可能覺得太長。請務必先用免費體驗課確認。</p></div>
            <div class="card"><h3>以學校考試為主要目標</h3><p>口說為主的課程有幫助，但和考試導向的課程目標不同。</p></div>
            <div class="card"><h3>家中網路不穩定</h3><p>經常斷線會嚴重影響上課品質，請先確認環境。</p></div>
            <div class="card"><h3>孩子強烈抗拒</h3><p>勉強開始容易讓孩子討厭英語本身，延後一段時間反而較好。</p></div>
          </div>
        </div>
      </section>

${PRICING_BLOCK}

      <section>
        <div class="wrap">
          <span class="kicker">開始方式</span>
          <h2>四個步驟就能上第一堂課</h2>
          <div class="steps">
            <div class="step"><h3>建立免費帳號</h3><p>在網站上用電子郵件簡單註冊。</p></div>
            <div class="step"><h3>填寫孩子資料</h3><p>年級、使用教材與學習目標。</p></div>
            <div class="step"><h3>選擇時段</h3><p>預約您方便的第一堂免費課程。</p></div>
            <div class="step"><h3>課後再決定</h3><p>上完再決定是否繼續，沒有綁約。</p></div>
          </div>
        </div>
      </section>

      <section class="faq alt">
        <div class="wrap wrap--narrow">
          <span class="kicker">常見問題</span>
          <h2>家長常問的問題</h2>
          <details open><summary>線上英語是什麼？</summary><p>透過視訊進行的英語課程。TutorPro 全部採一對一，沒有團體班，整堂課孩子都在用英語表達。</p></details>
          <details><summary>和團體班差在哪裡？</summary><p>團體班中孩子開口的時間會降到全堂的五分之一以下。一對一整堂課只有孩子在說，節奏也配合孩子的程度。</p></details>
          <details><summary>課程費用是多少？</summary><p>25 分鐘 US$10，50 分鐘 US$20，沒有報名費與教材費，第一堂免費。</p></details>
          <details><summary>第一堂課真的免費嗎？</summary><p>是的，不需要填寫信用卡，上完再決定要不要繼續。</p></details>
        </div>
      </section>`,
    schema: faqSchema(`${SITE}/tw/xianshang-yingyu.html`, [
      ['線上英語是什麼？', '透過視訊進行的英語課程。TutorPro 全部採一對一，沒有團體班，整堂課孩子都在用英語表達。'],
      ['和團體班差在哪裡？', '團體班中孩子開口的時間會降到全堂的五分之一以下。一對一整堂課只有孩子在說，節奏也配合孩子的程度。'],
      ['課程費用是多少？', '25 分鐘 US$10，50 分鐘 US$20，沒有報名費與教材費，第一堂免費。'],
      ['第一堂課真的免費嗎？', '是的，不需要填寫信用卡，上完再決定要不要繼續。'],
    ]),
  },

  {
    slug: 'tw/guoxiao-yingyu.html',
    file: 'tw/guoxiao-yingyu.html',
    title: '國小英語線上家教 — 各年級學習重點 | TutorPro',
    description:
      '國小英語一對一線上家教。低年級自然發音到高年級閱讀、文法與口說，說明各年級的學習目標與上課方式。25 分鐘 US$10，第一堂免費。',
    keywords: '國小英語, 國小英文家教, 兒童線上英語, 自然發音, 小學英語, 線上英文家教, 國小英文',
    hero: { eyebrow: '國小一年級到六年級' },
    heading: '國小英語，<br />依年級一對一指導',
    lede: '國小階段每個年級需要的東西完全不同。一年級需要的課程和六年級需要的不可能一樣。以下說明各年級要做什麼、怎麼做。',
    body: `      <section>
        <div class="wrap">
          <span class="kicker">分年級目標</span>
          <h2>現在孩子需要的是什麼</h2>
          <div class="grid grid--3">
            <div class="card card--lift"><h3>一～二年級</h3><p>紮實建立字母與自然發音，把聲音和文字連結起來，累積自己讀出短單字的成功經驗。以歌曲、繪本與遊戲為主，讓孩子覺得英語是愉快的。</p></div>
            <div class="card card--lift"><h3>三～四年級</h3><p>學校開始正式上英語課的階段。練習以句子為單位閱讀與表達，自然而然熟悉基本文法。從自我介紹、家人、日常生活等主題開始練習口說。</p></div>
            <div class="card card--lift"><h3>五～六年級</h3><p>擴充閱讀流暢度與字彙量，練習用句子表達自己的想法。為銜接國中，有系統地整理文法，並開始短文寫作。</p></div>
          </div>
        </div>
      </section>

      <section class="alt">
        <div class="wrap">
          <span class="kicker">上課方式</span>
          <h2>一堂課是這樣進行的</h2>
          <p class="section-lede">所有課程都在我們自己開發的瀏覽器教室進行，不需要安裝任何程式，點開連結就能進入。老師會把教材投影在畫面上，和孩子一起在上面書寫。</p>
          <div class="steps">
            <div class="step"><h3>暖身</h3><p>複習上次內容，用輕鬆的對話開口。</p></div>
            <div class="step"><h3>新內容</h3><p>學習新單字與句型，實際唸出來練習。</p></div>
            <div class="step"><h3>活動</h3><p>用閱讀、聽力與角色扮演實際運用所學。</p></div>
            <div class="step"><h3>收尾</h3><p>用學到的句型自由表達一段話。</p></div>
          </div>
          <p style="margin-top:20px">發音由 AI 發音教練協助，逐字評分並播放正確發音，孩子可以自己對照修正。</p>
        </div>
      </section>

      <section>
        <div class="wrap">
          <span class="kicker">教材</span>
          <h2>使用劍橋與牛津原文教材</h2>
          <p class="section-lede">依孩子的程度與目標選擇合適的教材，<strong>教材費已包含在課程費用中</strong>。</p>
          <div class="books">
            <figure><img src="/assets/curriculum/oxford-phonics-world-drive.jpg" alt="Oxford Phonics World 教材" loading="lazy" /></figure>
            <figure><img src="/assets/curriculum/family-and-friends-drive.jpg" alt="Family and Friends 教材" loading="lazy" /></figure>
            <figure><img src="/assets/curriculum/global-english-drive.jpg" alt="Cambridge Global English 教材" loading="lazy" /></figure>
            <figure><img src="/assets/curriculum/grammar-friends-drive.jpg" alt="Grammar Friends 教材" loading="lazy" /></figure>
            <figure><img src="/assets/curriculum/lets-go-drive.jpg" alt="Let's Go 教材" loading="lazy" /></figure>
          </div>
        </div>
      </section>

      <section class="alt">
        <div class="wrap">
          <span class="kicker">家長回報</span>
          <h2>每堂課後都會讓您知道</h2>
          <div class="grid grid--3">
            <div class="card"><h3>課後紀錄</h3><p>記錄學了什麼、孩子表現好的地方，以及需要加強的部分。</p></div>
            <div class="card"><h3>練習單字</h3><p>整理該次的單字，讓您清楚知道在家可以怎麼協助。</p></div>
            <div class="card"><h3>課程錄影</h3><p>錄影後可以重看，錄影期間畫面上會明確顯示。</p></div>
          </div>
        </div>
      </section>

${PRICING_BLOCK}

      <section class="faq">
        <div class="wrap wrap--narrow">
          <span class="kicker">常見問題</span>
          <h2>家長常問的問題</h2>
          <details open><summary>國小幾年級可以開始？</summary><p>我們的學生從 4 歲到 16 歲，國小各年級都可以，會依年級與程度調整內容與教材。</p></details>
          <details><summary>25 分鐘和 50 分鐘怎麼選？</summary><p>一般來說一～三年級考量專注力多選 25 分鐘，四～六年級需要較深入的內容則選 50 分鐘。可以在免費體驗課中確認哪一種適合。</p></details>
          <details><summary>教材需要另外購買嗎？</summary><p>不需要。使用劍橋與牛津教材，教材費已包含在課程費用中。</p></details>
          <details><summary>上課時間怎麼安排？</summary><p>菲律賓與台灣同為 UTC+8，沒有時差，放學後與晚上時段都很順暢。</p></details>
        </div>
      </section>`,
    schema: faqSchema(`${SITE}/tw/guoxiao-yingyu.html`, [
      ['國小幾年級可以開始？', '我們的學生從 4 歲到 16 歲，國小各年級都可以，會依年級與程度調整內容與教材。'],
      ['25 分鐘和 50 分鐘怎麼選？', '一般來說一～三年級考量專注力多選 25 分鐘，四～六年級需要較深入的內容則選 50 分鐘。'],
      ['教材需要另外購買嗎？', '不需要。使用劍橋與牛津教材，教材費已包含在課程費用中。'],
      ['上課時間怎麼安排？', '菲律賓與台灣同為 UTC+8，沒有時差，放學後與晚上時段都很順暢。'],
    ]),
  },
]

async function run() {
  await mkdir(resolve(publicDir, 'tw'), { recursive: true })
  for (const spec of PAGES) {
    await writeFile(resolve(publicDir, spec.file), page(spec), 'utf8')
    console.log(`[taiwan] wrote public/${spec.file}`)
  }
  console.log(`[taiwan] ${PAGES.length} Traditional Chinese pages generated.`)
}

run().catch((error) => {
  console.error('[taiwan] failed:', error)
  process.exit(1)
})
