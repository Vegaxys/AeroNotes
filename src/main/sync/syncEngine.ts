import { join, extname } from 'path'
import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import { app, BrowserWindow } from 'electron'
import type {
  Folder,
  SyncDocument,
  SyncedNote,
  SyncStatus,
  SyncTombstones,
  Template
} from '@shared/types'
import { IPC_CHANNELS } from '@shared/ipcChannels'
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
const STARTUP_SYNC_DELAY_MS = 3_000
/** Tombstones older than this are pruned — any machine offline longer re-uploads at worst. */
const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000

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

interface MergeResult {
  merged: SyncDocument
  /** The merged state differs from what this machine had — apply it locally. */
  localChanged: boolean
  /** The merged state differs from the cloud copy — upload it. */
  remoteChanged: boolean
}

function mergeTombstones(local: SyncTombstones, remote: SyncTombstones): SyncTombstones {
  const cutoff = Date.now() - TOMBSTONE_TTL_MS
  const mergeSide = (a: Record<string, number>, b: Record<string, number>): Record<string, number> => {
    const out: Record<string, number> = {}
    for (const [id, ts] of [...Object.entries(a), ...Object.entries(b)]) {
      if (ts >= cutoff && (out[id] === undefined || ts > out[id])) out[id] = ts
    }
    return out
  }
  return {
    notes: mergeSide(local.notes, remote.notes),
    folders: mergeSide(local.folders, remote.folders),
    // Docs uploaded before 0.4 have no template tombstones.
    templates: mergeSide(local.templates ?? {}, remote.templates ?? {})
  }
}

/**
 * Per-entity last-writer-wins on updatedAt; a tombstone wins over any version
 * older than it. Never invents data — but never silently loses a note either:
 * a note that survives while its folder was deleted gets its folder revived.
 */
export function merge(local: SyncDocument, remote: SyncDocument): MergeResult {
  const tombstones = mergeTombstones(local.tombstones, remote.tombstones)

  const pickNewer = <T extends { updatedAt: number }>(a?: T, b?: T): T | undefined => {
    if (!a) return b
    if (!b) return a
    return b.updatedAt > a.updatedAt ? b : a
  }

  const notes: Record<string, SyncedNote> = {}
  for (const id of new Set([...Object.keys(local.notes), ...Object.keys(remote.notes)])) {
    const winner = pickNewer(local.notes[id], remote.notes[id])
    if (winner && !(tombstones.notes[id] >= winner.updatedAt)) {
      notes[id] = winner
      delete tombstones.notes[id]
    }
  }

  const folders: Record<string, Folder> = {}
  for (const id of new Set([...Object.keys(local.folders), ...Object.keys(remote.folders)])) {
    const winner = pickNewer(local.folders[id], remote.folders[id])
    if (winner && !(tombstones.folders[id] >= winner.updatedAt)) {
      folders[id] = winner
      delete tombstones.folders[id]
    }
  }

  // A surviving note must have a folder: revive it from either side if its
  // folder lost the tombstone race (losing the note would be worse).
  for (const note of Object.values(notes)) {
    if (!folders[note.folderId]) {
      const revived = local.folders[note.folderId] ?? remote.folders[note.folderId]
      if (revived) {
        folders[revived.id] = revived
        delete tombstones.folders[revived.id]
      }
    }
  }

  const templates: Record<string, Template> = {}
  const localTemplates = local.templates ?? {}
  const remoteTemplates = remote.templates ?? {}
  for (const id of new Set([...Object.keys(localTemplates), ...Object.keys(remoteTemplates)])) {
    const winner = pickNewer(localTemplates[id], remoteTemplates[id])
    if (winner && !(tombstones.templates[id] >= winner.updatedAt)) {
      templates[id] = winner
      delete tombstones.templates[id]
    }
  }

  const merged: SyncDocument = { schemaVersion: 1, notes, folders, templates, tombstones }

  const viewOf = (doc: SyncDocument): string =>
    JSON.stringify([
      Object.values(doc.notes)
        .map((n) => `${n.id}:${n.updatedAt}`)
        .sort(),
      Object.values(doc.folders)
        .map((f) => `${f.id}:${f.updatedAt}`)
        .sort(),
      Object.values(doc.templates ?? {})
        .map((tpl) => `${tpl.id}:${tpl.updatedAt}`)
        .sort()
    ])

  return {
    merged,
    localChanged: viewOf(merged) !== viewOf(local),
    remoteChanged: viewOf(merged) !== viewOf(remote)
  }
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
    if (queuedWhileSyncing) {
      queuedWhileSyncing = false
      scheduleDebouncedSync()
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

/** Recomputes the resting status after sign-in/out. */
export function refreshAuthStatus(): void {
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
  if (isSyncConfigured() && isSignedIn()) {
    setTimeout(() => void syncNow(), STARTUP_SYNC_DELAY_MS)
  }
  // Best effort on quit: flush the local store; the cloud catches up next launch.
  app.on('before-quit', () => {
    if (debounceTimer) clearTimeout(debounceTimer)
  })
}
