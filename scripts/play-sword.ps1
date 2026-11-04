# Arranca ps2run con la secuencia de botones medida (video -> memory card -> menú ->
# cutscene) y, si se pide, captura la ventana a un PNG.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/play-sword.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/play-sword.ps1 -Seconds 120 -Shot work/shot.png
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/play-sword.ps1 -Cutscene Fast
#
# Requiere haber construido el juego (ver docs/analysis/07-runtime-nativo.md).
param(
    [int]$Seconds = 60,
    [string]$Shot,
    # Fast: avanza el diálogo con cruz; Skip: corta la cutscene (start) y vuelve al menú.
    [ValidateSet('None', 'Fast', 'Skip')][string]$Cutscene = 'Fast'
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$game = Join-Path $repo 'tools\ps2-native-recomp'
$exe = Join-Path $game 'build\native-sword\ps2run.exe'
if (-not (Test-Path $exe)) { throw "falta $exe; construí el juego primero" }

# 300/600/900: selección de video (PAL) y confirmaciones.
# 1400 left + 1500 cross: "No memory card" -> Yes.
# 3000/3200/3400: Story Mode -> Start New.
$presses = @('300:cross:8', '600:cross:8', '900:cross:8',
             '1400:left:8', '1500:cross:8',
             '3000:cross:6', '3200:cross:6', '3400:cross:6')

$frame = 4000
switch ($Cutscene) {
    'Fast' {
        # Pulsos cortos: mantener cruz sólo acelera el texto, no pasa de línea.
        while ($frame -lt 20000) { $presses += "${frame}:cross:5"; $frame += 120 }
    }
    'Skip' {
        $presses += '3800:start:600'
    }
}

$args = @('games/sword/disc/SLES_537.68', '--disc', 'games/sword/disc.iso', '--window')
foreach ($p in $presses) { $args += '--press'; $args += $p }

$proc = Start-Process -FilePath $exe -ArgumentList $args -WorkingDirectory $game `
    -RedirectStandardOutput (Join-Path $repo 'work\play.out') `
    -RedirectStandardError (Join-Path $repo 'work\play.err') -PassThru
Write-Output "ps2run PID $($proc.Id); corriendo $Seconds s"

if ($Shot) {
    Start-Sleep -Seconds $Seconds
    powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'capture-window.ps1') -Out $Shot
} else {
    Start-Sleep -Seconds $Seconds
}

$running = Get-Process ps2run -ErrorAction SilentlyContinue
if ($running) { $running | ForEach-Object { $_.Kill() } }

$errors = Select-String -Path (Join-Path $repo 'work\play.err') -Pattern 'stopped|missing code' -ErrorAction SilentlyContinue
if ($errors) { $errors | ForEach-Object { $_.Line } } else { Write-Output 'sin missing code' }
