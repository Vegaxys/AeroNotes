import type { JSONContent } from '@tiptap/core'
import type { Folder, Note, WindowBounds } from '@shared/types'
import { GRADIENT_PRESETS, SOLID_PRESETS } from '@shared/colorPalette'
import { extractPlainText } from '@shared/plainTextExtract'
import { t } from '@shared/i18n'
import { loadFolders, loadNotes, saveFolders, saveNotes } from './persistence'

const SAVE_DEBOUNCE_MS = 500

const seedTimestamp = Date.now()

function seedNote(
  partial: Pick<Note, 'id' | 'title' | 'contentPreview' | 'color' | 'dockIndex' | 'folderId'>
): Note {
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

function seedNotes(folderId: string): Note[] {
  return [
    seedNote({
      id: '1',
      title: 'Groceries',
      contentPreview: 'Milk, eggs, bread, coffee, pasta',
      color: SOLID_PRESETS[0],
      dockIndex: 0,
      folderId
    }),
    seedNote({
      id: '2',
      title: 'AeroNotes project ideas',
      contentPreview: 'Toggle blocks, drag handle, slash menu',
      color: GRADIENT_PRESETS[0],
      dockIndex: 1,
      folderId
    }),
    seedNote({
      id: '3',
      title: 'Reading',
      contentPreview: 'Finish chapter 4, take notes',
      color: SOLID_PRESETS[2],
      dockIndex: 2,
      folderId
    })
  ]
}

class NotesStore {
  private notes = new Map<string, Note>()
  private folders = new Map<string, Folder>()
  private saveTimeout: ReturnType<typeof setTimeout> | null = null

  constructor() {
    loadFolders().forEach((folder) => this.folders.set(folder.id, folder))

    const persisted = loadNotes()
    if (persisted.length === 0 && this.folders.size === 0) {
      const folder = this.createFolder(t('folder.defaultName'))
      seedNotes(folder.id).forEach((note) => this.notes.set(note.id, note))
      this.scheduleSave()
      return
    }

    // Migration: notes persisted before folders existed have no folderId —
    // move them into a default folder (created on demand).
    let defaultFolder: Folder | undefined
    persisted.forEach((note) => {
      let folderId = note.folderId
      if (!folderId || !this.folders.has(folderId)) {
        defaultFolder ??= [...this.folders.values()][0] ?? this.createFolder(t('folder.defaultName'))
        folderId = defaultFolder.id
      }
      // No detached window exists yet at startup, regardless of what was persisted.
      this.notes.set(note.id, { ...note, folderId, isDetached: false })
    })
    this.scheduleSave()
  }

  private createFolder(name: string): Folder {
    const folder: Folder = { id: crypto.randomUUID(), name, createdAt: Date.now() }
    this.folders.set(folder.id, folder)
    return folder
  }

  getAll(): Note[] {
    return [...this.notes.values()].sort((a, b) => a.dockIndex - b.dockIndex)
  }

  getById(id: string): Note | undefined {
    return this.notes.get(id)
  }

  getFolders(): Folder[] {
    return [...this.folders.values()].sort((a, b) => a.createdAt - b.createdAt)
  }

  addFolder(name: string): Folder {
    const folder = this.createFolder(name)
    this.scheduleSave()
    return folder
  }

  renameFolder(id: string, name: string): void {
    const folder = this.folders.get(id)
    if (!folder) return
    this.folders.set(id, { ...folder, name })
    this.scheduleSave()
  }

  deleteNote(id: string): void {
    if (!this.notes.delete(id)) return
    this.scheduleSave()
  }

  duplicateNote(id: string): Note | undefined {
    const source = this.notes.get(id)
    if (!source) return undefined
    const timestamp = Date.now()
    const copy: Note = {
      ...source,
      id: crypto.randomUUID(),
      title: `${source.title} ${t('note.copySuffix')}`.trim(),
      content: structuredClone(source.content),
      dockIndex: this.countNotesInFolder(source.folderId),
      isDetached: false,
      windowBounds: undefined,
      alwaysOnTop: false,
      createdAt: timestamp,
      updatedAt: timestamp
    }
    this.notes.set(copy.id, copy)
    this.scheduleSave()
    return copy
  }

  moveNoteToFolder(id: string, folderId: string): void {
    const note = this.notes.get(id)
    if (!note || note.folderId === folderId || !this.folders.has(folderId)) return
    this.notes.set(id, {
      ...note,
      folderId,
      dockIndex: this.countNotesInFolder(folderId),
      updatedAt: Date.now()
    })
    this.scheduleSave()
  }

  /** Deletes a folder and all its notes; returns the ids of the deleted notes. */
  deleteFolder(id: string): string[] {
    if (!this.folders.delete(id)) return []
    const noteIds = [...this.notes.values()].filter((n) => n.folderId === id).map((n) => n.id)
    noteIds.forEach((noteId) => this.notes.delete(noteId))
    this.scheduleSave()
    return noteIds
  }

  countNotesInFolder(id: string): number {
    return [...this.notes.values()].filter((n) => n.folderId === id).length
  }

  add(folderId: string): Note {
    const timestamp = Date.now()
    const siblings = [...this.notes.values()].filter((n) => n.folderId === folderId)
    const note: Note = {
      id: crypto.randomUUID(),
      title: t('note.defaultTitle'),
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      contentPreview: '',
      color: SOLID_PRESETS[this.notes.size % SOLID_PRESETS.length],
      folderId,
      dockIndex: siblings.length,
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

  setTitle(id: string, title: string): void {
    const note = this.notes.get(id)
    if (!note) return
    this.notes.set(id, { ...note, title, updatedAt: Date.now() })
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

  setDockOrder(orderedIds: string[]): void {
    orderedIds.forEach((id, index) => {
      const note = this.notes.get(id)
      if (!note) return
      this.notes.set(id, { ...note, dockIndex: index })
    })
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
    saveFolders(this.getFolders())
  }
}

export const notesStore = new NotesStore()
