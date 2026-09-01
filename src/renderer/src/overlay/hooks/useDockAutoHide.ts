import { useEffect, useState } from 'react'
import { useSettingsStore } from '@renderer/state/useSettingsStore'
import { recheckClickThrough } from './useClickThroughHitTest'

/** How close to the screen edge the cursor must come to reveal the dock. */
const REVEAL_EDGE_PX = 4
/**
 * How long the cursor must REST on the edge before the dock comes out. Short
 * enough to feel immediate when aimed at, long enough that merely flicking the
 * pointer across the edge on the way somewhere else doesn't pop it open.
 */
const REVEAL_DELAY_MS = 100
/** Grace period before hiding again, so a quick overshoot doesn't close it. */
const HIDE_DELAY_MS = 500

/**
 * Taskbar-style auto-hide (opt-in setting): the dock retracts entirely and
 * comes back when the cursor rests on its screen edge.
 *
 * Purely renderer-side: the overlay window covers the whole screen and
 * `setIgnoreMouseEvents(true, { forward: true })` keeps forwarding mouse
 * moves, so the same event stream the click-through hit-test uses is enough
 * to know where the cursor is — no polling in the main process.
 *
 * Returns whether the dock is currently hidden. This is runtime state, never
 * persisted: it must not overwrite the user's own collapsed preference.
 */
export function useDockAutoHide(): boolean {
  const dockAutoHide = useSettingsStore((s) => s.dockAutoHide)
  const dockSide = useSettingsStore((s) => s.dockSide)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!dockAutoHide) {
      setHidden(false)
      return
    }
    // Turning the setting on hides right away; the cursor may already be at
    // the edge, in which case the first mousemove reveals it again.
    setHidden(true)

    let hideTimer: ReturnType<typeof setTimeout> | null = null
    let revealTimer: ReturnType<typeof setTimeout> | null = null
    const cancelHide = (): void => {
      if (hideTimer) clearTimeout(hideTimer)
      hideTimer = null
    }
    const cancelReveal = (): void => {
      if (revealTimer) clearTimeout(revealTimer)
      revealTimer = null
    }

    function handleMouseMove(event: MouseEvent): void {
      const rect = document.querySelector('[data-dock-root]')?.getBoundingClientRect()
      // `rect.width > 0`: while hidden the dock box collapses onto the screen
      // edge, and a zero-width box would swallow the edge itself — turning
      // every reveal into an immediate one.
      const overDock =
        rect !== undefined &&
        rect.width > 0 &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right
      const atScreenEdge =
        dockSide === 'right'
          ? event.clientX >= window.innerWidth - REVEAL_EDGE_PX
          : event.clientX <= REVEAL_EDGE_PX

      // Already on the dock itself: keep it out, no delay.
      if (overDock) {
        cancelHide()
        cancelReveal()
        setHidden(false)
        return
      }
      if (atScreenEdge) {
        cancelHide()
        // Arm the reveal instead of firing it. Leaving the edge before the
        // timer runs cancels it; a cursor that simply stops there emits no
        // further mousemove, so "still armed" IS "still on the edge".
        if (!revealTimer) {
          revealTimer = setTimeout(() => {
            revealTimer = null
            setHidden(false)
          }, REVEAL_DELAY_MS)
        }
        return
      }
      cancelReveal()
      if (!hideTimer) {
        hideTimer = setTimeout(() => {
          hideTimer = null
          setHidden(true)
        }, HIDE_DELAY_MS)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      cancelHide()
      cancelReveal()
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [dockAutoHide, dockSide])

  // The dock slides out (or retracts) under a cursor that is not moving — by
  // design, since it takes a cursor resting on the edge to reveal it. The
  // overlay's click-through state is otherwise only recomputed on mousemove,
  // which would leave the freshly revealed dock visible but dead to clicks
  // until the user jiggled the mouse.
  useEffect(() => {
    recheckClickThrough()
  }, [hidden])

  return hidden
}
