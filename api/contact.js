/* Public contact-form gate (owner, 2026-11-02: "what are these?" - bot
 * submissions had filled the support inbox with random-token names).
 *
 * The forms used to call the Supabase RPC straight from the browser, which
 * put the endpoint and the publishable key in the source of every page that
 * carries a form - an open door for fuzzers. They now post HERE, and this
 * route refuses anything a person would not send:
 *   - a hidden honeypot field only bots fill;
 *   - submissions faster than a human can read the form;
 *   - "names" that are random tokens (no space, long consonant runs);
 *   - malformed emails or empty messages;
 *   - more than five messages an hour from one address block.
 * Only what passes is written to the support inbox, server side.
 */
const SUPABASE_URL = 'https://losmkvvwzijipqrlelyt.supabase.co'
/* The publishable key is public by design (it ships in every page); the
   write path is what this route protects, not the key. */
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_icTkeremuFxwHOy52_gXfQ_x3IibhLL'

const HUMAN_NAME = /^[\p{L}][\p{L}\s'’.\-]{1,79}$/u
const CONSONANT_RUN = /[^aeiouAEIOU\s'’.\-]{6,}/
const MIN_MILLIS = 3000
const HOURLY_LIMIT = 5
const hits = new Map()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'This endpoint accepts POST only.' })
  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {})
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim()
  const message = String(body.message || '').trim()
  const role = String(body.role || 'Parent or guardian').slice(0, 40)
  const topic = String(body.topic || 'Something else').slice(0, 60)

  if (String(body.website || '').trim()) return res.status(400).json({ error: 'Spam detected.' })
  const age = Date.now() - Number(body.ts || 0)
  if (!Number(body.ts) || !Number.isFinite(age) || age < MIN_MILLIS) return res.status(400).json({ error: 'Please take a moment to fill the form before sending.' })
  if (name.length < 2 || !HUMAN_NAME.test(name)) return res.status(400).json({ error: 'Please add your real name so we can answer you.' })
  if (!/\s/.test(name) && CONSONANT_RUN.test(name)) return res.status(400).json({ error: 'Please add your real name so we can answer you.' })
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Please add a valid email address.' })
  if (message.length < 10) return res.status(400).json({ error: 'Please write a short message so we know how to help.' })

  const ip = String(req.headers['x-forwarded-for'] || 'local').split(',')[0].trim()
  const now = Date.now()
  const log = (hits.get(ip) || []).filter((t) => now - t < 3600000)
  if (log.length >= HOURLY_LIMIT) return res.status(429).json({ error: 'Too many messages from this connection. Please try again later or email us directly.' })
  log.push(now)
  hits.set(ip, log)

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_support_conversation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${PUBLISHABLE_KEY}` },
      body: JSON.stringify({
        parent_name: name,
        parent_email: email,
        visitor_language: 'en',
        first_message: `[Contact page] ${role} — ${topic}.\n\n${message}`,
      }),
    })
    if (!response.ok) throw new Error(`status ${response.status}`)
    return res.status(200).json({ ok: true })
  } catch {
    return res.status(502).json({ error: 'The website could not send your message just now. Please email sejongenglish@yahoo.com instead.' })
  }
}

function safeParse(text) {
  try { return JSON.parse(text) } catch { return {} }
}
