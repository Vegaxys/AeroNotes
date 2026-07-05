import { create } from 'zustand'
import type { JSONContent } from '@tiptap/core'
import type { Note, NoteColor } from '@shared/types'

interface NotesState {
  notes: Note[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  addNote: () => void
  updateNoteContent: (id: string, content: JSONContent) => void
  detachNote: (id: string) => void
  redockNote: (id: string) => void
  focusNote: (id: string) => void
  setNoteAlwaysOnTop: (id: string, alwaysOnTop: boolean) => void
  setNoteColor: (id: string, color: NoteColor) => void
  setNoteTitle: (id: string, title: string) => void
  reorderNotes: (orderedIds: string[]) => void
}

export const useNotesStore = create<NotesState>((set) => {
  window.aeronotes.getAllNotes().then((notes) => set({ notes }))
  window.aeronotes.onNotesChanged((notes) => set({ notes }))

  return {
    notes: [],
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),
    addNote: () => void window.aeronotes.addNote(),
    updateNoteContent: (id, content) => window.aeronotes.updateNoteContent(id, content),
    detachNote: (id) => void window.aeronotes.detachNote(id),
    redockNote: (id) => void window.aeronotes.redockNote(id),
    focusNote: (id) => window.aeronotes.focusNote(id),
    setNoteAlwaysOnTop: (id, alwaysOnTop) => window.aeronotes.setNoteAlwaysOnTop(id, alwaysOnTop),
    setNoteColor: (id, color) => window.aeronotes.setNoteColor(id, color),
    setNoteTitle: (id, title) => window.aeronotes.setNoteTitle(id, title),
    reorderNotes: (orderedIds) => window.aeronotes.reorderNotes(orderedIds)
  }
})
