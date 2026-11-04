# Prepara el juego desde tu ISO, para el launcher (y para CI con un ISO propio).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prepare-game.ps1 -Iso "D:\Sword of Etheria.iso"
#
# Hace cuatro cosas, cada una sólo si hace falta:
#   1. aplica patches/ps2-native-recomp-sword.patch al clon del runtime;
#   2. compila eerecomp/vurecomp (scripts/setup.sh --native-only);
#   3. construye el juego desde el ISO (scripts/port.sh sword <iso> --native-only);
#   4. extrae TODO el contenido del ISO a -Data\disc, para no volver a necesitar el ISO.
#
# Nada de esto versiona contenido del juego: el ISO del usuario y lo extraído quedan en
# su equipo (tools/ y work/ están ignorados). El progreso se escribe en -Log.
param(
    [Parameter(Mandatory = $true)][string]$Iso,
    [string]$Game = '',
    [string]$GameId = 'sword',
    [string]$Data = '',
    [string]$Log = ''
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not $Game) { $Game = Join-Path $PSScriptRoot '..\tools\ps2-native-recomp' }
if (-not $Data) { $Data = Join-Path $repo 'work' }
# Sin runtime clonado (paquete nuevo) se clona solo; después los parches lo ajustan.
if (-not (Test-Path (Join-Path $Game 'scripts\port.sh'))) {
    Say "clonando ps2-native-recomp en $Game"
    New-Item -ItemType Directory -Force (Split-Path -Parent $Game) | Out-Null
    & git clone --depth 1 https://github.com/exoteric33/ps2-native-recomp $Game
    if ($LASTEXITCODE -ne 0) { Say 'no se pudo clonar ps2-native-recomp (¿git y red?)'; exit 1 }
}
$Game = (Resolve-Path $Game).Path
$Iso = (Resolve-Path $Iso).Path
if (-not $Log) { $Log = Join-Path $repo 'work\prepare.log' }
New-Item -ItemType Directory -Force (Split-Path -Parent $Log) | Out-Null
New-Item -ItemType Directory -Force $Data | Out-Null
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

$python = Join-Path $repo 'tools\python\python.exe'
if (-not (Test-Path $python)) { $python = 'python' }

$game_posix = $Game -replace '\\', '/'
$iso_posix = $Iso -replace '\\', '/'
$repo_posix = $repo -replace '\\', '/'
$disc_dir = Join-Path $Data 'game\disc'
$disc_posix = ($disc_dir -replace '\\', '/')

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
RunStep "construyendo el juego $GameId desde $Iso" "cd '$game_posix' && bash scripts/port.sh $GameId '$iso_posix' --native-only"
if ($script:last_code -ne 0) { Say 'port.sh falló (mirá las líneas de arriba)'; exit 1 }

$run = Join-Path $Game ('build\native-' + $GameId + '\ps2run.exe')
if (-not (Test-Path $run)) { Say 'port.sh terminó sin ps2run.exe'; exit 1 }

# 3b. overlays del menú: el juego los carga en runtime y el pipeline sólo captura ventanas
# de 16 KiB, así que se registran desde OL.BIN (imagen completa + rango de texto + init).
$games = Join-Path $Game 'games'
$overlays = Join-Path $games "$GameId\overlays"
$entries = Join-Path $games "$GameId\entries.txt"
$have_overlay = (Test-Path $overlays) -and ((Get-ChildItem $overlays -Filter '*.bin' -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0)
if (-not $have_overlay) {
    $ol = Join-Path $Data "$GameId-OL.BIN"
    RunStep "extrayendo OL.BIN para registrar el menú" "cd '$repo_posix' && '$python' scripts/extract-disc.py '$iso_posix' '$($ol -replace '\\','/')' --pick OL.BIN"
    if ($script:last_code -ne 0) { Say 'no se pudo extraer OL.BIN'; exit 1 }
    Say 'registrando el overlay del menú'
    $tokens = & $python (Join-Path $repo 'scripts\register-overlay.py') $ol 'menu.bin' $overlays
    if ($LASTEXITCODE -ne 0) { Say 'register-overlay falló'; exit 1 }
    if ($tokens) {
        Add-Content -Path $entries -Value $tokens
        RunStep "reconstruyendo con el overlay del menú" "cd '$game_posix' && bash scripts/port.sh $GameId '$iso_posix' --native-only"
        if ($script:last_code -ne 0) { Say 'port.sh falló al reconstruir con el overlay'; exit 1 }
    }
}

# 4. contenido del ISO, para no volver a usarlo
$marker = Join-Path $disc_dir '.extracted'
if (Test-Path $marker) {
    Say "contenido ya extraído en $disc_dir"
} else {
    RunStep "extrayendo el contenido del ISO a $disc_dir (una sola vez)" "cd '$repo_posix' && '$python' scripts/extract-disc.py '$iso_posix' '$disc_posix'"
    if ($script:last_code -ne 0) { Say 'la extracción falló'; exit 1 }
}

Say "listo: $run"
Say "disco extraído: $disc_dir"
exit 0
