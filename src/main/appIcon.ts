import { join } from 'path'
import { app } from 'electron'

/**
 * Absolute path to the app logo used for BrowserWindow taskbar icons. Bundled
 * as an extraResource in packaged builds; read from the repo's resources/ in dev.
 * (The tray uses its own smaller copy; see tray.ts.)
 */
export function getAppIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'app-icon.png')
    : join(__dirname, '../../resources/app-icon.png')
}
