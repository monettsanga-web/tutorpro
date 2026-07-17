const classroomPhrases = {
  tl: {
    'hello': 'kumusta',
    'good job': 'magaling',
    'please read': 'pakibasa',
    'please repeat': 'pakiulit',
    'do you understand?': 'naiintindihan mo ba?',
    'yes, i understand': 'oo, naiintindihan ko',
    'i have a question': 'may tanong ako',
    'thank you': 'salamat',
  },
  ko: {
    'hello': '안녕하세요',
    'good job': '잘했어요',
    'please read': '읽어 주세요',
    'please repeat': '다시 말해 주세요',
    'do you understand?': '이해했어요?',
    'yes, i understand': '네, 이해했어요',
    'i have a question': '질문이 있어요',
    'thank you': '감사합니다',
  },
  'zh-CN': {
    'hello': '你好',
    'good job': '做得好',
    'please read': '请阅读',
    'please repeat': '请再说一遍',
    'do you understand?': '你明白吗？',
    'yes, i understand': '是的，我明白',
    'i have a question': '我有一个问题',
    'thank you': '谢谢',
  },
  ja: {
    'hello': 'こんにちは',
    'good job': 'よくできました',
    'please read': '読んでください',
    'please repeat': 'もう一度言ってください',
    'do you understand?': '分かりましたか？',
    'yes, i understand': 'はい、分かりました',
    'i have a question': '質問があります',
    'thank you': 'ありがとうございます',
  },
  es: {
    'hello': 'hola',
    'good job': 'buen trabajo',
    'please read': 'por favor, lee',
    'please repeat': 'por favor, repite',
    'do you understand?': '¿entiendes?',
    'yes, i understand': 'sí, entiendo',
    'i have a question': 'tengo una pregunta',
    'thank you': 'gracias',
  },
  fr: {
    'hello': 'bonjour',
    'good job': 'bon travail',
    'please read': 'lis, s’il te plaît',
    'please repeat': 'répète, s’il te plaît',
    'do you understand?': 'tu comprends ?',
    'yes, i understand': 'oui, je comprends',
    'i have a question': 'j’ai une question',
    'thank you': 'merci',
  },
  ar: {
    'hello': 'مرحباً',
    'good job': 'عمل رائع',
    'please read': 'يرجى القراءة',
    'please repeat': 'يرجى التكرار',
    'do you understand?': 'هل تفهم؟',
    'yes, i understand': 'نعم، أفهم',
    'i have a question': 'لدي سؤال',
    'thank you': 'شكراً',
  },
}

export const chatLanguages = [
  { code: 'en', label: 'English' },
  { code: 'tl', label: 'Filipino' },
  { code: 'ko', label: '한국어' },
  { code: 'zh-CN', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
]

export async function translateChatText(text, targetLanguage) {
  if (!text?.trim() || targetLanguage === 'en') return text
  const endpoint = import.meta.env?.VITE_TRANSLATION_API_URL
    || 'https://translate.googleapis.com/translate_a/single'
  try {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 5000)
    const url = `${endpoint}?client=gtx&sl=auto&tl=${encodeURIComponent(targetLanguage)}&dt=t&q=${encodeURIComponent(text.trim())}`
    const response = await fetch(url, { signal: controller.signal })
    window.clearTimeout(timeout)
    if (response.ok) {
      const result = await response.json()
      const translated = Array.isArray(result?.[0]) ? result[0].map((part) => part?.[0] || '').join('') : ''
      if (translated) return translated
    }
  } catch {
    // Fall through to the safe classroom phrase dictionary.
  }
  const phrase = classroomPhrases[targetLanguage]?.[text.trim().toLowerCase()]
  return phrase || `${text} (${chatLanguages.find((language) => language.code === targetLanguage)?.label || targetLanguage})`
}
