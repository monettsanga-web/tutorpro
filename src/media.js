const DB_NAME = 'tutorpro_profile_media'
const STORE_NAME = 'media'
const DB_VERSION = 1


async function imageFileToDataUrl(file) {
  if (!file?.type?.startsWith('image/')) return ''
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) {
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    })
  }
  const maxSide = 720
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()
  return canvas.toDataURL('image/jpeg', 0.82)
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser does not support profile media storage.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Media storage could not be opened.'))
  })
}

export async function saveProfileMedia(accountId, kind, file) {
  if (!file) throw new Error('Choose a file to upload.')
  if (kind === 'avatar' && !file.type.startsWith('image/')) throw new Error('Choose a JPG, PNG or WebP image.')
  if (kind === 'intro-video' && !file.type.startsWith('video/')) throw new Error('Choose an MP4 or WebM video.')
  const maximumSize = kind === 'avatar' ? 5 * 1024 * 1024 : 50 * 1024 * 1024
  if (file.size > maximumSize) throw new Error(kind === 'avatar' ? 'Profile photos must be under 5 MB.' : 'Introduction videos must be under 50 MB.')

  const dataUrl = kind === 'avatar' ? await imageFileToDataUrl(file) : ''
  const database = await openDatabase()
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put({
      id: `${accountId}:${kind}`,
      accountId,
      kind,
      blob: file,
      dataUrl,
      fileName: file.name,
      mimeType: file.type,
      updatedAt: new Date().toISOString(),
    })
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error || new Error('The media file could not be saved.'))
  })
  database.close()
  return { fileName: file.name, mimeType: file.type, dataUrl, updatedAt: new Date().toISOString() }
}

export async function deleteProfileMediaOwner(accountId) {
  if (!accountId || typeof indexedDB === 'undefined') return 0
  const database = await openDatabase()
  let removed = 0
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const request = transaction.objectStore(STORE_NAME).openCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) return
      if (cursor.value?.accountId === accountId || String(cursor.key).startsWith(`${accountId}:`)) {
        cursor.delete()
        removed += 1
      }
      cursor.continue()
    }
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error || new Error('Profile media could not be removed.'))
  })
  database.close()
  return removed
}

export async function getProfileMedia(accountId, kind) {
  if (!accountId || typeof indexedDB === 'undefined') return null
  const database = await openDatabase()
  const record = await new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(`${accountId}:${kind}`)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error || new Error('The media file could not be loaded.'))
  })
  database.close()
  return record
}
