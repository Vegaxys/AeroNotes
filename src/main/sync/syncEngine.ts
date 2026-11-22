import { join, extname } from 'path'
import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import { app, BrowserWindow, powerMonitor } from 'electron'
import type { SyncDocument, SyncStatus } from '@shared/types'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { merge } from '@shared/syncMerge'
import { getImagesDir } from '../protocols/imageProtocol'
import { notesStore } from '../store/notesStore'
import { broadcastFolders, broadcastNotes } from '../ipc/notesHandlers'
import { destroyNoteWindow } from '../windows/noteWindowRegistry'
import { createFile, downloadBinary, downloadJson, listAppDataFiles, updateFile } from './driveClient'
import { isSignedIn } from './googleAuth'
import { isSyncConfigured } from './oauthConfig'
import { canStoreTokens, loadEmail } from './tokenStore'

const SYNC_FILE_NAME = 'aeronotes-sync.json'
const MUTATION_DEBOUNCE_MS = 20_000
const PERIODIC_SYNC_MS = 5 * 60_000
/**
 * Longest wait before notes become editable anyway: a hung request must not
 * lock the user out. An offline machine fails fast and unlocks sooner.
 */
const EDIT_LOCK_TIMEOUT_MS = 10_000

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml'
}

let status: SyncStatus = { state: 'unconfigured' }
let isSyncing = false
let queuedWhileSyncing = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let editLockTimer: ReturnType<typeof setTimeout> | null = null
/** When the current edit lock was taken: only a sync started after it may release it. */
let editLockedAt = 0

function setStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch }
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(IPC_CHANNELS.SYNC_STATUS_CHANGED, status)
  })
}

export function getSyncStatus(): SyncStatus {
  return status
}

/** Surfaces an auth-flow failure (e.g. sign-in cancelled/timeout) in the status UI. */
export function reportSyncError(message: string): void {
  setStatus({ state: 'error', error: message })
}

/** Every image filename referenced by any note in the document. */
function referencedImageNames(doc: SyncDocument): Set<string> {
  const names = new Set<string>()
  const json = JSON.stringify(doc.notes)
  for (const match of json.matchAll(/aeronotes-image:\/\/([\w][\w.-]*)/g)) {
    names.add(match[1])
  }
  return names
}

async function syncImages(driveFiles: { id: string; name: string }[], doc: SyncDocument): Promise<void> {
  const imagesDir = getImagesDir()
  await mkdir(imagesDir, { recursive: true })
  const localNames = new Set(await readdir(imagesDir))
  const remoteByName = new Map(driveFiles.filter((f) => f.name !== SYNC_FILE_NAME).map((f) => [f.name, f]))

  for (const name of referencedImageNames(doc)) {
    const extension = extname(name).slice(1).toLowerCase()
    const mimeType = IMAGE_MIME_BY_EXT[extension] ?? 'application/octet-stream'
    const remote = remoteByName.get(name)
    if (localNames.has(name) && !remote) {
      await createFile(name, await readFile(join(imagesDir, name)), mimeType)
    } else if (!localNames.has(name) && remote) {
      await writeFile(join(imagesDir, name), await downloadBinary(remote.id))
    }
  }
}

export async function syncNow(): Promise<void> {
  if (status.state === 'unconfigured' || !isSignedIn()) return
  if (isSyncing) {
    // A change landed mid-sync: run once more when this pass finishes.
    queuedWhileSyncing = true
    return
  }
  isSyncing = true
  const startedAt = Date.now()
  setStatus({ state: 'syncing', error: undefined })

  try {
    const driveFiles = await listAppDataFiles()
    const syncFile = driveFiles.find((file) => file.name === SYNC_FILE_NAME)
    const localDoc = notesStore.toSyncDocument()

    let uploadNeeded: boolean
    let documentToUpload: SyncDocument

    if (syncFile) {
      const remoteDoc = await downloadJson<SyncDocument>(syncFile.id)
      const { merged, localChanged, remoteChanged } = merge(localDoc, remoteDoc)
      documentToUpload = merged
      uploadNeeded = remoteChanged

      if (localChanged) {
        const { changedNoteIds, deletedNoteIds } = notesStore.applyRemote(merged)
        deletedNoteIds.forEach(destroyNoteWindow)
        broadcastNotes()
        broadcastFolders()
        if (changedNoteIds.length > 0) {
          BrowserWindow.getAllWindows().forEach((window) => {
            window.webContents.send(IPC_CHANNELS.NOTES_REMOTE_APPLIED, changedNoteIds)
          })
        }
      }
    } else {
      documentToUpload = localDoc
      uploadNeeded = true
    }

    if (uploadNeeded) {
      const json = JSON.stringify(documentToUpload)
      if (syncFile) {
        await updateFile(syncFile.id, json, 'application/json')
      } else {
        await createFile(SYNC_FILE_NAME, json, 'application/json')
      }
    }

    await syncImages(driveFiles, documentToUpload)

    console.log(
      `[sync] completed — ${Object.keys(documentToUpload.notes).length} notes, ` +
        `${Object.keys(documentToUpload.folders).length} folders${uploadNeeded ? ', uploaded' : ''}`
    )
    setStatus({ state: 'idle', lastSyncAt: Date.now(), email: loadEmail() ?? status.email })
  } catch (error) {
    // Full error in the main-process console — the status line only has room
    // for a summary and truncation was hiding the actual cause.
    console.error('[sync]', error)
    setStatus({ state: 'error', error: error instanceof Error ? error.message : String(error) })
  } finally {
    isSyncing = false
    // A pass that began before the lock may have read the cloud before the
    // other machine's changes: it releases nothing, the queued pass will.
    if (startedAt >= editLockedAt) unlockEditing()
    if (queuedWhileSyncing) {
      queuedWhileSyncing = false
      // Someone is waiting to edit: no debounce for the pass that unlocks them.
      if (status.editingLocked) void syncNow()
      else scheduleDebouncedSync()
    }
  }
}

function scheduleDebouncedSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void syncNow()
  }, MUTATION_DEBOUNCE_MS)
}

function unlockEditing(): void {
  if (editLockTimer) clearTimeout(editLockTimer)
  editLockTimer = null
  if (status.editingLocked) setStatus({ editingLocked: false })
}

/**
 * Makes notes read-only and syncs right away; the lock lifts when that sync
 * ends (success or failure) or after {@link EDIT_LOCK_TIMEOUT_MS}. Called
 * whenever this machine may have missed remote changes: launch, wake.
 */
function lockEditingUntilSynced(): void {
  if (!isSyncConfigured() || !isSignedIn()) return
  editLockedAt = Date.now()
  if (editLockTimer) clearTimeout(editLockTimer)
  editLockTimer = setTimeout(unlockEditing, EDIT_LOCK_TIMEOUT_MS)
  setStatus({ editingLocked: true })
  if (isSyncing) queuedWhileSyncing = true
  else void syncNow()
}

/** Recomputes the resting status after sign-in/out. */
export function refreshAuthStatus(): void {
  // Signed out (or never configured): there is nothing to wait for.
  if (!isSyncConfigured() || !isSignedIn()) unlockEditing()
  if (!isSyncConfigured()) {
    setStatus({ state: 'unconfigured', email: undefined })
  } else if (!canStoreTokens()) {
    setStatus({ state: 'error', error: 'OS credential encryption unavailable', email: undefined })
  } else if (isSignedIn()) {
    setStatus({ state: 'idle', email: loadEmail() ?? undefined })
  } else {
    setStatus({ state: 'signed-out', email: undefined, lastSyncAt: undefined })
  }
}

export function initSync(): void {
  refreshAuthStatus()
  console.log(
    `[sync] init — configured=${isSyncConfigured()} signedIn=${isSignedIn()} state=${status.state}`
  )
  notesStore.setOnMutated(scheduleDebouncedSync)
  setInterval(() => void syncNow(), PERIODIC_SYNC_MS)
  lockEditingUntilSynced()
  // The app lives in the tray for days: waking the PC is the "launch" that
  // matters, other machines may have edited notes meanwhile.
  powerMonitor.on('resume', lockEditingUntilSynced)
  // Best effort on quit: flush the local store; the cloud catches up next launch.
  app.on('before-quit', () => {
    if (debounceTimer) clearTimeout(debounceTimer)
  })
}
