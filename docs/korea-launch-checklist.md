# Getting found by Korean parents — what was built and what you must do

Built 7 September 2026. Companion to `docs/korea-marketing-guide.md`, which
covers the market research; this covers the actions.

---

## What is now live on the site

| | |
|---|---|
| Korean pages | `/kr/` plus **3 new long-tail pages** |
| Sitemap | 26 → **29 URLs**, all Korean pages included |
| `robots.txt` | Now names **Yeti** (Naver) and **Daum** explicitly |
| Korean contact block | Messenger, WhatsApp, Facebook, email — on every Korean page |
| Metadata | `og:locale ko_KR`, hreflang, canonical, FAQ structured data |

### The three new pages

| URL | Targets the search |
|---|---|
| `/kr/hwasang-yeongeo.html` | 화상영어 — "what is video English, is it right for my child" |
| `/kr/choding-yeongeo.html` | 초등영어 — elementary English by school year |
| `/kr/philippine-hwasang-yeongeo.html` | 필리핀 화상영어 — the honest comparison |

Each is 1,000+ Hangul characters of genuinely distinct content, cross-linked,
with FAQ schema and the real prices (₩15,000 / ₩30,000).

**They deliberately state the limitations too** — that Filipino accents differ
from American or British, that very young children may find 25 minutes long,
that this is not a Korean 학원. Korean parents research hard and compare
carefully; a page that admits a downside is more persuasive than one that
does not, and it keeps you clearly outside Korea's domestic tutoring rules.

---

## ⚠️ The honest part: the website is the smaller half

**Korean search does not run on Google.** Naver holds the majority of
Korean-language search, and Naver systematically favours its own properties —
Naver Blog, Naver Cafe, Naver Knowledge-iN — over external websites.

So these pages help, but they will not carry Korea by themselves. The three
actions below matter more than anything on tutorpro.site. All are free.

---

## 1. 🥇 KakaoTalk Channel — do this first

Korean parents message on KakaoTalk. Not email, not WhatsApp. Asking a Korean
parent to email you is like asking a Filipino parent to fax you.

**How:**
1. Go to https://center-pf.kakao.com and sign in with a Kakao account
2. Create a **채널 (Channel)** — free, no business registration needed to start
3. Name it `TutorPro 온라인 영어`
4. Add the profile image and a one-line description
5. Copy the channel URL (looks like `http://pf.kakao.com/_xxxxx`)

**Then send me the URL.** One line changes in `scripts/build-korea-pages.mjs`
(`CONTACT.kakao`) and it appears on every Korean page automatically — the slot
is already built and waiting.

---

## 2. 🥈 Naver Blog — the page that will outrank your website

A Naver Blog is free and will rank *above* tutorpro.site for Korean queries,
because Naver prefers its own content.

1. Create a Naver account at https://www.naver.com
2. Activate Blog (블로그)
3. Post in Korean, roughly weekly

`docs/naver-blog-posts.md` already contains ready-to-post Korean content.

**Post ideas that match what parents actually search:**
- 우리 아이 영어 말하기, 왜 늘지 않을까요? (why isn't my child's speaking improving)
- 화상영어 처음 시작할 때 확인할 5가지
- 초등 저학년 파닉스, 집에서 이렇게 도와주세요
- 필리핀 화상영어와 원어민 화상영어, 무엇이 다른가요?

Link back to `/kr/` from each post. That is also a real backlink, which the
main site badly needs.

---

## 3. 🥉 Naver Cafe (맘카페) — where decisions are actually made

Korean mothers organise into enormous regional parenting cafés. A
recommendation inside one of these drives more enrolment than any advertising.

**This must be done carefully:**
- Join and participate genuinely for **weeks** before mentioning TutorPro
- Most cafés **ban outright advertising** and will remove you permanently
- Answer questions about English learning, share useful tips
- Let parents ask you privately — that is how it converts
- **It only works in Korean.** If you have any Korean-speaking contact, have
  them do this.

---

## After deploying: tell Naver the site exists

Naver will not find you on its own.

1. Go to **https://searchadvisor.naver.com**
2. Sign in with a Naver account → **웹마스터도구** (Webmaster Tools)
3. Add `https://www.tutorpro.site`
4. Verify by HTML meta tag — **send me the tag and I will add it**
5. Submit the sitemap: `https://www.tutorpro.site/sitemap.xml`
6. Request indexing for `/kr/` and the three new pages

Also submit the same URLs in Google Search Console — Google is second in
Korea, but second is not nothing.

---

## Realistic expectations

- Naver indexing a new foreign domain: **weeks, sometimes longer**
- A Naver Blog post can rank in **days**
- A Naver Cafe recommendation can produce enquiries **immediately**

That ordering is the whole strategy. The website is the destination; Naver
Blog and Cafe are the road to it.

## Why Korea is worth this effort

From the market research: teaching English to under-15s is legal and normal in
Korea, foreign online tutors are permitted, PayPal works, there is no
firewall, the time difference is one hour, and Korean households spend among
the most on earth on private education. There is no regulatory landmine of
the kind that rules out mainland China.
