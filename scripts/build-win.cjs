// electron-builder's cache directory defaults to %LOCALAPPDATA%\electron-builder\Cache,
// which on this machine sits on a different volume than the project — renaming a
// downloaded archive across volumes fails with EXDEV. Relocating the cache next to the
// project fixes it, but only works when given an *absolute* path (a relative
// ELECTRON_BUILDER_CACHE value is not resolved against the project root reliably).
const { resolve } = require('path')
const { spawnSync } = require('child_process')

const cacheDir = resolve(__dirname, '..', '.cache', 'electron-builder')

const result = spawnSync('npx', ['electron-builder', '--win'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ELECTRON_BUILDER_CACHE: cacheDir }
})

process.exit(result.status ?? 1)
