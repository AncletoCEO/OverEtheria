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

# La ventana de 0x100000 la crea este repo: se lo decimos a port.sh (el clon del
# runtime puede vivir en cualquier carpeta, así que la ruta relativa no alcanza).
export PS2_ELF_WINDOW_PATCH="$repo/scripts/patch-elf-window.py"

if [ ! -f "$game/scripts/port.sh" ]; then
    say "clonando ps2-native-recomp en $game"
    mkdir -p "$(dirname "$game")"
    git clone --depth 1 https://github.com/exoteric33/ps2-native-recomp "$game"
fi
game="$(cd "$game" && pwd)"

patch="$repo/patches/ps2-native-recomp-sword.patch"
if [ -f "$patch" ]; then
    if git -C "$game" apply --reverse --check "$patch" > /dev/null 2>&1; then
        say "parche del runtime ya aplicado"
    else
        say "aplicando patches/ps2-native-recomp-sword.patch"
        git -C "$game" apply "$patch"
    fi
fi

if [ ! -x "$game/build/tools/eerecomp" ]; then
    say "compilando eerecomp/vurecomp (setup.sh --native-only)"
    (cd "$game" && bash scripts/setup.sh --native-only)
fi

say "construyendo el juego $game_id desde $iso"
(cd "$game" && bash scripts/port.sh "$game_id" "$iso" --native-only)

pattern="python3"
[ -x "$repo/tools/python/python.exe" ] && pattern="$repo/tools/python/python.exe"

# Overlays del menú: el pipeline sólo captura ventanas de 16 KiB; se registran desde OL.BIN.
overlays="$game/games/$game_id/overlays"
if ! ls "$overlays"/*.bin > /dev/null 2>&1; then
    ol="$data/$game_id-OL.BIN"
    say "extrayendo OL.BIN y registrando el menú"
    "$pattern" "$repo/scripts/extract-disc.py" "$iso" "$ol" --pick OL.BIN
    "$pattern" "$repo/scripts/register-overlay.py" "$ol" menu.bin "$overlays" >> "$game/games/$game_id/entries.txt"
    (cd "$game" && bash scripts/port.sh "$game_id" "$iso" --native-only)
fi

# Contenido del ISO, para no volver a usarlo.
if [ ! -f "$data/game/disc/.extracted" ]; then
    say "extrayendo el contenido del ISO a $data/game/disc (una sola vez)"
    "$pattern" "$repo/scripts/extract-disc.py" "$iso" "$data/game/disc"
fi

[ -x "$game/build/native-$game_id/ps2run" ] || { echo "port.sh terminó sin ps2run" >&2; exit 1; }
say "listo: $game/build/native-$game_id/ps2run"
say "disco extraído: $data/game/disc"
