import { useEffect } from 'react'

/**
 * The overlay window is created non-focusable so clicking the dock never steals
 * foreground from a fullscreen/borderless video behind it (which would drop the
 * video's window behind everything and make it "disappear"). But a
 * non-focusable window receives no keystrokes, so text fields — the search box,
 * folder/title rename inputs, the embedded note editor — would be unusable.
 *
 * This bridges the gap: while any editable element needs the keyboard, the
 * window is escalated to focusable (and activated so keys route to it); once
 * focus leaves every editable element, it drops back to non-focusable. Casual
 * dock interaction (buttons, menus, scrolling, dragging) never escalates, so it
 * never disturbs the video — only deliberate typing briefly takes focus.
 *
 * The escalation MUST be driven by pointerdown, not by focus events: a window
 * Chromium refuses to activate never gives its page focus, so clicking an input
 * produces no `focusin` at all — waiting for one would deadlock (and an
 * inactive window draws no caret, which is what "the search bar does nothing"
 * looked like). So: escalate first, then place the focus ourselves.
 */
function closestEditable(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null
  const editable = target.closest<HTMLElement>('input, textarea, [contenteditable=""], [contenteditable="true"]')
  return editable && !editable.matches('input[type="color"]') ? editable : null
}

function isEditable(target: EventTarget | null): boolean {
  return closestEditable(target) !== null
}

export function useKeyboardFocusEscalation(): void {
  useEffect(() => {
    async function handlePointerDown(event: PointerEvent): Promise<void> {
      const editable = closestEditable(event.target)
      if (!editable) return
      // Capture phase + await: the window is only activatable once the main
      // process answers, so the click that started this can't have focused
      // anything by itself.
      await window.aeronotes.setOverlayFocusable(true)
      if (editable.isConnected && document.activeElement !== editable) {
        editable.focus()
        // focus() alone leaves the caret at offset 0 on an <input>; put it at
        // the end, like a regular click on an unfocused field would.
        if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
          const end = editable.value.length
          editable.setSelectionRange(end, end)
        }
      }
    }

    function handleFocusIn(event: FocusEvent): void {
      // Programmatic focus (autoFocus on the rename input, a freshly mounted
      // editor) still needs the escalation.
      if (isEditable(event.target)) void window.aeronotes.setOverlayFocusable(true)
    }

    function handleFocusOut(): void {
      // focusout fires before the next element receives focus, so defer the
      // check: only de-escalate once nothing editable is focused anymore.
      setTimeout(() => {
        if (!isEditable(document.activeElement)) void window.aeronotes.setOverlayFocusable(false)
      }, 0)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [])
}
