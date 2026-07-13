import { createServer } from 'http'
import type { AddressInfo } from 'net'
import { shell } from 'electron'
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OAUTH_SCOPES } from './oauthConfig'
import { createPkcePair } from './pkce'
import { clearAuth, loadRefreshToken, saveAuth } from './tokenStore'

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'
const SIGN_IN_TIMEOUT_MS = 2 * 60 * 1000

interface TokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  id_token?: string
  /** Space-separated scopes the user actually granted (granular consent!). */
  scope?: string
}

let cachedAccessToken: string | null = null
let cachedAccessTokenExpiry = 0

/** Reads the (unverified) email claim from a Google id_token — it just arrived over TLS from Google. */
function emailFromIdToken(idToken: string): string {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString('utf8'))
    return typeof payload.email === 'string' ? payload.email : ''
  } catch {
    return ''
  }
}

async function requestTokens(params: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString()
  })
  if (!response.ok) {
    throw new Error(`Token request failed (${response.status}): ${await response.text()}`)
  }
  return (await response.json()) as TokenResponse
}

/**
 * Full interactive sign-in: loopback HTTP server + system browser (Google
 * blocks OAuth inside embedded webviews). Resolves with the account email.
 */
export function signIn(): Promise<string> {
  return new Promise((resolve, reject) => {
    const { verifier, challenge } = createPkcePair()

    const server = createServer()
    const timeout = setTimeout(() => {
      server.close()
      reject(new Error('Sign-in timed out'))
    }, SIGN_IN_TIMEOUT_MS)

    function finish(error: Error | null, email?: string): void {
      clearTimeout(timeout)
      server.close()
      if (error) reject(error)
      else resolve(email ?? '')
    }

    server.on('request', (request, response) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')
      if (url.pathname !== '/callback') {
        response.writeHead(404).end()
        return
      }
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      response.end(
        '<html><body style="font-family:system-ui;text-align:center;padding-top:80px">' +
          '<h2>AeroNotes</h2><p>You can close this tab and return to the app.</p></body></html>'
      )

      const code = url.searchParams.get('code')
      if (!code) {
        finish(new Error(url.searchParams.get('error') ?? 'Sign-in was cancelled'))
        return
      }

      const port = (server.address() as AddressInfo).port
      requestTokens({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `http://127.0.0.1:${port}/callback`,
        grant_type: 'authorization_code',
        code_verifier: verifier
      })
        .then((tokens) => {
          if (!tokens.refresh_token) {
            throw new Error('Google did not return a refresh token')
          }
          // Google's granular consent lets the user untick individual
          // permissions on the sign-in screen; without Drive access every
          // sync would 403. Fail loudly now, with the remedy in the message.
          if (tokens.scope && !tokens.scope.includes('drive.appdata')) {
            throw new Error(
              'Drive access was not granted — sign in again and tick the Google Drive checkbox on the consent screen'
            )
          }
          const email = tokens.id_token ? emailFromIdToken(tokens.id_token) : ''
          saveAuth(tokens.refresh_token, email)
          cachedAccessToken = tokens.access_token
          cachedAccessTokenExpiry = Date.now() + (tokens.expires_in - 60) * 1000
          finish(null, email)
        })
        .catch((error: Error) => finish(error))
    })

    server.on('error', (error) => finish(error))

    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port
      const authUrl = new URL(AUTH_ENDPOINT)
      authUrl.search = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: `http://127.0.0.1:${port}/callback`,
        response_type: 'code',
        scope: OAUTH_SCOPES,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        // offline + consent: guarantees a refresh_token even on re-authorization.
        access_type: 'offline',
        prompt: 'consent'
      }).toString()
      void shell.openExternal(authUrl.toString())
    })
  })
}

export function isSignedIn(): boolean {
  return loadRefreshToken() !== null
}

/** Valid access token, refreshed through the stored refresh token when expired. */
export async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiry) {
    return cachedAccessToken
  }
  const refreshToken = loadRefreshToken()
  if (!refreshToken) {
    throw new Error('Not signed in')
  }
  let tokens: TokenResponse
  try {
    tokens = await requestTokens({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token'
    })
  } catch (error) {
    // Revoked/expired grant (user removed access, or test-mode 7-day expiry):
    // this token is dead — drop it so the UI offers a clean re-sign-in.
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      clearAuth()
      throw new Error('Google session expired — please sign in again')
    }
    throw error
  }
  cachedAccessToken = tokens.access_token
  cachedAccessTokenExpiry = Date.now() + (tokens.expires_in - 60) * 1000
  return tokens.access_token
}

/** Drops the cached access token so the next call runs a fresh refresh (after a 401). */
export function invalidateAccessToken(): void {
  cachedAccessToken = null
  cachedAccessTokenExpiry = 0
}

export async function signOut(): Promise<void> {
  const refreshToken = loadRefreshToken()
  if (refreshToken) {
    // Best effort — local sign-out must work offline too.
    try {
      await fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(refreshToken)}`, { method: 'POST' })
    } catch {
      // ignore
    }
  }
  invalidateAccessToken()
  clearAuth()
}
