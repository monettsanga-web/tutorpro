# TutorPro English recorded AI teacher applicant interview

Teacher applicants must complete a 14-question recorded interview before their application can be submitted. A fictional, AI-generated English male interviewer displays and reads one question at a time using an `en-GB` browser voice. Applicants can:

1. Review the complete question without a timer.
2. Hear the interviewer read it aloud.
3. Press **Start answer** only when ready.
4. Wait for the spoken question and three-second countdown.
5. Record up to five minutes of microphone audio.
6. Listen to the answer, re-record it, and review the automatic transcript.
7. Save the answer and continue.

The reviewed transcript supports structured/AI evaluation. Private audio lets the human hiring team assess spoken fluency, pronunciation, communication clarity and teaching delivery.

## Required private recording setup

Run the complete contents of this file in **Supabase Dashboard → SQL Editor**:

```text
supabase/teacher_interview_recordings.sql
```

Expected result:

```text
TutorPro English recorded teacher interviews are ready
```

The SQL creates:

- Private bucket `teacher-interview-recordings`
- Expiring, unguessable applicant upload sessions
- Maximum 8 MB and five minutes per answer
- Applicant upload-only access
- Administrator-only playback access
- Recording metadata linked to the teacher profile

The bucket is private. Audio is never public and applicants cannot browse another applicant’s recordings. If the SQL has not been run, applicants can still complete the recorded flow and submit reviewed transcripts, but the interface marks secure audio storage as unavailable.

## Browser requirements

Use a current version of Chrome, Edge or Safari and allow microphone access. Automatic speech-to-text support varies by browser and country. When it is unavailable, the applicant listens to the recording and types or corrects a short transcript before continuing. The original recording is never altered by transcript edits.

The spoken voice is selected from the device’s English voices, preferring an English male `en-GB` voice. The exact installed voice can vary by operating system.

## Optional AI evaluation setup

The structured interview works without an external model. If the AI evaluator is unavailable, TutorPro English stores a conservative structured fallback recommendation for mandatory human review.

The included Supabase Edge Function can use any OpenAI-compatible chat-completions provider.

Function source:

```text
supabase/functions/teacher-interview-evaluator/index.ts
```

Private prompt reference:

```text
supabase/functions/teacher-interview-evaluator/prompt.md
```

### Configure secrets

```bash
supabase secrets set AI_INTERVIEW_API_KEY=YOUR_PRIVATE_MODEL_API_KEY
supabase secrets set AI_INTERVIEW_API_URL=https://api.openai.com/v1/chat/completions
supabase secrets set AI_INTERVIEW_MODEL=gpt-4o-mini
```

Never place the model API key in a `VITE_` variable or browser code.

### Deploy

```bash
supabase functions deploy teacher-interview-evaluator
```

## Administrator review

Open:

```text
Admin → Teachers → Open → AI teacher interview
```

The administrator can securely open every recorded answer and sees English proficiency, micro-demo performance, strengths, concerns, availability, recommendation, suggested next step and the complete question-by-question transcript. Signed playback links expire after 30 minutes.

A human administrator must always make the final hiring decision and verify the Bachelor's Degree, TEFL certificate, ESL teaching experience and identity documents.
