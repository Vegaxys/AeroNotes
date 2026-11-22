import { useSyncStatus } from './useSyncStatus'

/**
 * True while notes are held read-only until this session's first cloud sync
 * lands (see `SyncStatus.editingLocked`).
 */
export function useEditingLocked(): boolean {
  return Boolean(useSyncStatus().editingLocked)
}
