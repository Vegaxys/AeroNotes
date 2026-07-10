import { useEffect, useRef } from 'react'

/**
 * Margin added around each measured element's bounding rect. Elements like the
 * dock's collapse tab intentionally poke outside their own box (negative offset),
 * so the hit-test box must extend beyond it or part of them becomes unclickable.
 */
const HIT_TEST_MARGIN_PX = 12

/**
 * Toggles the overlay window's click-through state based on whether the cursor
 * is over any element marked `data-mouse-live`. Elements opt in per-state (the
 * dock root only marks itself while expanded; the collapse tab is always live),
 * so a collapsed dock's gradient strip never swallows clicks meant for what's
 * behind it.
 */
export function useClickThroughHitTest(): void {
  const isIgnoringRef = useRef(true)

  useEffect(() => {
    function handleMouseMove(event: MouseEvent): void {
      const liveElements = document.querySelectorAll<HTMLElement>('[data-mouse-live]')
      const isInsideAnyLiveRegion = Array.from(liveElements).some((element) => {
        const rect = element.getBoundingClientRect()
        return (
          event.clientX >= rect.left - HIT_TEST_MARGIN_PX &&
          event.clientX <= rect.right + HIT_TEST_MARGIN_PX &&
          event.clientY >= rect.top - HIT_TEST_MARGIN_PX &&
          event.clientY <= rect.bottom + HIT_TEST_MARGIN_PX
        )
      })

      const shouldIgnore = !isInsideAnyLiveRegion
      if (shouldIgnore !== isIgnoringRef.current) {
        isIgnoringRef.current = shouldIgnore
        window.aeronotes.setOverlayIgnoreMouse(shouldIgnore)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
}
