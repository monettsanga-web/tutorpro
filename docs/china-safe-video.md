# Showing a class video that Chinese families can actually watch

## The short answer

**You cannot make a YouTube link work in mainland China.** Not with a special
embed code, not with a setting, not with a trick. The only reliable fix is to
put the video file on your own website, and that is what the site now does.

---

## Why the YouTube link does not work

YouTube has been blocked in mainland China since 2009 and is still blocked.
Three details matter for us:

1. **Embedded players are blocked too.** It is not only youtube.com. A YouTube
   player placed inside tutorpro.site is also blocked, because the browser
   still has to fetch the video from Google's servers.
2. **The thumbnail is blocked as well.** YouTube's image host is blocked, so
   even the still picture before you press play will not appear.
3. **It fails silently.** The family does not see an error explaining that
   their government blocks YouTube. They see a black rectangle that spins
   forever. It looks exactly like a broken website, and the natural reaction is
   to close the page and not come back.

Hong Kong, Macau and Taiwan are outside the firewall and are fine. The problem
is only mainland China — which is where your student is.

---

## What we do instead

We host the video ourselves. `tutorpro.site` is not blocked in China, so a
video file served from our own domain plays in Beijing exactly as it plays in
Quezon City. No VPN, no app, no extra step for the parent.

The site uses a component called `ChinaSafeVideo` that:

1. plays our own file first — the only path that works in China;
2. falls back to the YouTube embed **only if our file is missing**, so the rest
   of the world still sees something if a deploy goes wrong;
3. shows a plain "open it directly" link rather than leaving a dead black box.

---

## What you need to do (about 10 minutes)

### Step 1 — Download the video from YouTube

Open your video: https://youtu.be/EQ12J6cxVZo

You uploaded it, so download your own original from YouTube Studio:

1. Go to https://studio.youtube.com
2. Left menu → **Content**
3. Find **TutorPro Class**
4. Click the **⋮** (three dots) next to it → **Download**

That gives you an MP4 file.

### Step 2 — Make it small

Your clip is 1 minute 4 seconds. Aim for **under 10 MB**. A large file is slow
for everyone and worst for families on mobile data in China.

Free and easy: https://www.freeconvert.com/video-compressor — upload the MP4,
set target size ~8 MB, download the result.

If you can, also make it **720p** rather than 1080p. On a phone the difference
is invisible and the file is roughly half the size.

### Step 3 — Send me the file

Attach the compressed MP4 in this chat. I will:

- put it at `public/assets/tutorpro-class.mp4`
- create a poster image from the first frame, hosted on our domain
- place the player on the homepage and the Chinese page (`/cn/`)
- push it live

### Step 4 — Keep the YouTube link anyway

Do not delete it. It stays as the fallback for the rest of the world and it is
still useful for sharing on Facebook.

---

## About the file size

| Length | Quality | Rough size | Verdict |
|---|---|---|---|
| 1 min | 1080p original | 30–80 MB | Too big — slow everywhere |
| 1 min | 720p compressed | 6–10 MB | **Recommended** |
| 1 min | 480p compressed | 3–5 MB | Fine for mobile-first |

Under 10 MB is the target. Above ~25 MB, families on Chinese mobile networks
will give up before it starts.

---

## About bilibili.tv — I checked, and it will not work

You sent `https://www.bilibili.tv/en/video/4800493496966144`. I tested it
against the live site rather than guessing, and found three problems:

1. **bilibili.tv is not bilibili.com.** They are two different services.
   `.tv` is the *international* edition; `.com` is the mainland one. Your
   students in China use `.com`.
2. **Your upload is already geo-blocked.** Loading that page returns:
   *"Sorry, according to the request of the copyright owner, this film is not
   available in your area."* It has 1 view and the account has 0 followers.
3. **There is no way to embed it.** `player.bilibili.tv` does not exist — it
   has no DNS record at all, unlike `player.bilibili.com`. The international
   edition simply does not publish an external player, so no website can put
   that video in a frame.

So the site now **links** to bilibili.tv links rather than embedding them. An
embed would have produced an empty box, which is the exact problem we are
trying to avoid.

**If you still want to use Bilibili**, upload to **bilibili.com** (the mainland
site) instead. That one does have a working player and the site already
embeds it correctly. It needs a Chinese phone number to register.

**Self-hosting is still the better answer** — see Step 1 above.

## If you would rather use a Chinese video platform

This is optional and more work, but it is what Chinese schools do. The player
already supports all three:

| Platform | Chinese name | Notes |
|---|---|---|
| Bilibili | 哔哩哔哩 | Most popular for education. Needs a Chinese phone number to register. |
| Tencent Video | 腾讯视频 | Same company as 腾讯会议, which you already recommend for classes. |
| Youku | 优酷 | Owned by Alibaba. |

Paste a link from any of these and the site embeds it correctly and does *not*
show the "video not loading" warning, because those platforms are reachable
inside China.

**Self-hosting is still simpler and I recommend it.** No Chinese phone number,
no account, no content review, and you keep control of the file.

---

## What will not work — do not waste time on these

- **youtube-nocookie.com** — still Google, still blocked.
- **Telling parents to use a VPN** — most will not, and you should not ask
  paying customers to circumvent their own country's controls to see your
  marketing.
- **A "China CDN"** — requires an ICP licence, which requires a Chinese
  business entity. Not realistic for a Philippine sole proprietorship.
- **Embedding via a proxy** — fragile, slow, and breaks without warning.
