import Store from 'electron-store'
import { safeStorage } from 'electron'

interface AuthSchema {
  /** Refresh token, encrypted with the OS keychain (DPAPI on Windows), base64. */
  encryptedRefreshToken: string
  email: string
}

const authStore = new Store<Partial<AuthSchema>>({ name: 'aeronotes-auth' })

export function canStoreTokens(): boolean {
  return safeStorage.isEncryptionAvailable()
}

export function saveAuth(refreshToken: string, email: string): void {
  authStore.set('encryptedRefreshToken', safeStorage.encryptString(refreshToken).toString('base64'))
  authStore.set('email', email)
}

export function loadRefreshToken(): string | null {
  const encrypted = authStore.get('encryptedRefreshToken')
  if (!encrypted) return null
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    // The Chromium os_crypt key changed (profile reset, hard kill while it
    // was being written, other OS user...): this token can never be read
    // again. Purge it so the UI shows a clean signed-out state instead of a
    // zombie session.
    clearAuth()
    return null
  }
}

export function loadEmail(): string | null {
  return authStore.get('email') ?? null
}

export function clearAuth(): void {
  authStore.delete('encryptedRefreshToken')
  authStore.delete('email')
}
