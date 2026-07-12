import { useEffect } from 'react'
import { Dock } from '@renderer/dock/Dock'
import { useSettingsStore } from '@renderer/state/useSettingsStore'
import { useClickThroughHitTest } from './hooks/useClickThroughHitTest'

export function OverlayApp(): React.JSX.Element {
  useClickThroughHitTest()

  // Click-dragging the dock's empty chrome would start a native drag of
  // whatever got selected, showing a ghost of the app under the cursor. Only
  // elements explicitly marked draggable (card headers, block grips) may
  // start a drag.
  useEffect(() => {
    function handleDragStart(event: DragEvent): void {
      if (event.target instanceof Element && event.target.closest('[draggable="true"]')) return
      event.preventDefault()
    }
    document.addEventListener('dragstart', handleDragStart)
    return () => document.removeEventListener('dragstart', handleDragStart)
  }, [])
  // Keyed remount on language change: t() calls are resolved at render time,
  // so remounting the tree is what repaints every label.
  const locale = useSettingsStore((s) => s.locale)

  return (
    <div className="fixed inset-0">
      <Dock key={locale} />
    </div>
  )
}
