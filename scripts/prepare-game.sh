#!/usr/bin/env bash
# Prepara el juego desde tu ISO en Linux/macOS. Equivalente a prepare-game.ps1.
#
#   bash scripts/prepare-game.sh --iso "/path/Sword of Etheria.iso" [--game-id sword|oz] [--data DIR]
#
# Requiere Git, bash y el toolchain nativo (clang, ninja, cmake, python3) en PATH.
set -euo pipefail

iso=""
game_id="sword"
data="$(cd "$(dirname "$0")/.." && pwd)/build/game"
game="$(cd "$(dirname "$0")/.." && pwd)/tools/ps2-native-recomp"
while [ $# -gt 0 ]; do
    case "$1" in
    --iso) iso="$2"; shift 2 ;;
    --game-id) game_id="$2"; shift 2 ;;
    --game) game="$2"; shift 2 ;;
    --data) data="$2"; shift 2 ;;
    *) echo "uso: $0 --iso <archivo.iso> [--game-id sword|oz] [--game <clon>] [--data <dir>]" >&2; exit 2 ;;
    esac
done
[ -n "$iso" ] || { echo "falta --iso" >&2; exit 2; }
[ -f "$iso" ] || { echo "no existe $iso" >&2; exit 2; }
iso="$(cd "$(dirname "$iso")" && pwd)/$(basename "$iso")"
repo="$(cd "$(dirname "$0")/.." && pwd)"

say() { echo "[prepare] $*"; }

if [ ! -f "$game/scripts/port.sh" ]; then
    say "clonando ps2-native-recomp en $game"
    mkdir -p "$(dirname "$game")"
    git clone --depth 1 https://github.com/exoteric33/ps2-native-recomp "$game"
fi
game="$(cd "$game" && pwd)"
mkdir -p "$data"

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

# Overlays del menú: el pipeline sólo captura ventanas de 16 KiB; se registran desde OL.BIN.
overlays="$game/games/$game_id/overlays"
if ! ls "$overlays"/*.bin > /dev/null 2>&1; then
    python="python3"
    [ -x "$repo/tools/python/python.exe" ] && python="$repo/tools/python/python.exe"
    ol="$data/$game_id-OL.BIN"
    say "extrayendo OL.BIN y registrando el menú"
    "$python" "$repo/scripts/extract-disc.py" "$iso" "$ol" --pick OL.BIN
    "$python" "$repo/scripts/register-overlay.py" "$ol" menu.bin "$overlays" >> "$game/games/$game_id/entries.txt"
    (cd "$game" && bash scripts/port.sh "$game_id" "$iso" --native-only)
fi

# Contenido del ISO, para no volver a usarlo.
if [ ! -f "$data/disc/.extracted" ]; then
    say "extrayendo el contenido del ISO a $data/disc (una sola vez)"
    python="python3"
    [ -x "$repo/tools/python/python.exe" ] && python="$repo/tools/python/python.exe"
    "$python" "$repo/scripts/extract-disc.py" "$iso" "$data/disc"
fi

[ -x "$game/build/native-$game_id/ps2run" ] || { echo "port.sh terminó sin ps2run" >&2; exit 1; }
say "listo: $game/build/native-$game_id/ps2run"
say "disco extraído: $data/disc"
