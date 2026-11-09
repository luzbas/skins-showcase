import './shell/emulate'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './shell/shell.css'
import App from './shell/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
