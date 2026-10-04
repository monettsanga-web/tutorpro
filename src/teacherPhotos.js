/**
 * Putting a teacher's photo where other people can see it.
 *
 * The browser used to do this itself, with a PATCH on `profiles`. That
 * goes through row-level security and the column-lock trigger, and when
 * it is refused the teacher is none the wiser: their own browser still
 * has the image, so their dashboard looks right while every parent sees a
 * grey letter. On the live site that produced three approved teachers and
 * one stored photo.
 *
 * /api/teachers/photo writes with the service-role key and answers with a
 * real error when it cannot. It also accepts the administrator as the
 * caller, which is what makes it possible to fix a teacher's photo from
 * the admin dashboard without that teacher doing anything.
 */

import { supabase } from './supabaseClient.js'

async function accessToken() {
  if (!supabase) return ''
  const { data } = await supabase.auth.getSession()
  return data?.session?.access_token || ''
}

/** Resize to 256px and return a data URL small enough to store on a row. */
export async function photoFileToDataUrl(file, maxSide = 256, quality = 0.72) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose a JPG, PNG or WebP image.')
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) throw new Error('That image could not be read. Try a JPG or PNG.')
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return canvas.toDataURL('image/jpeg', quality)
}

/**
 * Share a teacher's photo. Returns { shared: true } when the database has
 * it, or throws with a message worth showing to a person.
 */
export async function shareTeacherPhoto(teacherId, dataUrl) {
  if (!teacherId) throw new Error('No teacher was chosen.')
  if (!dataUrl) throw new Error('No photo to upload.')

  const token = await accessToken()
  if (!token) throw new Error('Your session has expired. Log out, log back in and try again.')

  const response = await fetch('/api/teachers/photo', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ teacherId, photo: dataUrl }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || payload?.message || `The photo could not be shared (HTTP ${response.status}).`)
  }
  return { shared: true, bytes: payload.bytes || dataUrl.length }
}
