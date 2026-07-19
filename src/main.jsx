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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AutoTranslate />
      <PremiumMotion />
      <App />
      <SupportChatWidget />
    </ErrorBoundary>
  </StrictMode>,
)
