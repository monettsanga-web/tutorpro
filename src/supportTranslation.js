const translationCache = new Map()

const languageMap = {
  en: 'en',
  tl: 'tl',
  ko: 'ko',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  ja: 'ja',
  es: 'es',
  fr: 'fr',
  de: 'de',
  pt: 'pt',
  ar: 'ar',
  vi: 'vi',
  th: 'th',
}

function detectSourceLanguage(text) {
  if (/[\u4e00-\u9fff]/u.test(text)) return 'zh-CN'
  if (/[\u3040-\u30ff]/u.test(text)) return 'ja'
  if (/[\uac00-\ud7af]/u.test(text)) return 'ko'
  if (/[\u0600-\u06ff]/u.test(text)) return 'ar'
  return 'en'
}

export async function translateSupportText(text, targetLanguage) {
  const normalized = text?.trim()
  const target = languageMap[targetLanguage] || 'en'
  if (!normalized) return ''
  const source = detectSourceLanguage(normalized)
  if (source === target || (source === 'zh-CN' && target === 'zh-TW')) return normalized
  const key = `${source}:${target}:${normalized}`
  if (translationCache.has(key)) return translationCache.get(key)

  try {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 7000)
    const endpoint = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(normalized)}&langpair=${encodeURIComponent(`${source}|${target}`)}`
    const response = await fetch(endpoint, { signal: controller.signal })
    window.clearTimeout(timeout)
    if (!response.ok) return ''
    const payload = await response.json()
    const translation = payload?.responseData?.translatedText?.trim() || ''
    if (translation && translation.toLowerCase() !== normalized.toLowerCase()) {
      translationCache.set(key, translation)
      return translation
    }
  } catch {
    // The original message remains visible if translation is unavailable.
  }
  return ''
}
