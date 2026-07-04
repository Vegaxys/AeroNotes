import Store from 'electron-store'
import type { AppSettings, Note } from '@shared/types'

interface PersistedSchema {
  notes: Record<string, Note>
  settings: AppSettings
}

const DEFAULT_SETTINGS: AppSettings = {
  dockSide: 'right',
  dockCollapsed: false,
  dockExpandedWidth: 300
}

const diskStore = new Store<PersistedSchema>({
  name: 'aeronotes',
  defaults: { notes: {}, settings: DEFAULT_SETTINGS }
})

export function loadNotes(): Note[] {
  return Object.values(diskStore.get('notes'))
}

export function saveNotes(notes: Note[]): void {
  const asRecord: Record<string, Note> = {}
  notes.forEach((note) => {
    asRecord[note.id] = note
  })
  diskStore.set('notes', asRecord)
}

export function loadSettings(): AppSettings {
  return diskStore.get('settings')
}

export function saveSettings(settings: AppSettings): void {
  diskStore.set('settings', settings)
}
