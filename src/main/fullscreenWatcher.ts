import { spawn, type ChildProcess } from 'child_process'
import { app, type BrowserWindow } from 'electron'

/**
 * Drops the overlay behind fullscreen apps (games). Electron has no API for
 * "which window is in the foreground", so a persistent hidden PowerShell
 * child polls Win32: if the foreground window belongs to another process and
 * covers its monitor EXACTLY (borderless fullscreen — a maximized window
 * overshoots its monitor by the invisible resize borders, so it won't match),
 * it prints "1"; the overlay then stops being always-on-top until it prints
 * "0" again. Exclusive-fullscreen games bypass the compositor and cover the
 * overlay natively either way.
 */

function buildWatcherScript(ownPid: number): string {
  return `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class FSW {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr h, uint f);
  [DllImport("user32.dll")] public static extern bool GetMonitorInfo(IntPtr m, ref MONITORINFO mi);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern int GetClassName(IntPtr h, StringBuilder sb, int max);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L; public int T; public int R; public int B; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int cb; public RECT mon; public RECT work; public uint flags; }
}
'@
$appPid = ${ownPid}
$prev = -1
while ($true) {
  $fs = 0
  $h = [FSW]::GetForegroundWindow()
  if ($h -ne [IntPtr]::Zero) {
    $wpid = [uint32]0
    [void][FSW]::GetWindowThreadProcessId($h, [ref]$wpid)
    $sb = New-Object System.Text.StringBuilder 256
    [void][FSW]::GetClassName($h, $sb, 256)
    $cls = $sb.ToString()
    if ($wpid -ne $appPid -and $cls -ne 'Progman' -and $cls -ne 'WorkerW') {
      $r = New-Object 'FSW+RECT'
      if ([FSW]::GetWindowRect($h, [ref]$r)) {
        $mi = New-Object 'FSW+MONITORINFO'
        $mi.cb = [System.Runtime.InteropServices.Marshal]::SizeOf($mi)
        $m = [FSW]::MonitorFromWindow($h, 2)
        if ([FSW]::GetMonitorInfo($m, [ref]$mi)) {
          if ([Math]::Abs($r.L - $mi.mon.L) -le 1 -and [Math]::Abs($r.T - $mi.mon.T) -le 1 -and [Math]::Abs($r.R - $mi.mon.R) -le 1 -and [Math]::Abs($r.B - $mi.mon.B) -le 1) {
            $fs = 1
          }
        }
      }
    }
  }
  if ($fs -ne $prev) {
    [Console]::Out.WriteLine($fs)
    [Console]::Out.Flush()
    $prev = $fs
  }
  Start-Sleep -Milliseconds 1500
}
`
}

export function startFullscreenWatcher(getOverlayWindow: () => BrowserWindow | null): void {
  if (process.platform !== 'win32') return

  let child: ChildProcess
  try {
    child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', buildWatcherScript(process.pid)],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }
    )
  } catch {
    return // watcher unavailable — the dock just stays on top
  }

  child.stdout?.setEncoding('utf8')
  let buffer = ''
  child.stdout?.on('data', (chunk: string) => {
    buffer += chunk
    let newlineIndex = buffer.indexOf('\n')
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim()
      buffer = buffer.slice(newlineIndex + 1)
      const overlay = getOverlayWindow()
      if (overlay && !overlay.isDestroyed()) {
        if (line === '1') {
          overlay.setAlwaysOnTop(false)
        } else if (line === '0') {
          overlay.setAlwaysOnTop(true, 'floating')
        }
      }
      newlineIndex = buffer.indexOf('\n')
    }
  })
  child.on('error', () => {})

  app.on('before-quit', () => {
    child.kill()
  })
}
