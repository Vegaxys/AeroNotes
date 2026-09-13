import type { NoteColor } from './types'

export const SOLID_PRESETS: NoteColor[] = [
  { type: 'solid', value: '#fef08a' },
  { type: 'solid', value: '#bbf7d0' },
  { type: 'solid', value: '#bfdbfe' },
  { type: 'solid', value: '#fbcfe8' },
  { type: 'solid', value: '#fed7aa' },
  { type: 'solid', value: '#e9d5ff' }
]

export const GRADIENT_PRESETS: NoteColor[] = [
  { type: 'gradient', value: ['#f9a8d4', '#a78bfa'], angle: 135 },
  { type: 'gradient', value: ['#93c5fd', '#6ee7b7'], angle: 135 },
  { type: 'gradient', value: ['#fde68a', '#fca5a5'], angle: 135 },
  { type: 'gradient', value: ['#c4b5fd', '#67e8f9'], angle: 135 }
]

/**
 * Rotation walked by `notesStore.add()` when a new note picks its color.
 * Solids and gradients are interleaved rather than concatenated: a gradient
 * must be able to show up on the second note created, not only once every
 * preset solid has been used.
 */
export const NOTE_COLOR_ROTATION: NoteColor[] = [
  SOLID_PRESETS[0],
  GRADIENT_PRESETS[0],
  SOLID_PRESETS[1],
  GRADIENT_PRESETS[1],
  SOLID_PRESETS[2],
  GRADIENT_PRESETS[2],
  SOLID_PRESETS[3],
  GRADIENT_PRESETS[3],
  SOLID_PRESETS[4],
  SOLID_PRESETS[5]
]

export const DEFAULT_NOTE_COLOR: NoteColor = SOLID_PRESETS[0]

export function noteColorToCss(color: NoteColor): string {
  if (color.type === 'solid') {
    return color.value as string
  }
  const [from, to] = color.value as [string, string]
  return `linear-gradient(${color.angle ?? 135}deg, ${from}, ${to})`
}

export function isSameNoteColor(a: NoteColor, b: NoteColor): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'solid') return a.value === b.value
  const [aFrom, aTo] = a.value as [string, string]
  const [bFrom, bTo] = b.value as [string, string]
  return aFrom === bFrom && aTo === bTo
}
