import { useEffect, useState } from 'react'

/**
 * True while the main process holds notes read-only until this session's first
 * cloud sync lands (see `SyncStatus.editingLocked`).
 */
export function useEditingLocked(): boolean {
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    // Subscribe before asking: a change pushed while the request is in flight
    // must win over the (older) answer to that request.
    let pushed = false
    const unsubscribe = window.aeronotes.onSyncStatusChanged((status) => {
      pushed = true
      setLocked(Boolean(status.editingLocked))
    })
    void window.aeronotes.getSyncStatus().then((status) => {
      if (!pushed) setLocked(Boolean(status.editingLocked))
    })
    return unsubscribe
  }, [])

  return locked
}
