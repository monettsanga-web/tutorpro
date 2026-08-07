# How to get your class video onto the homepage

You don't need to send me the file. You upload it yourself, then send me **one
line of text**. About 5 minutes.

---

## Step 1 — Get the video file onto your computer

1. Go to https://studio.youtube.com
2. Left menu → **Content**
3. Find **TutorPro Class**
4. Click the **⋮** (three dots) beside it → **Download**

You now have an MP4 file, probably in your Downloads folder.

**If it is bigger than 50 MB**, shrink it first at
https://www.freeconvert.com/video-compressor — set the target to about 8 MB.
Smaller is better: families on phones will not wait for a huge file.

---

## Step 2 — Make the folder (once only)

1. Open https://supabase.com/dashboard/project/losmkvvwzijipqrlelyt/sql/new
2. Open the file `supabase/create_site_media_bucket.sql` from your workspace
3. Select all of it, copy, paste into Supabase, press **RUN**

You should see one row come back saying `site-media` with `public = true`.

This only creates a new empty folder. It does not touch your lessons,
bookings or accounts.

---

## Step 3 — Upload the video

1. Go to https://supabase.com/dashboard/project/losmkvvwzijipqrlelyt/storage/buckets
2. Click the **site-media** folder
3. Click **Upload file** and choose your MP4
4. Wait for it to finish

---

## Step 4 — Copy the link

1. Still in the **site-media** folder, click the **⋮** beside your video
2. Click **Get URL** (or **Copy URL**)
3. It looks like this:

```
https://losmkvvwzijipqrlelyt.supabase.co/storage/v1/object/public/site-media/tutorpro-class.mp4
```

**Paste that line into our chat.** That is all I need.

---

## What happens then

I put the link in, push, and your video plays directly on the homepage:

- Plays in the page — no clicking away to another website
- No YouTube, no Bilibili, no cookie banners, no Sign In buttons
- No other company's branding on your site
- **Works in mainland China**, because it comes from your own domain

---

## Checking you got the right link

The link must end in **`.mp4`**. That is the important part.

| Link | Works? |
|---|---|
| `.../site-media/tutorpro-class.mp4` | ✅ Yes |
| `https://youtu.be/...` | ❌ No — that is a page, not a file |
| `https://www.bilibili.tv/en/video/...` | ❌ No — that is a page, not a file |

A link to a *page that plays a video* will not work. It has to be the video
file itself.

---

## If you get stuck

Tell me which step number, and what you see on the screen. There is nothing
here you can break — the worst case is an unused empty folder.

Until the link arrives, the homepage shows a "Watch a real TutorPro class"
card that opens Bilibili. Nothing is broken in the meantime.
