import { Notification } from 'electron'
import { t } from '@shared/i18n'
import { notesStore } from './store/notesStore'
import { detachNote } from './windows/noteWindowRegistry'

/**
 * How often due reminders are looked for. Polling rather than one timer per
 * note: it survives sleep/wake and system clock changes, and 30 s of lag on a
 * reminder is invisible (same reasoning as the fullscreen watcher).
 */
const POLL_INTERVAL_MS = 30_000

/** Notification body: the note's own text, trimmed to a toast-sized excerpt. */
const BODY_MAX_CHARS = 120

function notify(noteId: string, title: string, body: string, onChanged: () => void): void {
  if (!Notification.isSupported()) return
  const notification = new Notification({ title, body })
  // Clicking the toast brings the note up as a post-it.
  notification.on('click', () => detachNote(noteId, onChanged))
  notification.show()
}

/**
 * Fires Windows notifications for notes whose reminder is due. Reminders that
 * came due while the app was closed are notified once at the next launch (the
 * first sweep below) rather than silently skipped.
 */
export function startReminderScheduler(onChanged: () => void): void {
  const sweep = (): void => {
    const now = Date.now()
    let fired = false
    for (const note of notesStore.getAll()) {
      if (note.deletedAt || note.dueAt === undefined || note.dueAt > now) continue
      // Already notified for this exact reminder (setDueAt clears remindedAt).
      if (note.remindedAt !== undefined) continue
      notesStore.markReminded(note.id, now)
      fired = true
      notify(
        note.id,
        note.title || t('note.untitled'),
        note.contentPreview.slice(0, BODY_MAX_CHARS) || t('reminder.emptyBody'),
        onChanged
      )
    }
    if (fired) onChanged()
  }

  sweep()
  setInterval(sweep, POLL_INTERVAL_MS)
}
