# Product Context — Sword of Etheria

## Project Type

Proyecto de preservación y reverse engineering de un videojuego de PS2:
recompilación nativa a C++ para PC + decompilación anotada por módulos.

## Objetivo

1. Un ejecutable nativo (Windows/Linux) que corra el juego completo.
2. Una reconstrucción legible del código y del motor, módulo por módulo, que
   permita portear el juego a otras plataformas y modificarlo.

## Stack

- **Runtime / juego**: C++20, CMake, `ps2-native-recomp`
  ([MIT](https://github.com/exoteric33/ps2-native-recomp)).
- **Recompilador**: `eerecomp` + `vurecomp` de `ps2-native-recomp`; traduce en
  build y en runtime (`[ee-live]`, `[vu-live]`).
- **Análisis**: Ghidra 12.x + JDK 21, scripts propios en Node.js.
- **Referencia**: PCSX2 2.9 (savestates + PINE).
- **Scripts**: Node.js 22+ para el disco; Python embebido para el pipeline.
- **Toolchain**: llvm-mingw UCRT (clang 23), Ninja, CMake y Python en `tools/`.

## Estructura

```
docs/            análisis, formatos y runtime nativo
scripts/         inspección del disco, entradas de overlays, captura
patches/         parches propios sobre ps2-native-recomp
recomp/          baseline histórico de PS2Recomp y mapas de funciones
aspec/           configuración spec-driven
work/            artefactos locales (ignorado)
tools/           herramientas externas (ignorado)
```

## Estado

El juego arranca en nativo y llega al menú principal y a la cutscene inicial
(ver `docs/analysis/07-runtime-nativo.md`). Todavía no hay misión jugable.

## Comandos

```bash
node scripts/inspect-disc.mjs "Sword of Etheria.iso"
node scripts/inspect-disc.mjs "Sword of Etheria.iso" --md5
node scripts/validate-decomp.mjs

# construcción nativa (requiere tools/ y el ISO local)
cd tools/ps2-native-recomp
bash scripts/port.sh sword isos/sword.iso --native-only
build/native-sword/ps2run games/sword/disc/SLES_537.68 --disc games/sword/disc.iso --window
```
