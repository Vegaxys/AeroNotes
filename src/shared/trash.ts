/**
 * How long a trashed note is kept before the main process purges it for good.
 * Shared: the store enforces it, the dock's trash view counts down to it.
 */
export const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000
