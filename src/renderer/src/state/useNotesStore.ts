import { create } from 'zustand'
import type { JSONContent } from '@tiptap/core'
import type { Folder, Note, NoteColor, Template } from '@shared/types'
import { t } from '@shared/i18n'

interface NotesState {
  /** Active notes only — trashed ones are split out into `trash`. */
  notes: Note[]
  trash: Note[]
  folders: Folder[]
  templates: Template[]
  /** null = root (folder list); otherwise the opened folder. Dock-local, not persisted. */
  currentFolderId: string | null
  /** The dock is showing the trash instead of the folder/note list. */
  trashView: boolean
  setTrashView: (trashView: boolean) => void
  /** Bumped when a note changes from the cloud — keys editor remounts. */
  remoteRevisions: Record<string, number>
  searchQuery: string
  setSearchQuery: (query: string) => void
  enterFolder: (id: string) => void
  leaveFolder: () => void
  addNote: () => void
  addFolder: () => void
  renameFolder: (id: string, name: string) => void
  deleteNote: (id: string) => void
  restoreNote: (id: string) => void
  purgeNote: (id: string) => void
  emptyTrash: () => void
  setNotePinned: (id: string, pinned: boolean) => void
  setNoteDueAt: (id: string, dueAt: number | undefined) => void
  exportNoteMarkdown: (id: string) => void
  deleteFolder: (id: string) => void
  createTemplateFromNote: (note: Note) => void
  duplicateNote: (id: string) => void
  moveNoteToFolder: (id: string, folderId: string) => void
  updateNoteContent: (id: string, content: JSONContent) => void
  detachNote: (id: string, dropPosition?: { x: number; y: number }) => void
  redockNote: (id: string) => void
  focusNote: (id: string) => void
  setNoteAlwaysOnTop: (id: string, alwaysOnTop: boolean) => void
  setNoteColor: (id: string, color: NoteColor) => void
  setNoteTitle: (id: string, title: string) => void
  reorderNotes: (orderedIds: string[]) => void
}

export const useNotesStore = create<NotesState>((set, get) => {
  // The main process broadcasts every note, trashed ones included (it must, to
  // persist and sync them). Split once here so no view has to remember to
  // filter them out.
  const applyNotes = (all: Note[]): void =>
    set({
      notes: all.filter((note) => !note.deletedAt),
      trash: all.filter((note) => note.deletedAt)
    })
  window.aeronotes.getAllNotes().then(applyNotes)
  window.aeronotes.onNotesChanged(applyNotes)
  window.aeronotes.getAllTemplates().then((templates) => set({ templates }))
  window.aeronotes.onTemplatesChanged((templates) => set({ templates }))
  window.aeronotes.onFoldersChanged((folders) => {
    const current = get().currentFolderId
    // The open folder may have just been deleted (possibly from another window).
    set(current && !folders.some((f) => f.id === current) ? { folders, currentFolderId: null } : { folders })
  })
  window.aeronotes.onNotesRemoteApplied((noteIds) => {
    const remoteRevisions = { ...get().remoteRevisions }
    noteIds.forEach((id) => {
      remoteRevisions[id] = (remoteRevisions[id] ?? 0) + 1
    })
    set({ remoteRevisions })
  })
  // Folders and settings together: restoring the last open folder requires
  // validating it against the folder list, whichever loads first.
  void Promise.all([window.aeronotes.getAllFolders(), window.aeronotes.getSettings()]).then(
    ([folders, settings]) => {
      const restored = settings.lastOpenFolderId
      set({
        folders,
        currentFolderId: restored && folders.some((f) => f.id === restored) ? restored : null
      })
    }
  )

  return {
    notes: [],
    trash: [],
    folders: [],
    templates: [],
    currentFolderId: null,
    trashView: false,
    setTrashView: (trashView) => set({ trashView, searchQuery: '' }),
    remoteRevisions: {},
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),
    enterFolder: (id) => {
      window.aeronotes.setSettings({ lastOpenFolderId: id })
      set({ currentFolderId: id, searchQuery: '' })
    },
    leaveFolder: () => {
      // Leaving a folder hides its notes everywhere, desktop post-its included.
      window.aeronotes.closeAllNoteWindows()
      window.aeronotes.setSettings({ lastOpenFolderId: null })
      set({ currentFolderId: null, searchQuery: '', trashView: false })
    },
    // New notes land at the top of the list AND open as a post-it, cursor
    // ready — creating a note is always followed by writing in it.
    addNote: () => {
      const folderId = get().currentFolderId
      if (!folderId) return
      void window.aeronotes.addNote(folderId).then((note) => window.aeronotes.detachNote(note.id))
    },
    addFolder: () => void window.aeronotes.addFolder(t('folder.newName')),
    renameFolder: (id, name) => window.aeronotes.renameFolder(id, name),
    deleteNote: (id) => void window.aeronotes.deleteNote(id),
    restoreNote: (id) => window.aeronotes.restoreNote(id),
    purgeNote: (id) => void window.aeronotes.purgeNote(id),
    emptyTrash: () => void window.aeronotes.emptyTrash(),
    setNotePinned: (id, pinned) => window.aeronotes.setNotePinned(id, pinned),
    setNoteDueAt: (id, dueAt) => window.aeronotes.setNoteDueAt(id, dueAt),
    exportNoteMarkdown: (id) => void window.aeronotes.exportNoteMarkdown(id),
    deleteFolder: (id) => void window.aeronotes.deleteFolder(id),
    createTemplateFromNote: (note) =>
      void window.aeronotes.addTemplate(note.title || t('note.untitled'), note.content),
    duplicateNote: (id) => void window.aeronotes.duplicateNote(id),
    moveNoteToFolder: (id, folderId) => window.aeronotes.moveNoteToFolder(id, folderId),
    updateNoteContent: (id, content) => window.aeronotes.updateNoteContent(id, content),
    detachNote: (id, dropPosition) => void window.aeronotes.detachNote(id, dropPosition),
    redockNote: (id) => void window.aeronotes.redockNote(id),
    focusNote: (id) => window.aeronotes.focusNote(id),
    setNoteAlwaysOnTop: (id, alwaysOnTop) => window.aeronotes.setNoteAlwaysOnTop(id, alwaysOnTop),
    setNoteColor: (id, color) => window.aeronotes.setNoteColor(id, color),
    setNoteTitle: (id, title) => window.aeronotes.setNoteTitle(id, title),
    reorderNotes: (orderedIds) => window.aeronotes.reorderNotes(orderedIds)
  }
})
