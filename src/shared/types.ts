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
  /**
   * In the trash since this timestamp — hidden from every list, restorable,
   * and purged for good (real delete + tombstone) after 30 days. Synced like
   * any other field, so a deletion propagates before the purge does.
   */
  deletedAt?: number
  /** Floats to the top of the dock list whatever the sort mode. */
  pinned?: boolean
  /** Reminder time (epoch ms): a Windows notification fires once at or after it. */
  dueAt?: number
  /**
   * When the reminder for the current `dueAt` was notified. Synced like the
   * rest, so a note reminds once across machines rather than once per machine.
   */
  remindedAt?: number
  createdAt: number
  updatedAt: number
}

/** Dock list ordering. 'manual' = the user's own drag order (`dockIndex`). */
export type NoteSortMode = 'manual' | 'created' | 'updated' | 'name'

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

/** A connected monitor, as offered in the settings display picker. */
export interface DisplayInfo {
  id: number
  /** 1-based index for a human-friendly "Screen N" label. */
  index: number
  isPrimary: boolean
}

export interface AppSettings {
  dockSide: DockSide
  dockCollapsed: boolean
  dockExpandedWidth: number
  displayId?: number
  /**
   * Stable descriptor of the chosen display, used to re-find it after a reboot.
   * Electron regenerates `Display.id` each session on Windows, so the id alone
   * can't survive a restart; the label + geometry can.
   */
  displayTarget?: {
    label: string
    bounds: { x: number; y: number; width: number; height: number }
  }
  launchAtStartup?: boolean
  /** Folder the dock had open on last quit; restored at launch. null = folder list. */
  lastOpenFolderId?: string | null
  /** false = dock cards are collapsed to title + 3 preview lines, not editable. */
  notesExpanded?: boolean
  /** UI language: an explicit locale, or 'system' to follow the OS. */
  locale?: LocalePreference
  /** Electron accelerator toggling the dock (default CommandOrControl+Shift+N). */
  toggleShortcut?: string
  /** Electron accelerator opening the quick capture (default CommandOrControl+Shift+Space). */
  quickCaptureShortcut?: string
  /** Built-in template ids hidden from the carousel (local preference). */
  disabledBuiltinTemplates?: string[]
  /** Dock list ordering; reset to 'manual' as soon as a note is dragged. */
  sortMode?: NoteSortMode
  /** Taskbar-style auto-hide: the dock retracts until the cursor reaches its edge. */
  dockAutoHide?: boolean
}
