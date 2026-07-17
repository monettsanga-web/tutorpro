import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AutoTranslate from './AutoTranslate.jsx'
import './styles.css'
import './dashboard.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AutoTranslate />
    <App />
  </StrictMode>,
)
