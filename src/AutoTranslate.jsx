import { useEffect, useState } from 'react'
import { Globe2 } from 'lucide-react'
import { readVisitorCountry, saveVisitorCountry } from './visitorLocale.js'

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
  { code: 'pl', label: 'Polski' },
]

const languageControlLabels = {
  en: { choose: 'Choose language', auto: 'Auto-detect' },
  tl: { choose: 'Pumili ng wika', auto: 'Awtomatikong tukuyin' },
  ko: { choose: '언어 선택', auto: '자동 감지' },
  'zh-CN': { choose: '选择语言', auto: '根据位置自动检测' },
  'zh-TW': { choose: '選擇語言', auto: '根據位置自動偵測' },
  ja: { choose: '言語を選択', auto: '自動検出' },
  es: { choose: 'Elegir idioma', auto: 'Detectar automáticamente' },
  fr: { choose: 'Choisir la langue', auto: 'Détection automatique' },
  de: { choose: 'Sprache wählen', auto: 'Automatisch erkennen' },
  pt: { choose: 'Escolher idioma', auto: 'Detectar automaticamente' },
  ar: { choose: 'اختر اللغة', auto: 'اكتشاف تلقائي' },
  vi: { choose: 'Chọn ngôn ngữ', auto: 'Tự động phát hiện' },
  th: { choose: 'เลือกภาษา', auto: 'ตรวจหาอัตโนมัติ' },
  pl: { choose: 'Wybierz język', auto: 'Wykryj automatycznie' },
}

const pageTitles = {
  en: 'TutorPro Online English — English confidence, built one lesson at a time',
  tl: 'TutorPro Online English — Kumpiyansa sa Ingles, isang aralin sa bawat pagkakataon',
  ko: 'TutorPro Online English — 한 수업씩 키우는 영어 자신감',
  'zh-CN': 'TutorPro Online English — 一课一步，建立英语自信',
  'zh-TW': 'TutorPro Online English — 一課一步，建立英語自信',
  ja: 'TutorPro Online English — 一つひとつのレッスンで英語に自信を',
  es: 'TutorPro Online English — Confianza en inglés, una clase a la vez',
  fr: 'TutorPro Online English — La confiance en anglais, une leçon à la fois',
  de: 'TutorPro Online English — Englisch-Selbstvertrauen, Lektion für Lektion',
  pt: 'TutorPro Online English — Confiança em inglês, uma aula de cada vez',
  ar: 'TutorPro Online English — الثقة في الإنجليزية، درسًا بعد درس',
  vi: 'TutorPro Online English — Tự tin tiếng Anh qua từng bài học',
  th: 'TutorPro Online English — สร้างความมั่นใจภาษาอังกฤษทีละบทเรียน',
  pl: 'TutorPro Online English — Pewność w angielskim, lekcja po lekcji',
}

const countryLanguages = {
  PH: 'en', KR: 'ko', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-TW', MO: 'zh-TW', JP: 'ja',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  FR: 'fr', DE: 'de', AT: 'de', BR: 'pt', PT: 'pt',
  SA: 'ar', AE: 'ar', QA: 'ar', EG: 'ar', VN: 'vi', TH: 'th',
  PL: 'pl',
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

async function lookupCountry(url, readCountry) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 2600)
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    if (!response.ok) return ''
    const payload = await response.json()
    return (readCountry(payload) || '').toUpperCase()
  } catch {
    return ''
  } finally {
    window.clearTimeout(timeout)
  }
}

async function detectLocationLanguage() {
  const lookups = [
    ['https://api.country.is/', (payload) => payload.country],
    ['https://ipwho.is/', (payload) => payload.success === false ? '' : payload.country_code],
  ]
  for (const [url, readCountry] of lookups) {
    const country = await lookupCountry(url, readCountry)
    if (country) return { language: countryLanguages[country] || browserLanguage(), country }
  }
  return { language: browserLanguage(), country: readVisitorCountry() }
}

function applyLanguagePreference(language, country = readVisitorCountry()) {
  document.documentElement.lang = language
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  document.title = pageTitles[language] || pageTitles.en
  if (country) saveVisitorCountry(country)
  window.dispatchEvent(new CustomEvent('tutorpro:language-change', { detail: { language, country } }))
}

function googleTranslateCode(language) {
  if (!language || language === 'en') return ''
  return language
}

function setGoogleTranslateCookie(language) {
  const target = googleTranslateCode(language)
  const value = target ? `/en/${target}` : ''
  const maxAge = target ? '31536000' : '0'
  document.cookie = `googtrans=${value};path=/;max-age=${maxAge};SameSite=Lax`
  try {
    const hostParts = window.location.hostname.split('.')
    if (hostParts.length > 1) {
      const rootDomain = `.${hostParts.slice(-2).join('.')}`
      document.cookie = `googtrans=${value};path=/;domain=${rootDomain};max-age=${maxAge};SameSite=Lax`
    }
  } catch { /* Best effort cookie cleanup/apply. */ }
}

function loadGoogleTranslate(language) {
  const target = googleTranslateCode(language)
  setGoogleTranslateCookie(target)
  if (!target) return
  if (!document.getElementById('google_translate_element')) {
    const mount = document.createElement('div')
    mount.id = 'google_translate_element'
    mount.style.position = 'fixed'
    mount.style.left = '-9999px'
    mount.style.top = '-9999px'
    document.body.appendChild(mount)
  }
  window.googleTranslateElementInit = () => {
    if (!window.google?.translate?.TranslateElement) return
    new window.google.translate.TranslateElement({
      pageLanguage: 'en',
      includedLanguages: languages.map((item) => item.code).filter((code) => code !== 'en').join(','),
      autoDisplay: false,
    }, 'google_translate_element')
  }
  if (!document.getElementById('google-translate-script')) {
    const script = document.createElement('script')
    script.id = 'google-translate-script'
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
    script.async = true
    document.body.appendChild(script)
  } else if (window.googleTranslateElementInit) {
    window.googleTranslateElementInit()
  }
}

export default function AutoTranslate() {
  const [language, setLanguage] = useState(() => readSavedLanguage() || 'en')
  const [automatic, setAutomatic] = useState(() => !readSavedLanguage())

  useEffect(() => {
    let cancelled = false
    const initialise = async () => {
      const detected = await detectLocationLanguage()
      const targetLanguage = readSavedLanguage() || detected.language
      if (cancelled) return
      setLanguage(targetLanguage)
      applyLanguagePreference(targetLanguage, detected.country)
      loadGoogleTranslate(targetLanguage)
    }
    initialise()
    return () => { cancelled = true }
  }, [])

  const chooseLanguage = async (event) => {
    const selection = event.target.value
    if (selection === 'auto') {
      saveLanguage('')
      setAutomatic(true)
      const detected = await detectLocationLanguage()
      setLanguage(detected.language)
      applyLanguagePreference(detected.language, detected.country)
      loadGoogleTranslate(detected.language)
      return
    }
    setLanguage(selection)
    setAutomatic(false)
    saveLanguage(selection)
    applyLanguagePreference(selection)
    loadGoogleTranslate(selection)
  }

  const labels = languageControlLabels[language] || languageControlLabels.en
  const quickTranslateUrl = typeof window !== 'undefined'
    ? `https://translate.google.com/translate?sl=en&tl=${encodeURIComponent(language)}&u=${encodeURIComponent(window.location.href)}`
    : ''
  const showQuickTranslate = language && language !== 'en'

  return (
    <div className={`language-control ${showQuickTranslate ? 'language-control--translate-ready' : ''}`} title={labels.choose}>
      <Globe2 size={17} />
      <span>{labels.choose}</span>
      <select value={automatic ? 'auto' : language} onChange={chooseLanguage} aria-label={labels.choose}>
        <option value="auto">{labels.auto}</option>
        {languages.map((item) => <option value={item.code} key={item.code}>{item.label}</option>)}
      </select>
      {showQuickTranslate && <a className="quick-translate-link" href={quickTranslateUrl} target="_blank" rel="noreferrer">Quick translate</a>}
    </div>
  )
}
