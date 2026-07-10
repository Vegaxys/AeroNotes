import { useEffect, useRef, useState } from 'react'
import type { Note } from '@shared/types'
import { noteColorToCss } from '@shared/colorPalette'
import { t } from '@shared/i18n'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { useSettingsStore } from '@renderer/state/useSettingsStore'
import { NoteEditor } from '@renderer/editor/NoteEditor'

interface DockNoteCardProps {
  note: Note
  /** Drag props live on the card header, not the whole card: the editor body must keep text selection usable. */
  onDragStart: () => void
  onDragEnd: (event: React.DragEvent<HTMLDivElement>) => void
}

interface ContextMenuState {
  x: number
  y: number
  foldersOpen: boolean
}

function formatUpdatedAt(timestamp: number): string {
  const updated = new Date(timestamp)
  const now = new Date()
  const isToday =
    updated.getFullYear() === now.getFullYear() &&
    updated.getMonth() === now.getMonth() &&
    updated.getDate() === now.getDate()

  if (isToday) {
    return updated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
  return updated.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })
}

function MenuItem({
  onClick,
  danger,
  children
}: {
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left hover:bg-white/10 ${
        danger ? 'text-red-400' : ''
      }`}
    >
      {children}
    </button>
  )
}

export function DockNotePreview({ note, onDragStart, onDragEnd }: DockNoteCardProps): React.JSX.Element {
  const detachNote = useNotesStore((s) => s.detachNote)
  const focusNote = useNotesStore((s) => s.focusNote)
  const deleteNote = useNotesStore((s) => s.deleteNote)
  const duplicateNote = useNotesStore((s) => s.duplicateNote)
  const moveNoteToFolder = useNotesStore((s) => s.moveNoteToFolder)
  const updateNoteContent = useNotesStore((s) => s.updateNoteContent)
  const setNoteTitle = useNotesStore((s) => s.setNoteTitle)
  const folders = useNotesStore((s) => s.folders)
  const notesExpanded = useSettingsStore((s) => s.notesExpanded)

  const cardRef = useRef<HTMLDivElement>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [menu, setMenu] = useState<ContextMenuState | null>(null)

  useEffect(() => {
    if (!menu) return
    function handlePointerDown(event: PointerEvent): void {
      if (event.target instanceof Element && event.target.closest('.note-context-menu')) return
      setMenu(null)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [menu])

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>): void => {
    // Whole card as the drag ghost, anchored right under the cursor, and an
    // explicit 'move' effect so the cursor reads as an accepted drag.
    if (cardRef.current) {
      event.dataTransfer.setDragImage(cardRef.current, 30, 12)
    }
    event.dataTransfer.effectAllowed = 'move'
    onDragStart()
  }

  const openContextMenu = (event: React.MouseEvent): void => {
    event.preventDefault()
    setMenu({ x: event.clientX, y: event.clientY, foldersOpen: false })
  }

  const otherFolders = folders.filter((folder) => folder.id !== note.folderId)

  // The whole header is a grab zone; every action lives in the context menu.
  const header = (
    <div
      draggable={!isEditingTitle}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onContextMenu={openContextMenu}
      className="flex cursor-grab items-center gap-1.5 border-b border-black/10 px-3 py-2 active:cursor-grabbing"
    >
      {isEditingTitle ? (
        <input
          autoFocus
          value={note.title}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setNoteTitle(note.id, e.target.value)}
          onBlur={() => setIsEditingTitle(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
          }}
          placeholder={t('note.untitled')}
          spellCheck={false}
          className="min-w-0 flex-1 truncate bg-transparent text-sm font-medium outline-none placeholder:text-black/40"
        />
      ) : (
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {note.title || t('note.untitled')}
        </p>
      )}
      {note.isDetached && <span className="shrink-0 text-[10px] text-black/50">{t('note.open')}</span>}
    </div>
  )

  const contextMenu = menu && (
    <div
      data-mouse-live=""
      onClick={(e) => e.stopPropagation()}
      className="note-context-menu fixed z-50 w-52 rounded-[var(--radius-md)] border border-white/15 bg-neutral-900/95 p-1 text-xs text-white/85 shadow-2xl"
      style={{ top: menu.y, left: menu.x }}
    >
      <MenuItem
        onClick={() => {
          setIsEditingTitle(true)
          setMenu(null)
        }}
      >
        {t('note.rename')}
      </MenuItem>
      <MenuItem onClick={() => setMenu({ ...menu, foldersOpen: !menu.foldersOpen })}>
        <span>{t('note.moveToFolder')}</span>
        <span className="text-white/50">{menu.foldersOpen ? '▾' : '▸'}</span>
      </MenuItem>
      {menu.foldersOpen && (
        <div className="ml-2 flex flex-col border-l border-white/10 pl-1">
          {otherFolders.map((folder) => (
            <MenuItem
              key={folder.id}
              onClick={() => {
                moveNoteToFolder(note.id, folder.id)
                setMenu(null)
              }}
            >
              📁 {folder.name}
            </MenuItem>
          ))}
          {otherFolders.length === 0 && <p className="px-2 py-1.5 text-white/40">—</p>}
        </div>
      )}
      <MenuItem
        onClick={() => {
          duplicateNote(note.id)
          setMenu(null)
        }}
      >
        {t('note.duplicate')}
      </MenuItem>
      {!note.isDetached && (
        <MenuItem
          onClick={() => {
            detachNote(note.id)
            setMenu(null)
          }}
        >
          {t('note.detach')}
        </MenuItem>
      )}
      <div className="my-1 h-px bg-white/10" />
      <MenuItem
        danger
        onClick={() => {
          deleteNote(note.id)
          setMenu(null)
        }}
      >
        {t('note.delete')}
      </MenuItem>
    </div>
  )

  const isEditorCard = notesExpanded && !note.isDetached

  if (!isEditorCard) {
    // Preview card: detached notes always, and every note in collapsed mode
    // (title + 3 preview lines, not editable).
    return (
      <div
        ref={cardRef}
        onClick={() => (note.isDetached ? focusNote(note.id) : detachNote(note.id))}
        className={`cursor-pointer select-none rounded-[var(--radius-md)] text-black/80 shadow-md ${
          note.isDetached ? 'ring-2 ring-offset-2 ring-white' : ''
        }`}
        style={{ background: noteColorToCss(note.color) }}
      >
        {header}
        <div className="px-3 py-2">
          <p className={`${notesExpanded ? 'line-clamp-2' : 'line-clamp-3'} text-xs text-black/60`}>
            {note.contentPreview}
          </p>
          {notesExpanded && (
            <p className="mt-1 text-[10px] text-black/40">{formatUpdatedAt(note.updatedAt)}</p>
          )}
        </div>
        {contextMenu}
      </div>
    )
  }

  return (
    <div
      ref={cardRef}
      className="overflow-hidden rounded-[var(--radius-md)] text-black/80 shadow-md"
      style={{ background: noteColorToCss(note.color) }}
    >
      {header}
      <NoteEditor
        compact
        noteId={note.id}
        content={note.content}
        onChange={(content) => updateNoteContent(note.id, content)}
      />
      {contextMenu}
    </div>
  )
}
