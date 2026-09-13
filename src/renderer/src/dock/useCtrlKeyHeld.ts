import { useEffect, useState } from 'react'

/**
 * Whether Ctrl is currently held, as seen from the overlay window.
 *
 * The overlay is created `focusable: false`, so it normally holds no keyboard
 * focus and plain `keydown`/`keyup` never reach it — reading `ctrlKey` off the
 * mouse events we DO get is what makes this work at all. Chromium keeps
 * forwarding move messages to the renderer even while the window is
 * click-through (`setIgnoreMouseEvents(…, { forward: true })`), and every one
 * of them carries the live modifier state.
 *
 * The key listeners are registered anyway: while an input has escalated the
 * window to focusable (search field, inline rename), they answer without the
 * user having to jiggle the mouse first.
 */
export function useCtrlKeyHeld(): boolean {
  const [held, setHeld] = useState(false)

  useEffect(() => {
    const sync = (event: MouseEvent | KeyboardEvent): void => setHeld(event.ctrlKey)
    // Ctrl released while another app has the focus never reaches us; a blur
    // (or the cursor leaving the window) is the only hint we get.
    const release = (): void => setHeld(false)

    window.addEventListener('mousemove', sync)
    window.addEventListener('mousedown', sync)
    window.addEventListener('keydown', sync)
    window.addEventListener('keyup', sync)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('mousemove', sync)
      window.removeEventListener('mousedown', sync)
      window.removeEventListener('keydown', sync)
      window.removeEventListener('keyup', sync)
      window.removeEventListener('blur', release)
    }
  }, [])

  return held
}
