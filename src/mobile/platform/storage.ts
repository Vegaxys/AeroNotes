import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import type { NotesStoreData } from '@shared/notesStore'
import type { AppSettings } from '@shared/types'

const DATA_FILE = 'aeronotes.json'
const TEMP_FILE = 'aeronotes.json.tmp'

/** Everything the phone keeps between launches, in one JSON file of the app's private storage. */
export interface MobileData extends NotesStoreData {
  settings: AppSettings
}

/**
 * Reads the data file; null only when it does not exist yet (first launch).
 * A file that exists but cannot be read or parsed throws: starting empty
 * would overwrite the user's notes at the first save.
 */
export async function loadMobileData(): Promise<MobileData | null> {
  try {
    await Filesystem.stat({ path: DATA_FILE, directory: Directory.Data })
  } catch {
    return null
  }
  const file = await Filesystem.readFile({ path: DATA_FILE, directory: Directory.Data, encoding: Encoding.UTF8 })
  return JSON.parse(file.data as string) as MobileData
}

let pendingWrite: Promise<void> = Promise.resolve()

/**
 * Queues a full write. Writes run one at a time and go through a temp file
 * renamed over the real one, so a kill mid-write leaves the previous version
 * intact instead of a truncated file.
 */
export function saveMobileData(data: MobileData): Promise<void> {
  const json = JSON.stringify(data)
  pendingWrite = pendingWrite
    .then(async () => {
      await Filesystem.writeFile({ path: TEMP_FILE, directory: Directory.Data, encoding: Encoding.UTF8, data: json })
      await Filesystem.rename({ from: TEMP_FILE, to: DATA_FILE, directory: Directory.Data, toDirectory: Directory.Data })
    })
    .catch((error: unknown) => console.error('Saving the notes failed', error))
  return pendingWrite
}
