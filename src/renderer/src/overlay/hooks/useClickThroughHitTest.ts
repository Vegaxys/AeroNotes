import { useEffect } from 'react'

/**
 * Margin added around each measured element's bounding rect. Elements like the
 * dock's collapse tab intentionally poke outside their own box (negative offset),
 * so the hit-test box must extend beyond it or part of them becomes unclickable.
 */
const HIT_TEST_MARGIN_PX = 12

/**
 * How long a foreign drag may rest over the dock before the pass-through is
 * lifted. The overlay never learns when a drag it let through ends (the drop
 * lands in another window), so without this a drag released over the dock
 * would leave it click-through until the cursor left and came back. A drag
 * still in progress simply re-arms the pass-through on its next move.
 */
const FOREIGN_DRAG_IDLE_RELEASE_MS = 1000

/**
 * Module scope, not a ref: `recheckClickThrough` is called from outside the
 * component and must see the same state. There is exactly one overlay window
 * per renderer, so a single set of values is the whole picture.
 */
let lastCursor: { x: number; y: number } | null = null
let isIgnoring = true
/** A drag started inside the overlay (dock card, embedded editor selection) is in flight. */
let isOwnDragActive = false
/** A drag coming from another window crossed the dock: stay click-through under it. */
let isForeignDragPassThrough = false
let foreignDragReleaseTimer: ReturnType<typeof setTimeout> | null = null

function setIgnoring(shouldIgnore: boolean): void {
  if (shouldIgnore === isIgnoring) return
  isIgnoring = shouldIgnore
  window.aeronotes.setOverlayIgnoreMouse(shouldIgnore)
}

function armForeignDragRelease(): void {
  if (foreignDragReleaseTimer) clearTimeout(foreignDragReleaseTimer)
  foreignDragReleaseTimer = setTimeout(() => {
    endForeignDragPassThrough()
    recheckClickThrough()
  }, FOREIGN_DRAG_IDLE_RELEASE_MS)
}

function endForeignDragPassThrough(): void {
  isForeignDragPassThrough = false
  if (foreignDragReleaseTimer) clearTimeout(foreignDragReleaseTimer)
  foreignDragReleaseTimer = null
}

/**
 * The overlay is a fullscreen window: once a drag from another window enters
 * it, the OS makes it the drop target, and since the overlay receives drag
 * events instead of mousemoves it never turns click-through again — the whole
 * screen shows the not-allowed cursor and the drop is cancelled wherever it is
 * released. Going click-through on the spot hands the drag back to the window
 * below on its very next move.
 */
function startForeignDragPassThrough(): void {
  isForeignDragPassThrough = true
  setIgnoring(true)
  armForeignDragRelease()
}

function applyHitTest(x: number, y: number): void {
  const liveElements = document.querySelectorAll<HTMLElement>('[data-mouse-live]')
  const isInsideAnyLiveRegion = Array.from(liveElements).some((element) => {
    const rect = element.getBoundingClientRect()
    return (
      x >= rect.left - HIT_TEST_MARGIN_PX &&
      x <= rect.right + HIT_TEST_MARGIN_PX &&
      y >= rect.top - HIT_TEST_MARGIN_PX &&
      y <= rect.bottom + HIT_TEST_MARGIN_PX
    )
  })

  if (isForeignDragPassThrough) {
    // Mousemoves keep being forwarded during the drag (without button state),
    // so "over the dock" cannot be told apart from "dragging across the dock":
    // stay click-through until the cursor leaves the dock or rests long enough.
    if (isInsideAnyLiveRegion) {
      armForeignDragRelease()
      return
    }
    endForeignDragPassThrough()
  }

  setIgnoring(!isInsideAnyLiveRegion)
}

/**
 * Re-runs the hit test where the cursor already is.
 *
 * Live regions also appear and disappear on their own, with the mouse
 * perfectly still — the auto-hidden dock sliding out from under a cursor
 * resting on the screen edge is the whole point of that feature. Recomputing
 * only on mousemove would leave such a dock visible but click-through until
 * the user jiggled the mouse.
 *
 * Call it after the DOM has been updated (from an effect, not during render).
 */
export function recheckClickThrough(): void {
  if (lastCursor) applyHitTest(lastCursor.x, lastCursor.y)
}

/**
 * Toggles the overlay window's click-through state based on whether the cursor
 * is over any element marked `data-mouse-live`. Elements opt in per-state (the
 * dock root only marks itself while expanded; the collapse tab is always live),
 * so a collapsed dock's gradient strip never swallows clicks meant for what's
 * behind it.
 *
 * Drags started in another window always pass through the dock, open or
 * collapsed: it never accepts nor cancels them. Drags started in the dock
 * itself (card reorder/detach, editor selection) keep the overlay as their
 * target, since their drop logic lives here.
 */
export function useClickThroughHitTest(): void {
  useEffect(() => {
    function handleMouseMove(event: MouseEvent): void {
      lastCursor = { x: event.clientX, y: event.clientY }
      applyHitTest(event.clientX, event.clientY)
    }

    // Listened on window, after the document-level guard in OverlayApp: a
    // dragstart it cancelled never fires dragend, so it must not count.
    function handleDragStart(event: DragEvent): void {
      if (!event.defaultPrevented) isOwnDragActive = true
    }

    function handleDragEnd(): void {
      isOwnDragActive = false
    }

    function handleDragEnter(): void {
      if (!isOwnDragActive) startForeignDragPassThrough()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('dragstart', handleDragStart)
    window.addEventListener('dragend', handleDragEnd)
    window.addEventListener('dragenter', handleDragEnter)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('dragstart', handleDragStart)
      window.removeEventListener('dragend', handleDragEnd)
      window.removeEventListener('dragenter', handleDragEnter)
      endForeignDragPassThrough()
    }
  }, [])
}
