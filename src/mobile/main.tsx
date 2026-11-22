// FIRST import: installs window.aeronotes before any shared module uses it.
import './bootstrap'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MobileApp } from './app/MobileApp'
import './mobile.css'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <MobileApp />
  </StrictMode>
)
