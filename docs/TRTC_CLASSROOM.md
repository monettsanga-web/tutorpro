# Embedded VooV / Tencent RTC classroom

TutorPro English can use Tencent RTC as the embedded audio/video engine while keeping the booking, whiteboard, annotations, files, chat and feedback inside the website.

## Configuration

Public EdgeOne build variable:

```text
VITE_TRTC_SDK_APP_ID=YOUR_NUMERIC_SDK_APP_ID
```

Private Supabase Edge Function secrets:

```text
TRTC_SDK_APP_ID=YOUR_NUMERIC_SDK_APP_ID
TRTC_SECRET_KEY=YOUR_PRIVATE_SDK_SECRET_KEY
```

Never put `TRTC_SECRET_KEY` in a `VITE_` variable or GitHub.

## Deploy the secure UserSig function

From a trusted computer with Supabase CLI connected to the TutorPro project:

```bash
supabase functions deploy trtc-usersig
```

Keep JWT verification enabled. The function verifies the logged-in Supabase user against the booking before generating a two-hour UserSig. Applicants, parents and unrelated accounts cannot request credentials for another booking.

## Enable it for a teacher

1. Redeploy EdgeOne after adding `VITE_TRTC_SDK_APP_ID`.
2. Open **Teacher Dashboard → Classroom**.
3. Choose **VooV / Tencent RTC**.
4. Save the classroom setting.
5. The VooV link becomes an optional external fallback.
6. Open a confirmed booking and enter the private classroom.

When both participants enter, Tencent RTC handles embedded camera, microphone, remote video and screen sharing. TutorPro's Supabase transport continues to carry the private chat, lesson files, annotation state and classroom controls.

## Troubleshooting

- `Tencent classroom authorization failed`: deploy `trtc-usersig`, confirm both secrets, and log in again.
- `The class must be confirmed or ongoing`: confirm the booking before entry.
- `This browser does not support Tencent RTC`: use current Chrome, Edge or Safari over HTTPS.
- Teacher still uses peer-to-peer mode: select **VooV / Tencent RTC** in the Teacher Classroom settings and save.
- Environment changes do not affect an old EdgeOne deployment; create a new production deployment.
