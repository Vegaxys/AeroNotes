import { BrowserWindow, ipcMain } from 'electron'
import type { JSONContent } from '@tiptap/core'
import type { NoteColor } from '@shared/types'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { notesStore } from '../store/notesStore'
import {
  detachNote,
  focusNote,
  redockNote,
  setNoteAlwaysOnTop
} from '../windows/noteWindowRegistry'

function broadcastNotes(): void {
  const notes = notesStore.getAll()
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(IPC_CHANNELS.NOTES_CHANGED, notes)
  })
}

export function registerNotesHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.NOTES_GET_ALL, () => notesStore.getAll())

  ipcMain.handle(IPC_CHANNELS.NOTE_ADD, () => {
    const note = notesStore.add()
    broadcastNotes()
    return note
  })

  ipcMain.on(IPC_CHANNELS.NOTE_UPDATE_CONTENT, (_event, id: string, content: JSONContent) => {
    notesStore.updateContent(id, content)
    broadcastNotes()
  })

  ipcMain.handle(IPC_CHANNELS.NOTE_DETACH, (_event, id: string) => {
    detachNote(id, broadcastNotes)
  })

  ipcMain.handle(IPC_CHANNELS.NOTE_REDOCK, (_event, id: string) => {
    redockNote(id, broadcastNotes)
  })

  ipcMain.on(IPC_CHANNELS.NOTE_FOCUS, (_event, id: string) => {
    focusNote(id)
  })

  ipcMain.on(IPC_CHANNELS.NOTE_SET_ALWAYS_ON_TOP, (_event, id: string, alwaysOnTop: boolean) => {
    setNoteAlwaysOnTop(id, alwaysOnTop)
    broadcastNotes()
  })

  ipcMain.on(IPC_CHANNELS.NOTE_SET_COLOR, (_event, id: string, color: NoteColor) => {
    notesStore.setColor(id, color)
    broadcastNotes()
  })

  ipcMain.on(IPC_CHANNELS.NOTE_SET_TITLE, (_event, id: string, title: string) => {
    notesStore.setTitle(id, title)
    broadcastNotes()
  })

  ipcMain.on(IPC_CHANNELS.NOTES_REORDER, (_event, orderedIds: string[]) => {
    notesStore.setDockOrder(orderedIds)
    broadcastNotes()
  })
}
