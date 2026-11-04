# Captura la ventana de ps2run a un PNG usando PrintWindow.
# Uso: pwsh -File scripts/capture-window.ps1 -Out work/shot.png [-ProcessName ps2run]
param(
    [Parameter(Mandatory = $true)][string]$Out,
    [string]$ProcessName = 'ps2run'
)

Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class Win {
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@

$proc = Get-Process $ProcessName -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $proc) { throw "no hay ventana de $ProcessName" }

$rect = New-Object Win+RECT
[Win]::GetWindowRect($proc.MainWindowHandle, [ref]$rect) | Out-Null
$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top

$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$dc = $graphics.GetHdc()
$ok = [Win]::PrintWindow($proc.MainWindowHandle, $dc, 2)
$graphics.ReleaseHdc($dc)
$graphics.Dispose()

$dir = Split-Path -Parent $Out
if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
$bitmap.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
Write-Output "printwindow=$ok -> $Out"
