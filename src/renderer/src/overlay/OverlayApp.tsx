import { Dock } from '@renderer/dock/Dock'
import { useClickThroughHitTest } from './hooks/useClickThroughHitTest'

export function OverlayApp(): React.JSX.Element {
  useClickThroughHitTest()

  return (
    <div className="fixed inset-0">
      <Dock />
    </div>
  )
}
