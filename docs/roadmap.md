# Roadmap

> Fase vigente: **0 (hecha) → 1**. Cada fase tiene un gate medible; no se avanza sin él.

## Fase 0 — Repo y análisis ✅ (2026-11-03)

- Repo git con `.gitignore` que excluye todo el contenido del juego.
- Análisis del disco, ELF, overlays, formatos y del intento anterior.
- Herramienta reproducible: `scripts/inspect-disc.mjs`.
- Pins de herramientas en `tools.lock.toml`.

**Gate**: `node scripts/inspect-disc.mjs --md5` reproduce el MD5 esperado y la tabla
de overlays.

## Fase 1 — Build reproducible

- Elegir toolchain (ver `analysis/05-entorno.md`).
- Compilar `ps2_recomp` + `ps2_analyzer` del fork pineado.
- Extraer el ELF y `OL.BIN`; generar los ~18k `.cpp`; correr `split_monsters.py`.
- Compilar el juego y correr 60 s.

**Gate**: el binario arranca y emite los logs base (`vblank`, `gs:present`,
`frame-loop`) sin crash. Tiempos y flags documentados.

## Fase 2 — Menú visible

- Atacar el lead medido: el pase único de subida de texturas procesa 1 asset en vez
  de 6; la lista de 6 objetos de UI (`0xA88874`) nunca se arma.
- Método: trazas de control de flujo + comparación con savestate real del menú.
- Sin triages: `SWORD_FORCE_STATE=0` y sin parches de emergencia.

**Gate**: frame presentado con `rgbNZ > 0` y el menú visible.

## Fase 3 — Overlays (el gate al juego)

- Recompilar los 25 módulos `MWo` con su base (`0x100000` / `0x154000`).
- Implementar en el runtime:
  - loader `SIMB`/`MWo` (copiar text/data, limpiar bss, ejecutar `_static_init`);
  - **overlay bank**: tabla de funciones por módulo;
  - dispatch de llamadas indirectas al módulo activo.
- Validar con `prg_player_0.bin` (229 KB) y `menu.bin` (369 KB).

**Gate**: el log muestra `pc` dentro de `0x100000`/`0x154000` y el overlay ejecuta
su código recompilado, sin caer a "función no encontrada".

## Fase 4 — Primer nivel jugable

- Cargar `mission01.bin` y ejecutar gameplay básico.
- Pad (SIO2 real o HLE completo), cámara, colisiones.
- Resolver el timing del tick (~9/s vs 60 fps).

**Gate**: una misión jugable de punta a punta (aunque sea con audio mudo).

## Fase 5 — Decompilación por módulos

Orden sugerido: `mission98.bin` (192 B) → `menu.bin` → misiones.

- Proyecto de Ghidra versionado (solo metadatos: símbolos, structs, comentarios).
- Nombres y tipos en `decomp/`.
- Comparación contra el original (asm-differ/objdiff o test de comportamiento).

**Gate**: un módulo recompilado desde fuente propia se comporta igual que el original
en los casos de prueba definidos.

## Fase 6 — Portabilidad

- Abstraer renderer (GS → backend moderno) y audio (TYOSD → mixer propio).
- Input y guardado.
- Targets: Windows/Linux → Android/Vita → otros.

**Gate**: build sin la capa de emulación de hardware para el menú y una misión.

## Decisiones pendientes

| Decisión | Opciones | Cuándo |
|---|---|---|
| Toolchain | WSL2 / MSVC | antes de fase 1 |
| Base del código | extender el fork legado / reescribir runtime limpio | fase 1 |
| Overrides del juego | reusar `game_overrides.cpp` (250 hooks) / reimplementar por módulo | fase 3 |
| Audio | emular SPU2 / parsear `TYOSD` offline | fase 4 |
| Decomp | anotada / matching (si aparece MWCC 2.4.x) | fase 5 |
