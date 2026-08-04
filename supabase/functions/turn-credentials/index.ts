// TutorPro Online English — short-lived TURN credentials
//
// Cloudflare Realtime TURN does not accept a static username/password. You hold
// one long-lived TURN key on the server and mint short-lived credentials per
// lesson. This function does that minting.
//
// Keeping the key server-side matters: with it, anyone could generate unlimited
// relay credentials and burn through your bandwidth allowance.
//
// Deploy:
//   supabase functions deploy turn-credentials
// Secrets (Supabase → Edge Functions → Secrets):
//   CLOUDFLARE_TURN_KEY_ID
//   CLOUDFLARE_TURN_API_TOKEN

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Long enough for the longest lesson plus overrun. Cloudflare recommends
// exceeding your expected session length.
const CREDENTIAL_TTL_SECONDS = 4 * 60 * 60

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (payload: unknown, status = 200) => new Response(
    JSON.stringify(payload),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )

  try {
    const keyId = Deno.env.get('CLOUDFLARE_TURN_KEY_ID')
    const apiToken = Deno.env.get('CLOUDFLARE_TURN_API_TOKEN')
    // Not configured is a normal state, not an error: the classroom falls back
    // to a direct connection exactly as it does today.
    if (!keyId || !apiToken) return json({ configured: false, iceServers: [] })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Only signed-in users may mint credentials, so the bandwidth allowance
    // cannot be drained by anonymous traffic.
    const authorization = request.headers.get('Authorization') || ''
    if (!authorization) return json({ error: 'Authentication required' }, 401)
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Invalid session' }, 401)

    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: CREDENTIAL_TTL_SECONDS }),
      },
    )
    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`Cloudflare TURN request failed (${response.status}): ${detail.slice(0, 200)}`)
    }

    const data = await response.json()
    const iceServers = Array.isArray(data?.iceServers) ? data.iceServers : []
    if (!iceServers.length) throw new Error('Cloudflare returned no ICE servers')

    return json({
      configured: true,
      iceServers,
      // Let the client refresh a little before the credentials actually lapse.
      expiresAt: new Date(Date.now() + (CREDENTIAL_TTL_SECONDS - 300) * 1000).toISOString(),
    })
  } catch (error) {
    // A failure here must never block the lesson: the classroom still attempts
    // a direct peer-to-peer connection.
    return json({ configured: false, iceServers: [], error: (error as Error).message }, 200)
  }
})
