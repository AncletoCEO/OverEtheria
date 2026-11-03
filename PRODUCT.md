# Product Context — Sword of Etheria

## Project Type

Proyecto de preservación y reverse engineering de un videojuego de PS2:
recompilación estática a C++ para PC + decompilación anotada por módulos.

## Objetivo

1. Un ejecutable nativo (Windows/Linux) que corra el juego completo.
2. Una reconstrucción legible del código y del motor, módulo por módulo, que
   permita portear el juego a otras plataformas y modificarlo.

## Stack

- **Runtime / juego**: C++20, CMake, SDL/raylib (vía PS2Recomp).
- **Recompilador**: PS2Recomp (fork `AncletoCEO/Ps2Recomp-of-etheria`, GPLv3).
- **Análisis**: Ghidra 12.x + JDK 21, scripts propios en Node.js.
- **Referencia**: PCSX2 2.9 (savestates + PINE).
- **Scripts**: Node.js 22+ (sin dependencias externas).

## Estructura

```
docs/            análisis y formatos
scripts/         inspección del disco (Node, sin deps)
aspec/           configuración spec-driven
work/            artefactos locales (ignorado)
tools/           clones externos (ignorado)
```

## Comandos

Todavía no hay build en este repo. Lo único ejecutable hoy:

```bash
node scripts/inspect-disc.mjs "Sword of Etheria.iso"
node scripts/inspect-disc.mjs "Sword of Etheria.iso" --md5
```

## Archivos críticos

- `docs/analysis/02-ejecutable-y-overlays.md`: mapa de memoria y overlays.
- `docs/analysis/03-intento-anterior.md`: estado medido del intento previo.
- `.gitignore`: protege contra versionar contenido del juego.

## Reglas de negocio

- **Bring your own disc**: el ISO nunca se distribuye; se valida por MD5.
- El repo no contiene assets ni binarios del juego.
- La decompilación es incremental y verificable; no se declara un módulo
  "decompilado" sin comparación contra el original.
