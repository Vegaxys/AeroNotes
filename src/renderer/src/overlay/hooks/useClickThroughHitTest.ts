import { useEffect } from 'react'

/**
 * Margin added around each measured element's bounding rect. Elements like the
 * dock's collapse tab intentionally poke outside their own box (negative offset),
 * so the hit-test box must extend beyond it or part of them becomes unclickable.
 */
const HIT_TEST_MARGIN_PX = 12

/**
 * Module scope, not a ref: `recheckClickThrough` is called from outside the
 * component and must see the same state. There is exactly one overlay window
 * per renderer, so a single pair of values is the whole picture.
 */
let lastCursor: { x: number; y: number } | null = null
let isIgnoring = true

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

  const shouldIgnore = !isInsideAnyLiveRegion
  if (shouldIgnore === isIgnoring) return
  isIgnoring = shouldIgnore
  window.aeronotes.setOverlayIgnoreMouse(shouldIgnore)
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
 */
export function useClickThroughHitTest(): void {
  useEffect(() => {
    function handleMouseMove(event: MouseEvent): void {
      lastCursor = { x: event.clientX, y: event.clientY }
      applyHitTest(event.clientX, event.clientY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
}
