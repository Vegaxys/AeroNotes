import type { Folder, SyncDocument, SyncedNote, SyncTombstones, Template } from './types'

/** Tombstones older than this are pruned — any machine offline longer re-uploads at worst. */
const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000

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
