import { useState, type CSSProperties } from 'react'
import type { NoteColor } from '@shared/types'
import { noteColorToCss } from '@shared/colorPalette'
import { ColorPicker } from './ColorPicker'

/** `WebkitAppRegion` drives native window dragging in Electron but isn't in DOM's CSSProperties. */
const dragRegion = { WebkitAppRegion: 'drag' } as unknown as CSSProperties
const noDragRegion = { WebkitAppRegion: 'no-drag' } as unknown as CSSProperties

interface NoteFrameProps {
  title: string
  color: NoteColor
  isPinned: boolean
  onTogglePin: () => void
  onRedock: () => void
  onColorChange: (color: NoteColor) => void
  onTitleChange: (title: string) => void
  children: React.ReactNode
}

function EditableTitle({
  title,
  onTitleChange
}: {
  title: string
  onTitleChange: (title: string) => void
}): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <input
        autoFocus
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        onBlur={() => setIsEditing(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        placeholder="Sans titre"
        spellCheck={false}
        size={Math.max(title.length, 6)}
        style={noDragRegion}
        className="max-w-full truncate bg-transparent text-sm font-semibold text-black/80 outline-none placeholder:text-black/40"
      />
    )
  }

  // Only the word itself is clickable/editable and non-draggable; the rest of
  // the titlebar (including the space right of a short title) stays part of
  // the window's drag region.
  return (
    <span
      onClick={() => setIsEditing(true)}
      style={noDragRegion}
      className="max-w-full cursor-text truncate text-sm font-semibold text-black/80"
    >
      {title || 'Sans titre'}
    </span>
  )
}

export function NoteFrame({
  title,
  color,
  isPinned,
  onTogglePin,
  onRedock,
  onColorChange,
  onTitleChange,
  children
}: NoteFrameProps): React.JSX.Element {
  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden rounded-[var(--radius-lg)] shadow-2xl"
      style={{ background: noteColorToCss(color) }}
    >
      <div
        className="flex shrink-0 items-center gap-2 border-b border-black/10 px-3 py-2"
        style={dragRegion}
      >
        <EditableTitle title={title} onTitleChange={onTitleChange} />
        <div className="ml-auto flex shrink-0 items-center gap-1" style={noDragRegion}>
          <ColorPicker value={color} onChange={onColorChange} />
          <button
            onClick={onTogglePin}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs hover:bg-black/10 ${
              isPinned ? 'text-black/90' : 'text-black/40'
            }`}
            aria-label={isPinned ? 'Ne plus epingler' : 'Epingler au premier plan'}
            title={isPinned ? 'Ne plus epingler' : 'Epingler au premier plan'}
          >
            📌
          </button>
          <button
            onClick={onRedock}
            className="flex h-6 w-6 items-center justify-center rounded-full text-sm text-black/50 hover:bg-black/10"
            aria-label="Ranger dans le dock"
            title="Ranger dans le dock"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
