import { supabase } from './supabaseClient.js'

const CLASSROOM_BUCKET = 'classroom-files'
const MAX_STORAGE_SIZE = 500 * 1024 * 1024 // 500 MB

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

/**
 * List every lesson file this teacher has uploaded before, newest first.
 * Files used to be stored under the booking id, so each one was trapped in a
 * single lesson and had to be re-uploaded every time. Teacher-owned files live
 * under `library/<teacherId>/` and can be re-shared in any class.
 */
export async function listTeacherLibrary(teacherId) {
  if (!supabase || !teacherId) return []
  const { data, error } = await supabase.storage
    .from(CLASSROOM_BUCKET)
    .list(`library/${teacherId}`, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
  if (error || !Array.isArray(data)) return []
  return data
    .filter((item) => item.id || item.name)
    .map((item) => ({
      id: item.id || item.name,
      name: String(item.name || '').replace(/^\d+__/, ''),
      size: item.metadata?.size || 0,
      type: item.metadata?.mimetype || 'application/octet-stream',
      storagePath: `library/${teacherId}/${item.name}`,
      source: 'supabase',
      library: true,
      uploadedAt: item.created_at || '',
    }))
}

export async function uploadClassroomFile(bookingId, file, options = {}) {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (file.size > MAX_STORAGE_SIZE) {
    throw new Error(`Lesson files must be under ${Math.round(MAX_STORAGE_SIZE / 1024 / 1024)} MB.`)
  }
  if (!isClassroomFileAllowed(file)) {
    throw new Error('This file type is not supported in the classroom.')
  }

  const fileId = crypto.randomUUID()
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  // A teacher's uploads go to their reusable library; anything else stays
  // scoped to the booking exactly as before.
  const safeName = String(file.name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  const storagePath = options.teacherId
    ? `library/${options.teacherId}/${Date.now()}__${safeName}`
    : `${bookingId}/${fileId}.${extension}`

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
    library: Boolean(options.teacherId),
  }
}

export async function getClassroomFileUrl(storagePath) {
  if (!supabase) return null
  const { data, error } = await supabase.storage
    .from(CLASSROOM_BUCKET)
    .createSignedUrl(storagePath, 21600)

  if (error) return null
  return data?.signedUrl || null
}

export async function deleteClassroomFile(storagePath) {
  if (!supabase) return
  await supabase.storage
    .from(CLASSROOM_BUCKET)
    .remove([storagePath])
}
