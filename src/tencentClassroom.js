import { supabase } from './supabaseClient.js'

const configuredSdkAppId = Number(import.meta.env?.VITE_TRTC_SDK_APP_ID || 0)

export function isTencentClassroomConfigured() {
  return Boolean(supabase && Number.isInteger(configuredSdkAppId) && configuredSdkAppId > 0)
}

export async function fetchTencentClassroomCredentials(bookingId) {
  if (!isTencentClassroomConfigured()) throw new Error('Tencent RTC is not configured for this deployment.')
  const { data, error } = await supabase.functions.invoke('trtc-usersig', {
    body: { bookingId },
  })
  if (error) throw new Error(`Tencent classroom authorization failed: ${error.message}`)
  if (!data?.userSig || !data?.userId || !data?.roomId || Number(data?.sdkAppId) !== configuredSdkAppId) {
    throw new Error('Tencent classroom authorization returned incomplete credentials.')
  }
  return {
    sdkAppId: configuredSdkAppId,
    userId: data.userId,
    userSig: data.userSig,
    roomId: data.roomId,
    expiresIn: Number(data.expiresIn) || 3600,
  }
}
