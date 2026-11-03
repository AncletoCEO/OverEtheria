# Documentación

Todo lo que sigue está medido sobre el disco `Sword of Etheria.iso`
(MD5 `b9c5115b77b7f05fbf14a67df8d3f99d`) y los repos de `tools/`.
Cada documento incluye cómo reproducir la medición.

## Análisis

| Documento | Contenido |
|---|---|
| [`analysis/00-resumen.md`](analysis/00-resumen.md) | TL;DR, números clave y hallazgos |
| [`analysis/01-disco.md`](analysis/01-disco.md) | Contenido del ISO, tamaños y formatos |
| [`analysis/02-ejecutable-y-overlays.md`](analysis/02-ejecutable-y-overlays.md) | ELF, mapa de memoria, overlays `MWo` y `SIMB` |
| [`analysis/03-intento-anterior.md`](analysis/03-intento-anterior.md) | Qué logró el recomp previo, dónde se trabó y qué ya está refutado |
| [`analysis/04-estrategia-decomp.md`](analysis/04-estrategia-decomp.md) | Recompilar vs decompilar; qué es viable y en qué orden |
| [`analysis/05-entorno.md`](analysis/05-entorno.md) | Máquina, toolchain instalado/faltante y estimaciones |
| [`analysis/06-herramientas.md`](analysis/06-herramientas.md) | Veredicto por herramienta (REA, PS2Recomp, Ghidra, PCSX2) |

## Formatos

| Documento | Contenido |
|---|---|
| [`formats/simb.md`](formats/simb.md) | Contenedor `SIMB` (assets y overlays) |
| [`formats/mwo.md`](formats/mwo.md) | Header de overlay `MWo` |
| [`formats/tyosd.md`](formats/tyosd.md) | Archivo de audio `TYOSD` |

## Plan

- [`roadmap.md`](roadmap.md): fases, entregables y gates.
