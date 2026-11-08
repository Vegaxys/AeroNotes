/**
 * Turns what the user typed into an href. A bare "www.example.com" would be
 * resolved against the app's own origin, so anything without a scheme gets
 * https:// in front of it.
 */
export function normalizeWebUrl(url: string): string {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`
}
