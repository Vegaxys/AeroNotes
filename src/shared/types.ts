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
}
