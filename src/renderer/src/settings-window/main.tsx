import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { resolveLocale, setLocale } from '@shared/i18n'
import '../styles/theme.css'
import { SettingsWindowApp } from './SettingsWindowApp'

// Resolve the UI language before the first render so no English flashes by.
void window.aeronotes.getSettings().then((settings) => {
  setLocale(resolveLocale(settings.locale ?? 'system', [navigator.language]))
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <SettingsWindowApp />
    </StrictMode>
  )
})
