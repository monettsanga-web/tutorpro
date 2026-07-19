import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AutoTranslate from './AutoTranslate.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import PremiumMotion from './PremiumMotion.jsx'
import './styles.css'
import './dashboard.css'
import './classroom.css'
import './premium-motion.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AutoTranslate />
      <PremiumMotion />
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
