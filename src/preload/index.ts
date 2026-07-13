import { contextBridge, ipcRenderer } from 'electron'
import type { JSONContent } from '@tiptap/core'
import type {
  AppSettings,
  BlockTransferPayload,
  Folder,
  Note,
  NoteColor,
  SyncStatus,
  Template
} from '@shared/types'
import { IPC_CHANNELS } from '@shared/ipcChannels'

const api = {
  setOverlayIgnoreMouse: (ignore: boolean): void => {
    ipcRenderer.send(IPC_CHANNELS.OVERLAY_SET_IGNORE_MOUSE, ignore)
  },
  getAllNotes: (): Promise<Note[]> => ipcRenderer.invoke(IPC_CHANNELS.NOTES_GET_ALL),
  onNotesChanged: (callback: (notes: Note[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, notes: Note[]): void => callback(notes)
    ipcRenderer.on(IPC_CHANNELS.NOTES_CHANGED, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.NOTES_CHANGED, listener)
  },
  addNote: (folderId: string): Promise<Note> => ipcRenderer.invoke(IPC_CHANNELS.NOTE_ADD, folderId),
  getAllFolders: (): Promise<Folder[]> => ipcRenderer.invoke(IPC_CHANNELS.FOLDERS_GET_ALL),
  onFoldersChanged: (callback: (folders: Folder[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, folders: Folder[]): void =>
      callback(folders)
    ipcRenderer.on(IPC_CHANNELS.FOLDERS_CHANGED, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.FOLDERS_CHANGED, listener)
  },
  addFolder: (name: string): Promise<Folder> => ipcRenderer.invoke(IPC_CHANNELS.FOLDER_ADD, name),
  renameFolder: (id: string, name: string): void => {
    ipcRenderer.send(IPC_CHANNELS.FOLDER_RENAME, id, name)
  },
  deleteNote: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.NOTE_DELETE, id),
  getAllTemplates: (): Promise<Template[]> => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES_GET_ALL),
  onTemplatesChanged: (callback: (templates: Template[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, templates: Template[]): void =>
      callback(templates)
    ipcRenderer.on(IPC_CHANNELS.TEMPLATES_CHANGED, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TEMPLATES_CHANGED, listener)
  },
  addTemplate: (name: string, content: JSONContent): Promise<Template> =>
    ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_ADD, name, content),
  updateTemplate: (id: string, patch: { name?: string; content?: JSONContent }): void => {
    ipcRenderer.send(IPC_CHANNELS.TEMPLATE_UPDATE, id, patch)
  },
  deleteTemplate: (id: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_DELETE, id),
  openTemplateEditor: (id: string): void => {
    ipcRenderer.send(IPC_CHANNELS.TEMPLATE_EDITOR_OPEN, id)
  },
  deleteFolder: (id: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.FOLDER_DELETE, id),
  duplicateNote: (id: string): Promise<Note | undefined> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTE_DUPLICATE, id),
  copyNoteColor: (color: NoteColor): void => {
    ipcRenderer.send(IPC_CHANNELS.COLOR_COPY, color)
  },
  getCopiedNoteColor: (): Promise<NoteColor | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.COLOR_GET_COPIED),
  moveNoteToFolder: (id: string, folderId: string): void => {
    ipcRenderer.send(IPC_CHANNELS.NOTE_MOVE_TO_FOLDER, id, folderId)
  },
  hideOverlay: (): void => {
    ipcRenderer.send(IPC_CHANNELS.OVERLAY_HIDE)
  },
  openSettingsWindow: (): void => {
    ipcRenderer.send(IPC_CHANNELS.SETTINGS_WINDOW_OPEN)
  },
  quitApp: (): void => {
    ipcRenderer.send(IPC_CHANNELS.APP_QUIT)
  },
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
  syncSignIn: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.SYNC_SIGN_IN),
  syncSignOut: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.SYNC_SIGN_OUT),
  syncNow: (): void => {
    ipcRenderer.send(IPC_CHANNELS.SYNC_NOW)
  },
  getSyncStatus: (): Promise<SyncStatus> => ipcRenderer.invoke(IPC_CHANNELS.SYNC_STATUS_GET),
  onSyncStatusChanged: (callback: (status: SyncStatus) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: SyncStatus): void =>
      callback(status)
    ipcRenderer.on(IPC_CHANNELS.SYNC_STATUS_CHANGED, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SYNC_STATUS_CHANGED, listener)
  },
  onNotesRemoteApplied: (callback: (noteIds: string[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, noteIds: string[]): void =>
      callback(noteIds)
    ipcRenderer.on(IPC_CHANNELS.NOTES_REMOTE_APPLIED, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.NOTES_REMOTE_APPLIED, listener)
  },
  closeAllNoteWindows: (): void => {
    ipcRenderer.send(IPC_CHANNELS.NOTE_WINDOWS_CLOSE_ALL)
  },
  updateNoteContent: (id: string, content: JSONContent): void => {
    ipcRenderer.send(IPC_CHANNELS.NOTE_UPDATE_CONTENT, id, content)
  },
  detachNote: (id: string, dropPosition?: { x: number; y: number }): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTE_DETACH, id, dropPosition),
  redockNote: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.NOTE_REDOCK, id),
  focusNote: (id: string): void => ipcRenderer.send(IPC_CHANNELS.NOTE_FOCUS, id),
  setNoteAlwaysOnTop: (id: string, alwaysOnTop: boolean): void => {
    ipcRenderer.send(IPC_CHANNELS.NOTE_SET_ALWAYS_ON_TOP, id, alwaysOnTop)
  },
  toggleNoteCollapse: (id: string): void => {
    ipcRenderer.send(IPC_CHANNELS.NOTE_TOGGLE_COLLAPSE, id)
  },
  onNoteHeaderContextMenu: (callback: (x: number, y: number) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, x: number, y: number): void =>
      callback(x, y)
    ipcRenderer.on(IPC_CHANNELS.NOTE_HEADER_CONTEXT_MENU, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.NOTE_HEADER_CONTEXT_MENU, listener)
  },
  setNoteColor: (id: string, color: NoteColor): void => {
    ipcRenderer.send(IPC_CHANNELS.NOTE_SET_COLOR, id, color)
  },
  setNoteTitle: (id: string, title: string): void => {
    ipcRenderer.send(IPC_CHANNELS.NOTE_SET_TITLE, id, title)
  },
  reorderNotes: (orderedIds: string[]): void => {
    ipcRenderer.send(IPC_CHANNELS.NOTES_REORDER, orderedIds)
  },
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  setSettings: (patch: Partial<AppSettings>): void => {
    ipcRenderer.send(IPC_CHANNELS.SETTINGS_SET, patch)
  },
  onSettingsChanged: (callback: (settings: AppSettings) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, settings: AppSettings): void =>
      callback(settings)
    ipcRenderer.on(IPC_CHANNELS.SETTINGS_CHANGED, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SETTINGS_CHANGED, listener)
  },
  openLocalPath: (path: string, kind: 'file' | 'folder'): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.SHELL_OPEN_PATH, path, kind),
  openExternalUrl: (url: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, url),
  blockDragMove: (sourceNoteId: string, screenX: number, screenY: number): void => {
    ipcRenderer.send(IPC_CHANNELS.BLOCK_DRAG_MOVE, sourceNoteId, screenX, screenY)
  },
  blockDragCancel: (sourceNoteId: string): void => {
    ipcRenderer.send(IPC_CHANNELS.BLOCK_DRAG_CANCEL, sourceNoteId)
  },
  blockDragDrop: (screenX: number, screenY: number, payload: BlockTransferPayload): void => {
    ipcRenderer.send(IPC_CHANNELS.BLOCK_DRAG_DROP, screenX, screenY, payload)
  },
  onBlockDragOver: (callback: (x: number, y: number) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, x: number, y: number): void =>
      callback(x, y)
    ipcRenderer.on(IPC_CHANNELS.BLOCK_DRAG_OVER, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.BLOCK_DRAG_OVER, listener)
  },
  onBlockDragLeave: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on(IPC_CHANNELS.BLOCK_DRAG_LEAVE, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.BLOCK_DRAG_LEAVE, listener)
  },
  onBlockDrop: (
    callback: (x: number, y: number, payload: BlockTransferPayload) => void
  ): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      x: number,
      y: number,
      payload: BlockTransferPayload
    ): void => callback(x, y, payload)
    ipcRenderer.on(IPC_CHANNELS.BLOCK_DROP, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.BLOCK_DROP, listener)
  },
  notifyBlockTransferred: (sourceNoteId: string, pos: number, size: number): void => {
    ipcRenderer.send(IPC_CHANNELS.BLOCK_TRANSFERRED, sourceNoteId, pos, size)
  },
  onBlockRemoveRequested: (callback: (pos: number, size: number) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, pos: number, size: number): void =>
      callback(pos, size)
    ipcRenderer.on(IPC_CHANNELS.BLOCK_REMOVE, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.BLOCK_REMOVE, listener)
  },
  pickLocalPath: (kind: 'file' | 'folder'): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_PICK_PATH, kind),
  saveImage: (dataUrl: string): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.IMAGE_SAVE, dataUrl),
  importImage: (): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.IMAGE_IMPORT)
}

contextBridge.exposeInMainWorld('aeronotes', api)

export type AeronotesApi = typeof api
