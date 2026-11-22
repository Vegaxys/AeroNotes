import { flushSync } from 'react-dom'

/** Name shared by the tapped card and the open note sheet during the zoom. */
export const NOTE_SHEET_TRANSITION = 'note-sheet'

const cardOf = (noteId: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[data-note-card="${CSS.escape(noteId)}"]`)

/**
 * Runs a React state change inside a view transition where the note's card
 * and the note sheet are one shared element, so the card grows into the
 * sheet (opening) or shrinks back into it (closing). Only one element may
 * hold the name at a time: the card takes it on the side of the transition
 * where the sheet is not mounted. Without the API (or the card, e.g. in
 * another folder) the change simply happens, with a cross-fade at most.
 */
export function zoomNote(noteId: string, direction: 'open' | 'close', update: () => void): void {
  if (!document.startViewTransition) {
    update()
    return
  }
  const card = cardOf(noteId)
  if (direction === 'open' && card) card.style.viewTransitionName = NOTE_SHEET_TRANSITION
  const transition = document.startViewTransition(() => {
    flushSync(update)
    if (!card) return
    card.style.viewTransitionName = direction === 'open' ? '' : NOTE_SHEET_TRANSITION
  })
  if (direction === 'close' && card) {
    void transition.finished.finally(() => {
      card.style.viewTransitionName = ''
    })
  }
}
