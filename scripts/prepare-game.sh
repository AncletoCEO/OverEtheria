#!/usr/bin/env bash
# Prepara el juego desde tu ISO en Linux/macOS. Equivalente a prepare-game.ps1.
#
#   bash scripts/prepare-game.sh --iso "/path/Sword of Etheria.iso" [--game tools/ps2-native-recomp]
#
# Requiere Git, bash y el toolchain nativo (clang, ninja, cmake, python3) en PATH.
set -euo pipefail

iso=""
game="$(cd "$(dirname "$0")/.." && pwd)/tools/ps2-native-recomp"
while [ $# -gt 0 ]; do
    case "$1" in
    --iso) iso="$2"; shift 2 ;;
    --game) game="$2"; shift 2 ;;
    *) echo "uso: $0 --iso <archivo.iso> [--game <clon>]" >&2; exit 2 ;;
    esac
done
[ -n "$iso" ] || { echo "falta --iso" >&2; exit 2; }
[ -f "$iso" ] || { echo "no existe $iso" >&2; exit 2; }
repo="$(cd "$(dirname "$0")/.." && pwd)"
game="$(cd "$game" && pwd)"

say() { echo "[prepare] $*"; }

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

say "construyendo el juego desde $iso"
(cd "$game" && bash scripts/port.sh sword "$iso" --native-only)

[ -x "$game/build/native-sword/ps2run" ] || { echo "port.sh terminó sin ps2run" >&2; exit 1; }
say "listo: $game/build/native-sword/ps2run"
