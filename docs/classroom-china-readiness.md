# Will the classroom work in China?

Audited 5 August 2026 against the live code. Short answer: **partly, and not
reliably enough to sell to a mainland family yet.** One setting fixes most of it.

---

## What the classroom actually depends on

| Piece | What it does | Mainland China |
|---|---|---|
| **Supabase Realtime** | Signalling — how the two browsers find each other | ⚠️ Not blocked, but slow and unstable cross-border |
| **Supabase Storage** | Lesson PDFs and recordings | ⚠️ Same |
| **STUN servers** | Discovers your public address | ✅ Already China-friendly: `stun.qq.com`, `stun.miwifi.com` |
| **TURN relay** | Fallback when a direct connection fails | 🔴 **Not configured** — this is the real problem |
| **Tencent TRTC** | Purpose-built China video path | 🔴 Present in code, **not switched on** |
| **PDF viewer** | Renders lesson material | ✅ Fully local, `pdfjs-dist` is bundled |
| **Whiteboard / chat** | Drawing, messages, attendance | ✅ Runs over the same signalling |
| **Office viewer** | `.pptx` / `.docx` preview | 🔴 `view.officeapps.live.com` is blocked |
| **Google Fonts** | — | ✅ None used, the usual cause of hangs in China |
| **Google Analytics** | — | ✅ None used |

---

## The core issue: no TURN relay

WebRTC tries a **direct** connection between teacher and student first. That
usually works on a normal home network.

It fails when either side is behind strict NAT, carrier-grade NAT (common on
Chinese mobile networks), or a firewall that drops peer-to-peer UDP. The fix in
every production video product is a **TURN relay**: a server that forwards the
audio and video when a direct link cannot be made.

The code already supports one:

```js
// src/OnlineClassroom.jsx
const turnServer = import.meta.env.VITE_CLASSROOM_TURN_URL ? { ... } : null
```

`VITE_CLASSROOM_TURN_URL` is **empty**, so there is no fallback. When the direct
path fails, the lesson simply does not connect — and that is not a
China-only risk. It affects some corporate networks, university wifi and mobile
hotspots anywhere in the world.

**This is the single highest-value fix, and it helps every market, not just China.**

---

## What works today, without any changes

- The whole site loads (no Google Fonts, no Analytics, no blocked CDN)
- The PDF viewer, whiteboard, chat, attendance and recording UI
- Video **when** the direct peer-to-peer connection succeeds — often fine on
  ordinary home broadband, unreliable on mobile data

## What is unreliable or broken

- Video when a direct connection cannot be made → no TURN fallback
- Supabase signalling latency cross-border → slow joins, occasional drops
- `.pptx` / `.docx` preview → the Microsoft viewer is blocked
  (**workaround: export to PDF**, which renders locally and works perfectly)

---

## How to fix it, cheapest first

### 1. Add a TURN server — biggest win, ~30 minutes

Helps China *and* every other difficult network worldwide.

Options:
- **Metered.ca** — free tier around 500 MB/month, enough for light testing
- **Twilio Network Traversal** — pay per GB, very reliable
- **Cloudflare Calls TURN** — generous free allowance
- **Self-host coturn** on a small VPS, ideally in Singapore or Hong Kong for
  low latency to both Manila and mainland China

Then in **Vercel → Settings → Environment Variables**:

```
VITE_CLASSROOM_TURN_URL=turn:your-server:3478
VITE_CLASSROOM_TURN_USERNAME=your-username
VITE_CLASSROOM_TURN_CREDENTIAL=your-password
```

Redeploy. No code change needed — the classroom picks it up automatically.

### 2. Turn on Tencent TRTC — proper China grade

The integration is already written (`src/tencentClassroom.js` plus the
`trtc-usersig` edge function). It needs a Tencent Cloud account and:

```
VITE_TRTC_SDK_APP_ID=your-app-id
```

Note this currently activates only when a teacher's classroom platform is set to
`voov`. Worth doing if mainland China becomes a real market; skip it otherwise,
since it needs a Chinese-entity Tencent Cloud account.

### 3. Tell teachers to export slides as PDF

Free, immediate. PDFs render locally and are unaffected by any blocking, and the
viewer now scrolls continuously.

---

## Honest recommendation

Do **step 1 regardless** — a missing TURN relay is a worldwide reliability gap
that is currently costing you failed lessons you may be blaming on "bad internet".

Do **not** invest in step 2 for mainland China yet. Separately from the technical
issues, the **Double Reduction policy (双减政策)** restricts for-profit English
tutoring for grades 1–9 and bars foreign-based teachers from teaching Chinese
minors online. Target the **overseas Chinese diaspora** — Singapore, Malaysia,
Hong Kong, Taiwan, Australia, Canada — where the market is open, payment is
straightforward, and the time zones are ideal.
