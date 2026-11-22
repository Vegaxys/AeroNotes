import { Capacitor, registerPlugin } from '@capacitor/core'
import type { DriveAuth } from '@shared/sync/driveClient'

interface GoogleDriveAuthPlugin {
  authorize(options: { interactive: boolean }): Promise<{ accessToken: string }>
  clearToken(options: { accessToken: string }): Promise<void>
}

/** Native side: android/app/src/main/java/com/aeronotes/app/GoogleDriveAuthPlugin.java. */
const GoogleDriveAuth = registerPlugin<GoogleDriveAuthPlugin>('GoogleDriveAuth')

const ACCOUNT_KEY = 'aeronotes.googleAccount'
/** Google access tokens last an hour; renew a little before Drive starts refusing them. */
const TOKEN_LIFETIME_MS = 50 * 60_000

let cachedToken: { value: string; expiresAt: number } | null = null

function readAccount(): string | null {
  try {
    return localStorage.getItem(ACCOUNT_KEY)
  } catch {
    return null
  }
}

/** Sync only exists in the Android app (the browser preview has no Google Play services). */
export const isSyncAvailable = (): boolean => Capacitor.isNativePlatform()

/** Signed in = the user went through the consent once and did not sign out since. */
export const isSignedIn = (): boolean => isSyncAvailable() && readAccount() !== null

export const accountEmail = (): string | undefined => readAccount() || undefined

async function fetchEmail(accessToken: string): Promise<string> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!response.ok) return ''
  const info = (await response.json()) as { email?: string }
  return info.email ?? ''
}

/** Account picker + consent; remembers the account so later tokens come silently. */
export async function signIn(): Promise<void> {
  const { accessToken } = await GoogleDriveAuth.authorize({ interactive: true })
  cachedToken = { value: accessToken, expiresAt: Date.now() + TOKEN_LIFETIME_MS }
  localStorage.setItem(ACCOUNT_KEY, await fetchEmail(accessToken))
}

export async function signOut(): Promise<void> {
  if (cachedToken) await GoogleDriveAuth.clearToken({ accessToken: cachedToken.value }).catch(() => {})
  cachedToken = null
  localStorage.removeItem(ACCOUNT_KEY)
}

/** Token provider for the shared Drive client: silent, never shows UI. */
export const driveAuth: DriveAuth = {
  async getAccessToken() {
    if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value
    try {
      const { accessToken } = await GoogleDriveAuth.authorize({ interactive: false })
      cachedToken = { value: accessToken, expiresAt: Date.now() + TOKEN_LIFETIME_MS }
      return accessToken
    } catch (error) {
      // Access revoked from the Google account page: the user must sign in again.
      if ((error as { code?: string }).code === 'CONSENT_REQUIRED') {
        throw new Error('Google access expired — sign in again')
      }
      throw error
    }
  },
  invalidateAccessToken() {
    if (cachedToken) void GoogleDriveAuth.clearToken({ accessToken: cachedToken.value }).catch(() => {})
    cachedToken = null
  }
}
