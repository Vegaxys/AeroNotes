import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Share } from '@capacitor/share'
import { t } from '@shared/i18n'
import { noteToMarkdown } from '@shared/markdownSerialize'
import { NotesStore, type NotesStoreData } from '@shared/notesStore'
import { createDriveClient } from '@shared/sync/driveClient'
import { SyncEngine } from '@shared/sync/syncEngine'
import type { AppSettings, NoteColor, SyncStatus } from '@shared/types'
import { accountEmail, driveAuth, isSignedIn, isSyncAvailable, signIn, signOut } from './googleAuth'
import {
  initImageStore,
  listImageNames,
  pickImageAsDataUrl,
  readImageBytes,
  saveImageDataUrl,
  writeImageBytes
} from './images'
import { loadMobileData, saveMobileData } from './storage'

type AeronotesApi = Window['aeronotes']

/**
 * The phone syncs soon after an edit: unlike the always-on desktop, the app
 * can be put away (and killed) at any moment.
 */
const MUTATION_DEBOUNCE_MS = 4_000

const DEFAULT_SETTINGS: AppSettings = {
  // Desktop-only fields, required by the type; the phone never reads them.
  dockSide: 'right',
  dockCollapsed: false,
  dockExpandedWidth: 380,
  lastOpenFolderId: null,
  locale: 'system',
  sortMode: 'manual',
  disabledBuiltinTemplates: [],
  showTaskProgress: true
}

/** A tiny event channel standing in for the desktop's IPC broadcasts. */
class Channel<T> {
  private readonly listeners = new Set<(value: T) => void>()

  subscribe(listener: (value: T) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(value: T): void {
    this.listeners.forEach((listener) => listener(value))
  }
}

const channels = {
  notes: new Channel<ReturnType<NotesStore['getAll']>>(),
  folders: new Channel<ReturnType<NotesStore['getFolders']>>(),
  templates: new Channel<ReturnType<NotesStore['getTemplates']>>(),
  settings: new Channel<AppSettings>(),
  sync: new Channel<SyncStatus>(),
  remoteApplied: new Channel<string[]>()
}

interface Runtime {
  store: NotesStore
  sync: SyncEngine
  settings: AppSettings
}

/**
 * Plays the desktop main process inside the WebView: the shared NotesStore
 * on a JSON file, the shared SyncEngine on the native Google sign-in. Built
 * once the data file is read; every API call waits for it.
 */
async function startRuntime(): Promise<Runtime> {
  await initImageStore()
  const data = await loadMobileData()
  const runtime = { settings: { ...DEFAULT_SETTINGS, ...data?.settings } } as Runtime
  const empty: NotesStoreData = { notes: [], folders: [], templates: [], tombstones: { notes: {}, folders: {}, templates: {} } }
  // Settings are written with the notes: flushing the store rewrites the one file.
  runtime.store = new NotesStore(
    data ?? empty,
    (latest) => void saveMobileData({ ...latest, settings: runtime.settings }),
    { seedOnFirstRun: false }
  )

  runtime.sync = new SyncEngine({
    store: runtime.store,
    drive: createDriveClient(driveAuth),
    images: { list: listImageNames, read: readImageBytes, write: writeImageBytes },
    isSignedIn,
    restingStatus: () => {
      if (!isSyncAvailable()) return { state: 'unconfigured', email: undefined }
      if (isSignedIn()) return { state: 'idle', email: accountEmail() }
      return { state: 'signed-out', email: undefined, lastSyncAt: undefined }
    },
    email: accountEmail,
    onStatus: (status) => channels.sync.emit(status),
    onRemoteApplied: ({ changedNoteIds }) => {
      emitNotes(runtime)
      emitFolders(runtime)
      emitTemplates(runtime)
      if (changedNoteIds.length > 0) channels.remoteApplied.emit(changedNoteIds)
    },
    mutationDebounceMs: MUTATION_DEBOUNCE_MS
  })
  runtime.sync.refreshAuthStatus()
  // Opening the app = maybe behind the other machines: pull before any edit.
  runtime.sync.lockEditingUntilSynced()
  void App.addListener('resume', () => runtime.sync.lockEditingUntilSynced())
  // Put away: write the file now and push, Android may kill the app later.
  void App.addListener('pause', () => {
    runtime.store.flush()
    void runtime.sync.syncNow()
  })
  return runtime
}

const ready = startRuntime()

/** Runs a fire-and-forget mutation once the runtime exists (the desktop's ipcRenderer.send). */
const later = (action: (runtime: Runtime) => void): void => void ready.then(action)

const emitNotes = (runtime: Runtime): void => channels.notes.emit(runtime.store.getAll())
const emitFolders = (runtime: Runtime): void => channels.folders.emit(runtime.store.getFolders())
const emitTemplates = (runtime: Runtime): void => channels.templates.emit(runtime.store.getTemplates())

/** Native confirm dialog for the irreversible actions, like the desktop's message box. */
const confirmIrreversible = (message: string): boolean => window.confirm(`${message}\n\n${t('confirm.irreversible')}`)

/** Session-only color clipboard, as on the desktop. */
let copiedColor: NoteColor | null = null

const api: Partial<AeronotesApi> = {
  getAllNotes: async () => (await ready).store.getAll(),
  onNotesChanged: (callback) => channels.notes.subscribe(callback),
  addNote: async (folderId) => {
    const runtime = await ready
    const note = runtime.store.add(folderId)
    emitNotes(runtime)
    return note
  },
  getAllFolders: async () => (await ready).store.getFolders(),
  onFoldersChanged: (callback) => channels.folders.subscribe(callback),
  addFolder: async (name) => {
    const runtime = await ready
    const folder = runtime.store.addFolder(name)
    emitFolders(runtime)
    return folder
  },
  renameFolder: (id, name) =>
    later((runtime) => {
      runtime.store.renameFolder(id, name)
      emitFolders(runtime)
    }),
  deleteFolder: async (id) => {
    const runtime = await ready
    const folder = runtime.store.getFolders().find((f) => f.id === id)
    if (!folder) return false
    const count = runtime.store.countNotesInFolder(id)
    const message =
      count > 0
        ? t('confirm.deleteFolder.withNotes', { name: folder.name, count })
        : t('confirm.deleteFolder.message', { name: folder.name })
    if (!confirmIrreversible(message)) return false
    runtime.store.deleteFolder(id)
    emitNotes(runtime)
    emitFolders(runtime)
    return true
  },
  deleteNote: async (id) => {
    const runtime = await ready
    if (!runtime.store.getById(id)) return false
    runtime.store.deleteNote(id)
    emitNotes(runtime)
    return true
  },
  restoreNote: (id) =>
    later((runtime) => {
      runtime.store.restoreNote(id)
      emitNotes(runtime)
    }),
  purgeNote: async (id) => {
    const runtime = await ready
    const note = runtime.store.getById(id)
    if (!note) return false
    if (!confirmIrreversible(t('confirm.deleteNote.message', { title: note.title || t('note.untitled') }))) return false
    runtime.store.purgeNote(id)
    emitNotes(runtime)
    return true
  },
  emptyTrash: async () => {
    const runtime = await ready
    const count = runtime.store.getTrash().length
    if (count === 0 || !confirmIrreversible(t('confirm.emptyTrash.message', { count }))) return false
    runtime.store.emptyTrash()
    emitNotes(runtime)
    return true
  },
  // No file to save on a phone: the share sheet hands the Markdown to any app.
  exportNoteMarkdown: async (id) => {
    const note = (await ready).store.getById(id)
    if (!note) return null
    const title = note.title || t('note.untitled')
    await Share.share({ title, text: noteToMarkdown(title, note.content) }).catch(() => {})
    return null
  },
  setNoteDueAt: (id, dueAt) =>
    later((runtime) => {
      runtime.store.setDueAt(id, dueAt)
      emitNotes(runtime)
    }),
  setNotePinned: (id, pinned) =>
    later((runtime) => {
      runtime.store.setPinned(id, pinned)
      emitNotes(runtime)
    }),
  duplicateNote: async (id) => {
    const runtime = await ready
    const copy = runtime.store.duplicateNote(id)
    emitNotes(runtime)
    return copy
  },
  moveNoteToFolder: (id, folderId) =>
    later((runtime) => {
      runtime.store.moveNoteToFolder(id, folderId)
      emitNotes(runtime)
    }),
  updateNoteContent: (id, content) =>
    later((runtime) => {
      runtime.store.updateContent(id, content)
      emitNotes(runtime)
    }),
  setNoteColor: (id, color) =>
    later((runtime) => {
      runtime.store.setColor(id, color)
      emitNotes(runtime)
    }),
  setNoteTitle: (id, title) =>
    later((runtime) => {
      runtime.store.setTitle(id, title)
      emitNotes(runtime)
    }),
  reorderNotes: (orderedIds) =>
    later((runtime) => {
      runtime.store.setDockOrder(orderedIds)
      emitNotes(runtime)
    }),
  copyNoteColor: (color) => {
    copiedColor = color
  },
  getCopiedNoteColor: async () => copiedColor,
  // No post-it windows on a phone.
  closeAllNoteWindows: () => {},

  getAllTemplates: async () => (await ready).store.getTemplates(),
  onTemplatesChanged: (callback) => channels.templates.subscribe(callback),
  addTemplate: async (name, content) => {
    const runtime = await ready
    const template = runtime.store.addTemplate(name, content)
    emitTemplates(runtime)
    return template
  },
  updateTemplate: (id, patch) =>
    later((runtime) => {
      runtime.store.updateTemplate(id, patch)
      emitTemplates(runtime)
    }),
  deleteTemplate: async (id) => {
    const runtime = await ready
    const template = runtime.store.getTemplateById(id)
    if (!template || !confirmIrreversible(t('confirm.deleteTemplate.message', { name: template.name }))) return false
    runtime.store.deleteTemplate(id)
    emitTemplates(runtime)
    return true
  },

  getSettings: async () => (await ready).settings,
  setSettings: (patch) =>
    later((runtime) => {
      runtime.settings = { ...runtime.settings, ...patch }
      runtime.store.flush()
      channels.settings.emit(runtime.settings)
    }),
  onSettingsChanged: (callback) => channels.settings.subscribe(callback),
  getAppVersion: async () => (await App.getInfo()).version,

  getSyncStatus: async () => (await ready).sync.getStatus(),
  onSyncStatusChanged: (callback) => channels.sync.subscribe(callback),
  onNotesRemoteApplied: (callback) => channels.remoteApplied.subscribe(callback),
  syncNow: () => later((runtime) => void runtime.sync.syncNow()),
  syncSignIn: async () => {
    const runtime = await ready
    try {
      await signIn()
      runtime.sync.refreshAuthStatus()
      void runtime.sync.syncNow()
    } catch (error) {
      if ((error as { code?: string }).code === 'CANCELLED') runtime.sync.refreshAuthStatus()
      else runtime.sync.reportError(error instanceof Error ? error.message : String(error))
    }
  },
  syncSignOut: async () => {
    const runtime = await ready
    await signOut()
    runtime.sync.refreshAuthStatus()
  },

  readClipboardText: () => navigator.clipboard.readText(),
  writeClipboardText: (text) => navigator.clipboard.writeText(text),
  openExternalUrl: async (url) => {
    await Browser.open({ url })
  },
  // Links to PC files sync to the phone but cannot open there.
  openLocalPath: async () => '',
  pickLocalPath: async () => null,
  saveImage: saveImageDataUrl,
  importImage: async () => {
    const dataUrl = await pickImageAsDataUrl()
    return dataUrl ? saveImageDataUrl(dataUrl) : null
  }
}

/**
 * Installs `window.aeronotes` for the WebView. The desktop-only members
 * (overlay, post-it windows, block transfer between windows, shortcuts)
 * resolve to undefined (subscriptions to a no-op unsubscribe) and warn, so a
 * stray call shows up in the console instead of crashing a screen.
 */
export function installMobileBridge(): void {
  window.aeronotes = new Proxy(api, {
    get(target, property) {
      if (property in target) return target[property as keyof AeronotesApi]
      const name = String(property)
      return (..._args: unknown[]) => {
        console.warn(`aeronotes.${name} is desktop-only`)
        return name.startsWith('on') ? () => {} : Promise.resolve(undefined)
      }
    }
  }) as AeronotesApi
}
