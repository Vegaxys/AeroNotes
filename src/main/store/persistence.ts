import Store from 'electron-store'
import type { AppSettings, Folder, Note } from '@shared/types'

interface PersistedSchema {
  notes: Record<string, Note>
  folders: Record<string, Folder>
  settings: AppSettings
}

const DEFAULT_SETTINGS: AppSettings = {
  dockSide: 'right',
  dockCollapsed: false,
  // Wide enough for comfortable in-dock editing.
  dockExpandedWidth: 380,
  launchAtStartup: false,
  lastOpenFolderId: null,
  notesExpanded: true,
  locale: 'system'
}

const diskStore = new Store<PersistedSchema>({
  name: 'aeronotes',
  defaults: { notes: {}, folders: {}, settings: DEFAULT_SETTINGS }
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

export function loadFolders(): Folder[] {
  return Object.values(diskStore.get('folders'))
}

export function saveFolders(folders: Folder[]): void {
  const asRecord: Record<string, Folder> = {}
  folders.forEach((folder) => {
    asRecord[folder.id] = folder
  })
  diskStore.set('folders', asRecord)
}

export function loadSettings(): AppSettings {
  const settings = diskStore.get('settings')
  // No UI ever let the user pick a width, so a persisted pre-folders 300 is
  // just the old default — widen it for in-dock editing.
  if (settings.dockExpandedWidth < DEFAULT_SETTINGS.dockExpandedWidth) {
    settings.dockExpandedWidth = DEFAULT_SETTINGS.dockExpandedWidth
  }
  return settings
}

export function saveSettings(settings: AppSettings): void {
  diskStore.set('settings', settings)
}
