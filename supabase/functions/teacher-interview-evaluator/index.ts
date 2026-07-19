const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const systemPrompt = `You are TUTORPRO ENGLISH Hiring Assistant, an AI interviewer that screens Filipino applicants who want to become English teachers on TutorPro English, an online English learning platform. You are the first screen, never the final decision-maker.

Evaluate the completed interview transcript for: English proficiency and communication clarity, teaching experience, pedagogical skill, professionalism, platform fit, and live micro-demo quality. Minimum requirements are a Bachelor's Degree, TEFL certification, and ESL teaching experience. The hiring subjects are English for Primary and Secondary learners.

Be professional, neutral, consistent, and evidence-based. Do not promise a job, salary, or pay rate. Treat vague, inconsistent, evasive, or apparently copied answers as concerns rather than confronting the applicant. Internal scoring, thresholds, and notes must never be shown to the applicant.

Evaluate these dimensions: English proficiency (accuracy, range, fluency, clarity); teaching experience (depth, ages, levels, online/in-person); pedagogical skill (structured methods, adaptability, empathy, correction style); communication clarity; live demo correctness, clarity, simplicity and adaptation; professionalism, reliability and preparation; and red flags.

Map the overall recommendation to exactly one of: "Strong Hire", "Consider / Second Interview", or "Not a Fit Now".

Return ONLY valid JSON with this exact shape:
{
  "applicantName": "string",
  "selfReportedExperience": "string",
  "certificationsMentioned": ["string"],
  "englishProficiency": { "band": "Strong|Good|Needs Review", "justification": "string" },
  "teachingApproach": "string",
  "liveDemo": { "band": "Strong|Good|Weak", "prompt": "string", "justification": "string" },
  "strengths": ["string"],
  "concerns": ["string"],
  "availability": "string",
  "overallRecommendation": "Strong Hire|Consider / Second Interview|Not a Fit Now",
  "suggestedNextStep": "string"
}`

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const apiKey = Deno.env.get('AI_INTERVIEW_API_KEY')
    const apiUrl = Deno.env.get('AI_INTERVIEW_API_URL') || 'https://api.openai.com/v1/chat/completions'
    const model = Deno.env.get('AI_INTERVIEW_MODEL') || 'gpt-4o-mini'
    if (!apiKey) throw new Error('AI_INTERVIEW_API_KEY is not configured')

    const { applicant, transcript, microDemoPrompt } = await request.json()
    if (!applicant?.fullName || !Array.isArray(transcript) || transcript.length < 10 || transcript.length > 18) {
      throw new Error('Interview payload is incomplete')
    }
    const safeTranscript = transcript.map((item) => ({
      stage: String(item.stage || '').slice(0, 100),
      question: String(item.question || '').slice(0, 600),
      answer: String(item.answer || '').slice(0, 2500),
    }))
    const userPayload = {
      applicant: {
        fullName: String(applicant.fullName).slice(0, 100),
        specialization: String(applicant.specialization || '').slice(0, 100),
        education: String(applicant.education || '').slice(0, 200),
        experience: Number(applicant.experience) || 0,
        languages: String(applicant.languages || '').slice(0, 200),
        credentialFileNames: Array.isArray(applicant.credentials) ? applicant.credentials.slice(0, 10).map((item: unknown) => String(item).slice(0, 180)) : [],
      },
      microDemoPrompt: String(microDemoPrompt || '').slice(0, 700),
      transcript: safeTranscript,
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.15,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(userPayload) },
        ],
      }),
    })
    if (!response.ok) throw new Error(`AI evaluation failed: ${await response.text()}`)
    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content
    if (!content) throw new Error('AI evaluator returned no result')
    const evaluation = JSON.parse(content.replace(/^```json\s*|\s*```$/g, ''))
    if (!['Strong Hire', 'Consider / Second Interview', 'Not a Fit Now'].includes(evaluation.overallRecommendation)) {
      throw new Error('AI evaluator returned an invalid recommendation')
    }
    return new Response(JSON.stringify(evaluation), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
