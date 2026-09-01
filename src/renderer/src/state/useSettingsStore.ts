import { create } from 'zustand'
import type { AppSettings, DockSide, NoteSortMode } from '@shared/types'
import { resolveLocale, setLocale, type LocalePreference } from '@shared/i18n'

interface SettingsState {
  dockSide: DockSide
  dockCollapsed: boolean
  dockExpandedWidth: number
  notesExpanded: boolean
  locale: LocalePreference
  disabledBuiltinTemplates: string[]
  sortMode: NoteSortMode
  setSortMode: (sortMode: NoteSortMode) => void
  dockAutoHide: boolean
  showTaskProgress: boolean
  toggleDockSide: () => void
  toggleDockCollapsed: () => void
  toggleNotesExpanded: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  // setLocale BEFORE set(): components remounting off the `locale` key must
  // already read the new dictionary.
  const applySettings = (settings: AppSettings): void => {
    setLocale(resolveLocale(settings.locale ?? 'system', [navigator.language]))
    // Optional settings arrive as undefined on a store written before they
    // existed — spreading that over the defaults would erase them.
    set({
      ...settings,
      sortMode: settings.sortMode ?? 'manual',
      dockAutoHide: Boolean(settings.dockAutoHide),
      showTaskProgress: settings.showTaskProgress ?? true
    })
  }
  window.aeronotes.getSettings().then(applySettings)
  window.aeronotes.onSettingsChanged(applySettings)

  return {
    dockSide: 'right',
    dockCollapsed: false,
    dockExpandedWidth: 380,
    notesExpanded: true,
    locale: 'system',
    disabledBuiltinTemplates: [],
    sortMode: 'manual',
    setSortMode: (sortMode) => window.aeronotes.setSettings({ sortMode }),
    dockAutoHide: false,
    showTaskProgress: true,
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
