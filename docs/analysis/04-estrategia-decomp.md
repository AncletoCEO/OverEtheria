# 04 — Recompilar vs decompilar (y qué es viable)

## Dos cosas distintas

```
RECOMPILACIÓN (lo que existe hoy)          DECOMPILACIÓN (matching)
─────────────────────────────────          ────────────────────────
ELF MIPS ──ps2_recomp──► C++ mecánico      ELF ──Ghidra──► C/C++ legible
1 instrucción = 1 operación                a mano, con nombres y structs
no hay nombres, no hay tipos               objetivo: recompilar byte-idéntico
objetivo: ejecutar                         objetivo: fuente portable
✔ ya existe y corre                        ✘ requiere compilador original
```

Portear no exige *matching*: el recomp ya es C++ portable (raylib/SDL) y el fork
tiene targets Android/Vita. Pero el recomp arrastra el **runtime de hardware**
(GS, VU1, DMA, IOP), que es lo que cuesta portear y mantener. Una decomp real
elimina esa capa. La estrategia correcta es hacer las dos, compartiendo conocimiento.

## ¿Se puede hacer un matching decomp?

Requisitos y realidad:

| Requisito | Estado |
|---|---|
| Compilador original | **MWCCPS2 2.4.x** (propietario, abandonado). El `.comment` no fija el build |
| Flags y orden de TUs | Desconocidos; hay que inferirlos |
| Símbolos / debug | **Ninguno** (ELF stripped, sin `.debug`) |
| Tamaño | ~8 MB de código, ~29k funciones |
| Herramientas | Existen (decomp.wiki, decomp.me, mwccps2-debugger, proyecto Mac MWCC) |
| Precedentes PS2 | Dark Cloud, Silent Hill 3, SF III: Third Strike, Sonic CD (años de comunidad) |

Conclusión: **posible en teoría, no como primer objetivo.** Sin el compilador
exacto no hay byte-match; sin byte-match no hay "decomp" en el sentido estricto.

## Estrategia recomendada: dos vías, un solo conocimiento

```
        ┌──────────────── FASE 0/1: build reproducible ────────────────┐
        │                                                              │
   VÍA A (rápida)                    VÍA B (profunda)
   recomp + overlays                 Ghidra: decomp por módulo
   objetivo: jugar                   objetivo: fuente legible
        │                                 │
        ├── arregla el runtime ◄──────────┤ documenta ABI, structs, formatos
        │                                 │
        └──► juego jugable                └──► base para ports y mods
```

- **Vía A** da resultado visible en semanas y valida todo el conocimiento.
- **Vía B** empieza por los módulos chicos y autocontenidos:
  `mission98.bin` (192 B) → `menu.bin` (369 KB) → misiones.
- Cada módulo decompilado se documenta en `docs/` y se compara contra el original
  (asm-differ/objdiff o diff de comportamiento), sin declarar "hecho" sin evidencia.

## Qué significa "portear a múltiples plataformas"

| Nivel | Qué se obtiene | Cómo |
|---|---|---|
| 1. PC nativo | Windows/Linux | recomp + runtime (ya casi) |
| 2. Android/Vita | targets del fork | recomp + runtime adaptado |
| 3. Port limpio (consolas, móvil, web) | sin capa de emulación | decomp del motor + renderer propio |

El nivel 3 es el que justifica la decompilación. No es el primer entregable.

## Hitos

1. **Build reproducible** (fase 1): regenerar 18k `.cpp`, compilar, correr 60 s.
2. **Menú visible** (fase 2): `rgbNZ > 0` con los triages apagados.
3. **Overlays** (fase 3): 28 módulos recompilados + overlay bank + loader `SIMB/MWo`.
4. **Primer nivel jugable** (fase 4): una misión completa.
5. **Decomp del menú** (fase 5): `menu.bin` legible y documentado.

## Riesgos

- **Overlays**: es una extensión no trivial de PS2Recomp (tabla de funciones por
  módulo, dispatch, `_static_init`). Es el mayor riesgo técnico.
- **Timing**: el recomp corre el tick del juego a ~9/s (vs 60 fps reales); eso ya
  produjo un artefacto de "un solo asset listo". Cualquier fix de secuencia debe
  medirse contra el real.
- **Audio**: `SD.BIN` es `TYOSD`; el runtime actual tiene SPU2 mínimo. Un port
  completo necesita el driver/streaming.
- **Cinemáticas**: 61 `.PSS` (MPEG/PS2); el runtime tiene stubs de MPEG/IPU.
- **Compilador**: si algún día se consigue MWCCPS2 2.4.x, la vía B cambia de escala;
  hasta entonces, decompilación anotada.
