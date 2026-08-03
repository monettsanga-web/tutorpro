import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AutoTranslate from './AutoTranslate.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import PremiumMotion from './PremiumMotion.jsx'
import SupportChatWidget from './SupportChatWidget.jsx'
import './styles.css'
import './dashboard.css'
import './classroom.css'
import './premium-motion.css'
import './support-chat.css'
import './support-inbox.css'

const rootElement = document.getElementById('root')

// scripts/prerender-home.mjs injects static, crawlable homepage copy into #root
// at build time so search engines and link scrapers see real content instead of
// an empty div. Remove it before mounting so users never see it flash twice.
const prerendered = rootElement?.querySelector('#prerendered-home')
if (prerendered) prerendered.remove()

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <AutoTranslate />
      <PremiumMotion />
      <App />
      <SupportChatWidget />
    </ErrorBoundary>
  </StrictMode>,
)


if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {})
  })
}
