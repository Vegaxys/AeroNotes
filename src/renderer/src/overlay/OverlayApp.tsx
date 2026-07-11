import { Dock } from '@renderer/dock/Dock'
import { useSettingsStore } from '@renderer/state/useSettingsStore'
import { useClickThroughHitTest } from './hooks/useClickThroughHitTest'

export function OverlayApp(): React.JSX.Element {
  useClickThroughHitTest()
  // Keyed remount on language change: t() calls are resolved at render time,
  // so remounting the tree is what repaints every label.
  const locale = useSettingsStore((s) => s.locale)

  return (
    <div className="fixed inset-0">
      <Dock key={locale} />
    </div>
  )
}
