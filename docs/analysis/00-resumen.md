# 00 — Resumen

> Fecha: 2026-11-03. Fuente: inspección del ISO, del ELF y de los repos en `tools/`.

## Objetivo

1. **Jugar** Sword of Etheria nativo en PC.
2. **Decompilarlo** de forma anotada para portearlo a otras plataformas.

## Números clave

| Dato | Valor |
|---|---|
| ISO | 4.472.995.840 B (4,17 GiB), 87 archivos |
| MD5 | `b9c5115b77b7f05fbf14a67df8d3f99d` (coincide con el esperado) |
| Ejecutable | `SLES_537.68`, ELF32 MIPS LE, 6.457.864 B |
| `main` | 5.667.968 B en `0x4C0000`, sin símbolos |
| Funciones catalogadas | 20.434 (CSV de Ghidra del intento previo) |
| Overlays | 25 módulos `MWo` en `OL.BIN`, **2.350.016 B de text** |
| Código total | ~8,0 MB (main + overlays) |
| Compilador | Metrowerks CodeWarrior PS2 2.4.x (`MW MIPS C Compiler (2.4.1.01)`) |
| Audio | `SD.BIN`, 715 MB, `TYOSD v-1.28` |
| Cinemáticas | 61 `.PSS`, ~3,18 GB (71 % del disco) |

## Hallazgos

1. **El juego son módulos overlay.** El ELF reserva `0x100000` (344 KB de ceros) y
   `0x154000`; `OL.BIN` trae 25 módulos `MWo` (`menu.bin`, `prg_player_0.bin`,
   `mission01..25`, `mission98`). El recomp previo compiló **0 líneas de overlay**:
   su CSV tiene 4 funciones por debajo de `0x4C0000`. Ver `02`.
2. **El intento anterior no llegó al juego, llegó al menú de arranque.** Su pantalla
   negra está acotada a un solo eslabón: el pase único de subida de texturas del
   arranque procesa 1 asset listo en vez de 6, así que nunca sube el atlas PSMT8 ni
   su CLUT. Ver `03`.
3. **La decompilación "matching" no es viable como primer objetivo.** Requiere
   MWCCPS2 2.4.x exacto (propietario), ~8 MB de código y ~29k funciones sin símbolos.
   Lo viable es una **decompilación anotada por módulo** que alimente al recomp y,
   a largo plazo, permita ports. Ver `04`.
4. **REA no puede abrir este ELF hoy.** En Windows su lane Ghidra solo admite PE y
   6502; el lane MIPS rechaza variantes *machine-specific* como el R5900. Ghidra
   directo sigue siendo la herramienta de decompilación. Ver `06`.
5. **El repo arranca de cero** (decisión 2026-11-03): el intento previo queda como
   referencia en `tools/legacy-recomp/`, sin heredar su historia git.

## Próximo paso

Fase 1 del [`roadmap`](../roadmap.md): montar el toolchain y reproducir el build
(18k `.cpp` + link) antes de tocar lógica. El toolchain se decide en `05`.
