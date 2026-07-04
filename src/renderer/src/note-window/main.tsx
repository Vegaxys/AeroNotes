import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/theme.css'
import { NoteWindowApp } from './NoteWindowApp'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <NoteWindowApp />
  </StrictMode>
)
