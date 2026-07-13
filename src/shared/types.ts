import type { JSONContent } from '@tiptap/core'
import type { LocalePreference } from './i18n'

export interface NoteColor {
  type: 'solid' | 'gradient'
  value: string | [string, string]
  angle?: number
}

export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface Folder {
  id: string
  name: string
  createdAt: number
  /** Last rename timestamp — drives last-writer-wins during cloud sync. */
  updatedAt: number
}

export interface Note {
  id: string
  title: string
  content: JSONContent
  /** Plain-text extract of `content`, kept in sync for cheap dock-preview rendering and search. */
  contentPreview: string
  color: NoteColor
  folderId: string
  /** Position within its folder's dock list. */
  dockIndex: number
  isDetached: boolean
  windowBounds?: WindowBounds
  alwaysOnTop?: boolean
  createdAt: number
  updatedAt: number
}

/** A user-created note template (built-ins live in code, never persisted). */
export interface Template {
  id: string
  name: string
  content: JSONContent
  createdAt: number
  updatedAt: number
}

/** A note as synced to the cloud — per-machine runtime state stripped. */
export type SyncedNote = Omit<Note, 'isDetached' | 'windowBounds' | 'alwaysOnTop'>

/** Deletion markers, so a note deleted on one machine doesn't resurrect from another. */
export interface SyncTombstones {
  notes: Record<string, number>
  folders: Record<string, number>
  templates: Record<string, number>
}

/** The single JSON document stored in the Drive appDataFolder. */
export interface SyncDocument {
  schemaVersion: 1
  notes: Record<string, SyncedNote>
  folders: Record<string, Folder>
  /** Absent in docs uploaded before 0.4 — normalize to {} on download. */
  templates?: Record<string, Template>
  tombstones: SyncTombstones
}

export interface SyncStatus {
  state: 'unconfigured' | 'signed-out' | 'idle' | 'syncing' | 'error'
  email?: string
  lastSyncAt?: number
  error?: string
}

/** A block being dragged from one note toward another (cross-window transfer). */
export interface BlockTransferPayload {
  sourceNoteId: string
  sourcePos: number
  sourceSize: number
  /** ProseMirror node JSON — every note window shares the same schema. */
  content: JSONContent
}

export type DockSide = 'left' | 'right'

export interface AppSettings {
  dockSide: DockSide
  dockCollapsed: boolean
  dockExpandedWidth: number
  displayId?: number
  launchAtStartup?: boolean
  /** Folder the dock had open on last quit; restored at launch. null = folder list. */
  lastOpenFolderId?: string | null
  /** false = dock cards are collapsed to title + 3 preview lines, not editable. */
  notesExpanded?: boolean
  /** UI language: an explicit locale, or 'system' to follow the OS. */
  locale?: LocalePreference
  /** Electron accelerator toggling the dock (default CommandOrControl+Shift+N). */
  toggleShortcut?: string
  /** Built-in template ids hidden from the carousel (local preference). */
  disabledBuiltinTemplates?: string[]
}
