/**
 * Google OAuth client credentials, baked in at build time from `.env`
 * (see docs/GOOGLE_CLOUD_SETUP.md). For an installed desktop app the
 * "secret" is not actually confidential (PKCE secures the flow) — it is
 * kept out of the public repo as hygiene, not as a security boundary.
 */
export const GOOGLE_CLIENT_ID = import.meta.env.MAIN_VITE_GOOGLE_CLIENT_ID ?? ''
export const GOOGLE_CLIENT_SECRET = import.meta.env.MAIN_VITE_GOOGLE_CLIENT_SECRET ?? ''

export const OAUTH_SCOPES = 'https://www.googleapis.com/auth/drive.appdata openid email'

export function isSyncConfigured(): boolean {
  return GOOGLE_CLIENT_ID.length > 0 && GOOGLE_CLIENT_SECRET.length > 0
}
