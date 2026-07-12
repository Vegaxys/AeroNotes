import { create } from 'zustand'
import type { JSONContent } from '@tiptap/core'
import type { Folder, Note, NoteColor } from '@shared/types'
import { t } from '@shared/i18n'

interface NotesState {
  notes: Note[]
  folders: Folder[]
  /** null = root (folder list); otherwise the opened folder. Dock-local, not persisted. */
  currentFolderId: string | null
  searchQuery: string
  setSearchQuery: (query: string) => void
  enterFolder: (id: string) => void
  leaveFolder: () => void
  addNote: () => void
  addFolder: () => void
  renameFolder: (id: string, name: string) => void
  deleteNote: (id: string) => void
  deleteFolder: (id: string) => void
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
  window.aeronotes.getAllNotes().then((notes) => set({ notes }))
  window.aeronotes.onNotesChanged((notes) => set({ notes }))
  window.aeronotes.onFoldersChanged((folders) => {
    const current = get().currentFolderId
    // The open folder may have just been deleted (possibly from another window).
    set(current && !folders.some((f) => f.id === current) ? { folders, currentFolderId: null } : { folders })
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
    folders: [],
    currentFolderId: null,
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
      set({ currentFolderId: null, searchQuery: '' })
    },
    addNote: () => {
      const folderId = get().currentFolderId
      if (folderId) void window.aeronotes.addNote(folderId)
    },
    addFolder: () => void window.aeronotes.addFolder(t('folder.newName')),
    renameFolder: (id, name) => window.aeronotes.renameFolder(id, name),
    deleteNote: (id) => void window.aeronotes.deleteNote(id),
    deleteFolder: (id) => void window.aeronotes.deleteFolder(id),
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
