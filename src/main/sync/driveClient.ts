import { getAccessToken, invalidateAccessToken } from './googleAuth'

const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

export interface DriveFile {
  id: string
  name: string
}

async function driveFetch(url: string, init: RequestInit = {}, retryOn401 = true): Promise<Response> {
  const token = await getAccessToken()
  const response = await fetch(url, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` }
  })
  if (response.status === 401 && retryOn401) {
    // Stale access token: refresh once and retry.
    invalidateAccessToken()
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

/** Every file in the app's hidden appDataFolder. */
export async function listAppDataFiles(): Promise<DriveFile[]> {
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
}

export async function downloadJson<T>(fileId: string): Promise<T> {
  const response = await driveFetch(`${API}/files/${fileId}?alt=media`)
  return (await response.json()) as T
}

export async function downloadBinary(fileId: string): Promise<Buffer> {
  const response = await driveFetch(`${API}/files/${fileId}?alt=media`)
  return Buffer.from(await response.arrayBuffer())
}

/** Creates a file inside the appDataFolder (multipart: metadata + content in one request). */
export async function createFile(
  name: string,
  content: Buffer | string,
  mimeType: string
): Promise<DriveFile> {
  const boundary = `aeronotes-${crypto.randomUUID()}`
  const metadata = JSON.stringify({ name, parents: ['appDataFolder'] })
  const head =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  const tail = `\r\n--${boundary}--`
  const body = Buffer.concat([
    Buffer.from(head, 'utf8'),
    typeof content === 'string' ? Buffer.from(content, 'utf8') : content,
    Buffer.from(tail, 'utf8')
  ])

  const response = await driveFetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id,name`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body
  })
  return (await response.json()) as DriveFile
}

export async function updateFile(
  fileId: string,
  content: Buffer | string,
  mimeType: string
): Promise<void> {
  await driveFetch(`${UPLOAD_API}/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { 'Content-Type': mimeType },
    body: typeof content === 'string' ? Buffer.from(content, 'utf8') : content
  })
}
