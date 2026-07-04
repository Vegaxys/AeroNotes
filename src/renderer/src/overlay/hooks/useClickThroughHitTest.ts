import { useEffect, useRef } from 'react'

/**
 * Margin added around each measured element's bounding rect. Elements like the
 * dock's collapse tab intentionally poke outside their own box (negative offset),
 * so the hit-test box must extend beyond it or part of them becomes unclickable.
 */
const HIT_TEST_MARGIN_PX = 16

export function useClickThroughHitTest(
  liveRegionRefs: React.RefObject<HTMLElement | null>[]
): void {
  const isIgnoringRef = useRef(true)

  useEffect(() => {
    function handleMouseMove(event: MouseEvent): void {
      const isInsideAnyLiveRegion = liveRegionRefs.some((ref) => {
        const rect = ref.current?.getBoundingClientRect()
        return (
          !!rect &&
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
  }, [liveRegionRefs])
}
