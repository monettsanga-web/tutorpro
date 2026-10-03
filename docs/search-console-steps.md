# Getting the new pages into Google — click by click

Everything on the site side is done. These three jobs can only be done by you,
because they need your Google and Bing logins.

Time needed: about 15 minutes in total.

---

## Job 1 — Tell Google the sitemap exists (5 minutes)

Your sitemap now lists **55 pages**, and almost every page title changed
recently. Google will not notice quickly on its own.

1. Open **https://search.google.com/search-console** and sign in.
2. Top-left, there is a box with a website address in it. Click it and make
   sure **tutorpro.site** (or `https://www.tutorpro.site`) is the one selected.
   - If it is not listed at all, click **Add property** → choose **URL prefix**
     → type `https://www.tutorpro.site` → **Continue**, and follow the
     verification step it offers. Stop here and tell me — I will add the
     verification file to the site for you.
3. In the left menu, click **Sitemaps**.
4. In the box labelled *Add a new sitemap*, type exactly:

   ```
   sitemap.xml
   ```

5. Click **Submit**.
6. You should see a row appear saying **Success** and *55 discovered URLs*.
   If it says "Couldn't fetch", wait an hour and press the refresh arrow —
   that message is usually just Google not having looked yet.

---

## Job 2 — Ask Google to re-read the important pages (5 minutes)

Do this for the four pages below, one at a time.

1. Still in Search Console, click the **search box at the very top** that says
   *Inspect any URL in...*
2. Paste one address and press **Enter**.
3. Wait for the grey "Retrieving data" box to finish.
4. Click **Request indexing**.
5. Wait for the tick, then repeat with the next address.

Paste these four:

```
https://www.tutorpro.site/
https://www.tutorpro.site/pricing.html
https://www.tutorpro.site/online-english-classes-for-kids.html
https://www.tutorpro.site/contact.html
```

Google limits you to roughly 10 of these a day. Four is fine.

---

## Job 3 — Claim Bing (5 minutes)

Bing also feeds DuckDuckGo and Yahoo, and it is far less crowded than Google.

1. Open **https://www.bing.com/webmasters** and sign in with a Microsoft
   account (a free Outlook/Hotmail address works).
2. Click **Import from Google Search Console** — this is the quick route and
   it copies the verification across, so you do not have to touch any code.
3. If the import does not work, choose **Add site manually**, type
   `https://www.tutorpro.site`, and pick the **HTML Meta Tag** option. It will
   show you a line that looks like `<meta name="msvalidate.01" content="..."/>`.
   **Copy that whole line and send it to me** — I will put it on the site and
   you press Verify. I cannot make that code up; it has to come from Bing.
4. Once verified, go to **Sitemaps** → **Submit sitemap** → paste
   `https://www.tutorpro.site/sitemap.xml`.

---

## What to expect, honestly

- Submitting a sitemap does not cause ranking. It causes **crawling**. New
  titles usually show in results within a few days to two weeks.
- The site currently has **17 pages indexed and 24 not indexed**. Thin or
  duplicate-looking pages are the usual reason, and the two thinnest ones
  were rewritten today.
- **The real ceiling is links.** No other website links to tutorpro.site yet,
  and that single fact limits how high any page can go, no matter how good
  the page is. `docs/posts-to-share.md` has ready-made posts for the places
  that will accept them — Facebook groups, local directories, parent forums.
  Five genuine links will do more than fifty more pages.

---

## Where the site stands today (measured, not guessed)

Run `npm run audit:seo` any time to re-check. As of today, against the live
site:

```
sitemap: 55 URLs
HIGH 0 · MED 0 · LOW 0
```

- Every page has a unique title under 62 characters and a description under
  165, an H1, a canonical, an og:image and valid structured data.
- Structured data in place: Article, Course, CourseInstance, Offer, FAQPage,
  BreadcrumbList, EducationalOrganization, WebSite + SearchAction.
- hreflang between `/`, `/cn/`, `/tw/` and `/kr/` is reciprocal and correct.
- No invented reviews, ratings, student counts or success rates anywhere.
