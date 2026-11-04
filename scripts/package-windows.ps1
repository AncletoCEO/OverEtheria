# Arma el paquete Windows del launcher: exe + SDL2.dll + scripts + parches + docs.
#
#   powershell -File scripts/package-windows.ps1 -Build work\launcher-build -Out work\dist
#
# El paquete NO contiene contenido del juego: el usuario aporta su ISO y prepara.
param(
    [string]$Build = '',
    [string]$Out = '',
    [string]$Version = 'dev'
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not $Build) { $Build = Join-Path $repo 'work\launcher-build' }
if (-not $Out) { $Out = Join-Path $repo 'work\dist' }

$bin = Join-Path $Build 'bin'
$launcher = Get-ChildItem $bin -Filter 'overetheria-launcher.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $launcher) { throw "falta el ejecutable en $bin (compilá con -S launcher -B $Build)" }
$exe_dir = $launcher.Directory.FullName

$stage = Join-Path $Out "OverEtheria-$Version-windows-x86_64"
Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $stage | Out-Null

Copy-Item $launcher.FullName $stage
$sdl = Join-Path $exe_dir 'SDL2.dll'
if (Test-Path $sdl) { Copy-Item $sdl $stage } else { throw 'falta SDL2.dll junto al ejecutable' }
Copy-Item (Join-Path $repo 'README.md') $stage
Copy-Item (Join-Path $repo 'LICENSE') $stage
Copy-Item (Join-Path $repo 'launcher\README.md') (Join-Path $stage 'LAUNCHER.md')
Copy-Item (Join-Path $repo 'scripts') (Join-Path $stage 'scripts') -Recurse
Copy-Item (Join-Path $repo 'patches') (Join-Path $stage 'patches') -Recurse
New-Item -ItemType Directory -Force (Join-Path $stage 'docs\analysis') | Out-Null
Copy-Item (Join-Path $repo 'docs\analysis\07-runtime-nativo.md') (Join-Path $stage 'docs\analysis')

$zip = Join-Path $Out "OverEtheria-$Version-windows-x86_64.zip"
Remove-Item $zip -ErrorAction SilentlyContinue
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal
Write-Output "listo: $zip"
