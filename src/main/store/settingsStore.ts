import type { AppSettings } from '@shared/types'
import { loadSettings, saveSettings } from './persistence'

class SettingsStore {
  private settings: AppSettings = loadSettings()

  get(): AppSettings {
    return this.settings
  }

  update(patch: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...patch }
    saveSettings(this.settings)
    return this.settings
  }
}

export const settingsStore = new SettingsStore()
