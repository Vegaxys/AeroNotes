import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { JSONContent } from '@tiptap/core'
import type { NoteColor, Template } from '@shared/types'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { t } from '@shared/i18n'
import { notesStore } from '../store/notesStore'
import {
  closeAllNoteWindows,
  destroyNoteWindow,
  detachNote,
  focusNote,
  redockNote,
  setNoteAlwaysOnTop,
  toggleNoteCollapse
} from '../windows/noteWindowRegistry'
import { openTemplateEditorWindow } from '../windows/templateEditorWindow'

/** Native confirmation dialog; resolves true when the user confirms the deletion. */
async function confirmDeletion(
  sender: Electron.WebContents,
  title: string,
  message: string
): Promise<boolean> {
  const window = BrowserWindow.fromWebContents(sender)
  const options: Electron.MessageBoxOptions = {
    type: 'warning',
    buttons: [t('confirm.delete'), t('confirm.cancel')],
    defaultId: 1,
    cancelId: 1,
    title,
    message,
    detail: t('confirm.irreversible')
  }
  const result = window
    ? await dialog.showMessageBox(window, options)
    : await dialog.showMessageBox(options)
  return result.response === 0
}

export function broadcastNotes(): void {
  const notes = notesStore.getAll()
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(IPC_CHANNELS.NOTES_CHANGED, notes)
  })
}

export function broadcastTemplates(): void {
  const templates = notesStore.getTemplates()
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(IPC_CHANNELS.TEMPLATES_CHANGED, templates)
  })
}

export function broadcastFolders(): void {
  const folders = notesStore.getFolders()
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(IPC_CHANNELS.FOLDERS_CHANGED, folders)
  })
}

/** Session-only color clipboard shared by every window. */
let copiedColor: NoteColor | null = null

export function registerNotesHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.NOTES_GET_ALL, () => notesStore.getAll())

  ipcMain.on(IPC_CHANNELS.COLOR_COPY, (_event, color: NoteColor) => {
    copiedColor = color
  })

  ipcMain.handle(IPC_CHANNELS.COLOR_GET_COPIED, () => copiedColor)

  ipcMain.handle(IPC_CHANNELS.NOTE_ADD, (_event, folderId: string) => {
    const note = notesStore.add(folderId)
    broadcastNotes()
    return note
  })

  ipcMain.handle(IPC_CHANNELS.FOLDERS_GET_ALL, () => notesStore.getFolders())

  ipcMain.handle(IPC_CHANNELS.FOLDER_ADD, (_event, name: string) => {
    const folder = notesStore.addFolder(name)
    broadcastFolders()
    return folder
  })

  ipcMain.on(IPC_CHANNELS.FOLDER_RENAME, (_event, id: string, name: string) => {
    notesStore.renameFolder(id, name)
    broadcastFolders()
  })

  ipcMain.on(IPC_CHANNELS.NOTE_WINDOWS_CLOSE_ALL, () => {
    closeAllNoteWindows(broadcastNotes)
  })

  ipcMain.handle(IPC_CHANNELS.NOTE_DELETE, async (event, id: string): Promise<boolean> => {
    const note = notesStore.getById(id)
    if (!note) return false
    const confirmed = await confirmDeletion(
      event.sender,
      t('confirm.deleteNote.title'),
      t('confirm.deleteNote.message', { title: note.title || t('note.untitled') })
    )
    if (!confirmed) return false
    destroyNoteWindow(id)
    notesStore.deleteNote(id)
    broadcastNotes()
    return true
  })

  ipcMain.handle(IPC_CHANNELS.NOTE_DUPLICATE, (_event, id: string) => {
    const copy = notesStore.duplicateNote(id)
    broadcastNotes()
    return copy
  })

  ipcMain.on(IPC_CHANNELS.NOTE_MOVE_TO_FOLDER, (_event, id: string, folderId: string) => {
    // A detached window for this note would show a note the dock no longer
    // lists in the current folder — close it first.
    const note = notesStore.getById(id)
    if (note?.isDetached) {
      destroyNoteWindow(id)
      notesStore.setDetached(id, false)
    }
    notesStore.moveNoteToFolder(id, folderId)
    broadcastNotes()
  })

  ipcMain.handle(IPC_CHANNELS.TEMPLATES_GET_ALL, () => notesStore.getTemplates())

  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE_ADD,
    (_event, name: string, content: JSONContent): Template => {
      const template = notesStore.addTemplate(name, content)
      broadcastTemplates()
      return template
    }
  )

  ipcMain.on(
    IPC_CHANNELS.TEMPLATE_UPDATE,
    (_event, id: string, patch: { name?: string; content?: JSONContent }) => {
      notesStore.updateTemplate(id, patch)
      broadcastTemplates()
    }
  )

  ipcMain.on(IPC_CHANNELS.TEMPLATE_EDITOR_OPEN, (_event, id: string) => {
    openTemplateEditorWindow(id)
  })

  ipcMain.handle(IPC_CHANNELS.TEMPLATE_DELETE, async (event, id: string): Promise<boolean> => {
    const template = notesStore.getTemplateById(id)
    if (!template) return false
    const confirmed = await confirmDeletion(
      event.sender,
      t('confirm.deleteTemplate.title'),
      t('confirm.deleteTemplate.message', { name: template.name })
    )
    if (!confirmed) return false
    notesStore.deleteTemplate(id)
    broadcastTemplates()
    return true
  })

  ipcMain.handle(IPC_CHANNELS.FOLDER_DELETE, async (event, id: string): Promise<boolean> => {
    const folder = notesStore.getFolders().find((f) => f.id === id)
    if (!folder) return false
    const count = notesStore.countNotesInFolder(id)
    const message =
      count > 0
        ? t('confirm.deleteFolder.withNotes', { name: folder.name, count })
        : t('confirm.deleteFolder.message', { name: folder.name })
    const confirmed = await confirmDeletion(event.sender, t('confirm.deleteFolder.title'), message)
    if (!confirmed) return false
    const deletedNoteIds = notesStore.deleteFolder(id)
    deletedNoteIds.forEach(destroyNoteWindow)
    broadcastNotes()
    broadcastFolders()
    return true
  })

  ipcMain.on(IPC_CHANNELS.NOTE_UPDATE_CONTENT, (_event, id: string, content: JSONContent) => {
    notesStore.updateContent(id, content)
    broadcastNotes()
  })

  ipcMain.handle(
    IPC_CHANNELS.NOTE_DETACH,
    (_event, id: string, dropPosition?: { x: number; y: number }) => {
      detachNote(id, broadcastNotes, dropPosition)
    }
  )

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

  ipcMain.on(IPC_CHANNELS.NOTE_TOGGLE_COLLAPSE, (_event, id: string) => {
    toggleNoteCollapse(id)
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
