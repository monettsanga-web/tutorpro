/**
 * Korean discovery pages — how families in South Korea find TutorPro.
 *
 * WHY THIS EXISTS
 * ---------------
 * `/kr/` already existed and is good, but it was a single 472-word page with
 * nothing linking to it and no Korean-language long-tail coverage. Korea does
 * not run on Google: Naver holds the majority of Korean-language search, and
 * Naver's crawler (Yeti) is a different crawler with different habits.
 *
 * A single page cannot rank for the range of things Korean parents actually
 * type. These pages target the real queries — 화상영어 (video English),
 * 초등영어 (elementary English), 필리핀 화상영어 (Philippine video English) —
 * each with genuinely distinct content rather than spun duplicates.
 *
 * HONESTY RULES OBSERVED
 * ----------------------
 * - Pricing mirrors the real rates: 25min ₩15,000, 50min ₩30,000, matching
 *   the $10 / $20 shown everywhere else.
 * - No invented reviews, no star ratings, no fabricated student counts.
 * - Only English claims Cambridge/Oxford alignment, matching the English site.
 * - Teachers are described as Philippine-based, because they are, and because
 *   that is precisely what keeps TutorPro outside Korea's domestic tutoring
 *   rules (see docs/korea-marketing-guide.md).
 *
 * Run: node scripts/build-korea-pages.mjs   (wired into npm run build)
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
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
  // Korean parents overwhelmingly expect KakaoTalk. Set this the moment a
  // KakaoTalk Channel exists and it appears on every Korean page at once.
  kakao: '',
}

const STYLE = `
  *{box-sizing:border-box}
  :root{--lime:#bce94e;--line:rgba(255,255,255,.14);--card:rgba(255,255,255,.07);--muted:#c9bddb}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Apple SD Gothic Neo","Malgun Gothic",sans-serif;background:radial-gradient(circle at 15% 5%,rgba(188,233,78,.14),transparent 30%),linear-gradient(135deg,#090510 0%,#25104d 54%,#111827 100%);color:#fff;line-height:1.75}
  a{color:var(--lime)}
  .wrap{width:min(880px,calc(100% - 32px));margin:auto}
  header{position:sticky;top:0;z-index:10;backdrop-filter:blur(18px);background:rgba(9,5,16,.74);border-bottom:1px solid var(--line)}
  .top{min-height:70px;display:flex;align-items:center;justify-content:space-between;gap:16px}
  .brand{display:flex;align-items:center;gap:10px;font-weight:900;text-decoration:none;color:#fff}
  .brand img{width:40px;height:40px;border-radius:12px}
  .lang{font-size:.82rem;color:var(--muted);text-decoration:none}
  main{padding:38px 0 70px}
  h1{font-size:clamp(1.8rem,4.4vw,2.7rem);letter-spacing:-.03em;line-height:1.25;margin:0 0 12px}
  h2{font-size:1.22rem;margin:32px 0 10px}
  h3{font-size:1rem;margin:14px 0 6px;color:var(--lime)}
  p,li,td{color:var(--muted)}
  .lede{font-size:1.05rem;color:#e6dff5}
  .pill{display:inline-block;border-radius:999px;padding:6px 13px;background:var(--card);border:1px solid var(--line);font-size:.78rem;margin:0 6px 16px 0;color:var(--muted)}
  .btn{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:13px 20px;background:var(--lime);color:#140a29;font-weight:900;text-decoration:none;margin:6px 8px 6px 0}
  .btn--ghost{background:transparent;border:1px solid var(--line);color:#fff}
  .card{border:1px solid var(--line);border-radius:18px;padding:18px 20px;background:var(--card);margin:14px 0}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:.94rem}
  th,td{text-align:left;padding:11px 10px;border-bottom:1px solid var(--line)}
  th{color:#fff;font-size:.8rem}
  .price{font-size:1.6rem;font-weight:900;color:var(--lime)}
  footer{border-top:1px solid var(--line);padding:24px 0;font-size:.84rem;color:var(--muted)}
  footer a{margin-right:14px;display:inline-block}
  ul{padding-left:20px}
  .contact-row{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}
  .contact-row a{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:11px 16px;border:1px solid var(--line);background:var(--card);color:#fff;text-decoration:none;font-weight:700;font-size:.94rem}
  .contact-row a:hover{background:rgba(255,255,255,.13)}
  .krlinks{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:16px 0}
  .krlinks a{display:block;border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:var(--card);text-decoration:none;color:#fff;font-weight:700}
  .krlinks a span{display:block;margin-top:4px;color:var(--muted);font-weight:400;font-size:.88rem}
`

/** The Korean contact block, shared by every page so it can never drift. */
function contactHtml() {
  const kakao = CONTACT.kakao
    ? `<a href="${CONTACT.kakao}" target="_blank" rel="noopener">카카오톡 상담</a>`
    : ''
  return `
      <div class="card">
        <h3>상담 문의</h3>
        <p>궁금한 점은 편하신 방법으로 문의해 주세요. 실제 담당자가 직접 답변드리며, 상담 후 반드시 등록하실 필요는 없습니다.</p>
        <div class="contact-row">
          ${kakao}
          <a href="${CONTACT.messenger}" target="_blank" rel="noopener">페이스북 메신저</a>
          <a href="${CONTACT.whatsapp}" target="_blank" rel="noopener">WhatsApp ${CONTACT.whatsappLabel}</a>
          <a href="${CONTACT.facebook}" target="_blank" rel="noopener">페이스북 페이지</a>
          <a href="mailto:${CONTACT.email}">이메일</a>
        </div>
        <p style="font-size:.86rem">필리핀 DTI 사업자 등록 제5274092호. 상담 과정에서 카드 정보를 요구하지 않습니다.</p>
      </div>`
}

/** Cross-links so every Korean page feeds the others. Naver values this. */
function krLinksHtml(currentSlug) {
  const all = [
    { slug: 'kr/', title: '한국 학부모를 위한 안내', note: '수업료·커리큘럼·강사 소개' },
    { slug: 'kr/hwasang-yeongeo.html', title: '화상영어란 무엇인가요?', note: '학원·그룹수업과의 차이' },
    { slug: 'kr/choding-yeongeo.html', title: '초등 영어 온라인 과외', note: '학년별 학습 목표와 방법' },
    { slug: 'kr/philippine-hwasang-yeongeo.html', title: '필리핀 화상영어 솔직한 안내', note: '장점과 한계까지 그대로' },
  ]
  return `<div class="krlinks">${all
    .filter((p) => p.slug !== currentSlug)
    .map((p) => `<a href="/${p.slug}">${p.title}<span>${p.note}</span></a>`)
    .join('')}</div>`
}

function page({ slug, title, description, keywords, heading, lede, body, schema }) {
  const url = `${SITE}/${slug}`
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#321568" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="keywords" content="${keywords}" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="/assets/pwa-icon-192.png" />
    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="en" href="${SITE}/" />
    <link rel="alternate" hreflang="zh-Hans" href="${SITE}/cn/" />
    <link rel="alternate" hreflang="ko" href="${SITE}/kr/" />
    <link rel="alternate" hreflang="x-default" href="${SITE}/" />
    <meta property="og:type" content="article" />
    <meta property="og:locale" content="ko_KR" />
    <meta property="og:site_name" content="TutorPro 온라인 영어" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${SITE}/assets/tutorpro-hero.webp" />
    <script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
    </script>
    <style>${STYLE}</style>
  </head>
  <body>
    <header>
      <div class="wrap">
        <div class="top">
          <a class="brand" href="/kr/"><img src="/assets/tutorpro-panda-logo.webp" alt="TutorPro 온라인 영어" />TutorPro 온라인 영어</a>
          <a class="lang" href="/">English</a>
        </div>
      </div>
    </header>
    <main>
      <div class="wrap">
        <h1>${heading}</h1>
        <p class="lede">${lede}</p>
        <p>
          <span class="pill">25분 ₩15,000</span>
          <span class="pill">50분 ₩30,000</span>
          <span class="pill">첫 수업 무료</span>
          <span class="pill">약정 없음</span>
        </p>
        <p>
          <a class="btn" href="/">첫 수업 무료로 신청하기</a>
          <a class="btn btn--ghost" href="/kr/">한국 학부모 안내 보기</a>
        </p>
${body}
${contactHtml()}
        <h2>다른 안내도 살펴보세요</h2>
${krLinksHtml(slug)}
      </div>
    </main>
    <footer>
      <div class="wrap">
        <p>
          <a href="/kr/">한국어 안내</a>
          <a href="/">English site</a>
          <a href="/pricing.html">Pricing</a>
          <a href="/about.html">About</a>
          <a href="/contact.html">Contact</a>
        </p>
        <p>© ${new Date().getFullYear()} TutorPro Online English · 필리핀 DTI 사업자 등록 제5274092호 · 필리핀에서 진행되는 온라인 수업입니다.</p>
      </div>
    </footer>
  </body>
</html>
`
}

const faqSchema = (url, qa) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${url}#faq`,
  inLanguage: 'ko',
  mainEntity: qa.map(([q, a]) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
})

const PAGES = [
  {
    slug: 'kr/hwasang-yeongeo.html',
    title: '화상영어란? 어린이 1:1 화상영어 완전 정리 | TutorPro',
    description:
      '화상영어가 무엇인지, 학원·그룹수업과 무엇이 다른지 정리했습니다. 어린이 1:1 화상영어의 장단점, 수업료, 시작 방법까지 솔직하게 안내합니다.',
    keywords: '화상영어, 화상영어란, 어린이 화상영어, 1:1 화상영어, 온라인 영어회화, 초등 화상영어',
    heading: '화상영어란 무엇이고,<br />우리 아이에게 맞을까요?',
    lede:
      '화상영어는 화상 통화로 진행하는 영어 수업입니다. 개념은 단순하지만 수업의 질은 형태에 따라 크게 달라집니다. 판단에 도움이 되도록 장점과 한계를 함께 정리했습니다.',
    body: `
        <h2>화상영어의 기본 개념</h2>
        <p>화상영어는 강사와 학생이 화면을 통해 만나 진행하는 영어 수업입니다. 학원에 오가는 시간이 없고, 집에서 아이가 편안한 상태로 수업에 집중할 수 있습니다. 한국에서는 주로 원어민 또는 영어권 교육을 받은 강사와의 회화 수업을 뜻합니다.</p>
        <p>중요한 것은 '화상'이 아니라 '수업 방식'입니다. 화면으로 진행하더라도 그룹 수업이라면 아이가 말할 기회는 여전히 적습니다.</p>

        <h2>그룹 수업과 1:1 수업의 실제 차이</h2>
        <table>
          <tr><th></th><th>그룹 수업 (4~6명)</th><th>1:1 수업</th></tr>
          <tr><td>아이가 말하는 시간</td><td>수업의 약 1/5 이하</td><td><strong>수업 내내</strong></td></tr>
          <tr><td>수업 속도</td><td>평균에 맞춤</td><td>아이 수준에 맞춤</td></tr>
          <tr><td>실수했을 때</td><td>다른 친구들 앞</td><td>강사와 둘만</td></tr>
          <tr><td>진도 조절</td><td>어려움</td><td>즉시 가능</td></tr>
        </table>
        <p>말하기가 목표라면 이 차이가 결정적입니다. 조용하거나 실수를 부끄러워하는 아이일수록 1:1 수업에서 훨씬 빨리 입을 엽니다.</p>

        <h2>화상영어가 잘 맞는 경우</h2>
        <ul>
          <li>학교에서 영어를 배우지만 말할 기회가 거의 없는 경우</li>
          <li>읽기·쓰기는 되는데 말하기만 유독 어려워하는 경우</li>
          <li>학원 이동 시간이 부담스럽거나 일정이 불규칙한 경우</li>
          <li>또래 앞에서 영어로 말하기를 부끄러워하는 경우</li>
          <li>원어민과 대화할 기회 자체가 필요한 경우</li>
        </ul>

        <h2>솔직하게, 이런 경우에는 신중하세요</h2>
        <p>모든 아이에게 화상영어가 정답은 아닙니다. 다음의 경우에는 다른 방법이 더 나을 수 있습니다.</p>
        <ul>
          <li><strong>집중 시간이 매우 짧은 유아</strong> — 25분도 길게 느낄 수 있습니다. 첫 수업 무료 체험으로 반드시 확인해 보세요.</li>
          <li><strong>내신·문법 시험이 목표인 경우</strong> — 말하기 중심 수업은 도움은 되지만, 시험 대비 전문 수업과는 목적이 다릅니다.</li>
          <li><strong>가정에서 인터넷이 불안정한 경우</strong> — 끊김이 잦으면 수업의 질이 떨어집니다.</li>
        </ul>
        <p>이런 점을 미리 말씀드리는 이유는, 맞지 않는 수업을 등록하시는 것이 서로에게 도움이 되지 않기 때문입니다.</p>

        <h2>수업료</h2>
        <div class="card">
          <p class="price">25분 ₩15,000 &nbsp;·&nbsp; 50분 ₩30,000</p>
          <p>등록비, 교재비, 플랫폼 이용료가 없습니다. 교재와 학습 자료는 모두 포함되어 있습니다. <strong>첫 수업은 무료</strong>이며 카드 등록도 필요하지 않습니다.</p>
        </div>

        <h2>시작하는 방법</h2>
        <ul>
          <li>홈페이지에서 무료 계정을 만듭니다.</li>
          <li>아이의 학년, 커리큘럼, 학습 목표를 입력합니다.</li>
          <li>원하시는 시간에 첫 무료 수업을 예약합니다.</li>
          <li>수업 후 계속할지 결정하시면 됩니다. 약정은 없습니다.</li>
        </ul>`,
    schema: faqSchema(`${SITE}/kr/hwasang-yeongeo.html`, [
      ['화상영어란 무엇인가요?', '화상영어는 화상 통화로 진행하는 영어 수업입니다. TutorPro는 그룹 수업 없이 항상 1:1로 진행하여 아이가 수업 시간 내내 영어로 말할 수 있도록 합니다.'],
      ['그룹 수업과 무엇이 다른가요?', '그룹 수업에서는 아이가 말하는 시간이 전체의 5분의 1 이하로 줄어듭니다. 1:1 수업에서는 수업 내내 아이만 말하며, 수업 속도도 아이 수준에 맞춥니다.'],
      ['수업료는 얼마인가요?', '25분 수업은 ₩15,000, 50분 수업은 ₩30,000입니다. 등록비와 교재비가 없으며 첫 수업은 무료입니다.'],
      ['첫 수업은 정말 무료인가요?', '네. 카드 등록 없이 실제 수업을 체험하신 후 계속할지 결정하시면 됩니다.'],
    ]),
  },

  {
    slug: 'kr/choding-yeongeo.html',
    title: '초등 영어 온라인 과외 — 학년별 학습 안내 | TutorPro',
    description:
      '초등학생 영어를 온라인 1:1로 지도합니다. 저학년 파닉스부터 고학년 읽기·문법·말하기까지 학년별 목표와 수업 방식을 안내합니다. 25분 ₩15,000, 첫 수업 무료.',
    keywords: '초등 영어, 초등 영어 과외, 초등 화상영어, 온라인 영어 과외, 초등학생 영어회화, 파닉스',
    heading: '초등 영어,<br />학년에 맞게 1:1로 지도합니다',
    lede:
      '초등학생은 학년에 따라 필요한 것이 완전히 다릅니다. 1학년에게 필요한 수업과 6학년에게 필요한 수업은 같을 수 없습니다. 학년별로 무엇을 어떻게 하는지 정리했습니다.',
    body: `
        <h2>학년별 학습 목표</h2>
        <div class="grid">
          <div class="card"><h3>1~2학년</h3><p>알파벳과 파닉스를 확실히 잡습니다. 소리와 글자를 연결하고, 짧은 단어를 스스로 읽어내는 경험을 만듭니다. 노래와 그림책, 게임 중심으로 영어를 즐거운 것으로 인식하게 합니다.</p></div>
          <div class="card"><h3>3~4학년</h3><p>학교에서 영어가 정식 교과가 되는 시기입니다. 문장 단위로 읽고 말하는 연습을 하며, 기본 문법을 자연스럽게 익힙니다. 자기 소개, 가족, 일상 같은 주제로 말하기를 시작합니다.</p></div>
          <div class="card"><h3>5~6학년</h3><p>읽기 유창성과 어휘를 확장하고, 자기 생각을 문장으로 표현하는 연습을 합니다. 중학교 영어를 대비해 문법을 체계적으로 정리하고, 짧은 글쓰기도 시작합니다.</p></div>
        </div>

        <h2>수업은 이렇게 진행됩니다</h2>
        <p>모든 수업은 저희가 직접 개발한 브라우저 교실에서 진행됩니다. 별도 프로그램 설치가 필요 없고, 링크를 클릭하면 바로 입장합니다. 강사가 화면에 교재를 띄우고 아이와 함께 판서하며 수업합니다.</p>
        <ul>
          <li><strong>도입</strong> — 지난 수업 복습과 가벼운 대화로 입을 풉니다.</li>
          <li><strong>새 내용</strong> — 새로운 단어와 표현을 배우고 소리 내어 연습합니다.</li>
          <li><strong>활동</strong> — 읽기, 듣기, 역할극 등으로 배운 내용을 사용합니다.</li>
          <li><strong>마무리</strong> — 배운 표현으로 자유롭게 말해 봅니다.</li>
        </ul>
        <p>발음은 AI 발음 코치가 함께 도와드립니다. 단어별로 점수를 확인하고 올바른 발음을 들으며 스스로 교정할 수 있습니다.</p>

        <h2>교재</h2>
        <p>케임브리지와 옥스퍼드의 검증된 원서 교재를 사용합니다. Power Up, Global English, Family and Friends, Oxford Phonics World, THiNK 등이며, 아이의 수준과 목표에 맞춰 선택합니다. 교재비는 수업료에 포함되어 있습니다.</p>

        <h2>학부모님께 드리는 수업 리포트</h2>
        <p>매 수업이 끝나면 강사가 무엇을 배웠는지, 아이가 잘한 점은 무엇인지, 어떤 부분을 더 연습하면 좋을지를 기록해 드립니다. 연습할 단어도 함께 정리되어 집에서 무엇을 도와주면 좋을지 명확해집니다.</p>

        <h2>한국 시간에 맞는 수업</h2>
        <p>한국과 필리핀의 시차는 1시간입니다. 방과 후 오후 시간대와 저녁 시간대 수업이 모두 원활하게 가능하며, 강사가 새벽에 일하지 않으므로 수업의 질이 유지됩니다.</p>

        <h2>수업료</h2>
        <div class="card">
          <p class="price">25분 ₩15,000 &nbsp;·&nbsp; 50분 ₩30,000</p>
          <table>
            <tr><th>수업 시간</th><th>추천 대상</th><th>수업료</th></tr>
            <tr><td>25분</td><td>1~3학년 (집중력에 맞춘 길이)</td><td><strong>₩15,000</strong></td></tr>
            <tr><td>50분</td><td>4~6학년 (심화 학습)</td><td><strong>₩30,000</strong></td></tr>
          </table>
          <p><strong>첫 수업은 무료</strong>이며 카드 등록이 필요 없습니다. 약정도 없어 언제든 중단하실 수 있습니다.</p>
        </div>`,
    schema: faqSchema(`${SITE}/kr/choding-yeongeo.html`, [
      ['초등학생 몇 학년부터 가능한가요?', '4세부터 16세까지 수업하고 있으며, 초등학생은 전 학년 모두 가능합니다. 학년과 수준에 맞춰 수업 내용과 교재를 조정합니다.'],
      ['25분과 50분 중 어느 것이 좋을까요?', '보통 1~3학년은 집중력을 고려해 25분을, 4~6학년은 심화 학습이 가능한 50분을 선택하십니다. 첫 무료 수업에서 아이에게 맞는 길이를 확인해 보실 수 있습니다.'],
      ['교재는 따로 구입해야 하나요?', '아닙니다. 케임브리지와 옥스퍼드 교재를 사용하며 교재비는 수업료에 포함되어 있습니다.'],
      ['수업 시간은 한국 시간으로 언제 가능한가요?', '한국과 필리핀은 1시간 차이여서 방과 후 오후와 저녁 시간대 수업이 원활하게 가능합니다.'],
    ]),
  },

  {
    slug: 'kr/philippine-hwasang-yeongeo.html',
    title: '필리핀 화상영어, 솔직하게 말씀드립니다 | TutorPro',
    description:
      '필리핀 화상영어의 장점과 한계를 솔직하게 정리했습니다. 강사 선발 방식, 발음, 수업료, 미국·영국 강사와의 차이까지 과장 없이 안내합니다.',
    keywords: '필리핀 화상영어, 필리핀 영어, 화상영어 추천, 저렴한 화상영어, 원어민 화상영어 비교',
    heading: '필리핀 화상영어,<br />솔직하게 말씀드립니다',
    lede:
      '필리핀 화상영어에 대해 좋은 말만 하는 곳은 많습니다. 저희는 장점과 한계를 모두 말씀드리겠습니다. 그래야 학부모님이 제대로 판단하실 수 있습니다.',
    body: `
        <h2>먼저, 저희가 누구인지 분명히 말씀드립니다</h2>
        <p>TutorPro는 필리핀에 등록된 사업체이며(DTI 사업자 등록 제5274092호), 강사들은 필리핀에 거주하며 필리핀에서 수업합니다. 한국의 학원이 아니고, 강사가 한국에 있지도 않습니다. 온라인으로 한국 가정에 수업을 제공하는 해외 업체입니다. 이 점을 숨기지 않습니다.</p>

        <h2>필리핀 강사의 실제 장점</h2>
        <ul>
          <li><strong>영어가 공용어입니다.</strong> 필리핀은 영어가 공식 언어 중 하나이며, 학교 수업과 대학 교육이 영어로 진행됩니다. 배워서 쓰는 언어가 아니라 일상에서 쓰는 언어입니다.</li>
          <li><strong>가격 대비 수업 시간이 깁니다.</strong> 같은 예산으로 미국·영국 강사보다 훨씬 많은 수업을 들을 수 있습니다. 언어는 빈도가 중요하기 때문에 이는 실질적인 장점입니다.</li>
          <li><strong>인내심 있는 수업 문화</strong> — 필리핀 강사들은 아이가 틀려도 여유 있게 기다려 주는 것으로 평가받습니다. 말하기를 부끄러워하는 아이에게 특히 중요합니다.</li>
          <li><strong>시차가 1시간뿐입니다.</strong> 강사가 한밤중에 일하지 않으므로 수업의 질이 유지됩니다.</li>
        </ul>

        <h2>한계도 말씀드립니다</h2>
        <ul>
          <li><strong>발음은 미국식·영국식과 다릅니다.</strong> 필리핀 영어는 미국 영어의 영향을 많이 받았지만 완전히 같지는 않습니다. 아이가 특정 국가의 억양을 그대로 익히기를 원하신다면 해당 국가 강사를 선택하시는 것이 맞습니다.</li>
          <li><strong>모든 강사가 같지 않습니다.</strong> 이는 어느 나라든 마찬가지입니다. 그래서 저희는 선발 과정을 아래에 공개합니다.</li>
          <li><strong>인터넷 환경에 영향을 받습니다.</strong> 저희는 강사의 회선 상태를 확인하지만, 100% 완벽을 보장할 수는 없습니다.</li>
        </ul>
        <p>이런 내용을 먼저 말씀드리는 이유는, 기대와 다른 수업을 등록하시면 결국 아이의 시간이 낭비되기 때문입니다.</p>

        <h2>강사는 이렇게 선발합니다</h2>
        <p>지원자는 구조화된 절차를 거칩니다. 녹화된 시범 수업을 제출해야 하며, 저희가 이를 직접 심사합니다. 학력과 교육 경력을 확인하고, 아동 대상 수업 경험을 중요하게 봅니다. 심사를 통과한 강사만 학생을 배정받습니다.</p>
        <p>수업 후에는 학부모님이 강사를 평가하실 수 있으며, 이 평가는 실제로 강사 배정에 반영됩니다.</p>

        <h2>미국·영국 강사와 비교하면</h2>
        <table>
          <tr><th></th><th>필리핀 강사</th><th>미국·영국 강사</th></tr>
          <tr><td>수업료</td><td><strong>25분 ₩15,000</strong></td><td>보통 2~4배</td></tr>
          <tr><td>같은 예산의 수업 횟수</td><td>많음</td><td>적음</td></tr>
          <tr><td>억양</td><td>미국식에 가까움</td><td>해당 국가 억양</td></tr>
          <tr><td>시차</td><td>1시간</td><td>13~16시간</td></tr>
          <tr><td>수업 가능 시간</td><td>방과 후·저녁 원활</td><td>제한적</td></tr>
        </table>
        <p>정답은 없습니다. 억양이 최우선이라면 원어민 강사를, 말하기 빈도와 지속 가능한 비용이 중요하다면 필리핀 강사를 권해 드립니다.</p>

        <h2>확인해 보시고 결정하세요</h2>
        <p>글로 판단하기 어려운 부분입니다. 첫 수업은 무료이고 카드 등록도 필요 없으니, 실제 수업을 보시고 아이의 반응으로 판단하시는 것이 가장 정확합니다.</p>`,
    schema: faqSchema(`${SITE}/kr/philippine-hwasang-yeongeo.html`, [
      ['필리핀 강사의 발음은 괜찮은가요?', '필리핀은 영어가 공용어이며 대학 교육이 영어로 진행됩니다. 발음은 미국식에 가깝지만 완전히 동일하지는 않습니다. 특정 국가의 억양을 그대로 익히기를 원하신다면 해당 국가 강사가 더 적합합니다.'],
      ['강사는 어떻게 선발하나요?', '지원자는 녹화된 시범 수업을 제출해야 하며 저희가 직접 심사합니다. 학력과 교육 경력을 확인하고, 아동 대상 수업 경험을 중요하게 평가합니다.'],
      ['한국 학원과 무엇이 다른가요?', 'TutorPro는 한국 학원이 아니라 필리핀에 등록된 사업체(DTI 제5274092호)이며, 강사들은 필리핀에서 온라인으로 수업합니다.'],
      ['수업료는 얼마인가요?', '25분 ₩15,000, 50분 ₩30,000입니다. 등록비와 교재비가 없고 첫 수업은 무료입니다.'],
    ]),
  },
]

async function run() {
  await mkdir(resolve(publicDir, 'kr'), { recursive: true })
  for (const spec of PAGES) {
    await writeFile(resolve(publicDir, spec.slug), page(spec), 'utf8')
    console.log(`[korea] wrote public/${spec.slug}`)
  }
  console.log(`[korea] ${PAGES.length} Korean pages generated.`)
}

run().catch((error) => {
  console.error('[korea] failed:', error)
  process.exit(1)
})
