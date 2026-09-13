import type { JSONContent } from '@tiptap/core'
import type {
  Folder,
  Note,
  SyncDocument,
  SyncedNote,
  SyncTombstones,
  Template,
  WindowBounds
} from '@shared/types'
import { GRADIENT_PRESETS, NOTE_COLOR_ROTATION, SOLID_PRESETS } from '@shared/colorPalette'
import { extractPlainText } from '@shared/plainTextExtract'
import { TRASH_TTL_MS } from '@shared/trash'
import { t } from '@shared/i18n'
import {
  loadFolders,
  loadNotes,
  loadTemplates,
  loadTombstones,
  saveFolders,
  saveNotes,
  saveTemplates,
  saveTombstones
} from './persistence'

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
  private templates = new Map<string, Template>(loadTemplates().map((tpl) => [tpl.id, tpl]))
  private tombstones: SyncTombstones = loadTombstones()
  private saveTimeout: ReturnType<typeof setTimeout> | null = null
  /** Cloud sync hook — fires on every user-driven mutation (not on applyRemote). */
  private onMutated: (() => void) | null = null

  constructor() {
    // Migration: folders persisted before cloud sync have no updatedAt.
    loadFolders().forEach((folder) =>
      this.folders.set(folder.id, { ...folder, updatedAt: folder.updatedAt ?? folder.createdAt })
    )

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
    const timestamp = Date.now()
    const folder: Folder = { id: crypto.randomUUID(), name, createdAt: timestamp, updatedAt: timestamp }
    this.folders.set(folder.id, folder)
    return folder
  }

  setOnMutated(callback: () => void): void {
    this.onMutated = callback
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
    this.folders.set(id, { ...folder, name, updatedAt: Date.now() })
    this.scheduleSave()
  }

  /**
   * Moves a note to the trash. Soft delete on purpose: `deletedAt` is a synced
   * field, so the deletion reaches the other machines as a plain update and
   * stays undoable for 30 days on all of them. The real delete (which drops
   * the note and leaves a tombstone) happens in `purgeNote`.
   */
  deleteNote(id: string): void {
    const note = this.notes.get(id)
    if (!note || note.deletedAt) return
    const timestamp = Date.now()
    this.notes.set(id, { ...note, deletedAt: timestamp, isDetached: false, updatedAt: timestamp })
    this.scheduleSave()
  }

  /**
   * Back out of the trash, at the top of its folder. A note whose folder was
   * deleted meanwhile would be invisible, so it lands in the first folder —
   * same rule as the orphan-note migration in the constructor.
   */
  restoreNote(id: string): void {
    const note = this.notes.get(id)
    if (!note?.deletedAt) return
    const folderId = this.folders.has(note.folderId)
      ? note.folderId
      : ([...this.folders.values()][0] ?? this.createFolder(t('folder.defaultName'))).id
    this.shiftDockIndexes(folderId)
    const { deletedAt: _trashed, ...restored } = note
    this.notes.set(id, { ...restored, folderId, dockIndex: 0, updatedAt: Date.now() })
    this.scheduleSave()
  }

  /** Real, irreversible delete (+ tombstone so it can't come back from the cloud). */
  purgeNote(id: string): void {
    if (!this.notes.delete(id)) return
    this.tombstones.notes[id] = Date.now()
    this.scheduleSave()
  }

  getTrash(): Note[] {
    return [...this.notes.values()]
      .filter((note) => note.deletedAt)
      .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
  }

  /** Empties the trash; returns the purged ids. */
  emptyTrash(): string[] {
    const ids = this.getTrash().map((note) => note.id)
    ids.forEach((id) => this.purgeNote(id))
    return ids
  }

  /** Purges notes trashed more than TRASH_TTL_MS ago; returns the purged ids. */
  purgeExpiredTrash(): string[] {
    const cutoff = Date.now() - TRASH_TTL_MS
    const ids = this.getTrash()
      .filter((note) => (note.deletedAt ?? 0) < cutoff)
      .map((note) => note.id)
    ids.forEach((id) => this.purgeNote(id))
    return ids
  }

  /** Sets (or clears, with undefined) a note's reminder; re-arms the notification. */
  setDueAt(id: string, dueAt: number | undefined): void {
    const note = this.notes.get(id)
    if (!note) return
    this.notes.set(id, { ...note, dueAt, remindedAt: undefined, updatedAt: Date.now() })
    this.scheduleSave()
  }

  /** Records that the reminder fired, so the scheduler never repeats it. */
  markReminded(id: string, at: number): void {
    const note = this.notes.get(id)
    if (!note) return
    this.notes.set(id, { ...note, remindedAt: at, updatedAt: at })
    this.scheduleSave()
  }

  setPinned(id: string, pinned: boolean): void {
    const note = this.notes.get(id)
    if (!note) return
    this.notes.set(id, { ...note, pinned, updatedAt: Date.now() })
    this.scheduleSave()
  }

  getTemplates(): Template[] {
    return [...this.templates.values()].sort((a, b) => a.createdAt - b.createdAt)
  }

  getTemplateById(id: string): Template | undefined {
    return this.templates.get(id)
  }

  addTemplate(name: string, content: JSONContent): Template {
    const timestamp = Date.now()
    const template: Template = {
      id: crypto.randomUUID(),
      name,
      content: structuredClone(content),
      createdAt: timestamp,
      updatedAt: timestamp
    }
    this.templates.set(template.id, template)
    this.scheduleSave()
    return template
  }

  updateTemplate(id: string, patch: Partial<Pick<Template, 'name' | 'content'>>): void {
    const template = this.templates.get(id)
    if (!template) return
    this.templates.set(id, { ...template, ...patch, updatedAt: Date.now() })
    this.scheduleSave()
  }

  deleteTemplate(id: string): void {
    if (!this.templates.delete(id)) return
    this.tombstones.templates[id] = Date.now()
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

  /**
   * Deletes a folder; its notes go to the trash (restoring one later moves it
   * to another folder). Returns the ids of the trashed notes.
   */
  deleteFolder(id: string): string[] {
    if (!this.folders.delete(id)) return []
    this.tombstones.folders[id] = Date.now()
    const noteIds = this.getActiveNotesInFolder(id).map((n) => n.id)
    noteIds.forEach((noteId) => this.deleteNote(noteId))
    this.scheduleSave()
    return noteIds
  }

  /** Notes of a folder that are not in the trash. */
  private getActiveNotesInFolder(id: string): Note[] {
    return [...this.notes.values()].filter((n) => n.folderId === id && !n.deletedAt)
  }

  /** Frees index 0 of a folder so a new (or restored) note can take the top spot. */
  private shiftDockIndexes(folderId: string): void {
    this.getActiveNotesInFolder(folderId).forEach((note) => {
      this.notes.set(note.id, { ...note, dockIndex: note.dockIndex + 1 })
    })
  }

  countNotesInFolder(id: string): number {
    return this.getActiveNotesInFolder(id).length
  }

  /** New notes go to the TOP of their folder (index 0), not the bottom. */
  add(folderId: string): Note {
    const timestamp = Date.now()
    this.shiftDockIndexes(folderId)
    const note: Note = {
      id: crypto.randomUUID(),
      title: t('note.defaultTitle'),
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      contentPreview: '',
      // Gradients are part of the rotation, not a manual-only choice.
      color: NOTE_COLOR_ROTATION[this.notes.size % NOTE_COLOR_ROTATION.length],
      folderId,
      dockIndex: 0,
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

  getTombstones(): SyncTombstones {
    return structuredClone(this.tombstones)
  }

  /** Snapshot for cloud sync — per-machine runtime state stripped from notes. */
  toSyncDocument(): SyncDocument {
    const notes: Record<string, SyncedNote> = {}
    for (const note of this.notes.values()) {
      const { isDetached: _detached, windowBounds: _bounds, alwaysOnTop: _pinned, ...synced } = note
      notes[note.id] = synced
    }
    const folders: Record<string, Folder> = {}
    for (const folder of this.folders.values()) {
      folders[folder.id] = folder
    }
    const templates: Record<string, Template> = {}
    for (const template of this.templates.values()) {
      templates[template.id] = template
    }
    return { schemaVersion: 1, notes, folders, templates, tombstones: structuredClone(this.tombstones) }
  }

  /**
   * Replaces collections with the merged sync result, keeping each note's
   * local runtime state (detached window, bounds, pin). Returns the ids of
   * notes whose synced content changed (their open editors must reload) and
   * of notes that disappeared (their windows must close).
   */
  applyRemote(merged: SyncDocument): { changedNoteIds: string[]; deletedNoteIds: string[] } {
    const changedNoteIds: string[] = []
    const nextNotes = new Map<string, Note>()
    for (const synced of Object.values(merged.notes)) {
      const existing = this.notes.get(synced.id)
      if (!existing || existing.updatedAt !== synced.updatedAt) {
        changedNoteIds.push(synced.id)
      }
      nextNotes.set(synced.id, {
        ...synced,
        isDetached: existing?.isDetached ?? false,
        windowBounds: existing?.windowBounds,
        alwaysOnTop: existing?.alwaysOnTop
      })
    }
    const deletedNoteIds = [...this.notes.keys()].filter((id) => !nextNotes.has(id))

    this.notes = nextNotes
    this.folders = new Map(Object.entries(merged.folders))
    this.templates = new Map(Object.entries(merged.templates ?? {}))
    this.tombstones = structuredClone(merged.tombstones)
    this.scheduleSave(false)
    return { changedNoteIds, deletedNoteIds }
  }

  private scheduleSave(notifyMutation = true): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout)
    this.saveTimeout = setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS)
    // Not on applyRemote: a just-pulled state has nothing new to push.
    if (notifyMutation) this.onMutated?.()
  }

  flush(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }
    saveNotes(this.getAll())
    saveFolders(this.getFolders())
    saveTemplates(this.getTemplates())
    saveTombstones(this.tombstones)
  }
}

export const notesStore = new NotesStore()
