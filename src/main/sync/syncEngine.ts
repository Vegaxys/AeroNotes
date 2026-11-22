import { join } from 'path'
import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import { app, BrowserWindow, powerMonitor } from 'electron'
import type { SyncStatus } from '@shared/types'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { createDriveClient } from '@shared/sync/driveClient'
import { SyncEngine } from '@shared/sync/syncEngine'
import { getImagesDir } from '../protocols/imageProtocol'
import { notesStore } from '../store/notesStore'
import { broadcastFolders, broadcastNotes, broadcastTemplates } from '../ipc/notesHandlers'
import { destroyNoteWindow } from '../windows/noteWindowRegistry'
import { getAccessToken, invalidateAccessToken, isSignedIn } from './googleAuth'
import { isSyncConfigured } from './oauthConfig'
import { canStoreTokens, loadEmail } from './tokenStore'

/** Edits typed in a row share one pass; the desktop is rarely closed abruptly. */
const MUTATION_DEBOUNCE_MS = 20_000
const PERIODIC_SYNC_MS = 5 * 60_000

function sendToAllWindows(channel: string, payload: unknown): void {
  BrowserWindow.getAllWindows().forEach((window) => window.webContents.send(channel, payload))
}

const engine = new SyncEngine({
  store: notesStore,
  drive: createDriveClient({ getAccessToken, invalidateAccessToken }),
  images: {
    async list() {
      await mkdir(getImagesDir(), { recursive: true })
      return new Set(await readdir(getImagesDir()))
    },
    read: (name) => readFile(join(getImagesDir(), name)),
    async write(name, bytes) {
      await mkdir(getImagesDir(), { recursive: true })
      await writeFile(join(getImagesDir(), name), bytes)
    }
  },
  isSignedIn: () => isSyncConfigured() && isSignedIn(),
  restingStatus: (): Partial<SyncStatus> => {
    if (!isSyncConfigured()) return { state: 'unconfigured', email: undefined }
    if (!canStoreTokens()) return { state: 'error', error: 'OS credential encryption unavailable', email: undefined }
    if (isSignedIn()) return { state: 'idle', email: loadEmail() ?? undefined }
    return { state: 'signed-out', email: undefined, lastSyncAt: undefined }
  },
  email: () => loadEmail() ?? undefined,
  onStatus: (status) => sendToAllWindows(IPC_CHANNELS.SYNC_STATUS_CHANGED, status),
  onRemoteApplied: ({ changedNoteIds, deletedNoteIds }) => {
    deletedNoteIds.forEach(destroyNoteWindow)
    broadcastNotes()
    broadcastFolders()
    broadcastTemplates()
    if (changedNoteIds.length > 0) sendToAllWindows(IPC_CHANNELS.NOTES_REMOTE_APPLIED, changedNoteIds)
  },
  mutationDebounceMs: MUTATION_DEBOUNCE_MS
})

export const getSyncStatus = (): SyncStatus => engine.getStatus()
export const reportSyncError = (message: string): void => engine.reportError(message)
export const refreshAuthStatus = (): void => engine.refreshAuthStatus()
export const syncNow = (): Promise<void> => engine.syncNow()

export function initSync(): void {
  engine.refreshAuthStatus()
  console.log(
    `[sync] init — configured=${isSyncConfigured()} signedIn=${isSignedIn()} state=${engine.getStatus().state}`
  )
  setInterval(() => void engine.syncNow(), PERIODIC_SYNC_MS)
  engine.lockEditingUntilSynced()
  // The app lives in the tray for days: waking the PC is the "launch" that
  // matters, other machines may have edited notes meanwhile.
  powerMonitor.on('resume', () => engine.lockEditingUntilSynced())
  // Best effort on quit: flush the local store; the cloud catches up next launch.
  app.on('before-quit', () => engine.cancelPending())
}
