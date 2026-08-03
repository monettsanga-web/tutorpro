import { useEffect, useState } from 'react'
import { Bell, Globe2, X } from 'lucide-react'
import {
  announcementLabel,
  dismissAnnouncement,
  originalLabel,
  translateAnnouncement,
  viewerLanguage,
  visibleAnnouncements,
} from './announcements.js'

/**
 * Shows admin announcements inside the dashboard, automatically translated
 * into the viewer's language. The language comes from their IP country
 * (detected by AutoTranslate) or the country saved at registration.
 * English is always kept underneath so nothing is lost in translation.
 */
export default function AnnouncementBanner({ account }) {
  const [items, setItems] = useState(() => visibleAnnouncements(account))
  const [translations, setTranslations] = useState({})
  const [language, setLanguage] = useState(() => viewerLanguage(account))

  useEffect(() => {
    const refresh = () => {
      setItems(visibleAnnouncements(account))
      setLanguage(viewerLanguage(account))
    }
    window.addEventListener('tutorpro:data-change', refresh)
    window.addEventListener('tutorpro:language-change', refresh)
    return () => {
      window.removeEventListener('tutorpro:data-change', refresh)
      window.removeEventListener('tutorpro:language-change', refresh)
    }
  }, [account])

  useEffect(() => {
    let cancelled = false
    const needsTranslation = language && language !== 'en' && items.length > 0
    const load = async () => {
      if (!needsTranslation) {
        if (!cancelled) setTranslations({})
        return
      }
      const pairs = await Promise.all(items.map(async (item) => {
        // Prefer the copy translated when the announcement was sent.
        const ready = item.translations?.[language]
        if (ready) return [item.id, ready]
        const live = await translateAnnouncement(item.subject, item.body, language).catch(() => null)
        return live ? [item.id, live] : null
      }))
      if (!cancelled) setTranslations(Object.fromEntries(pairs.filter(Boolean)))
    }
    load()
    return () => { cancelled = true }
  }, [items, language])

  if (!items.length) return null

  const close = (id) => {
    dismissAnnouncement(id)
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return (
    <div className="announcement-banner-stack">
      {items.map((item) => {
        const translated = translations[item.id]
        return (
          <section className="announcement-banner" key={item.id} role="status">
            <span className="announcement-banner__icon"><Bell size={17} /></span>
            <div className="announcement-banner__content">
              <small>{translated ? announcementLabel(translated.language) : 'Announcement'}</small>
              <strong>{translated ? translated.subject : item.subject}</strong>
              <p>{translated ? translated.body : item.body}</p>
              {translated && (
                <details className="announcement-banner__original">
                  <summary><Globe2 size={12} /> {originalLabel(translated.language)}</summary>
                  <strong>{item.subject}</strong>
                  <p>{item.body}</p>
                </details>
              )}
              <em>{new Date(item.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</em>
            </div>
            <button type="button" onClick={() => close(item.id)} aria-label="Dismiss announcement"><X size={16} /></button>
          </section>
        )
      })}
    </div>
  )
}
