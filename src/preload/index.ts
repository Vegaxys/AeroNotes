import { contextBridge, ipcRenderer } from 'electron'
import type { JSONContent } from '@tiptap/core'
import type { AppSettings, Note, NoteColor } from '@shared/types'
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
  addNote: (): Promise<Note> => ipcRenderer.invoke(IPC_CHANNELS.NOTE_ADD),
  updateNoteContent: (id: string, content: JSONContent): void => {
    ipcRenderer.send(IPC_CHANNELS.NOTE_UPDATE_CONTENT, id, content)
  },
  detachNote: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.NOTE_DETACH, id),
  redockNote: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.NOTE_REDOCK, id),
  focusNote: (id: string): void => ipcRenderer.send(IPC_CHANNELS.NOTE_FOCUS, id),
  setNoteAlwaysOnTop: (id: string, alwaysOnTop: boolean): void => {
    ipcRenderer.send(IPC_CHANNELS.NOTE_SET_ALWAYS_ON_TOP, id, alwaysOnTop)
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
  pickLocalPath: (kind: 'file' | 'folder'): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_PICK_PATH, kind),
  saveImage: (dataUrl: string): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.IMAGE_SAVE, dataUrl)
}

contextBridge.exposeInMainWorld('aeronotes', api)

export type AeronotesApi = typeof api
