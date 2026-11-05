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
# Commit exacto contra el que se genera patches/ps2-native-recomp-sword.patch.
$RecompCommit = '263508314076fda7837b51434222578331047273'
$Game = [System.IO.Path]::GetFullPath($Game)
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

# Avance para el launcher: "[progress] <0-100> <texto>".
function EmitProgress([int]$percent, $text) {
    $line = '[progress] ' + $percent + ' ' + $text
    Write-Output $line
    Add-Content -Path $Log -Value $line -Encoding utf8
}

# Lanza un paso y escribe su salida en vivo (no al final). Si se pasan $from/$to,
# traduce las fases de port.sh ("== [N/6]") en porcentaje dentro de ese tramo.
function RunStep($title, $command, $from = $null, $to = $null) {
    Say $title
    if ($null -ne $from) { EmitProgress $from $title }
    & $bash -c $command 2>&1 | ForEach-Object {
        $text = [string]$_
        Write-Output $text
        Add-Content -Path $Log -Value $text -Encoding utf8
        if (($null -ne $from) -and ($text -match '== \[(\d)/6\]')) {
            $phase = [int]$matches[1]
            $percent = [int]([math]::Round($from + ($to - $from) * ($phase - 1) / 6))
            EmitProgress $percent ($title + ' (paso ' + $phase + ' de 6)')
        }
    }
    $script:last_code = $LASTEXITCODE
    if ($null -ne $to) { EmitProgress $to ($title + ': listo') }
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

# La ventana de 0x100000 la crea este script: se lo decimos a port.sh (el clon del
# runtime puede vivir en cualquier carpeta, asi que la ruta relativa no alcanza).
$env:PS2_ELF_WINDOW_PATCH = Join-Path $repo 'scripts\patch-elf-window.py'

$game_posix = $Game -replace '\\', '/'
$iso_posix = $Iso -replace '\\', '/'
$repo_posix = $repo -replace '\\', '/'
$disc_dir = Join-Path $Data 'game\disc'
$disc_posix = ($disc_dir -replace '\\', '/')

EmitProgress 2 'preparando el entorno'

# Sin runtime clonado (paquete nuevo) se clona solo.
if (-not (Test-Path (Join-Path $Game 'scripts\port.sh'))) {
    if ((Test-Path $Game) -and (Get-ChildItem $Game -Force -ErrorAction SilentlyContinue)) {
        Say "la carpeta $Game existe y no es un clon del runtime; movela o vaciala"; exit 1
    }
    EmitProgress 3 'descargando el motor del juego'
    New-Item -ItemType Directory -Force (Split-Path -Parent $Game) | Out-Null
    & git clone https://github.com/exoteric33/ps2-native-recomp $Game
    if ($LASTEXITCODE -ne 0) { Say 'no se pudo descargar el motor del juego (¿git y red?)'; exit 1 }
}

# 1. fijar el commit del runtime y aplicar los parches propios
& git -C $Game fetch --quiet origin $RecompCommit 2>$null
Say "fijando el runtime en $RecompCommit"
& git -C $Game checkout --quiet --force $RecompCommit
if ($LASTEXITCODE -ne 0) { Say 'no se pudo preparar el runtime (¿red?)'; exit 1 }

$patch = Join-Path $repo 'patches\ps2-native-recomp-sword.patch'
if (Test-Path $patch) {
    Say 'aplicando los ajustes del juego'
    & git -C $Game apply $patch
    if ($LASTEXITCODE -ne 0) {
        Say 'los ajustes no coinciden con esta versión del runtime: se restaura y se reintenta'
        & git -C $Game reset --hard --quiet $RecompCommit
        & git -C $Game apply $patch
        if ($LASTEXITCODE -ne 0) { Say 'no se pudieron aplicar los ajustes del juego'; exit 1 }
    }
}
EmitProgress 6 'motor listo'

# 2. herramientas del recompilador
$eerecomp = Join-Path $Game 'build\tools\eerecomp.exe'
if (-not (Test-Path $eerecomp)) {
    RunStep 'preparando las herramientas' "cd '$game_posix' && bash scripts/setup.sh --native-only" 6 12
    if ($script:last_code -ne 0) { Say 'no se pudieron preparar las herramientas'; exit 1 }
}

# 3. juego desde el ISO
RunStep "construyendo el juego" "cd '$game_posix' && bash scripts/port.sh $GameId '$iso_posix' --native-only" 12 60
if ($script:last_code -ne 0) { Say 'la construcción falló (mirá el registro)'; exit 1 }

$run = Get-ChildItem (Join-Path $Game ('build\native-' + $GameId)) -Filter 'ps2run*' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $run) { Say 'la construcción terminó sin el ejecutable del juego'; exit 1 }

# 3b. overlays del menú: el juego los carga en runtime y el pipeline sólo captura ventanas
# de 16 KiB, así que se registran desde OL.BIN (imagen completa + rango de texto + init).
$games = Join-Path $Game 'games'
$overlays = Join-Path $games "$GameId\overlays"
$entries = Join-Path $games "$GameId\entries.txt"
$registered = Join-Path $overlays '.registered'
$have_overlay = (Test-Path $registered) -and (Test-Path $overlays) -and
    ((Get-ChildItem $overlays -Filter '*.bin' -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0)
if (-not $have_overlay) {
    EmitProgress 62 'preparando el menú del juego'
    $ol = Join-Path $Data "$GameId-OL.BIN"
    RunStep 'leyendo el menú del juego' "cd '$repo_posix' && '$python' scripts/extract-disc.py '$iso_posix' '$($ol -replace '\\','/')' --pick OL.BIN" 62 63
    if ($script:last_code -ne 0) { Say 'no se pudo leer el menú del juego'; exit 1 }
    Say 'registrando el menú del juego'
    $tokens = & $python (Join-Path $repo 'scripts\register-overlay.py') $ol 'menu.bin' $overlays
    if ($LASTEXITCODE -ne 0) { Say 'no se pudo registrar el menú del juego'; exit 1 }
    if ($tokens) {
        Add-Content -Path $entries -Value $tokens
        RunStep "terminando la construcción" "cd '$game_posix' && bash scripts/port.sh $GameId '$iso_posix' --native-only" 63 70
        if ($script:last_code -ne 0) { Say 'la construcción falló al registrar el menú'; exit 1 }
    }
    New-Item -ItemType File -Force $registered | Out-Null
}

# 4. contenido del ISO, para no volver a usarlo
$marker = Join-Path $disc_dir '.extracted'
if (Test-Path $marker) {
    Say "el contenido del juego ya estaba copiado en $disc_dir"
    EmitProgress 99 'contenido ya copiado'
} else {
    EmitProgress 70 'copiando el contenido del juego (4,5 GB, una sola vez)'
    RunStep 'copiando el contenido del juego' "cd '$repo_posix' && '$python' scripts/extract-disc.py '$iso_posix' '$disc_posix' --progress-base 70 --progress-end 99" 70 99
    if ($script:last_code -ne 0) { Say 'no se pudo copiar el contenido del juego (¿espacio en disco?)'; exit 1 }
}

EmitProgress 100 'listo para jugar'
Say "listo: $($run.FullName)"
Say "contenido del juego: $disc_dir"
exit 0
