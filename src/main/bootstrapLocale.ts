import { app } from 'electron'
import { resolveLocale, setLocale } from '@shared/i18n'
import { loadSettings } from './store/persistence'

/**
 * Side-effect module — it MUST be the first import of main/index.ts so the
 * locale is set before any module that renders strings at import time
 * (notesStore's seeds and folder migration call t() when the store is built).
 */
function bootstrapLocale(): void {
  let systemLanguages: string[] = []
  try {
    // Reads the OS language list directly, unlike app.getLocale() which is
    // only reliable after the 'ready' event.
    systemLanguages = app.getPreferredSystemLanguages()
  } catch {
    // English fallback if unavailable this early.
  }
  setLocale(resolveLocale(loadSettings().locale ?? 'system', systemLanguages))
}

bootstrapLocale()
