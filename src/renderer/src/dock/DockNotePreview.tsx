import { useRef, useState } from 'react'
import type { Note } from '@shared/types'
import { noteColorToCss } from '@shared/colorPalette'
import { countTasks } from '@shared/taskProgress'
import { t } from '@shared/i18n'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { useSettingsStore } from '@renderer/state/useSettingsStore'
import { NoteHeaderMenu, type NoteHeaderMenuState } from '@renderer/shared/NoteHeaderMenu'
import { NoteEditor } from '@renderer/editor/NoteEditor'

interface DockNoteCardProps {
  note: Note
  /** Drag props live on the card header, not the whole card: the editor body must keep text selection usable. */
  onDragStart: () => void
  onDragEnd: (event: React.DragEvent<HTMLDivElement>) => void
  /** Ctrl multi-selection is armed: the whole card becomes one selection target. */
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
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

/** Reminder chip label: time alone today, day + time beyond. */
function formatDueAt(timestamp: number): string {
  const due = new Date(timestamp)
  const time = due.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const isToday = due.toDateString() === new Date().toDateString()
  return isToday ? time : `${due.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })} ${time}`
}

export function DockNotePreview({
  note,
  onDragStart,
  onDragEnd,
  selectionMode = false,
  selected = false,
  onToggleSelect
}: DockNoteCardProps): React.JSX.Element {
  const detachNote = useNotesStore((s) => s.detachNote)
  const focusNote = useNotesStore((s) => s.focusNote)
  const updateNoteContent = useNotesStore((s) => s.updateNoteContent)
  const setNoteTitle = useNotesStore((s) => s.setNoteTitle)
  const setNotePinned = useNotesStore((s) => s.setNotePinned)
  const notesExpanded = useSettingsStore((s) => s.notesExpanded)
  const showTaskProgress = useSettingsStore((s) => s.showTaskProgress)

  const tasks = countTasks(note.content)

  const cardRef = useRef<HTMLDivElement>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [menu, setMenu] = useState<NoteHeaderMenuState | null>(null)

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

  // The whole header is a grab zone; every action lives in the context menu.
  const header = (
    <div
      draggable={!isEditingTitle}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onContextMenu={openContextMenu}
      className="group flex cursor-grab items-center gap-1.5 border-b border-black/10 px-3 py-2 active:cursor-grabbing"
    >
      {/* Pin to the top of the list. Ghost star until hovered, so an unpinned
       * note's header stays as clean as before. */}
      <button
        onClick={(event) => {
          event.stopPropagation()
          setNotePinned(note.id, !note.pinned)
        }}
        className={`shrink-0 text-xs leading-none transition-opacity ${
          note.pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
        }`}
        aria-label={note.pinned ? t('note.unpinFromTop') : t('note.pinToTop')}
        title={note.pinned ? t('note.unpinFromTop') : t('note.pinToTop')}
      >
        {note.pinned ? '⭐' : '☆'}
      </button>
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
      {note.dueAt !== undefined && (
        <span
          className={`shrink-0 text-[10px] ${
            note.dueAt <= Date.now() ? 'font-semibold text-red-800' : 'text-black/50'
          }`}
          title={t('reminder.due', { time: formatDueAt(note.dueAt) })}
        >
          ⏰ {formatDueAt(note.dueAt)}
        </span>
      )}
      {note.isDetached && <span className="shrink-0 text-[10px] text-black/50">{t('note.open')}</span>}
    </div>
  )

  // Checklist progress, right under the header — only for notes that have one,
  // and only while the setting keeps it on.
  const progress = showTaskProgress && tasks.total > 0 && (
    <div className="flex items-center gap-2 px-3 pt-2">
      {/* Says what the bar measures: this note's checklist, not reading progress. */}
      <span className="shrink-0 text-[10px] leading-none text-black/50" aria-hidden>
        ☑
      </span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-black/40 transition-[width] duration-200"
          style={{ width: `${(tasks.done / tasks.total) * 100}%` }}
        />
      </div>
      <span className="shrink-0 text-[10px] text-black/50">
        {tasks.done}/{tasks.total}
      </span>
    </div>
  )

  /**
   * Full-card click shield, on top of everything while Ctrl-selection is armed.
   * A transparent layer rather than per-surface click handlers: in "Expand
   * notes" mode the card body is a live editor, and a Ctrl+click there would
   * otherwise land in ProseMirror instead of toggling the note.
   */
  const selectionLayer = selectionMode && (
    <>
      <button
        type="button"
        aria-pressed={selected}
        aria-label={selected ? t('selection.deselect') : t('selection.select')}
        onClick={(event) => {
          event.stopPropagation()
          onToggleSelect?.()
        }}
        onContextMenu={(event) => event.preventDefault()}
        className="absolute inset-0 z-20 cursor-pointer rounded-[var(--radius-md)]"
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute right-2 top-2 z-30 flex h-5 w-5 items-center justify-center rounded-full border text-[11px] leading-none ${
          selected
            ? 'border-white bg-white text-black'
            : 'border-black/30 bg-black/10 text-transparent'
        }`}
      >
        ✓
      </span>
    </>
  )

  const contextMenu = menu && (
    <NoteHeaderMenu
      note={note}
      menu={menu}
      setMenu={setMenu}
      surface="dock"
      onRename={() => setIsEditingTitle(true)}
    />
  )

  const isEditorCard = notesExpanded && !note.isDetached

  if (!isEditorCard) {
    // Preview card: detached notes always, and every note in collapsed mode
    // (title + 3 preview lines, not editable).
    return (
      <div
        ref={cardRef}
        onClick={() => (note.isDetached ? focusNote(note.id) : detachNote(note.id))}
        className={`relative cursor-pointer select-none rounded-[var(--radius-md)] text-black/80 shadow-md ${
          // Inset: the highlight is drawn just inside the card's own outline,
          // so an open note doesn't grow a halo that shifts the list's rhythm.
          selected
            ? 'ring-2 ring-inset ring-[var(--color-accent-strong)]'
            : note.isDetached
              ? 'ring-2 ring-inset ring-white'
              : ''
        }`}
        style={{ background: noteColorToCss(note.color) }}
      >
        {selectionLayer}
        {header}
        {progress}
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
      className={`relative overflow-hidden rounded-[var(--radius-md)] text-black/80 shadow-md ${
        selected ? 'ring-2 ring-inset ring-[var(--color-accent-strong)]' : ''
      }`}
      style={{ background: noteColorToCss(note.color) }}
    >
      {selectionLayer}
      {header}
      {progress}
      <NoteEditor
        compact
        noteId={note.id}
        content={note.content}
        onChange={(content) => updateNoteContent(note.id, content)}
        // The editor card only exists in expanded mode, which is exactly when
        // the dock should offer templates.
        showTemplates
      />
      {contextMenu}
    </div>
  )
}
