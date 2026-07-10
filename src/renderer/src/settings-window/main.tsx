import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/theme.css'
import { SettingsWindowApp } from './SettingsWindowApp'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <SettingsWindowApp />
  </StrictMode>
)
