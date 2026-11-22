import type { NotesStore } from '../notesStore'
import type { SyncDocument, SyncStatus } from '../types'
import type { DriveClient, DriveFile } from './driveClient'
import { merge } from './merge'

const SYNC_FILE_NAME = 'aeronotes-sync.json'
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

/** The platform's image files, as the sync uploads and downloads them. */
export interface SyncImageStore {
  list(): Promise<Set<string>>
  read(name: string): Promise<Uint8Array>
  write(name: string, bytes: Uint8Array): Promise<void>
}

/** What a platform (desktop main process, Android WebView) plugs into the engine. */
export interface SyncHost {
  store: NotesStore
  drive: DriveClient
  images: SyncImageStore
  /** Sync is configured and an account is signed in right now. */
  isSignedIn(): boolean
  /** Status to show when no sync runs: unconfigured, signed-out, idle (+ email) or a setup error. */
  restingStatus(): Partial<SyncStatus>
  /** Email shown once a sync succeeds. */
  email(): string | undefined
  /** Every status change, to repaint the UI. */
  onStatus(status: SyncStatus): void
  /** The merge changed local data: notes, folders, templates must be re-read. */
  onRemoteApplied(changes: { changedNoteIds: string[]; deletedNoteIds: string[] }): void
  /** Wait after a local change before syncing it (changes typed in a row share one pass). */
  mutationDebounceMs: number
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

/**
 * One machine's side of the Google Drive sync, shared by the desktop and the
 * phone: pulls the cloud document, merges it with the local store, applies
 * and pushes what changed, then exchanges the referenced images. It owns the
 * pass scheduling (one at a time, debounce after edits) and the edit lock;
 * the host owns auth, storage and UI.
 */
export class SyncEngine {
  private status: SyncStatus = { state: 'unconfigured' }
  private isSyncing = false
  private queuedWhileSyncing = false
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private editLockTimer: ReturnType<typeof setTimeout> | null = null
  /** When the current edit lock was taken: only a sync started after it may release it. */
  private editLockedAt = 0

  constructor(private readonly host: SyncHost) {
    host.store.setOnMutated(() => this.scheduleDebouncedSync())
  }

  getStatus(): SyncStatus {
    return this.status
  }

  /** Surfaces an auth-flow failure (e.g. sign-in cancelled) in the status UI. */
  reportError(message: string): void {
    this.setStatus({ state: 'error', error: message })
  }

  /** Recomputes the resting status after sign-in/out. */
  refreshAuthStatus(): void {
    // Signed out (or never configured): there is nothing to wait for.
    if (!this.host.isSignedIn()) this.unlockEditing()
    this.setStatus(this.host.restingStatus())
  }

  /**
   * Makes notes read-only and syncs right away; the lock lifts when that sync
   * ends (success or failure) or after {@link EDIT_LOCK_TIMEOUT_MS}. Call it
   * whenever this machine may have missed remote changes: launch, wake, return
   * to the foreground. Editing a stale copy first would bump its `updatedAt`
   * and let it win the merge over newer changes made elsewhere.
   */
  lockEditingUntilSynced(): void {
    if (!this.host.isSignedIn()) return
    this.editLockedAt = Date.now()
    if (this.editLockTimer) clearTimeout(this.editLockTimer)
    this.editLockTimer = setTimeout(() => this.unlockEditing(), EDIT_LOCK_TIMEOUT_MS)
    this.setStatus({ editingLocked: true })
    if (this.isSyncing) this.queuedWhileSyncing = true
    else void this.syncNow()
  }

  /** Drops a pending debounced pass (quitting: the next launch catches up). */
  cancelPending(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = null
  }

  async syncNow(): Promise<void> {
    if (this.status.state === 'unconfigured' || !this.host.isSignedIn()) return
    if (this.isSyncing) {
      // A change landed mid-sync: run once more when this pass finishes.
      this.queuedWhileSyncing = true
      return
    }
    this.isSyncing = true
    const startedAt = Date.now()
    this.setStatus({ state: 'syncing', error: undefined })

    try {
      const { drive, store } = this.host
      const driveFiles = await drive.listAppDataFiles()
      const syncFile = driveFiles.find((file) => file.name === SYNC_FILE_NAME)
      const localDoc = store.toSyncDocument()

      let uploadNeeded: boolean
      let documentToUpload: SyncDocument

      if (syncFile) {
        const remoteDoc = await drive.downloadJson<SyncDocument>(syncFile.id)
        const { merged, localChanged, remoteChanged } = merge(localDoc, remoteDoc)
        documentToUpload = merged
        uploadNeeded = remoteChanged
        if (localChanged) this.host.onRemoteApplied(store.applyRemote(merged))
      } else {
        documentToUpload = localDoc
        uploadNeeded = true
      }

      if (uploadNeeded) {
        const json = JSON.stringify(documentToUpload)
        if (syncFile) await drive.updateFile(syncFile.id, json, 'application/json')
        else await drive.createFile(SYNC_FILE_NAME, json, 'application/json')
      }

      await this.syncImages(driveFiles, documentToUpload)

      console.log(
        `[sync] completed — ${Object.keys(documentToUpload.notes).length} notes, ` +
          `${Object.keys(documentToUpload.folders).length} folders${uploadNeeded ? ', uploaded' : ''}`
      )
      this.setStatus({ state: 'idle', lastSyncAt: Date.now(), email: this.host.email() ?? this.status.email })
    } catch (error) {
      // Full error in the console — the status line only has room for a
      // summary and truncation was hiding the actual cause.
      console.error('[sync]', error)
      this.setStatus({ state: 'error', error: error instanceof Error ? error.message : String(error) })
    } finally {
      this.isSyncing = false
      // A pass that began before the lock may have read the cloud before the
      // other machine's changes: it releases nothing, the queued pass will.
      if (startedAt >= this.editLockedAt) this.unlockEditing()
      if (this.queuedWhileSyncing) {
        this.queuedWhileSyncing = false
        // Someone is waiting to edit: no debounce for the pass that unlocks them.
        if (this.status.editingLocked) void this.syncNow()
        else this.scheduleDebouncedSync()
      }
    }
  }

  private async syncImages(driveFiles: DriveFile[], doc: SyncDocument): Promise<void> {
    const { drive, images } = this.host
    const localNames = await images.list()
    const remoteByName = new Map(driveFiles.filter((f) => f.name !== SYNC_FILE_NAME).map((f) => [f.name, f]))

    for (const name of referencedImageNames(doc)) {
      const extension = name.split('.').pop()?.toLowerCase() ?? ''
      const mimeType = IMAGE_MIME_BY_EXT[extension] ?? 'application/octet-stream'
      const remote = remoteByName.get(name)
      if (localNames.has(name) && !remote) {
        await drive.createFile(name, await images.read(name), mimeType)
      } else if (!localNames.has(name) && remote) {
        await images.write(name, await drive.downloadBinary(remote.id))
      }
    }
  }

  private scheduleDebouncedSync(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      void this.syncNow()
    }, this.host.mutationDebounceMs)
  }

  private unlockEditing(): void {
    if (this.editLockTimer) clearTimeout(this.editLockTimer)
    this.editLockTimer = null
    if (this.status.editingLocked) this.setStatus({ editingLocked: false })
  }

  private setStatus(patch: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...patch }
    this.host.onStatus(this.status)
  }
}
