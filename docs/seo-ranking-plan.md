# TutorPro Online English — Comprehensive SEO Ranking Plan

Assessed against the live site on 4 August 2026, after the rename.

---

## Part 1 — Was the rename dangerous? **No. Verdict: very low risk.**

A brand rename is dangerous when it changes **what Google indexes**. It didn't here.

| Signal Google ranks on | Status |
|---|---|
| Domain (`tutorpro.site`) | ✅ Unchanged — this is what carries authority |
| URL paths | ✅ Unchanged — no redirects, no 404s, no link equity lost |
| Backlinks | ✅ Unchanged — all point to the same URLs |
| Facebook page | ✅ Unchanged |
| Brand string in `<title>` / schema | 🔄 Changed — the only thing that moved |

### Why the risk is close to zero in your specific case

**There was nothing to lose.** Before today your homepage served **0 crawlable words** and all
five trust pages returned **404**. The old name had no rankings to protect, because the site
had almost nothing indexable. You renamed a brand that had not yet established search equity.

Renaming is dangerous when you have years of rankings under the old name. You had days, with
an empty homepage. **This was the cheapest possible moment to rename.**

### What to expect

- **Weeks 1–2:** Google re-crawls, updates the brand entity. Possible minor wobble on
  branded searches ("tutorpro english").
- **Week 3+:** New name settles. Because "online english" is now *inside* your brand name,
  you gain a small relevance boost for your core keyword.
- **Net effect:** mildly positive.

### The one real cost

Anyone who bookmarked or remembers "TutorPro English" still finds you — the domain is the
same. No action needed. Just request re-indexing in Search Console to speed up recognition.

---

## Part 2 — What's actually blocking your rankings

Live audit results:

| Check | Result | Severity |
|---|---|---|
| Crawlable homepage content | ✅ 419 words | Fixed today |
| Title tag length | ✅ 52 chars | Good |
| Trust pages (privacy/terms/refund) | ✅ All live, HTTP 200 | Fixed today |
| Sitemap | ✅ 8 URLs | Good |
| H1 / H2 structure | ✅ 1 H1, 6 H2 | Good |
| FAQ schema | ✅ Present | Good |
| **Image alt text** | ❌ **0 images with alt** | **HIGH** |
| **JS payload** | ❌ **543 KB gzipped main bundle** | **HIGH** |
| **hreflang tags** | ❌ None | MEDIUM |
| **AggregateRating schema** | ❌ None | MEDIUM |
| **Breadcrumb schema** | ❌ None | LOW |
| Independent reviews | ❌ None | **HIGH** |

### 🔴 Critical issue 1 — Page speed

Your main JavaScript bundle is **543 KB gzipped** (1.77 MB raw), plus a 275 KB Tencent RTC
chunk. Google flags anything over ~300 KB as a mobile speed risk, and **Core Web Vitals are a
confirmed ranking factor.**

This also directly hurts the Poland ad plan: Google Ads Quality Score penalises slow landing
pages, so you pay *more per click* for the same position.

**Fixes, in order of impact:**

1. **Lazy-load the classroom.** `trtc` (275 KB) and the classroom modules only matter *after*
   login. A visitor reading your homepage should never download them. Route-split so
   marketing pages load a minimal bundle.
2. **Lazy-load `pdfjs-dist`.** Only needed inside a lesson.
3. **Defer the main bundle** on marketing pages — the pre-rendered HTML already shows content,
   so React can hydrate later without blocking first paint.

Realistic target: get the homepage's initial JS under 150 KB gzipped. That is achievable
without touching features, purely through code-splitting.

### 🔴 Critical issue 2 — No image alt text

Zero images carry alt attributes. This costs you:
- Google Images traffic (parents search "online english class for kids" in Images)
- Accessibility compliance (WCAG — and it's the right thing to do)
- Context signals Google uses to understand the page

Every `<img>` needs a descriptive alt, e.g.
`alt="Child learning English online with a TutorPro tutor"`.

### 🔴 Critical issue 3 — No independent reviews

This is what the Google AI response flagged, and it's the hardest to fake because it must be
earned. It's also the highest-trust signal for a school.

**Do this in week 1:**
1. Create a free **Trustpilot** business profile.
2. Create a **Google Business Profile** (gets you into the knowledge panel).
3. Email your happiest existing parents a direct review link. Even 5–10 genuine reviews
   changes how both parents and AI assistants describe you.
4. Once real ratings exist, add `AggregateRating` schema so **stars appear in search results**
   — one of the biggest click-through-rate boosters available.

⚠️ Never invent reviews or add `AggregateRating` markup without real ratings behind it. That
is a manual-action penalty and Google actively polices it.

---

## Part 3 — Keyword strategy

### Tier 1 — Your realistic targets (lower competition, real intent)

These are winnable within months because they're specific:

```
online english class for kids philippines
one to one online english tutor for children
cambridge english tutor online for kids
online english lessons for primary students
25 minute english lessons for children
online english tutor with free trial
```

### Tier 2 — Comparison keywords (your best short-term win)

You already have `/online-english-alternatives.html`. Comparison pages rank fast because
competition is thin and intent is high:

```
novakid alternative
51talk alternative
preply alternative for kids
cambly kids alternative
best novakid competitor
```

**Action:** expand that page. Give each competitor its own H2, an honest comparison table
(price, class length, one-to-one vs group, curriculum), and a clear differentiator. Honesty
ranks better than hype — and don't disparage competitors, just compare factually.

### Tier 3 — Long-tail question keywords (build these as content)

This is how Allright wins. Each becomes a page or FAQ entry:

```
how much do online english classes for kids cost
what age should a child start learning english
how to improve my child's english speaking confidence
is 25 minutes enough for an english lesson
online english class vs in person tuition for kids
how to prepare a child for cambridge english exam
```

### Tier 4 — Aspirational (don't chase yet)

`online english classes`, `english tutor`, `learn english online` — dominated by Preply,
Cambly and Novakid with years of backlinks. Revisit in 12+ months.

---

## Part 4 — Content roadmap

### Pages to build, in priority order

| Priority | Page | Targets |
|---|---|---|
| 1 | **Pricing page** (`/pricing.html`) | "online english class price for kids" — parents search price directly, and it builds trust |
| 2 | **Age-tier pages** (`/english-for-ages-4-7`, `/8-11`, `/12-16`) | Novakid's biggest structural advantage. Each page speaks to a specific parent. |
| 3 | **Expanded comparison page** | Tier 2 keywords above |
| 4 | **FAQ hub** (`/faq.html`) | Tier 3 long-tail questions |
| 5 | **Teacher profiles as indexable pages** | "cambridge qualified english tutor online" |
| 6 | **Blog** — 1 post/week | Long-tail authority over time |

All of these must be **static, crawlable HTML** like your legal pages — not React-only routes.
I can generate them with the same build script pattern.

### Blog post ideas that match real parent searches

- "How much should online English classes for kids cost in 2026?"
- "What age should my child start learning English?"
- "Group vs one-to-one English classes: which works for kids?"
- "How to help a shy child speak English confidently"
- "Cambridge vs Oxford English curriculum for young learners: explained"

---

## Part 5 — Technical fixes checklist

**Immediate (this week)**
- [ ] Add alt text to every image
- [ ] Code-split classroom/TRTC/pdfjs out of the marketing bundle
- [ ] Request re-indexing of homepage in Search Console (new brand name)
- [ ] Submit the updated 8-URL sitemap in Search Console
- [ ] Verify the site in Google Search Console and Bing Webmaster Tools

**Short term (this month)**
- [ ] Create Trustpilot + Google Business Profile
- [ ] Add `hreflang` tags (you serve PH, CN, and soon PL — Google needs to know)
- [ ] Add `BreadcrumbList` schema to inner pages
- [ ] Build the pricing page
- [ ] Compress and convert images to WebP/AVIF
- [ ] Add `Course` schema to programme sections

**Ongoing**
- [ ] 1 blog post per week
- [ ] Collect and publish parent reviews
- [ ] Build backlinks: PH education directories, ESL blogs, parenting forums
- [ ] Monitor Core Web Vitals in Search Console

---

## Part 6 — Honest timeline

| Timeframe | Realistic outcome |
|---|---|
| Week 1–2 | Pages get indexed. Branded searches ("tutorpro online english") start working. |
| Month 1–2 | Long-tail keywords begin appearing on pages 3–5. Comparison page may rank first. |
| Month 3–6 | Tier 1 and Tier 2 keywords reach page 1–2 **if** content and reviews are being built consistently. |
| Month 6–12 | Meaningful organic traffic. Competing for broader terms. |

**SEO is slow.** Anyone promising page 1 in weeks is lying. Your paid Poland campaign is the
short-term traffic channel; SEO is the compounding long-term one. Run both.

### The single highest-leverage action

**Get 10 real parent reviews on Trustpilot and Google.** It fixes the trust gap the Google AI
flagged, unlocks star ratings in search results, and no competitor can copy your genuine
testimonials. It costs nothing but a few emails.
