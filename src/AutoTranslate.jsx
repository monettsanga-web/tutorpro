import { useEffect, useState } from 'react'
import { Globe2 } from 'lucide-react'

const languages = [
  { code: 'en', label: 'English' },
  { code: 'tl', label: 'Filipino' },
  { code: 'ko', label: '한국어' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'ja', label: '日本語' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'th', label: 'ไทย' },
]

const countryLanguages = {
  PH: 'tl', KR: 'ko', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-TW', JP: 'ja',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  FR: 'fr', DE: 'de', AT: 'de', BR: 'pt', PT: 'pt',
  SA: 'ar', AE: 'ar', QA: 'ar', EG: 'ar', VN: 'vi', TH: 'th',
}

function readSavedLanguage() {
  try { return localStorage.getItem('tutorpro_language') || '' } catch { return '' }
}

function saveLanguage(language) {
  try {
    if (language) localStorage.setItem('tutorpro_language', language)
    else localStorage.removeItem('tutorpro_language')
  } catch {
    // The current selection still works when persistent storage is unavailable.
  }
}

function browserLanguage() {
  const locale = navigator.language || 'en'
  if (/^(fil|tl)/i.test(locale)) return 'tl'
  if (/^zh-(tw|hk)/i.test(locale)) return 'zh-TW'
  if (/^zh/i.test(locale)) return 'zh-CN'
  const short = locale.split('-')[0]
  return languages.some((language) => language.code === short) ? short : 'en'
}

async function detectLocationLanguage() {
  try {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 3500)
    const response = await fetch('https://ipapi.co/json/', { signal: controller.signal })
    window.clearTimeout(timeout)
    if (response.ok) {
      const location = await response.json()
      return countryLanguages[location.country_code] || browserLanguage()
    }
  } catch {
    return browserLanguage()
  }
  return browserLanguage()
}

function applyLanguagePreference(language) {
  document.documentElement.lang = language
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  window.dispatchEvent(new CustomEvent('tutorpro:language-change', { detail: { language } }))
}

export default function AutoTranslate() {
  const [language, setLanguage] = useState(() => readSavedLanguage() || 'en')
  const [automatic, setAutomatic] = useState(() => !readSavedLanguage())

  useEffect(() => {
    let cancelled = false
    const initialise = async () => {
      document.cookie = 'googtrans=;path=/;max-age=0;SameSite=Lax'
      const targetLanguage = readSavedLanguage() || await detectLocationLanguage()
      if (cancelled) return
      setLanguage(targetLanguage)
      applyLanguagePreference(targetLanguage)
    }
    initialise()
    return () => { cancelled = true }
  }, [])

  const chooseLanguage = async (event) => {
    const selection = event.target.value
    if (selection === 'auto') {
      saveLanguage('')
      setAutomatic(true)
      const detectedLanguage = await detectLocationLanguage()
      setLanguage(detectedLanguage)
      applyLanguagePreference(detectedLanguage)
      return
    }
    setLanguage(selection)
    setAutomatic(false)
    saveLanguage(selection)
    applyLanguagePreference(selection)
  }

  return (
    <div className="language-control" title="Language preference">
      <Globe2 size={17} />
      <span>Choose language</span>
      <select value={automatic ? 'auto' : language} onChange={chooseLanguage} aria-label="Choose website language">
        <option value="auto">Auto-detect</option>
        {languages.map((item) => <option value={item.code} key={item.code}>{item.label}</option>)}
      </select>
    </div>
  )
}
