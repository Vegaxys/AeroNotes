import { useRef } from 'react'
import type { Note } from '@shared/types'
import { getLocale, t } from '@shared/i18n'
import { noteColorToCss } from '@shared/colorPalette'
import { countTasks } from '@shared/taskProgress'
import { IconClock, IconStar } from '../icons'

/** "Aujourd'hui", "Hier", else a short date — the card footer of the Figma list. */
export function formatShortDate(timestamp: number): string {
  const locale = getLocale()
  const day = new Date(timestamp)
  const today = new Date()
  const daysAgo = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()) /
      86_400_000
  )
  if (daysAgo === 0 || daysAgo === 1) {
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-daysAgo, 'day')
    return relative.charAt(0).toLocaleUpperCase(locale) + relative.slice(1)
  }
  return day.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

/** Reminder chip text: weekday and time when within a week, else the date. */
export function formatReminder(dueAt: number): string {
  const locale = getLocale()
  const due = new Date(dueAt)
  const withinWeek = Math.abs(dueAt - Date.now()) < 6 * 86_400_000
  return withinWeek
    ? due.toLocaleString(locale, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    : due.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

interface NoteCardProps {
  note: Note
  onOpen: () => void
  onLongPress: () => void
}

const LONG_PRESS_MS = 450

/**
 * A note in the two-column list (Figma board 01): title, a few lines of
 * text, checklist progress, date and reminder. `data-note-card` is the hook
 * the zoom transition uses to find it.
 */
export function NoteCard({ note, onOpen, onLongPress }: NoteCardProps): React.JSX.Element {
  const tasks = countTasks(note.content)
  // Refs, not locals: a re-render between press and release must not lose the timer.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)

  const startPress = (): void => {
    longPressed.current = false
    pressTimer.current = setTimeout(() => {
      longPressed.current = true
      navigator.vibrate?.(10)
      onLongPress()
    }, LONG_PRESS_MS)
  }
  const cancelPress = (): void => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = null
  }

  return (
    <button
      type="button"
      data-note-card={note.id}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(event) => event.preventDefault()}
      onClick={() => {
        if (!longPressed.current) onOpen()
      }}
      // wrap-anywhere: a long URL has no space to break at and would overflow the column.
      className="flex w-full flex-col gap-2 rounded-[20px] px-3.5 pt-3.5 pb-3 text-left text-m-ink wrap-anywhere"
      style={{ background: noteColorToCss(note.color) }}
    >
      <span className="flex w-full items-start gap-1.5">
        <span className="line-clamp-3 flex-1 text-base leading-[21px] font-bold">{note.title || t('note.untitled')}</span>
        {note.pinned && <IconStar width={16} height={16} className="mt-0.5 shrink-0" />}
      </span>
      {note.contentPreview && (
        <span className="line-clamp-6 text-[13px] leading-[18px] whitespace-pre-line text-m-ink/65">
          {note.contentPreview}
        </span>
      )}
      {tasks.total > 0 && (
        <span className="h-1 w-full overflow-hidden rounded-full bg-m-ink/15">
          <span className="block h-full rounded-full bg-m-ink" style={{ width: `${(tasks.done / tasks.total) * 100}%` }} />
        </span>
      )}
      <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-m-ink/65">
        {formatShortDate(note.updatedAt)}
        {note.dueAt && (
          <span className="flex items-center gap-1 rounded-[10px] bg-m-ink/10 py-[3px] pr-2 pl-1.5 text-m-ink">
            <IconClock width={12} height={12} />
            {formatReminder(note.dueAt)}
          </span>
        )}
        {tasks.total > 0 && <span>{`${tasks.done}/${tasks.total}`}</span>}
      </span>
    </button>
  )
}
