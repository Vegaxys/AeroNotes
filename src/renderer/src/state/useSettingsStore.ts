import { create } from 'zustand'
import type { DockSide } from '@shared/types'

interface SettingsState {
  dockSide: DockSide
  dockCollapsed: boolean
  dockExpandedWidth: number
  notesExpanded: boolean
  toggleDockSide: () => void
  toggleDockCollapsed: () => void
  toggleNotesExpanded: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  window.aeronotes.getSettings().then((settings) => set(settings))
  window.aeronotes.onSettingsChanged((settings) => set(settings))

  return {
    dockSide: 'right',
    dockCollapsed: false,
    dockExpandedWidth: 380,
    notesExpanded: true,
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
