import { create } from 'zustand'
import type { DockSide } from '@shared/types'

interface SettingsState {
  dockSide: DockSide
  dockCollapsed: boolean
  dockExpandedWidth: number
  toggleDockSide: () => void
  toggleDockCollapsed: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  window.aeronotes.getSettings().then((settings) => set(settings))
  window.aeronotes.onSettingsChanged((settings) => set(settings))

  return {
    dockSide: 'right',
    dockCollapsed: false,
    dockExpandedWidth: 300,
    toggleDockSide: () => {
      const dockSide: DockSide = get().dockSide === 'right' ? 'left' : 'right'
      window.aeronotes.setSettings({ dockSide })
    },
    toggleDockCollapsed: () => {
      window.aeronotes.setSettings({ dockCollapsed: !get().dockCollapsed })
    }
  }
})
