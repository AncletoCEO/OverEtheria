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
if (-not (Test-Path $Build)) { throw "no existe el build: $Build" }

Write-Output "buscando el launcher compilado en $Build"
$launcher = Get-ChildItem $Build -Filter 'overetheria-launcher.exe' -Recurse -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $launcher) {
    $seen = Get-ChildItem $Build -Recurse -Include *.exe -ErrorAction SilentlyContinue | Select-Object -First 10 -ExpandProperty FullName
    throw "no se encontró overetheria-launcher.exe en $Build. Ejecutables vistos: $($seen -join ', ')"
}
Write-Output "launcher: $($launcher.FullName)"
$exe_dir = $launcher.Directory.FullName

$sdl = Get-ChildItem $exe_dir -Filter 'SDL2.dll' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $sdl) { $sdl = Get-ChildItem $Build -Filter 'SDL2.dll' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 }
if (-not $sdl) { throw "no se encontró SDL2.dll en $exe_dir ni en $Build" }
Write-Output "SDL2: $($sdl.FullName)"

$stage = Join-Path $Out "OverEtheria-$Version-windows-x86_64"
Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $stage | Out-Null

Copy-Item $launcher.FullName $stage
Copy-Item $sdl.FullName $stage
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
