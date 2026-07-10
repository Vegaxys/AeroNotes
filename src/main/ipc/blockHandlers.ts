import { BrowserWindow, ipcMain } from 'electron'
import type { BlockTransferPayload } from '@shared/types'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { findNoteWindowAt, getNoteWindow } from '../windows/noteWindowRegistry'

/**
 * Cross-window block transfer. The drag itself lives in the source window's
 * renderer (mouse capture keeps feeding it mousemove/mouseup with screen
 * coordinates even outside the window); main only resolves which note window
 * is under the cursor and relays hover/drop events to it, then tells the
 * source to delete its block once the target confirms the insertion.
 */
export function registerBlockHandlers(): void {
  /** Last window each in-flight drag hovered, so it can be told to hide its indicator. */
  const lastDragTarget = new Map<string, BrowserWindow>()

  function clearPreviousTarget(sourceNoteId: string, current: BrowserWindow | null): void {
    const previous = lastDragTarget.get(sourceNoteId)
    if (previous && previous !== current && !previous.isDestroyed()) {
      previous.webContents.send(IPC_CHANNELS.BLOCK_DRAG_LEAVE)
    }
  }

  ipcMain.on(
    IPC_CHANNELS.BLOCK_DRAG_MOVE,
    (_event, sourceNoteId: string, screenX: number, screenY: number) => {
      const target = findNoteWindowAt(screenX, screenY, sourceNoteId)
      clearPreviousTarget(sourceNoteId, target)
      if (target) {
        const bounds = target.getContentBounds()
        target.webContents.send(IPC_CHANNELS.BLOCK_DRAG_OVER, screenX - bounds.x, screenY - bounds.y)
        lastDragTarget.set(sourceNoteId, target)
      } else {
        lastDragTarget.delete(sourceNoteId)
      }
    }
  )

  ipcMain.on(IPC_CHANNELS.BLOCK_DRAG_CANCEL, (_event, sourceNoteId: string) => {
    clearPreviousTarget(sourceNoteId, null)
    lastDragTarget.delete(sourceNoteId)
  })

  ipcMain.on(
    IPC_CHANNELS.BLOCK_DRAG_DROP,
    (_event, screenX: number, screenY: number, payload: BlockTransferPayload) => {
      const target = findNoteWindowAt(screenX, screenY, payload.sourceNoteId)
      clearPreviousTarget(payload.sourceNoteId, target)
      lastDragTarget.delete(payload.sourceNoteId)
      if (!target) return
      const bounds = target.getContentBounds()
      target.webContents.send(IPC_CHANNELS.BLOCK_DROP, screenX - bounds.x, screenY - bounds.y, payload)
    }
  )

  ipcMain.on(
    IPC_CHANNELS.BLOCK_TRANSFERRED,
    (_event, sourceNoteId: string, pos: number, size: number) => {
      const window = getNoteWindow(sourceNoteId)
      if (!window || window.isDestroyed()) return
      window.webContents.send(IPC_CHANNELS.BLOCK_REMOVE, pos, size)
    }
  )
}
