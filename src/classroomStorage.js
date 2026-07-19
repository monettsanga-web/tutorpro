import { supabase } from './supabaseClient.js'

const CLASSROOM_BUCKET = 'classroom-files'
const MAX_STORAGE_SIZE = 50 * 1024 * 1024 // 50 MB

const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'ppt', 'pptx', 'doc', 'docx', 'txt', 'epub', 'edb',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg',
])

const ALLOWED_MIME_PREFIXES = [
  'image/',
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml',
  'application/epub+zip',
  'text/plain',
  'application/octet-stream',
]

export const CLASSROOM_FILE_ACCEPT = '.pdf,.ppt,.pptx,.doc,.docx,.txt,.epub,.edb,image/*'

export function isClassroomFileAllowed(file) {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  if (ALLOWED_EXTENSIONS.has(extension)) return true
  const type = file.type || ''
  return ALLOWED_MIME_PREFIXES.some((prefix) => type.startsWith(prefix))
}

export function getClassroomFileSizeLimit() {
  return MAX_STORAGE_SIZE
}

export function isClassroomStorageAvailable() {
  return Boolean(supabase)
}

export async function uploadClassroomFile(bookingId, file) {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (file.size > MAX_STORAGE_SIZE) {
    throw new Error(`Lesson files must be under ${Math.round(MAX_STORAGE_SIZE / 1024 / 1024)} MB.`)
  }
  if (!isClassroomFileAllowed(file)) {
    throw new Error('This file type is not supported in the classroom.')
  }

  const fileId = crypto.randomUUID()
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const storagePath = `${bookingId}/${fileId}.${extension}`

  const { error } = await supabase.storage
    .from(CLASSROOM_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })

  if (error) throw new Error(error.message || 'File upload failed.')

  return {
    id: fileId,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    storagePath,
    source: 'supabase',
  }
}

export async function getClassroomFileUrl(storagePath) {
  if (!supabase) return null
  const { data, error } = await supabase.storage
    .from(CLASSROOM_BUCKET)
    .createSignedUrl(storagePath, 3600)

  if (error) return null
  return data?.signedUrl || null
}

export async function deleteClassroomFile(storagePath) {
  if (!supabase) return
  await supabase.storage
    .from(CLASSROOM_BUCKET)
    .remove([storagePath])
}
