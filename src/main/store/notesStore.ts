import type { JSONContent } from '@tiptap/core'
import type { Note, WindowBounds } from '@shared/types'
import { GRADIENT_PRESETS, SOLID_PRESETS } from '@shared/colorPalette'
import { extractPlainText } from '@shared/plainTextExtract'
import { loadNotes, saveNotes } from './persistence'

const SAVE_DEBOUNCE_MS = 500

const seedTimestamp = Date.now()

function seedNote(partial: Pick<Note, 'id' | 'title' | 'contentPreview' | 'color' | 'dockIndex'>): Note {
  return {
    content: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: partial.contentPreview }] }]
    },
    isDetached: false,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp,
    ...partial
  }
}

function seedNotes(): Note[] {
  return [
    seedNote({
      id: '1',
      title: 'Courses',
      contentPreview: 'Lait, oeufs, pain, cafe, pates',
      color: SOLID_PRESETS[0],
      dockIndex: 0
    }),
    seedNote({
      id: '2',
      title: 'Idees projet AeroNotes',
      contentPreview: 'Toggle blocks, drag handle, menu slash',
      color: GRADIENT_PRESETS[0],
      dockIndex: 1
    }),
    seedNote({
      id: '3',
      title: 'Lecture',
      contentPreview: 'Finir le chapitre 4, prendre des notes',
      color: SOLID_PRESETS[2],
      dockIndex: 2
    })
  ]
}

class NotesStore {
  private notes = new Map<string, Note>()
  private saveTimeout: ReturnType<typeof setTimeout> | null = null

  constructor() {
    const persisted = loadNotes()
    const initial = persisted.length > 0 ? persisted : seedNotes()
    // No detached window exists yet at startup, regardless of what was persisted.
    initial.forEach((note) => this.notes.set(note.id, { ...note, isDetached: false }))
    if (persisted.length === 0) {
      this.scheduleSave()
    }
  }

  getAll(): Note[] {
    return [...this.notes.values()].sort((a, b) => a.dockIndex - b.dockIndex)
  }

  getById(id: string): Note | undefined {
    return this.notes.get(id)
  }

  add(): Note {
    const timestamp = Date.now()
    const note: Note = {
      id: crypto.randomUUID(),
      title: 'Nouvelle note',
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      contentPreview: '',
      color: SOLID_PRESETS[this.notes.size % SOLID_PRESETS.length],
      dockIndex: this.notes.size,
      isDetached: false,
      createdAt: timestamp,
      updatedAt: timestamp
    }
    this.notes.set(note.id, note)
    this.scheduleSave()
    return note
  }

  updateContent(id: string, content: JSONContent): void {
    const note = this.notes.get(id)
    if (!note) return
    this.notes.set(id, {
      ...note,
      content,
      contentPreview: extractPlainText(content),
      updatedAt: Date.now()
    })
    this.scheduleSave()
  }

  setColor(id: string, color: Note['color']): void {
    const note = this.notes.get(id)
    if (!note) return
    this.notes.set(id, { ...note, color, updatedAt: Date.now() })
    this.scheduleSave()
  }

  setDetached(id: string, isDetached: boolean, windowBounds?: WindowBounds): void {
    const note = this.notes.get(id)
    if (!note) return
    this.notes.set(id, { ...note, isDetached, windowBounds: windowBounds ?? note.windowBounds })
    this.scheduleSave()
  }

  setAlwaysOnTop(id: string, alwaysOnTop: boolean): void {
    const note = this.notes.get(id)
    if (!note) return
    this.notes.set(id, { ...note, alwaysOnTop })
    this.scheduleSave()
  }

  setWindowBounds(id: string, windowBounds: WindowBounds): void {
    const note = this.notes.get(id)
    if (!note) return
    this.notes.set(id, { ...note, windowBounds })
    this.scheduleSave()
  }

  private scheduleSave(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout)
    this.saveTimeout = setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS)
  }

  flush(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }
    saveNotes(this.getAll())
  }
}

export const notesStore = new NotesStore()
