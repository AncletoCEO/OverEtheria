# Prepara el juego desde tu ISO, para el launcher (y para CI con un ISO propio).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prepare-game.ps1 -Iso "D:\Sword of Etheria.iso"
#
# Hace tres cosas, cada una sólo si hace falta:
#   1. aplica patches/ps2-native-recomp-sword.patch al clon del runtime;
#   2. compila eerecomp/vurecomp (scripts/setup.sh --native-only);
#   3. construye el juego desde el ISO (scripts/port.sh sword <iso> --native-only).
#
# Nada de esto versiona contenido del juego: todo queda en tools/ (ignorado).
# El progreso se escribe en -Log (el launcher lo lee mientras corre).
param(
    [Parameter(Mandatory = $true)][string]$Iso,
    [string]$Game = '',
    [string]$Log = ''
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not $Game) { $Game = Join-Path $PSScriptRoot '..\tools\ps2-native-recomp' }
$Game = (Resolve-Path $Game).Path
$Iso = (Resolve-Path $Iso).Path
if (-not $Log) { $Log = Join-Path (Join-Path $repo 'work') 'prepare.log' }
New-Item -ItemType Directory -Force (Split-Path -Parent $Log) | Out-Null
'' | Out-File -FilePath $Log -Append -Encoding utf8

function Say($text) {
    $line = '[prepare] ' + $text
    Write-Output $line
    Add-Content -Path $Log -Value $line -Encoding utf8
}

function RunStep($title, $command) {
    Say $title
    $out = & $bash -c $command 2>&1
    $script:last_code = $LASTEXITCODE
    $out | Out-File -FilePath $Log -Append -Encoding utf8
    $out | Write-Output
}

$env:PATH = @(
    (Join-Path $repo 'tools\llvm-mingw\bin'),
    (Join-Path $repo 'tools\ninja'),
    (Join-Path $repo 'tools\cmake\bin'),
    (Join-Path $repo 'tools\python'),
    (Join-Path $repo 'tools\w64devkit\bin'),
    $env:PATH
) -join ';'

$bash = 'C:\Program Files\Git\bin\bash.exe'
if (-not (Test-Path $bash)) { $bash = 'C:\Program Files (x86)\Git\bin\bash.exe' }
if (-not (Test-Path $bash)) { Say 'no se encontró Git Bash (lo necesita el pipeline del runtime)'; exit 1 }

$game_posix = $Game -replace '\\', '/'
$iso_posix = $Iso -replace '\\', '/'

# 1. parches propios sobre el runtime
$patch = Join-Path $repo 'patches\ps2-native-recomp-sword.patch'
if (Test-Path $patch) {
    & git -C $Game apply --reverse --check $patch 2>$null
    if ($LASTEXITCODE -ne 0) {
        Say 'aplicando patches/ps2-native-recomp-sword.patch'
        & git -C $Game apply $patch
        if ($LASTEXITCODE -ne 0) { Say 'no se pudo aplicar el parche del runtime'; exit 1 }
    } else {
        Say 'parche del runtime ya aplicado'
    }
}

# 2. herramientas del recompilador
$eerecomp = Join-Path $Game 'build\tools\eerecomp.exe'
if (-not (Test-Path $eerecomp)) {
    RunStep 'compilando eerecomp/vurecomp (setup.sh --native-only)' "cd '$game_posix' && bash scripts/setup.sh --native-only"
    if ($script:last_code -ne 0) { Say 'setup.sh falló'; exit 1 }
}

# 3. juego desde el ISO
RunStep "construyendo el juego desde $Iso" "cd '$game_posix' && bash scripts/port.sh sword '$iso_posix' --native-only"
if ($script:last_code -ne 0) { Say 'port.sh falló (mirá las líneas de arriba)'; exit 1 }

$run = Join-Path $Game 'build\native-sword\ps2run.exe'
if (-not (Test-Path $run)) { Say 'port.sh terminó sin ps2run.exe'; exit 1 }
Say "listo: $run"
exit 0
