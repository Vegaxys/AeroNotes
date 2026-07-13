import { useEffect, useState, type CSSProperties } from 'react'
import type { Note, NoteColor } from '@shared/types'
import { noteColorToCss } from '@shared/colorPalette'
import { t } from '@shared/i18n'
import { ColorPicker } from './ColorPicker'
import { NoteHeaderMenu, type NoteHeaderMenuState } from './NoteHeaderMenu'

/** `WebkitAppRegion` drives native window dragging in Electron but isn't in DOM's CSSProperties. */
const dragRegion = { WebkitAppRegion: 'drag' } as unknown as CSSProperties
const noDragRegion = { WebkitAppRegion: 'no-drag' } as unknown as CSSProperties

interface NoteFrameProps {
  title: string
  color: NoteColor
  isPinned: boolean
  onTogglePin: () => void
  onRedock: () => void
  onDelete: () => void
  onColorChange: (color: NoteColor) => void
  onTitleChange: (title: string) => void
  /** When provided, right-clicking the titlebar opens the shared note context menu. */
  note?: Note
  children: React.ReactNode
}

function EditableTitle({
  title,
  isEditing,
  onStartEdit,
  onStopEdit,
  onTitleChange
}: {
  title: string
  isEditing: boolean
  onStartEdit: () => void
  onStopEdit: () => void
  onTitleChange: (title: string) => void
}): React.JSX.Element {
  if (isEditing) {
    return (
      <input
        autoFocus
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        onBlur={onStopEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
        }}
        placeholder={t('note.untitled')}
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
      onClick={onStartEdit}
      style={noDragRegion}
      className="max-w-full cursor-text truncate text-sm font-semibold text-black/80"
    >
      {title || t('note.untitled')}
    </span>
  )
}

export function NoteFrame({
  title,
  color,
  isPinned,
  onTogglePin,
  onRedock,
  onDelete,
  onColorChange,
  onTitleChange,
  note,
  children
}: NoteFrameProps): React.JSX.Element {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [menu, setMenu] = useState<NoteHeaderMenuState | null>(null)

  // The titlebar is a drag region, so DOM mouse events never reach it —
  // right-clicks are caught natively by the main process and relayed here.
  const hasNote = Boolean(note)
  useEffect(() => {
    if (!hasNote) return
    return window.aeronotes.onNoteHeaderContextMenu((x, y) =>
      setMenu({ x, y, foldersOpen: false })
    )
  }, [hasNote])

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden rounded-[var(--radius-lg)] shadow-2xl"
      style={{ background: noteColorToCss(color) }}
    >
      <div
        className="flex shrink-0 items-center gap-2 border-b border-black/10 px-3 py-2"
        style={dragRegion}
      >
        <EditableTitle
          title={title}
          isEditing={isEditingTitle}
          onStartEdit={() => setIsEditingTitle(true)}
          onStopEdit={() => setIsEditingTitle(false)}
          onTitleChange={onTitleChange}
        />
        <div className="ml-auto flex shrink-0 items-center gap-1" style={noDragRegion}>
          <ColorPicker value={color} onChange={onColorChange} />
          <button
            onClick={onTogglePin}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs hover:bg-black/10 ${
              isPinned ? 'text-black/90' : 'text-black/40'
            }`}
            aria-label={isPinned ? t('note.unpin') : t('note.pin')}
            title={isPinned ? t('note.unpin') : t('note.pin')}
          >
            📌
          </button>
          <button
            onClick={onDelete}
            className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-black/40 hover:bg-black/10 hover:text-red-700"
            aria-label={t('note.delete')}
            title={t('note.delete')}
          >
            🗑
          </button>
          <button
            onClick={onRedock}
            className="flex h-6 w-6 items-center justify-center rounded-full text-sm text-black/50 hover:bg-black/10"
            aria-label={t('note.redock')}
            title={t('note.redock')}
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
      {note && menu && (
        <NoteHeaderMenu
          note={note}
          menu={menu}
          setMenu={setMenu}
          surface="window"
          onRename={() => setIsEditingTitle(true)}
        />
      )}
    </div>
  )
}
