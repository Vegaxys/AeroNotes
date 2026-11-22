import { useEffect, useState } from 'react'
import type { SyncStatus } from '@shared/types'

/** The sync engine's live status, pushed by the platform (main process or mobile runtime). */
export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({ state: 'unconfigured' })

  useEffect(() => {
    // Subscribe before asking: a change pushed while the request is in flight
    // must win over the (older) answer to that request.
    let pushed = false
    const unsubscribe = window.aeronotes.onSyncStatusChanged((next) => {
      pushed = true
      setStatus(next)
    })
    void window.aeronotes.getSyncStatus().then((next) => {
      if (!pushed) setStatus(next)
    })
    return unsubscribe
  }, [])

  return status
}
