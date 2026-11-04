# Proposal: Validación de gameplay y guardado

## Problem

El juego arranca, muestra el menú y entra a la misión inicial, pero no está verificado
que sea jugable de punta a punta: faltan input de combate, cámara, colisiones, el timing
del tick y el guardado real en la memory card (que el juego habilita recién después del
tutorial). La versión japonesa llega al attract pero no se probó su menú ni sus misiones.

Estas pruebas son de comportamiento del juego, no del launcher ni del pipeline, por eso
van en un change aparte.

## Scope

**In of scope**

- Verificar combate (cuadrado), cámara, colisiones y pausa.
- Completar el tutorial y guardar en la memory card; recargar desde `Load Game`.
- Verificar menú y primera misión de la versión japonesa.
- Medir el tick y documentar el timing.

**Out of scope**

- Cambios al launcher o al pipeline (van en sus changes).
- Optimización de rendimiento.
- Port a consolas.

## Decisions

### tests-in-their-own-change

- **memory_key**: `gameplay-validation-scope`
- **Elección**: las pruebas de juego van en este change, separadas del port y del
  launcher, que ya se cerraron.
- **Justificación**: un change por capacidad; el port y el launcher ya tienen sus gates
  cumplidos y las pruebas no cambian su diseño.
- **Refs**: `docs/analysis/07-runtime-nativo.md`.
- **Estado**: aceptada (2026-11-03).
