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


/**
 * Inline SVG icons.
 *
 * Emoji were used first and rendered as empty boxes wherever the OS lacked
 * the glyph, and looked different on every platform even when they worked.
 * These are stroke icons on currentColor, so they inherit the tile colour and
 * are identical for every parent.
 */
const ICON = {
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  laptop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/></svg>',
  report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m23 7-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
  bear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14" r="6"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M10 14h.01M14 14h.01M10.5 17a2.5 2.5 0 0 0 3 0"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>',
  speak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>',
  smile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 14a4.5 4.5 0 0 0 8 0"/><path d="M9 9h.01M15 9h.01"/></svg>',
  abc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18 7 6l4 12M4.5 14h5"/><path d="M14 18V6h3a3 3 0 0 1 0 6h-3M17 12a3 3 0 0 1 0 6h-3"/></svg>',
  money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9a3 3 0 0 0-3-1.5c-1.7 0-3 1-3 2.2 0 2.8 6 1.6 6 4.6 0 1.2-1.3 2.2-3 2.2A3 3 0 0 1 9 15"/><path d="M12 6v12"/></svg>',
  hands: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 13V5a1.5 1.5 0 0 1 3 0v6"/><path d="M14 11V4a1.5 1.5 0 0 1 3 0v8"/><path d="M17 11.5V7a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.2-3L4 14a1.5 1.5 0 0 1 2.6-1.5L8 15"/></svg>',
}

/** Shared chrome. The stylesheet lives in public/assets/kr.css. */
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
    <link rel="alternate" hreflang="ko" href="${SITE}/kr/" />
    <link rel="alternate" hreflang="x-default" href="${SITE}/" />
    <meta property="og:type" content="article" />
    <meta property="og:locale" content="ko_KR" />
    <meta property="og:site_name" content="TutorPro 온라인 영어" />
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
        <a class="brand" href="/kr/"><img src="/assets/tutorpro-panda-logo.webp" alt="TutorPro 온라인 영어" width="42" height="42" />TutorPro 온라인 영어</a>
        <div class="head-actions">
          <a class="head-lang" href="/">English</a>
          <a class="btn btn--sm" href="/">첫 수업 무료 신청</a>
        </div>
      </div>
    </header>`
}

/** Contact block. Shared so the channels can never drift between pages. */
function contactSection() {
  const kakao = CONTACT.kakao
    ? `<a class="channel" href="${CONTACT.kakao}" target="_blank" rel="noopener"><span class="channel__dot" style="background:#fee500"></span>카카오톡 상담</a>`
    : ''
  return `    <section class="tight">
      <div class="wrap">
        <div class="contact-card">
          <span class="kicker">상담 문의</span>
          <h2>궁금한 점은 편하게 물어보세요</h2>
          <p class="section-lede">실제 담당자가 직접 답변드립니다. 상담 후 반드시 등록하실 필요는 없고, 아이에게 맞지 않는다고 판단되면 솔직하게 말씀드립니다.</p>
          <div class="channels">
            ${kakao}
            <a class="channel" href="${CONTACT.messenger}" target="_blank" rel="noopener"><span class="channel__dot" style="background:#1877f2"></span>페이스북 메신저</a>
            <a class="channel" href="${CONTACT.whatsapp}" target="_blank" rel="noopener"><span class="channel__dot" style="background:#25d366"></span>WhatsApp ${CONTACT.whatsappLabel}</a>
            <a class="channel" href="${CONTACT.facebook}" target="_blank" rel="noopener"><span class="channel__dot" style="background:#1877f2"></span>페이스북 페이지</a>
            <a class="channel" href="mailto:${CONTACT.email}"><span class="channel__dot" style="background:#716981"></span>이메일</a>
          </div>
          <p class="fine">필리핀 DTI 사업자 등록 제5274092호 · 상담 과정에서 카드 정보를 요구하지 않습니다.</p>
        </div>
      </div>
    </section>`
}

function relatedSection(currentSlug) {
  const all = [
    { slug: 'kr/', title: '한국 학부모를 위한 안내', note: '수업료·커리큘럼·강사 소개' },
    { slug: 'kr/hwasang-yeongeo.html', title: '화상영어란 무엇인가요?', note: '학원·그룹수업과의 차이' },
    { slug: 'kr/choding-yeongeo.html', title: '초등 영어 온라인 과외', note: '학년별 학습 목표와 방법' },
    { slug: 'kr/philippine-hwasang-yeongeo.html', title: '필리핀 화상영어 솔직한 안내', note: '장점과 한계까지 그대로' },
  ].filter((p) => p.slug !== currentSlug)
  return `    <section class="tight alt">
      <div class="wrap">
        <span class="kicker">함께 보면 좋은 안내</span>
        <h2>다른 안내도 살펴보세요</h2>
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
          <h2>첫 수업은 무료입니다</h2>
          <p>카드 등록도, 약정도 없습니다. 실제 수업을 보시고 아이의 반응으로 판단하세요.</p>
          <p style="margin-top:22px"><a class="btn" href="/">첫 수업 무료로 신청하기</a></p>
        </div>
      </div>
    </section>`
}

function siteFooter() {
  return `    <footer class="site-foot">
      <div class="wrap">
        <p>
          <a href="/kr/">한국어 안내</a>
          <a href="/">English site</a>
          <a href="/pricing.html">수업료</a>
          <a href="/about.html">회사 소개</a>
          <a href="/contact.html">문의</a>
        </p>
        <p>© ${new Date().getFullYear()} TutorPro Online English · 필리핀 DTI 사업자 등록 제5274092호 · 필리핀에서 진행되는 온라인 수업입니다.</p>
      </div>
    </footer>
    <div class="sticky-cta">
      <a class="btn" href="/">첫 수업 무료 신청</a>
      <a class="btn btn--ghost" href="${CONTACT.messenger}" target="_blank" rel="noopener">상담하기</a>
    </div>`
}

function page({ slug, title, description, keywords, heading, lede, hero, body, schema }) {
  const url = `${SITE}/${slug}`
  return `<!doctype html>
<html lang="ko">
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
                <a class="btn" href="/">첫 수업 무료로 신청하기</a>
                <a class="btn btn--ghost" href="#pricing">수업료 보기</a>
              </div>
              <p class="hero__note">25분 ₩15,000 · 50분 ₩30,000 · 카드 등록 없음 · 약정 없음</p>
            </div>
            <div class="hero__art">
              <img src="/assets/tutorpro-hero.webp" alt="온라인으로 영어를 배우는 어린이" width="800" height="600" loading="eager" />
            </div>
          </div>
          <div class="trust">
            <div><strong>1:1</strong><span>그룹 수업 없음</span></div>
            <div><strong>무료</strong><span>첫 수업 체험</span></div>
            <div><strong>1시간</strong><span>한국과의 시차</span></div>
            <div><strong>DTI 등록</strong><span>제5274092호</span></div>
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
    slug: 'kr/',
    file: 'kr/index.html',
    title: 'TutorPro 온라인 영어 — 어린이 1:1 화상영어 | 첫 수업 무료',
    description:
      '필리핀 강사와 함께하는 어린이 1:1 화상영어. 케임브리지·옥스퍼드 커리큘럼, 25분 ₩15,000 / 50분 ₩30,000. 첫 수업 무료 체험, 카드 등록 없음.',
    keywords: '화상영어, 어린이 화상영어, 초등 영어 과외, 1:1 온라인 영어, 필리핀 화상영어, 케임브리지 영어, 온라인 영어 수업',
    hero: { eyebrow: '한국 학부모를 위한 안내' },
    heading: '아이가 영어로<br />말하기 시작합니다',
    lede:
      '그룹 수업에서 차례를 기다릴 필요가 없습니다. 수업 내내 우리 아이만 말합니다. 케임브리지·옥스퍼드 커리큘럼에 맞춘 1:1 화상영어입니다.',
    body: `      <section>
        <div class="wrap">
          <span class="kicker">왜 TutorPro인가요</span>
          <h2>여섯 가지 분명한 차이</h2>
          <div class="grid grid--3">
            <div class="card card--lift"><div class="card__icon">${ICON.user}</div><h3>완전한 1:1 수업</h3><p>그룹 수업이 없습니다. 모든 레벨에서 항상 1:1로 진행되어 아이가 수업 시간 내내 영어로 말합니다.</p></div>
            <div class="card card--lift"><div class="card__icon card__icon--sky">${ICON.book}</div><h3>케임브리지·옥스퍼드 교재</h3><p>Power Up, Global English, Family and Friends, THiNK 등 검증된 원서 교재로 수업합니다.</p></div>
            <div class="card card--lift"><div class="card__icon card__icon--gold">${ICON.clock}</div><h3>한국 시간 그대로</h3><p>한국과 필리핀은 1시간 차이입니다. 방과 후 오후·저녁 시간대 수업이 원활하게 가능합니다.</p></div>
            <div class="card card--lift"><div class="card__icon card__icon--coral">${ICON.laptop}</div><h3>설치 프로그램 없음</h3><p>줌이나 별도 앱이 필요 없습니다. 자체 개발한 브라우저 교실에서 클릭 한 번으로 입장합니다.</p></div>
            <div class="card card--lift"><div class="card__icon">${ICON.report}</div><h3>수업 후 학부모 리포트</h3><p>매 수업 후 강사가 학습 내용, 잘한 점, 보완할 점과 연습할 단어를 기록해 드립니다.</p></div>
            <div class="card card--lift"><div class="card__icon card__icon--sky">${ICON.video}</div><h3>수업 녹화 가능</h3><p>수업을 녹화하여 학부모님이 나중에 다시 보실 수 있습니다. 녹화 중에는 화면에 표시됩니다.</p></div>
          </div>
        </div>
      </section>

      <section class="alt" id="pricing">
        <div class="wrap">
          <span class="kicker">수업료</span>
          <h2>투명한 요금, 숨은 비용 없음</h2>
          <p class="section-lede">한국 학생을 위한 요금입니다. 등록비, 교재비, 플랫폼 이용료가 없으며 교재와 학습 자료는 모두 포함되어 있습니다.</p>
          <div class="price-grid">
            <div class="price-card price-card--feature">
              <span class="price-card__tag">유아·초등 저학년 추천</span>
              <h3>25분 수업</h3>
              <span class="price-card__amount">₩15,000 <small>/ 1회</small></span>
              <p>집중력에 맞춘 길이입니다.</p>
            </div>
            <div class="price-card">
              <h3>50분 수업</h3>
              <span class="price-card__amount">₩30,000 <small>/ 1회</small></span>
              <p>초등 고학년·중고등의 심화 학습에 적합합니다.</p>
            </div>
          </div>
          <p class="price-note">✓ <strong>첫 수업은 무료입니다.</strong> 카드 등록 없이 실제 수업을 체험하신 후 결정하세요.</p>
        </div>
      </section>

      <section>
        <div class="wrap">
          <span class="kicker">수업 진행</span>
          <h2>한 번의 수업은 이렇게 흘러갑니다</h2>
          <p class="section-lede">수업은 25분 또는 50분이며, 저희가 직접 개발한 브라우저 교실에서 진행됩니다. 강사가 화면에 학습 자료를 띄우고 아이와 함께 판서하며 수업합니다.</p>
          <div class="steps">
            <div class="step"><h3>도입</h3><p>간단한 대화로 편안하게 시작합니다.</p></div>
            <div class="step"><h3>새 표현</h3><p>새 단어와 표현을 배우고 소리 내어 연습합니다.</p></div>
            <div class="step"><h3>활동</h3><p>읽기·듣기 활동으로 배운 내용을 사용합니다.</p></div>
            <div class="step"><h3>말하기</h3><p>배운 표현으로 자유롭게 말하는 시간을 갖습니다.</p></div>
          </div>
          <p style="margin-top:20px">발음 연습에는 AI 발음 코치가 함께합니다. 아이의 발음을 단어별로 점수화하고 올바른 발음을 들려주어 스스로 교정할 수 있게 돕습니다.</p>
        </div>
      </section>

      <section class="alt">
        <div class="wrap">
          <span class="kicker">연령별 수업</span>
          <h2>나이에 맞는 방식으로</h2>
          <div class="grid grid--3">
            <div class="card"><div class="card__icon">${ICON.bear}</div><h3>4~7세</h3><p>파닉스, 첫 단어, 노래와 게임으로 영어에 대한 거부감을 없앱니다.</p></div>
            <div class="card"><div class="card__icon card__icon--sky">${ICON.book}</div><h3>8~11세</h3><p>읽기 유창성, 문법, 문장으로 말하기, 학교 영어 보완을 다룹니다.</p></div>
            <div class="card"><div class="card__icon card__icon--gold">${ICON.pencil}</div><h3>12~16세</h3><p>쓰기, 독해, 심화 문법, 시험 대비 스피킹을 준비합니다.</p></div>
          </div>
        </div>
      </section>

      <section>
        <div class="wrap">
          <span class="kicker">교재</span>
          <h2>검증된 원서 교재로 수업합니다</h2>
          <p class="section-lede">교재비는 수업료에 포함되어 있습니다.</p>
          <div class="books">
            <figure><img src="/assets/curriculum/oxford-phonics-world-drive.jpg" alt="Oxford Phonics World 교재" loading="lazy" /></figure>
            <figure><img src="/assets/curriculum/family-and-friends-drive.jpg" alt="Family and Friends 교재" loading="lazy" /></figure>
            <figure><img src="/assets/curriculum/global-english-drive.jpg" alt="Cambridge Global English 교재" loading="lazy" /></figure>
            <figure><img src="/assets/curriculum/grammar-friends-drive.jpg" alt="Grammar Friends 교재" loading="lazy" /></figure>
            <figure><img src="/assets/curriculum/lets-go-drive.jpg" alt="Let's Go 교재" loading="lazy" /></figure>
          </div>
        </div>
      </section>

      <section class="alt">
        <div class="wrap wrap--narrow">
          <span class="kicker">강사</span>
          <h2>강사에 대해</h2>
          <p>모든 강사는 구조화된 지원 절차를 거칩니다. <strong>녹화된 시범 수업 심사</strong>와 자격·경력 검증을 통과한 강사만 학생을 배정받습니다. 아동 대상 수업 경험을 중요하게 평가합니다.</p>
          <p>강사들은 필리핀에 거주하며 필리핀에서 수업합니다. TutorPro는 한국의 학원이 아니라 필리핀에 등록된 사업체(DTI 제5274092호)입니다. 이 점을 숨기지 않습니다.</p>
          <p><a href="/kr/philippine-hwasang-yeongeo.html">필리핀 화상영어의 장점과 한계를 더 자세히 보기 →</a></p>
        </div>
      </section>

      <section class="faq">
        <div class="wrap wrap--narrow">
          <span class="kicker">자주 묻는 질문</span>
          <h2>궁금하실 만한 것들</h2>
          <details open><summary>첫 수업은 정말 무료인가요?</summary><p>네. 카드 등록 없이 실제 수업을 체험하신 후 계속할지 결정하시면 됩니다.</p></details>
          <details><summary>수업료는 얼마인가요?</summary><p>25분 수업은 ₩15,000, 50분 수업은 ₩30,000입니다. 등록비와 교재비가 없습니다.</p></details>
          <details><summary>몇 살부터 수업할 수 있나요?</summary><p>4세부터 16세까지 수업하고 있습니다. 연령과 수준에 맞춰 수업 내용과 교재를 조정합니다.</p></details>
          <details><summary>수업 시간은 한국 시간으로 언제 가능한가요?</summary><p>한국과 필리핀은 1시간 차이여서 방과 후 오후와 저녁 시간대 수업이 원활하게 가능합니다.</p></details>
          <details><summary>별도 프로그램을 설치해야 하나요?</summary><p>아닙니다. 저희가 직접 개발한 브라우저 교실에서 진행되며, 링크를 클릭하면 바로 입장합니다.</p></details>
        </div>
      </section>`,
    schema: {
          "@context": "https://schema.org",
          "@graph": [
                {
                      "@type": "Course",
                      "@id": "https://www.tutorpro.site/kr/#course",
                      "name": "어린이 1:1 온라인 영어 수업",
                      "description": "케임브리지·옥스퍼드 커리큘럼에 맞춘 어린이·청소년 1:1 화상영어 수업입니다. 25분 또는 50분 수업으로 진행됩니다.",
                      "url": "https://www.tutorpro.site/kr/",
                      "inLanguage": "ko",
                      "provider": {
                            "@type": "EducationalOrganization",
                            "name": "TutorPro Online English",
                            "sameAs": "https://www.tutorpro.site/",
                            "identifier": {
                                  "@type": "PropertyValue",
                                  "propertyID": "DTI Business Name Registration",
                                  "value": "5274092"
                            },
                            "address": {
                                  "@type": "PostalAddress",
                                  "addressCountry": "PH"
                            }
                      },
                      "hasCourseInstance": [
                            {
                                  "@type": "CourseInstance",
                                  "courseMode": "online",
                                  "courseWorkload": "PT25M",
                                  "location": {
                                        "@type": "VirtualLocation",
                                        "url": "https://www.tutorpro.site/"
                                  },
                                  "courseSchedule": {
                                        "@type": "Schedule",
                                        "duration": "PT25M",
                                        "repeatFrequency": "Weekly",
                                        "repeatCount": 4
                                  },
                                  "offers": {
                                        "@type": "Offer",
                                        "category": "Paid",
                                        "price": "15000",
                                        "priceCurrency": "KRW",
                                        "availability": "https://schema.org/InStock",
                                        "url": "https://www.tutorpro.site/kr/"
                                  }
                            }
                      ],
                      "offers": [
                            {
                                  "@type": "Offer",
                                  "name": "25분 수업",
                                  "category": "Paid",
                                  "price": "15000",
                                  "priceCurrency": "KRW",
                                  "availability": "https://schema.org/InStock",
                                  "url": "https://www.tutorpro.site/kr/"
                            },
                            {
                                  "@type": "Offer",
                                  "name": "50분 수업",
                                  "category": "Paid",
                                  "price": "30000",
                                  "priceCurrency": "KRW",
                                  "availability": "https://schema.org/InStock",
                                  "url": "https://www.tutorpro.site/kr/"
                            }
                      ]
                },
                {
                      "@type": "FAQPage",
                      "@id": "https://www.tutorpro.site/kr/#faq",
                      "mainEntity": [
                            {
                                  "@type": "Question",
                                  "name": "수업료는 얼마인가요?",
                                  "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": "25분 수업은 ₩15,000, 50분 수업은 ₩30,000입니다. 첫 수업은 무료로 체험하실 수 있으며 카드 등록도 필요하지 않습니다."
                                  }
                            },
                            {
                                  "@type": "Question",
                                  "name": "강사는 어디에 계신가요?",
                                  "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": "모든 강사는 필리핀에 거주하며 필리핀에서 온라인으로 수업을 진행합니다. TutorPro Online English는 필리핀 통상산업부(DTI)에 등록된 사업체입니다. 등록번호 5274092."
                                  }
                            },
                            {
                                  "@type": "Question",
                                  "name": "수업 시간은 어떻게 되나요?",
                                  "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": "한국 시간 기준으로 예약하실 수 있습니다. 한국과 필리핀은 1시간 차이라 방과 후 시간대 수업이 원활합니다. 대시보드에 표시되는 시간은 자동으로 한국 시간으로 변환됩니다."
                                  }
                            },
                            {
                                  "@type": "Question",
                                  "name": "줌이나 별도 프로그램 설치가 필요한가요?",
                                  "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": "필요 없습니다. 자체 개발한 브라우저 교실에서 수업이 진행됩니다. 링크 하나로 바로 입장할 수 있습니다."
                                  }
                            },
                            {
                                  "@type": "Question",
                                  "name": "환불이 가능한가요?",
                                  "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": "사용하지 않은 수업권은 구매 후 14일 이내에 환불 가능합니다. 수업 12시간 전까지 취소하시면 수업권이 전액 복구됩니다."
                                  }
                            }
                      ]
                }
          ]
    },
  },

  {
    slug: 'kr/hwasang-yeongeo.html',
    title: '화상영어란? 어린이 1:1 화상영어 완전 정리 | TutorPro',
    description:
      '화상영어가 무엇인지, 학원·그룹수업과 무엇이 다른지 정리했습니다. 어린이 1:1 화상영어의 장단점, 수업료, 시작 방법까지 솔직하게 안내합니다.',
    keywords: '화상영어, 화상영어란, 어린이 화상영어, 1:1 화상영어, 온라인 영어회화, 초등 화상영어',
    hero: { eyebrow: '처음 알아보시는 학부모님께' },
    heading: '화상영어란 무엇이고,<br />우리 아이에게 맞을까요?',
    lede:
      '화상영어는 화상 통화로 진행하는 영어 수업입니다. 개념은 단순하지만 수업의 질은 형태에 따라 크게 달라집니다. 판단에 도움이 되도록 장점과 한계를 함께 정리했습니다.',
    body: `      <section>
        <div class="wrap wrap--narrow">
          <span class="kicker">기본 개념</span>
          <h2>화상영어의 기본 개념</h2>
          <p class="section-lede">화상영어는 강사와 학생이 화면을 통해 만나 진행하는 영어 수업입니다. 학원에 오가는 시간이 없고, 집에서 아이가 편안한 상태로 수업에 집중할 수 있습니다.</p>
          <p>중요한 것은 '화상'이 아니라 '수업 방식'입니다. 화면으로 진행하더라도 그룹 수업이라면 아이가 말할 기회는 여전히 적습니다.</p>
        </div>
      </section>

      <section class="alt">
        <div class="wrap">
          <span class="kicker">가장 큰 차이</span>
          <h2>그룹 수업과 1:1 수업의 실제 차이</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th></th><th>그룹 수업 (4~6명)</th><th>1:1 수업</th></tr></thead>
              <tbody>
                <tr><td><strong>아이가 말하는 시간</strong></td><td>수업의 약 1/5 이하</td><td class="yes">수업 내내</td></tr>
                <tr><td><strong>수업 속도</strong></td><td>평균에 맞춤</td><td class="yes">아이 수준에 맞춤</td></tr>
                <tr><td><strong>실수했을 때</strong></td><td>다른 친구들 앞</td><td class="yes">강사와 둘만</td></tr>
                <tr><td><strong>진도 조절</strong></td><td>어려움</td><td class="yes">즉시 가능</td></tr>
              </tbody>
            </table>
          </div>
          <p style="margin-top:18px">말하기가 목표라면 이 차이가 결정적입니다. 조용하거나 실수를 부끄러워하는 아이일수록 1:1 수업에서 훨씬 빨리 입을 엽니다.</p>
        </div>
      </section>

      <section>
        <div class="wrap">
          <span class="kicker">적합도 확인</span>
          <h2>화상영어가 잘 맞는 경우</h2>
          <div class="grid grid--3">
            <div class="card card--lift"><div class="card__icon">${ICON.speak}</div><h3>말할 기회가 없어요</h3><p>학교에서 영어를 배우지만 실제로 말해 볼 기회가 거의 없는 경우입니다.</p></div>
            <div class="card card--lift"><div class="card__icon card__icon--sky">${ICON.book}</div><h3>읽기는 되는데 말하기가</h3><p>읽기·쓰기는 곧잘 하는데 말하기만 유독 어려워하는 경우입니다.</p></div>
            <div class="card card--lift"><div class="card__icon card__icon--gold">${ICON.clock}</div><h3>학원 이동이 부담돼요</h3><p>이동 시간이 아깝거나 아이 일정이 불규칙한 경우입니다.</p></div>
            <div class="card card--lift"><div class="card__icon card__icon--coral">${ICON.smile}</div><h3>또래 앞에서 부끄러워해요</h3><p>친구들 앞에서 영어로 말하기를 유독 어려워하는 경우입니다.</p></div>
            <div class="card card--lift"><div class="card__icon">${ICON.globe}</div><h3>원어민 대화가 필요해요</h3><p>영어로 실제 대화할 기회 자체가 필요한 경우입니다.</p></div>
            <div class="card card--lift"><div class="card__icon card__icon--sky">${ICON.home}</div><h3>집에서 하고 싶어요</h3><p>익숙한 환경에서 편안하게 배우는 편이 잘 맞는 아이입니다.</p></div>
          </div>
        </div>
      </section>

      <section class="alt">
        <div class="wrap wrap--narrow">
          <span class="kicker">솔직하게</span>
          <h2>이런 경우에는 신중하세요</h2>
          <p class="section-lede">모든 아이에게 화상영어가 정답은 아닙니다. 맞지 않는 수업을 등록하시면 결국 아이의 시간이 낭비되기 때문에, 미리 말씀드립니다.</p>
          <div class="grid grid--2" style="margin-top:20px">
            <div class="card"><h3>집중 시간이 매우 짧은 유아</h3><p>25분도 길게 느낄 수 있습니다. 첫 수업 무료 체험으로 반드시 확인해 보세요.</p></div>
            <div class="card"><h3>내신·문법 시험이 목표</h3><p>말하기 중심 수업은 도움이 되지만, 시험 대비 전문 수업과는 목적이 다릅니다.</p></div>
            <div class="card"><h3>인터넷이 불안정한 가정</h3><p>끊김이 잦으면 수업의 질이 떨어집니다. 먼저 환경을 확인해 주세요.</p></div>
            <div class="card"><h3>아이가 완강히 거부할 때</h3><p>억지로 시작하면 영어 자체를 싫어하게 됩니다. 시기를 조금 미루는 편이 낫습니다.</p></div>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div class="wrap">
          <span class="kicker">수업료</span>
          <h2>투명한 요금, 숨은 비용 없음</h2>
          <div class="price-grid">
            <div class="price-card price-card--feature">
              <span class="price-card__tag">유아·초등 저학년 추천</span>
              <h3>25분 수업</h3>
              <span class="price-card__amount">₩15,000 <small>/ 1회</small></span>
              <p>집중력에 맞춘 길이입니다. 짧고 자주 하는 편이 어린 아이에게 효과적입니다.</p>
            </div>
            <div class="price-card">
              <h3>50분 수업</h3>
              <span class="price-card__amount">₩30,000 <small>/ 1회</small></span>
              <p>초등 고학년과 중고등학생에게 권해 드립니다. 읽기·쓰기까지 다룰 수 있습니다.</p>
            </div>
          </div>
          <p class="price-note">✓ 등록비 없음 · 교재비 없음 · 플랫폼 이용료 없음 · <strong>첫 수업 무료, 카드 등록 불필요</strong></p>
        </div>
      </section>

      <section class="alt">
        <div class="wrap">
          <span class="kicker">시작 방법</span>
          <h2>네 단계면 첫 수업까지</h2>
          <div class="steps">
            <div class="step"><h3>무료 계정 만들기</h3><p>홈페이지에서 이메일로 간단히 가입합니다.</p></div>
            <div class="step"><h3>아이 정보 입력</h3><p>학년, 커리큘럼, 학습 목표를 알려 주세요.</p></div>
            <div class="step"><h3>시간 선택</h3><p>원하시는 시간에 첫 무료 수업을 예약합니다.</p></div>
            <div class="step"><h3>수업 후 결정</h3><p>계속할지 그때 정하시면 됩니다. 약정은 없습니다.</p></div>
          </div>
        </div>
      </section>

      <section class="faq">
        <div class="wrap wrap--narrow">
          <span class="kicker">자주 묻는 질문</span>
          <h2>궁금하실 만한 것들</h2>
          <details open><summary>화상영어란 무엇인가요?</summary><p>화상 통화로 진행하는 영어 수업입니다. TutorPro는 그룹 수업 없이 항상 1:1로 진행하여 아이가 수업 시간 내내 영어로 말할 수 있도록 합니다.</p></details>
          <details><summary>그룹 수업과 무엇이 다른가요?</summary><p>그룹 수업에서는 아이가 말하는 시간이 전체의 5분의 1 이하로 줄어듭니다. 1:1 수업에서는 수업 내내 아이만 말하며, 수업 속도도 아이 수준에 맞춥니다.</p></details>
          <details><summary>수업료는 얼마인가요?</summary><p>25분 수업은 ₩15,000, 50분 수업은 ₩30,000입니다. 등록비와 교재비가 없으며 첫 수업은 무료입니다.</p></details>
          <details><summary>첫 수업은 정말 무료인가요?</summary><p>네. 카드 등록 없이 실제 수업을 체험하신 후 계속할지 결정하시면 됩니다.</p></details>
        </div>
      </section>`,
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
    hero: { eyebrow: '초등 1학년 ~ 6학년' },
    heading: '초등 영어,<br />학년에 맞게 1:1로 지도합니다',
    lede:
      '초등학생은 학년에 따라 필요한 것이 완전히 다릅니다. 1학년에게 필요한 수업과 6학년에게 필요한 수업은 같을 수 없습니다. 학년별로 무엇을 어떻게 하는지 정리했습니다.',
    body: `      <section>
        <div class="wrap">
          <span class="kicker">학년별 목표</span>
          <h2>지금 우리 아이에게 필요한 것</h2>
          <div class="grid grid--3">
            <div class="card card--lift"><div class="card__icon">${ICON.abc}</div><h3>1~2학년</h3><p>알파벳과 파닉스를 확실히 잡습니다. 소리와 글자를 연결하고, 짧은 단어를 스스로 읽어내는 경험을 만듭니다. 노래와 그림책, 게임 중심으로 영어를 즐거운 것으로 인식하게 합니다.</p></div>
            <div class="card card--lift"><div class="card__icon card__icon--sky">${ICON.speak}</div><h3>3~4학년</h3><p>학교에서 영어가 정식 교과가 되는 시기입니다. 문장 단위로 읽고 말하는 연습을 하며, 기본 문법을 자연스럽게 익힙니다. 자기 소개, 가족, 일상 같은 주제로 말하기를 시작합니다.</p></div>
            <div class="card card--lift"><div class="card__icon card__icon--gold">${ICON.pencil}</div><h3>5~6학년</h3><p>읽기 유창성과 어휘를 확장하고, 자기 생각을 문장으로 표현하는 연습을 합니다. 중학교 영어를 대비해 문법을 체계적으로 정리하고, 짧은 글쓰기도 시작합니다.</p></div>
          </div>
        </div>
      </section>

      <section class="alt">
        <div class="wrap">
          <span class="kicker">수업 진행</span>
          <h2>한 번의 수업은 이렇게 흘러갑니다</h2>
          <p class="section-lede">모든 수업은 저희가 직접 개발한 브라우저 교실에서 진행됩니다. 별도 프로그램 설치가 필요 없고, 링크를 클릭하면 바로 입장합니다.</p>
          <div class="steps">
            <div class="step"><h3>도입</h3><p>지난 수업 복습과 가벼운 대화로 입을 풉니다.</p></div>
            <div class="step"><h3>새 내용</h3><p>새로운 단어와 표현을 배우고 소리 내어 연습합니다.</p></div>
            <div class="step"><h3>활동</h3><p>읽기, 듣기, 역할극으로 배운 내용을 직접 사용합니다.</p></div>
            <div class="step"><h3>마무리</h3><p>배운 표현으로 자유롭게 말해 봅니다.</p></div>
          </div>
          <p style="margin-top:20px">발음은 AI 발음 코치가 함께 도와드립니다. 단어별로 점수를 확인하고 올바른 발음을 들으며 스스로 교정할 수 있습니다.</p>
        </div>
      </section>

      <section>
        <div class="wrap">
          <span class="kicker">교재</span>
          <h2>케임브리지·옥스퍼드 원서 교재</h2>
          <p class="section-lede">검증된 원서 교재를 사용하며, 아이의 수준과 목표에 맞춰 선택합니다. <strong>교재비는 수업료에 포함</strong>되어 있습니다.</p>
          <div class="books">
            <figure><img src="/assets/curriculum/oxford-phonics-world-drive.jpg" alt="Oxford Phonics World 교재" loading="lazy" /></figure>
            <figure><img src="/assets/curriculum/family-and-friends-drive.jpg" alt="Family and Friends 교재" loading="lazy" /></figure>
            <figure><img src="/assets/curriculum/global-english-drive.jpg" alt="Cambridge Global English 교재" loading="lazy" /></figure>
            <figure><img src="/assets/curriculum/grammar-friends-drive.jpg" alt="Grammar Friends 교재" loading="lazy" /></figure>
            <figure><img src="/assets/curriculum/lets-go-drive.jpg" alt="Let's Go 교재" loading="lazy" /></figure>
          </div>
        </div>
      </section>

      <section class="alt">
        <div class="wrap">
          <span class="kicker">학부모 안내</span>
          <h2>수업이 끝나면 이렇게 알려 드립니다</h2>
          <div class="grid grid--3">
            <div class="card"><div class="card__icon card__icon--coral">${ICON.report}</div><h3>수업 리포트</h3><p>무엇을 배웠는지, 아이가 잘한 점은 무엇인지, 어떤 부분을 더 연습하면 좋을지 기록해 드립니다.</p></div>
            <div class="card"><div class="card__icon">${ICON.abc}</div><h3>연습할 단어</h3><p>집에서 무엇을 도와주면 좋을지 명확해지도록 단어를 정리해 드립니다.</p></div>
            <div class="card"><div class="card__icon card__icon--sky">${ICON.video}</div><h3>수업 녹화</h3><p>녹화된 수업을 나중에 다시 보실 수 있습니다. 녹화 중에는 화면에 표시됩니다.</p></div>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div class="wrap">
          <span class="kicker">수업료</span>
          <h2>학년에 맞는 수업 길이를 고르세요</h2>
          <div class="price-grid">
            <div class="price-card price-card--feature">
              <span class="price-card__tag">1~3학년 추천</span>
              <h3>25분 수업</h3>
              <span class="price-card__amount">₩15,000 <small>/ 1회</small></span>
              <p>저학년의 집중력에 맞춘 길이입니다.</p>
            </div>
            <div class="price-card">
              <h3>50분 수업</h3>
              <span class="price-card__amount">₩30,000 <small>/ 1회</small></span>
              <p>4~6학년의 심화 학습에 적합합니다.</p>
            </div>
          </div>
          <p class="price-note">✓ 등록비·교재비 없음 · <strong>첫 수업 무료, 카드 등록 불필요</strong> · 약정 없이 언제든 중단 가능</p>
          <p style="margin-top:18px">한국과 필리핀의 시차는 1시간입니다. 방과 후 오후와 저녁 시간대 수업이 원활하며, 강사가 새벽에 일하지 않으므로 수업의 질이 유지됩니다.</p>
        </div>
      </section>

      <section class="faq alt">
        <div class="wrap wrap--narrow">
          <span class="kicker">자주 묻는 질문</span>
          <h2>궁금하실 만한 것들</h2>
          <details open><summary>초등학생 몇 학년부터 가능한가요?</summary><p>4세부터 16세까지 수업하고 있으며, 초등학생은 전 학년 모두 가능합니다. 학년과 수준에 맞춰 수업 내용과 교재를 조정합니다.</p></details>
          <details><summary>25분과 50분 중 어느 것이 좋을까요?</summary><p>보통 1~3학년은 집중력을 고려해 25분을, 4~6학년은 심화 학습이 가능한 50분을 선택하십니다. 첫 무료 수업에서 아이에게 맞는 길이를 확인해 보실 수 있습니다.</p></details>
          <details><summary>교재는 따로 구입해야 하나요?</summary><p>아닙니다. 케임브리지와 옥스퍼드 교재를 사용하며 교재비는 수업료에 포함되어 있습니다.</p></details>
          <details><summary>수업 시간은 한국 시간으로 언제 가능한가요?</summary><p>한국과 필리핀은 1시간 차이여서 방과 후 오후와 저녁 시간대 수업이 원활하게 가능합니다.</p></details>
        </div>
      </section>`,
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
    hero: { eyebrow: '비교해 보고 계신 학부모님께' },
    heading: '필리핀 화상영어,<br />솔직하게 말씀드립니다',
    lede:
      '필리핀 화상영어에 대해 좋은 말만 하는 곳은 많습니다. 저희는 장점과 한계를 모두 말씀드리겠습니다. 그래야 학부모님이 제대로 판단하실 수 있습니다.',
    body: `      <section>
        <div class="wrap wrap--narrow">
          <span class="kicker">먼저 밝힙니다</span>
          <h2>저희가 누구인지 분명히 말씀드립니다</h2>
          <p class="section-lede">TutorPro는 필리핀에 등록된 사업체이며(DTI 사업자 등록 제5274092호), 강사들은 필리핀에 거주하며 필리핀에서 수업합니다.</p>
          <p>한국의 학원이 아니고, 강사가 한국에 있지도 않습니다. 온라인으로 한국 가정에 수업을 제공하는 해외 업체입니다. 이 점을 숨기지 않습니다.</p>
        </div>
      </section>

      <section class="alt">
        <div class="wrap">
          <span class="kicker">장점</span>
          <h2>필리핀 강사의 실제 강점</h2>
          <div class="grid grid--2">
            <div class="card card--lift"><div class="card__icon">${ICON.globe}</div><h3>영어가 공용어입니다</h3><p>필리핀은 영어가 공식 언어 중 하나이며, 학교 수업과 대학 교육이 영어로 진행됩니다. 배워서 쓰는 언어가 아니라 일상에서 쓰는 언어입니다.</p></div>
            <div class="card card--lift"><div class="card__icon card__icon--gold">${ICON.money}</div><h3>같은 예산으로 더 많이</h3><p>미국·영국 강사보다 훨씬 많은 수업을 들을 수 있습니다. 언어는 빈도가 중요하기 때문에 이는 실질적인 장점입니다.</p></div>
            <div class="card card--lift"><div class="card__icon card__icon--coral">${ICON.hands}</div><h3>기다려 주는 수업 문화</h3><p>필리핀 강사들은 아이가 틀려도 여유 있게 기다려 주는 것으로 평가받습니다. 말하기를 부끄러워하는 아이에게 특히 중요합니다.</p></div>
            <div class="card card--lift"><div class="card__icon card__icon--sky">${ICON.clock}</div><h3>시차가 1시간뿐</h3><p>강사가 한밤중에 일하지 않으므로 수업의 질이 유지됩니다. 방과 후 시간대가 서로 편합니다.</p></div>
          </div>
        </div>
      </section>

      <section>
        <div class="wrap">
          <span class="kicker">한계</span>
          <h2>한계도 그대로 말씀드립니다</h2>
          <p class="section-lede">기대와 다른 수업을 등록하시면 결국 아이의 시간이 낭비되기 때문에, 미리 말씀드립니다.</p>
          <div class="grid grid--3" style="margin-top:20px">
            <div class="card"><h3>발음은 미국식·영국식과 다릅니다</h3><p>필리핀 영어는 미국 영어의 영향을 많이 받았지만 완전히 같지는 않습니다. 특정 국가의 억양을 그대로 익히기를 원하신다면 해당 국가 강사를 선택하시는 것이 맞습니다.</p></div>
            <div class="card"><h3>모든 강사가 같지 않습니다</h3><p>이는 어느 나라든 마찬가지입니다. 그래서 저희는 선발 과정을 아래에 공개합니다.</p></div>
            <div class="card"><h3>인터넷 환경의 영향</h3><p>저희는 강사의 회선 상태를 확인하지만, 100% 완벽을 보장할 수는 없습니다.</p></div>
          </div>
        </div>
      </section>

      <section class="alt">
        <div class="wrap wrap--narrow">
          <span class="kicker">강사 선발</span>
          <h2>강사는 이렇게 선발합니다</h2>
          <p>지원자는 구조화된 절차를 거칩니다. <strong>녹화된 시범 수업</strong>을 제출해야 하며, 저희가 이를 직접 심사합니다. 학력과 교육 경력을 확인하고, 아동 대상 수업 경험을 중요하게 봅니다. 심사를 통과한 강사만 학생을 배정받습니다.</p>
          <p>수업 후에는 학부모님이 강사를 평가하실 수 있으며, 이 평가는 실제로 강사 배정에 반영됩니다.</p>
        </div>
      </section>

      <section id="pricing">
        <div class="wrap">
          <span class="kicker">비교</span>
          <h2>미국·영국 강사와 비교하면</h2>
          <div class="table-wrap">
            <table>
              <thead><tr><th></th><th>필리핀 강사</th><th>미국·영국 강사</th></tr></thead>
              <tbody>
                <tr><td><strong>수업료</strong></td><td class="yes">25분 ₩15,000</td><td>보통 2~4배</td></tr>
                <tr><td><strong>같은 예산의 수업 횟수</strong></td><td class="yes">많음</td><td>적음</td></tr>
                <tr><td><strong>억양</strong></td><td>미국식에 가까움</td><td class="yes">해당 국가 억양</td></tr>
                <tr><td><strong>시차</strong></td><td class="yes">1시간</td><td>13~16시간</td></tr>
                <tr><td><strong>수업 가능 시간</strong></td><td class="yes">방과 후·저녁 원활</td><td>제한적</td></tr>
              </tbody>
            </table>
          </div>
          <p style="margin-top:18px">정답은 없습니다. <strong>억양이 최우선이라면</strong> 원어민 강사를, <strong>말하기 빈도와 지속 가능한 비용이 중요하다면</strong> 필리핀 강사를 권해 드립니다.</p>
          <div class="price-grid" style="margin-top:26px">
            <div class="price-card price-card--feature">
              <span class="price-card__tag">가장 많이 선택</span>
              <h3>25분 수업</h3>
              <span class="price-card__amount">₩15,000 <small>/ 1회</small></span>
            </div>
            <div class="price-card">
              <h3>50분 수업</h3>
              <span class="price-card__amount">₩30,000 <small>/ 1회</small></span>
            </div>
          </div>
          <p class="price-note">✓ 등록비·교재비 없음 · <strong>첫 수업 무료, 카드 등록 불필요</strong></p>
        </div>
      </section>

      <section class="faq alt">
        <div class="wrap wrap--narrow">
          <span class="kicker">자주 묻는 질문</span>
          <h2>궁금하실 만한 것들</h2>
          <details open><summary>필리핀 강사의 발음은 괜찮은가요?</summary><p>필리핀은 영어가 공용어이며 대학 교육이 영어로 진행됩니다. 발음은 미국식에 가깝지만 완전히 동일하지는 않습니다. 특정 국가의 억양을 그대로 익히기를 원하신다면 해당 국가 강사가 더 적합합니다.</p></details>
          <details><summary>강사는 어떻게 선발하나요?</summary><p>지원자는 녹화된 시범 수업을 제출해야 하며 저희가 직접 심사합니다. 학력과 교육 경력을 확인하고, 아동 대상 수업 경험을 중요하게 평가합니다.</p></details>
          <details><summary>한국 학원과 무엇이 다른가요?</summary><p>TutorPro는 한국 학원이 아니라 필리핀에 등록된 사업체(DTI 제5274092호)이며, 강사들은 필리핀에서 온라인으로 수업합니다.</p></details>
          <details><summary>수업료는 얼마인가요?</summary><p>25분 ₩15,000, 50분 ₩30,000입니다. 등록비와 교재비가 없고 첫 수업은 무료입니다.</p></details>
        </div>
      </section>`,
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
    await writeFile(resolve(publicDir, spec.file || spec.slug), page(spec), 'utf8')
    console.log(`[korea] wrote public/${spec.file || spec.slug}`)
  }
  console.log(`[korea] ${PAGES.length} Korean pages generated.`)
}

run().catch((error) => {
  console.error('[korea] failed:', error)
  process.exit(1)
})
