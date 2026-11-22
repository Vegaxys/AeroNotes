// FIRST import: installs window.aeronotes before any shared module uses it.
import './bootstrap'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MobileNoteScreen } from './MobileNoteScreen'
import '@renderer/styles/theme.css'
import './mobile.css'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <MobileNoteScreen />
  </StrictMode>
)
