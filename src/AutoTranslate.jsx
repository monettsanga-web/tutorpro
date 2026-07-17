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

function browserLanguage() {
  const locale = navigator.language || 'en'
  if (locale.toLowerCase().startsWith('fil') || locale.toLowerCase().startsWith('tl')) return 'tl'
  if (locale.toLowerCase().startsWith('zh-tw') || locale.toLowerCase().startsWith('zh-hk')) return 'zh-TW'
  if (locale.toLowerCase().startsWith('zh')) return 'zh-CN'
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

function setTranslationCookie(language) {
  const value = language === 'en' ? '/en/en' : `/en/${language}`
  document.cookie = `googtrans=${value};path=/;max-age=31536000;SameSite=Lax`
}

function changeGoogleLanguage(language) {
  setTranslationCookie(language)
  const select = document.querySelector('.goog-te-combo')
  if (select) {
    select.value = language
    select.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

export default function AutoTranslate() {
  const [language, setLanguage] = useState(() => localStorage.getItem('tutorpro_language') || 'en')
  const [automatic, setAutomatic] = useState(() => !localStorage.getItem('tutorpro_language'))

  useEffect(() => {
    let cancelled = false
    const saved = localStorage.getItem('tutorpro_language')

    const initialise = async () => {
      const targetLanguage = saved || await detectLocationLanguage()
      if (cancelled) return
      setLanguage(targetLanguage)
      setTranslationCookie(targetLanguage)

      window.tutorProTranslateReady = () => {
        if (!window.google?.translate) return
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: languages.map((item) => item.code).join(','),
          autoDisplay: false,
        }, 'google_translate_element')
        window.setTimeout(() => changeGoogleLanguage(targetLanguage), 250)
      }

      if (!document.querySelector('script[data-tutorpro-translate]')) {
        const script = document.createElement('script')
        script.src = 'https://translate.google.com/translate_a/element.js?cb=tutorProTranslateReady'
        script.async = true
        script.dataset.tutorproTranslate = 'true'
        document.head.appendChild(script)
      } else if (window.google?.translate) {
        window.tutorProTranslateReady()
      }
    }

    initialise()
    return () => { cancelled = true }
  }, [])

  const chooseLanguage = async (event) => {
    const selection = event.target.value
    if (selection === 'auto') {
      localStorage.removeItem('tutorpro_language')
      setAutomatic(true)
      const detectedLanguage = await detectLocationLanguage()
      setLanguage(detectedLanguage)
      changeGoogleLanguage(detectedLanguage)
      return
    }
    setLanguage(selection)
    setAutomatic(false)
    localStorage.setItem('tutorpro_language', selection)
    changeGoogleLanguage(selection)
  }

  return (
    <div className="language-control">
      <div id="google_translate_element" aria-hidden="true" />
      <Globe2 size={17} />
      <span>Choose language</span>
      <select value={automatic ? 'auto' : language} onChange={chooseLanguage} aria-label="Choose website language">
        <option value="auto">Auto-detect</option>
        {languages.map((item) => <option value={item.code} key={item.code}>{item.label}</option>)}
      </select>
    </div>
  )
}
