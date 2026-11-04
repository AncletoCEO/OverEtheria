#!/usr/bin/env bash
# Prepara el juego desde tu ISO en Linux/macOS. Equivalente a prepare-game.ps1.
#
#   bash scripts/prepare-game.sh --iso "/path/Sword of Etheria.iso" [--game-id sword|oz] [--data DIR]
#
# Requiere Git, bash y el toolchain nativo (clang, ninja, cmake, python3) en PATH.
# En el AppImage el programa vive en un montaje de solo lectura: --data (y el clon del
# runtime) van a una carpeta escribible del usuario, nunca al montaje.
set -euo pipefail

iso=""
game_id="sword"
data="${XDG_DATA_HOME:-$HOME/.local/share}/OverEtheria"
game=""
log=""
while [ $# -gt 0 ]; do
    case "$1" in
    --iso) iso="$2"; shift 2 ;;
    --game-id) game_id="$2"; shift 2 ;;
    --game) game="$2"; shift 2 ;;
    --data) data="$2"; shift 2 ;;
    --log) log="$2"; shift 2 ;;
    *) echo "uso: $0 --iso <archivo.iso> [--game-id sword|oz] [--game <clon>] [--data <dir>] [--log <archivo>]" >&2; exit 2 ;;
    esac
done
[ -n "$iso" ] || { echo "falta --iso" >&2; exit 2; }
[ -f "$iso" ] || { echo "no existe $iso" >&2; exit 2; }
iso="$(cd "$(dirname "$iso")" && pwd)/$(basename "$iso")"
repo="$(cd "$(dirname "$0")/.." && pwd)"
[ -n "$game" ] || game="$data/runtime/ps2-native-recomp"
mkdir -p "$data"
[ -n "$log" ] || log="$data/prepare.log"
: > "$log"

# Todo lo que sigue se ve en la consola y queda en el registro del launcher.
exec > >(tee -a "$log") 2>&1

say() { echo "[prepare] $*"; }
# Avance para el launcher: "[progress] <0-100> <texto>".
progress() { echo "[progress] $1 $2"; }

# La ventana de 0x100000 la crea este repo: se lo decimos a port.sh (el clon del
# runtime puede vivir en cualquier carpeta, así que la ruta relativa no alcanza).
export PS2_ELF_WINDOW_PATCH="$repo/scripts/patch-elf-window.py"

# Commit exacto contra el que se genera patches/ps2-native-recomp-sword.patch.
recomp_commit="263508314076fda7837b51434222578331047273"

progress 2 "preparando el entorno"
if [ ! -f "$game/scripts/port.sh" ]; then
    if [ -d "$game" ] && [ -n "$(ls -A "$game" 2> /dev/null)" ]; then
        say "la carpeta $game existe y no es un clon del runtime; movela o vaciala"
        exit 1
    fi
    progress 3 "descargando el motor del juego"
    say "clonando ps2-native-recomp en $game"
    mkdir -p "$(dirname "$game")"
    git clone https://github.com/exoteric33/ps2-native-recomp "$game"
fi
game="$(cd "$game" && pwd)"

# 1. fijar el commit del runtime y aplicar el parche propio
git -C "$game" fetch --quiet origin "$recomp_commit"
say "fijando el runtime en $recomp_commit"
git -C "$game" checkout --quiet --force "$recomp_commit"

patch="$repo/patches/ps2-native-recomp-sword.patch"
if [ -f "$patch" ]; then
    say "aplicando los ajustes del juego"
    if ! git -C "$game" apply "$patch"; then
        say "los ajustes no coinciden con esta versión del runtime: se restaura y se reintenta"
        git -C "$game" reset --hard --quiet "$recomp_commit"
        git -C "$game" apply "$patch" || { say "no se pudieron aplicar los ajustes del juego"; exit 1; }
    fi
fi
progress 6 "motor listo"

if [ ! -x "$game/build/tools/eerecomp" ]; then
    progress 6 "preparando las herramientas"
    say "compilando eerecomp/vurecomp (setup.sh --native-only)"
    (cd "$game" && bash scripts/setup.sh --native-only)
    progress 12 "herramientas listas"
fi

progress 12 "construyendo el juego"
say "construyendo el juego $game_id desde $iso"
(cd "$game" && bash scripts/port.sh "$game_id" "$iso" --native-only)
progress 60 "juego construido"

pattern="python3"
[ -x "$repo/tools/python/python.exe" ] && pattern="$repo/tools/python/python.exe"

# Overlays del menú: el pipeline sólo captura ventanas de 16 KiB; se registran desde OL.BIN.
overlays="$game/games/$game_id/overlays"
if ! ls "$overlays"/*.bin > /dev/null 2>&1; then
    progress 62 "preparando el menú del juego"
    ol="$data/$game_id-OL.BIN"
    say "leyendo y registrando el menú del juego"
    "$pattern" "$repo/scripts/extract-disc.py" "$iso" "$ol" --pick OL.BIN
    "$pattern" "$repo/scripts/register-overlay.py" "$ol" menu.bin "$overlays" >> "$game/games/$game_id/entries.txt"
    progress 65 "terminando la construcción"
    (cd "$game" && bash scripts/port.sh "$game_id" "$iso" --native-only)
    progress 70 "menú registrado"
fi

# Contenido del ISO, para no volver a usarlo.
if [ ! -f "$data/game/disc/.extracted" ]; then
    progress 70 "copiando el contenido del juego (4,5 GB, una sola vez)"
    say "copiando el contenido del juego a $data/game/disc"
    "$pattern" "$repo/scripts/extract-disc.py" "$iso" "$data/game/disc" --progress-base 70 --progress-end 99
else
    say "el contenido del juego ya estaba copiado en $data/game/disc"
    progress 99 "contenido ya copiado"
fi

[ -x "$game/build/native-$game_id/ps2run" ] || { echo "la construcción terminó sin el ejecutable del juego" >&2; exit 1; }
progress 100 "listo para jugar"
say "listo: $game/build/native-$game_id/ps2run"
say "contenido del juego: $data/game/disc"
