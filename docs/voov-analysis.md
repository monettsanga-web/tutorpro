# Why VooV works for students in China — and the catch

Researched 5 August 2026. This corrects a simplification in my earlier advice.

---

## The short answer

VooV works where your classroom does not because **the media servers are inside
China**. Your classroom relays video through Cloudflare, whose own documentation
states their network excludes mainland China, so a Chinese student's video has
to cross the border and gets filtered. Tencent has data centres in Shenzhen,
Beijing and Shanghai, so a Chinese student's video never leaves the country in
the first place.

Tencent is also a Chinese company operating with the required domestic licences.
Its traffic is not treated as foreign, so there is nothing to inspect at the
border and nothing to throttle.

---

## The catch I got wrong

I told you "download VooV and send the link". That is incomplete, and it would
have wasted your time.

**VooV and Tencent Meeting are two editions of the same product:**

| | Tencent Meeting (腾讯会议) | VooV Meeting |
|---|---|---|
| Market | Mainland China | International, 100+ countries |
| Sign-up needs | Mainland mobile number **or** WeChat account | Any international phone number |
| Available in | Chinese app stores | International app stores |

The important part, confirmed by university IT documentation from Macau and
XJTLU, who run both daily:

> **Tencent Meeting clients can join a meeting created by VooV Meeting clients,
> and vice versa.**

So the two editions **are interoperable**. You host on VooV, your student joins
on Tencent Meeting, and you meet in the same room.

**But your student cannot use VooV itself.** Tencent blocks it: a mainland
account is told to use Tencent Meeting instead. Several people report exactly
that error. So the advice "have your student install VooV" would have failed.

The correct instruction is:

- **You (Philippines):** install **VooV Meeting** from voovmeeting.com
- **Your student (China):** install **腾讯会议 / Tencent Meeting** from
  meeting.tencent.com
- **Share the numeric Meeting ID, not the URL.** XJTLU's IT guidance notes that
  cross-edition URL redirection is very slow; the ID avoids it entirely.

---

## Why your classroom cannot simply do the same

A fair question: if Tencent can serve China, why not just use their servers?

You can — the integration is already written (`src/tencentClassroom.js` and the
`trtc-usersig` function). What stops it is not code:

1. **Tencent Cloud requires a Chinese business entity** or mainland phone number
   with real-name verification for most services.
2. **It is paid**, per minute of video, unlike your current free Cloudflare tier.
3. **ICP licensing.** Services delivered inside China generally need one, and
   that needs a Chinese entity.

This is the same wall every foreign platform hits. It is not a limitation of
your school.

---

## What this actually costs you

| | Your classroom | VooV/Tencent workaround |
|---|---|---|
| Video | ❌ blocked | ✅ works |
| Lesson board, PDFs | ✅ works | — |
| Whiteboard, annotation | ✅ works | — |
| Chat, files | ✅ works | — |
| Attendance, recap, feedback | ✅ works | — |

So the student keeps everything except the camera stream, which moves to a
second window. Not elegant, but the lesson genuinely happens.

---

## How to set it up

1. Download **VooV Meeting** from https://voovmeeting.com and create a free
   account with your Philippine number
2. Create a recurring meeting and copy the **Meeting ID** (the number, not the link)
3. In TutorPro: **Teacher dashboard → My profile → Classroom** → platform
   **VooV** → paste the link
4. Send your student the **Meeting ID** and tell them to install
   **腾讯会议 (Tencent Meeting)**, not VooV
5. In the lesson: video in Tencent Meeting, materials in the TutorPro classroom

---

## The honest recommendation

This works, and it is worth doing for a student you already have.

It is not worth building a China strategy on. Beyond the technical friction,
the **Double Reduction policy (双减政策)** prohibits foreign-based teachers from
teaching Chinese minors online, which is precisely what this is. Combined with
payment friction and the two-app workaround, mainland China is a difficult
market to grow in.

The **overseas Chinese diaspora** — Singapore, Hong Kong, Taiwan, Malaysia,
Australia, Canada — gives you the same cultural fit with none of the problems,
and you already have city pages live for three of those.
