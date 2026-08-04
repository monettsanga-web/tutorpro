/**
 * Sends one follow-up email through the Supabase Edge Function.
 *
 * The function verifies the caller is an administrator and looks the
 * recipient's address up in the database, so nothing here can be used to mail
 * an arbitrary person.
 */
import { isSupabaseConfigured, supabase } from './supabaseClient.js'

export function followUpEmailAvailable() {
  return isSupabaseConfigured && Boolean(supabase)
}

export async function sendFollowUpEmail({ accountId, type, subject, body }) {
  if (!followUpEmailAvailable()) {
    throw new Error('Email sending needs Supabase. Use "Copy message" and send it yourself for now.')
  }
  const { data, error } = await supabase.functions.invoke('follow-up-email', {
    body: { accountId, type, subject, body },
  })
  if (error) throw new Error(error.message || 'The email could not be sent.')
  if (data?.error) throw new Error(data.error)
  if (data && data.delivered === false) throw new Error(data.reason || 'This family has no email address on file.')
  return data || { delivered: true }
}
