import { useRef } from 'react'
import { Dock } from '@renderer/dock/Dock'
import { useClickThroughHitTest } from './hooks/useClickThroughHitTest'

export function OverlayApp(): React.JSX.Element {
  const dockRef = useRef<HTMLDivElement>(null)

  useClickThroughHitTest([dockRef])

  return (
    <div className="fixed inset-0">
      <Dock ref={dockRef} />
    </div>
  )
}
