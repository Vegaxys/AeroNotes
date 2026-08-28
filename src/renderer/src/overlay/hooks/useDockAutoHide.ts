import { useEffect, useState } from 'react'
import { useSettingsStore } from '@renderer/state/useSettingsStore'

/** How close to the screen edge the cursor must come to reveal the dock. */
const REVEAL_EDGE_PX = 4
/** Grace period before hiding again, so a quick overshoot doesn't close it. */
const HIDE_DELAY_MS = 500

/**
 * Taskbar-style auto-hide (opt-in setting): the dock retracts entirely and
 * comes back when the cursor reaches its screen edge.
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
    const cancelHide = (): void => {
      if (hideTimer) clearTimeout(hideTimer)
      hideTimer = null
    }

    function handleMouseMove(event: MouseEvent): void {
      const rect = document.querySelector('[data-dock-root]')?.getBoundingClientRect()
      const overDock = rect !== undefined && event.clientX >= rect.left && event.clientX <= rect.right
      const atScreenEdge =
        dockSide === 'right'
          ? event.clientX >= window.innerWidth - REVEAL_EDGE_PX
          : event.clientX <= REVEAL_EDGE_PX

      if (atScreenEdge || overDock) {
        cancelHide()
        setHidden(false)
        return
      }
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
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [dockAutoHide, dockSide])

  return hidden
}
