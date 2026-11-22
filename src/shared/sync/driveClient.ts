const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

export interface DriveFile {
  id: string
  name: string
}

/** How a platform hands out Google access tokens (scope drive.appdata). */
export interface DriveAuth {
  getAccessToken(): Promise<string>
  /** The token was refused: forget it so the next call fetches a fresh one. */
  invalidateAccessToken(): void
}

/** The few Drive calls the sync needs, all inside the app's hidden appDataFolder. */
export interface DriveClient {
  listAppDataFiles(): Promise<DriveFile[]>
  downloadJson<T>(fileId: string): Promise<T>
  downloadBinary(fileId: string): Promise<Uint8Array>
  createFile(name: string, content: Uint8Array | string, mimeType: string): Promise<DriveFile>
  updateFile(fileId: string, content: Uint8Array | string, mimeType: string): Promise<void>
}

/**
 * Drive REST over plain fetch, so the same code runs in Electron's main
 * process and in the Android WebView (Drive answers CORS requests).
 */
export function createDriveClient(auth: DriveAuth): DriveClient {
  async function driveFetch(url: string, init: RequestInit = {}, retryOn401 = true): Promise<Response> {
    const token = await auth.getAccessToken()
    const response = await fetch(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` }
    })
    if (response.status === 401 && retryOn401) {
      // Stale access token: refresh once and retry.
      auth.invalidateAccessToken()
      return driveFetch(url, init, false)
    }
    if (!response.ok) {
      const body = await response.text()
      // Most common first-run failure: the Drive API was enabled minutes ago
      // and Google hasn't propagated it yet (or it wasn't enabled at all).
      if (response.status === 403 && body.includes('accessNotConfigured')) {
        throw new Error(
          'Google Drive API is not active for this project yet — enable it and retry in a few minutes'
        )
      }
      if (response.status === 403 && body.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
        throw new Error(
          'Missing Drive permission — sign out, sign in again and tick the Google Drive checkbox on the consent screen'
        )
      }
      throw new Error(`Drive request failed (${response.status}): ${body}`)
    }
    return response
  }

  const asBlobPart = (content: Uint8Array | string): string | Uint8Array<ArrayBuffer> =>
    typeof content === 'string' ? content : (content as Uint8Array<ArrayBuffer>)

  return {
    async listAppDataFiles() {
      const files: DriveFile[] = []
      let pageToken: string | undefined
      do {
        const params = new URLSearchParams({
          spaces: 'appDataFolder',
          fields: 'nextPageToken, files(id, name)',
          pageSize: '1000'
        })
        if (pageToken) params.set('pageToken', pageToken)
        const response = await driveFetch(`${API}/files?${params.toString()}`)
        const data = (await response.json()) as { files: DriveFile[]; nextPageToken?: string }
        files.push(...data.files)
        pageToken = data.nextPageToken
      } while (pageToken)
      return files
    },

    async downloadJson<T>(fileId: string) {
      const response = await driveFetch(`${API}/files/${fileId}?alt=media`)
      return (await response.json()) as T
    },

    async downloadBinary(fileId) {
      const response = await driveFetch(`${API}/files/${fileId}?alt=media`)
      return new Uint8Array(await response.arrayBuffer())
    },

    /** Multipart upload: metadata + content in one request. */
    async createFile(name, content, mimeType) {
      const boundary = `aeronotes-${crypto.randomUUID()}`
      const metadata = JSON.stringify({ name, parents: ['appDataFolder'] })
      const body = new Blob([
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
          `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
        asBlobPart(content),
        `\r\n--${boundary}--`
      ])
      const response = await driveFetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id,name`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body
      })
      return (await response.json()) as DriveFile
    },

    async updateFile(fileId, content, mimeType) {
      await driveFetch(`${UPLOAD_API}/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Content-Type': mimeType },
        body: new Blob([asBlobPart(content)])
      })
    }
  }
}
