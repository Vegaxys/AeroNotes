import { NotesStore } from '@shared/notesStore'
import { loadNotesStoreData, saveNotesStoreData } from './persistence'

/** The desktop's store: the shared NotesStore on top of electron-store. */
export const notesStore = new NotesStore(loadNotesStoreData(), saveNotesStoreData)
