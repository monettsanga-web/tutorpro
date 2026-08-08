# Switching on Facebook, KakaoTalk, Naver and QQ sign-up

The buttons are already built and live on your registration screen. Right now
all four say **"Not switched on yet"**, because your Supabase project has no
social providers configured. This is deliberate — a button that cannot finish
the job would send a parent to a raw error page.

**The moment you finish the steps below, the button turns on by itself.
No code change, no new deploy.**

Do them in this order. Facebook is the one most of your parents will use, and
it is also the easiest, so start there.

---

## 1. Facebook — easiest, do this first (about 20 minutes)

**Screen 1 — make the Facebook app**

1. Go to https://developers.facebook.com/apps
2. Click **Create App**.
3. When it asks what you want to do, choose **Authenticate and request data
   from users with Facebook Login**, then **Consumer**.
4. App name: `TutorPro Online English`. Use your own email. Click **Create app**.

**Screen 2 — get your two secret numbers**

5. In the left menu click **App settings → Basic**.
6. You will see **App ID** and **App Secret** (click *Show*). Copy both into a
   notepad. These are passwords — do not post them anywhere.

**Screen 3 — tell Facebook where to send parents back**

7. In the left menu click **Facebook Login → Settings**.
8. In **Valid OAuth Redirect URIs**, paste this exactly:

   ```
   https://losmkvvwzijipqrlelyt.supabase.co/auth/v1/callback
   ```

9. Click **Save changes**.

**Screen 4 — tell Supabase**

10. Go to https://supabase.com/dashboard/project/losmkvvwzijipqrlelyt/auth/providers
11. Find **Facebook** in the list and click it.
12. Turn the switch **on**.
13. Paste your **App ID** into *Client ID*, and your **App Secret** into
    *Client Secret*.
14. Click **Save**.

**Screen 5 — the step everyone forgets**

15. Back on developers.facebook.com, at the very top of the page there is a
    toggle that says **In development**. Switch it to **Live**.
    If you skip this, only *you* can sign in and nobody else can.

**Now test it:** open https://www.tutorpro.site, click Student registration.
The Facebook button should say *"Most parents already have this"* instead of
*"Not switched on yet"*. Click it — you should land on Facebook's real login
page, and after approving, come back to the child-details step.

---

## 2. KakaoTalk — for your Korean families (about 20 minutes)

1. Go to https://developers.kakao.com/console/app and click **애플리케이션 추가하기**
   (Add application). Name it `TutorPro Online English`.
2. Open **앱 키 (App Keys)** and copy the **REST API 키**. That is what Supabase
   calls the Client ID — *not* the JavaScript key.
3. Open **카카오 로그인 (Kakao Login)** in the left menu and turn **활성화 설정**
   (Activation) **ON**.
4. Still on that page, find **Redirect URI** and add:

   ```
   https://losmkvvwzijipqrlelyt.supabase.co/auth/v1/callback
   ```

5. Open **보안 (Security)** and click to generate a **Client Secret**, then set
   its status to **사용함 (in use)**. Copy the secret.
6. Open **동의항목 (Consent items)**. Turn on **닉네임 (nickname)** and
   **카카오계정(이메일) (email)**. Without the email item Kakao sends no address
   and the sign-up cannot complete.
7. Go to https://supabase.com/dashboard/project/losmkvvwzijipqrlelyt/auth/providers
   → **Kakao** → switch on → paste the REST API key and the Client Secret → **Save**.

---

## 3. Naver — a bit more work (about 30 minutes)

Supabase has no ready-made Naver button, so this one is added by hand. It is
still only copy-and-paste.

1. Go to https://developers.naver.com/apps/#/register
2. Application name: `TutorPro Online English`.
3. Under **사용 API**, choose **네이버 아이디로 로그인** (Login with Naver).
4. Tick the information you want: **이름 (name)** and **이메일 (email)**.
   Without the email tick, sign-up cannot complete.
5. Environment: choose **PC 웹**. For **서비스 URL** enter
   `https://www.tutorpro.site`, and for **Callback URL** enter:

   ```
   https://losmkvvwzijipqrlelyt.supabase.co/auth/v1/callback
   ```

6. Save, then copy the **Client ID** and **Client Secret**.
7. Go to https://supabase.com/dashboard/project/losmkvvwzijipqrlelyt/auth/providers
8. Click **New Provider**, then choose **Manual configuration**.
9. Fill it in exactly like this:

   | Field | Value |
   | --- | --- |
   | Identifier | `custom:naver` |
   | Name | `Naver` |
   | Client ID | *from step 6* |
   | Client Secret | *from step 6* |
   | Authorization URL | `https://nid.naver.com/oauth2.0/authorize` |
   | Token URL | `https://nid.naver.com/oauth2.0/token` |
   | UserInfo URL | `https://openapi.naver.com/v1/nid/me` |

10. Click **Create and enable provider**.

> The identifier must be exactly `custom:naver`. The website looks for that
> spelling.

---

## 4. QQ — please read this before spending time on it

**Be aware: this one may not be possible for you.**

QQ Connect (connect.qq.com) reviews every website by hand, and Tencent
normally requires:

- a company registered in **mainland China**, and
- an **ICP filing**, which itself requires a Chinese legal entity.

Your business is a **Philippine sole proprietorship (DTI 5274092)**, so a QQ
application would most likely be rejected. I have left the button in place
because you asked for it and because it will start working the moment a
provider is configured — but I do not want you to spend a week on an
application that Tencent is likely to refuse.

**What I would suggest instead for families in mainland China:** they can
register with the ordinary email form using a QQ email address
(`something@qq.com`), which works perfectly today and needs no approval from
Tencent. Your registration form already recommends exactly this to Chinese
visitors.

If you do get approved, the steps are:

1. Register at https://connect.qq.com/ and apply for **网站应用** (website application).
2. After approval, copy the **APP ID** and **APP Key**.
3. Set the callback to `https://losmkvvwzijipqrlelyt.supabase.co/auth/v1/callback`
4. In Supabase → **New Provider** → **Manual configuration**:

   | Field | Value |
   | --- | --- |
   | Identifier | `custom:qq` |
   | Authorization URL | `https://graph.qq.com/oauth2.0/authorize` |
   | Token URL | `https://graph.qq.com/oauth2.0/token` |
   | UserInfo URL | `https://graph.qq.com/user/get_user_info` |

5. Turn **email optional** on — QQ does not return an email address.

---

## One setting to check for all of them

In Supabase go to **Authentication → URL Configuration** and make sure these
are listed under **Redirect URLs**:

```
https://www.tutorpro.site
https://www.tutorpro.site/
https://tutorpro.site
```

If the site address is missing here, the provider will refuse to send parents
back and they will see an "invalid redirect" message.

---

## How to tell it worked

Open https://www.tutorpro.site in a private/incognito window and click
**Student registration**.

- **Still says "Not switched on yet"** → the provider is not enabled in
  Supabase yet, or the switch was not saved. Click the button; it will show
  you the exact steps again.
- **Shows the friendly description** (e.g. *"Most parents already have this"*)
  → it is live. Click it and you should reach the provider's real login page.

Nothing you do here can break the existing email sign-up. It carries on
working exactly as before, side by side with the new buttons.
