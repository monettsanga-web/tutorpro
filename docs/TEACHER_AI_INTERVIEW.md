# TutorPro English AI teacher applicant interview

Teacher applicants must complete a 14-question text interview before their application can be submitted. The interview covers credentials, written English, pedagogy, a randomized micro-demo, logistics and platform fit. The transcript and internal recommendation appear only in the Administrator Teacher Profile.

The structured interview works without an external model. If the AI evaluator is unavailable, TutorPro English stores a conservative structured fallback recommendation for mandatory human review.

## Optional AI evaluation setup

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

The URL and model can be changed to another OpenAI-compatible provider. Never place the model API key in a `VITE_` variable or browser code.

### Deploy

```bash
supabase functions deploy teacher-interview-evaluator
```

Keep JWT verification enabled. Applicants use the project’s browser-safe anonymous session while private provider credentials remain inside the Edge Function.

## Administrator review

Open:

```text
Admin → Teachers → Open → AI teacher interview
```

The administrator sees English proficiency, micro-demo performance, strengths, concerns, availability, recommendation, suggested next step and the complete question-by-question transcript. The applicant sees only the warm completion message and never sees internal scoring or notes.

A human administrator must always make the final hiring decision and verify the Bachelor's Degree, TEFL certificate, ESL teaching experience and identity documents.
