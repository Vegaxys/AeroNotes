import { create } from 'zustand'
import type { AppSettings, DockSide } from '@shared/types'
import { resolveLocale, setLocale, type LocalePreference } from '@shared/i18n'

interface SettingsState {
  dockSide: DockSide
  dockCollapsed: boolean
  dockExpandedWidth: number
  notesExpanded: boolean
  locale: LocalePreference
  toggleDockSide: () => void
  toggleDockCollapsed: () => void
  toggleNotesExpanded: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  // setLocale BEFORE set(): components remounting off the `locale` key must
  // already read the new dictionary.
  const applySettings = (settings: AppSettings): void => {
    setLocale(resolveLocale(settings.locale ?? 'system', [navigator.language]))
    set(settings)
  }
  window.aeronotes.getSettings().then(applySettings)
  window.aeronotes.onSettingsChanged(applySettings)

  return {
    dockSide: 'right',
    dockCollapsed: false,
    dockExpandedWidth: 380,
    notesExpanded: true,
    locale: 'system',
    toggleDockSide: () => {
      const dockSide: DockSide = get().dockSide === 'right' ? 'left' : 'right'
      window.aeronotes.setSettings({ dockSide })
    },
    toggleDockCollapsed: () => {
      window.aeronotes.setSettings({ dockCollapsed: !get().dockCollapsed })
    },
    toggleNotesExpanded: () => {
      window.aeronotes.setSettings({ notesExpanded: !get().notesExpanded })
    }
  }
})
