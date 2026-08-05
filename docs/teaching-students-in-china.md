# Teaching a student in mainland China

Written 5 August 2026 after a real lesson failed to connect.

---

## What is actually happening

This is not a bug in your classroom. It is a network restriction, and it is
documented by the provider itself.

Your video relay is Cloudflare. From Cloudflare's own documentation:

> Cloudflare Realtime TURN server runs on Cloudflare's global network — a growing
> global network of thousands of machines distributed across hundreds of
> locations, **with the notable exception of the Cloudflare China Network**.

> Cloudflare's China Network does not participate in serving Realtime traffic and
> TURN traffic from China will connect to Cloudflare locations outside of China.

So a student in mainland China has to reach a relay outside the country, across
the border. That crossing is heavily filtered, and peer-to-peer video is one of
the first things it drops. The connection attempt is genuine; it just cannot
complete.

**Everything else in the classroom still works** — chat, the lesson board,
annotations, shared PDFs, the whiteboard. Only the live camera and microphone
stream is affected.

---

## What I changed

The classroom used to tell a Chinese student it was *"re-establishing the video
link through the relay server"*. That was misleading: there is no relay
available to them, so waiting achieves nothing.

It now says plainly that cross-border video is restricted, confirms that chat
and the lesson board still work, and points to a backup — but only if one has
actually been configured.

---

## Your options, cheapest first

### Option 1 — Add a VooV backup link (free, 15 minutes)

VooV Meeting is Tencent's video product. It is built for Chinese networks and is
not blocked. Your classroom already supports it: there is a field for it, it was
simply empty, which is why the "backup link" the old message mentioned did not
exist.

1. Download **VooV Meeting** (腾讯会议) at https://voovmeeting.com
2. Create a free account and a recurring meeting
3. Copy the meeting link
4. In TutorPro: **Teacher dashboard → My profile → Classroom** → set platform to
   **VooV** and paste the link
5. Save

From then on, Chinese students see an **Open VooV backup** button whenever video
fails. They join the video there while keeping the TutorPro lesson board open in
another tab for materials and annotation.

This is the practical answer today.

### Option 2 — Teach over WeChat video

Most Chinese families already use WeChat. Call the parent, run the video there,
and keep the TutorPro classroom open beside it for the coursebook and
whiteboard. Slightly clumsy, but it works immediately and needs no setup.

### Option 3 — Full Tencent RTC integration (bigger job)

Your codebase already contains the integration (`src/tencentClassroom.js` and the
`trtc-usersig` edge function). It needs a Tencent Cloud account and
`VITE_TRTC_SDK_APP_ID` set.

Be aware of what this involves: a Tencent Cloud account generally requires a
Chinese business entity or a mainland phone number, real-name verification, and
it is a paid service. It is only worth doing if mainland China becomes a
significant part of your business.

### Option 4 — Ask the family whether they use a VPN

Many international families in China already do. If they do, the standard
classroom usually works. Worth one question before building anything.

---

## The strategic question worth asking

Beyond the technical problem, there is a legal one.

China's **Double Reduction policy (双减政策)**, in force since July 2021,
restricts for-profit tutoring in school subjects for grades 1 to 9, and
specifically prohibits foreign-based teachers from teaching Chinese minors
online. English is a school subject under that rule.

That does not make one student impossible, but it does mean mainland China is a
poor place to invest marketing effort: the connection is unreliable, payment is
awkward, and the regulatory position is against you.

**The overseas Chinese diaspora is the better target** — Singapore, Malaysia,
Hong Kong, Taiwan, Australia, Canada. Same language and cultural fit, no
blocking, straightforward payment, and no regulatory conflict. You already have
city pages live for Singapore, Hong Kong and Kuala Lumpur.

---

## For this particular student, today

1. Set up the **VooV backup link** (Option 1) — it is free and takes 15 minutes
2. Tell the family: *"Video runs through VooV, and everything else stays in the
   TutorPro classroom"*
3. Keep using TutorPro for the coursebook, whiteboard, homework and feedback,
   which all work normally

The lesson still happens. Only the camera feed moves to a different pipe.
