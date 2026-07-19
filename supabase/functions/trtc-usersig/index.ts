import { createClient } from 'npm:@supabase/supabase-js@2.110.7'
import TLSSigAPIv2 from 'npm:tls-sig-api-v2@1.0.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const sdkAppId = Number(Deno.env.get('TRTC_SDK_APP_ID') || '')
  const secretKey = Deno.env.get('TRTC_SECRET_KEY') || ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const authorization = request.headers.get('Authorization') || ''
  if (!sdkAppId || !secretKey || !supabaseUrl || !supabaseAnonKey) return json({ error: 'Tencent classroom secrets are not configured' }, 503)
  if (!authorization) return json({ error: 'Authentication is required' }, 401)

  try {
    const body = await request.json()
    const bookingId = String(body?.bookingId || '')
    if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return json({ error: 'A valid booking is required' }, 400)

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await client.auth.getUser()
    if (userError || !userData.user) return json({ error: 'The classroom login could not be verified' }, 401)

    const { data: booking, error: bookingError } = await client
      .from('bookings')
      .select('id, student_id, teacher_id, status, booking_data')
      .eq('id', bookingId)
      .single()
    if (bookingError || !booking) return json({ error: 'This booked classroom is not available to this account' }, 403)
    if (!['confirmed', 'ongoing'].includes(booking.status)) return json({ error: 'The class must be confirmed or ongoing' }, 409)

    const authId = userData.user.id
    const rolePrefix = booking.teacher_id === authId ? 't' : booking.student_id === authId ? 's' : 'a'
    const userId = `${rolePrefix}_${authId.replace(/[^a-z0-9]/gi, '').slice(0, 28)}`
    const roomId = String(booking.booking_data?.classroomId || '')
    if (!/^TP-[A-Z0-9-]{8,40}$/i.test(roomId)) return json({ error: 'The booking classroom ID is invalid' }, 409)

    const expiresIn = 2 * 60 * 60
    const signatureApi = new TLSSigAPIv2.Api(sdkAppId, secretKey)
    const userSig = signatureApi.genSig(userId, expiresIn)
    return json({ sdkAppId, userId, userSig, roomId, expiresIn })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Tencent classroom authorization failed' }, 500)
  }
})
