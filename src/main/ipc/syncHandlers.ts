import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { signIn, signOut } from '../sync/googleAuth'
import { getSyncStatus, refreshAuthStatus, reportSyncError, syncNow } from '../sync/syncEngine'

export function registerSyncHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SYNC_STATUS_GET, () => getSyncStatus())

  ipcMain.handle(IPC_CHANNELS.SYNC_SIGN_IN, async () => {
    try {
      await signIn()
      refreshAuthStatus()
      void syncNow()
    } catch (error) {
      reportSyncError(error instanceof Error ? error.message : String(error))
    }
  })

  ipcMain.handle(IPC_CHANNELS.SYNC_SIGN_OUT, async () => {
    await signOut()
    refreshAuthStatus()
  })

  ipcMain.on(IPC_CHANNELS.SYNC_NOW, () => {
    void syncNow()
  })
}
