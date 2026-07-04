import type { JSONContent } from '@tiptap/core'

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

export interface Note {
  id: string
  title: string
  content: JSONContent
  /** Plain-text extract of `content`, kept in sync for cheap dock-preview rendering and search. */
  contentPreview: string
  color: NoteColor
  dockIndex: number
  isDetached: boolean
  windowBounds?: WindowBounds
  alwaysOnTop?: boolean
  createdAt: number
  updatedAt: number
}

export type DockSide = 'left' | 'right'

export interface AppSettings {
  dockSide: DockSide
  dockCollapsed: boolean
  dockExpandedWidth: number
  displayId?: number
}
