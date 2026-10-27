import booking from './_booking.js'
import message from './_message.js'
import support from './_support.js'

/**
 * One serverless function for all three notification emails.
 *
 * WHY THE MERGE
 * -------------
 * Vercel's Hobby plan allows at most TWELVE serverless functions per
 * deployment, and this project had grown to thirteen the moment
 * /api/auth/ensure-profile (one-tap Google/Apple sign-up) joined: every
 * deploy since then died in seconds with
 * `exceeded_serverless_functions_per_deployment`.
 *
 * The three notify routes were the natural merge: same shape, same mail
 * layer, and Vercel maps /api/notify/booking, /api/notify/message and
 * /api/notify/support onto this one [type] file, so no caller changed.
 * The handlers themselves live in _-prefixed files, which Vercel treats as
 * helpers rather than functions.
 */
const HANDLERS = { booking, message, support }

export default async function handler(req, res) {
  const run = HANDLERS[String(req.query?.type || '')]
  if (!run) return res.status(404).json({ error: 'Unknown notification type.' })
  return run(req, res)
}
