import Store from 'electron-store'
import type { NotesStoreData } from '@shared/notesStore'
import type { AppSettings, Folder, Note, SyncTombstones, Template } from '@shared/types'

interface PersistedSchema {
  notes: Record<string, Note>
  folders: Record<string, Folder>
  templates: Record<string, Template>
  tombstones: SyncTombstones
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
  locale: 'system',
  toggleShortcut: 'CommandOrControl+Shift+N',
  disabledBuiltinTemplates: [],
  showTaskProgress: true
}

const diskStore = new Store<PersistedSchema>({
  name: 'aeronotes',
  defaults: {
    notes: {},
    folders: {},
    templates: {},
    tombstones: { notes: {}, folders: {}, templates: {} },
    settings: DEFAULT_SETTINGS
  }
})

export function loadNotesStoreData(): NotesStoreData {
  return { notes: loadNotes(), folders: loadFolders(), templates: loadTemplates(), tombstones: loadTombstones() }
}

export function saveNotesStoreData(data: NotesStoreData): void {
  saveNotes(data.notes)
  saveFolders(data.folders)
  saveTemplates(data.templates)
  saveTombstones(data.tombstones)
}

function loadNotes(): Note[] {
  return Object.values(diskStore.get('notes'))
}

function saveNotes(notes: Note[]): void {
  const asRecord: Record<string, Note> = {}
  notes.forEach((note) => {
    asRecord[note.id] = note
  })
  diskStore.set('notes', asRecord)
}

function loadFolders(): Folder[] {
  return Object.values(diskStore.get('folders'))
}

function saveFolders(folders: Folder[]): void {
  const asRecord: Record<string, Folder> = {}
  folders.forEach((folder) => {
    asRecord[folder.id] = folder
  })
  diskStore.set('folders', asRecord)
}

function loadTombstones(): SyncTombstones {
  return diskStore.get('tombstones')
}

function loadTemplates(): Template[] {
  return Object.values(diskStore.get('templates'))
}

function saveTemplates(templates: Template[]): void {
  const asRecord: Record<string, Template> = {}
  templates.forEach((template) => {
    asRecord[template.id] = template
  })
  diskStore.set('templates', asRecord)
}

function saveTombstones(tombstones: SyncTombstones): void {
  diskStore.set('tombstones', tombstones)
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
