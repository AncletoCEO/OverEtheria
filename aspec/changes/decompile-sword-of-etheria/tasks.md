# Tasks: Decompilación anotada de Sword of Etheria

> Cambio `decompile-sword-of-etheria`. Cada tarea se verifica sola y el orden es el
> de dependencia. Nada se marca hecho sin evidencia reproducible.

## Fase 0 — Toolchain y workspace

- [x] Instalar y verificar JDK 21 + Ghidra 12.x; registrar versiones exactas en
      `docs/analysis/05-entorno.md`.
- [x] Instalar un ensamblador MIPS para verificación (Zig/LLVM:
      `zig cc -target mipsel-freestanding`); registrar el comando que funciona.
- [x] Crear `work/elf/`, `work/overlays/` y `work/ghidra/` (ignorados) y extraer
      `SLES_537.68` y `OL.BIN` del ISO con 7-Zip o `bsdtar`.
- [x] Verificar la extracción: tamaño del ELF, magic `SIMB` de `OL.BIN` y
      `node scripts/inspect-disc.mjs --md5` en verde.

## Fase 1 — Extracción reproducible de overlays

- [x] Implementar `scripts/extract-overlays.mjs`: parsea el header y el TOC de
      `SIMB`, valida alineación y escribe cada módulo en `work/overlays/<name>`.
- [x] Agregar verificación al script: 25 módulos, bases `0x100000`/`0x154000`,
      `size == 0x40 + sz_text + sz_data` y offset alineado a 2048.
- [x] Generar `decomp/modules.json` con `name`, `id`, `base`, `text`, `data`, `bss`,
      `offset` y `sha256` de cada módulo.
- [x] Confirmar que `work/` sigue ignorado: `git status --short` no muestra ningún
      blob extraído.

## Fase 2 — Ingesta en Ghidra

- [x] Importar `SLES_537.68` en Ghidra como `r5900:LE:32:default` y exportar el mapa
      de funciones con el script del repo legado (solo como exportador, no como
      baseline).
- [x] Auditar la cobertura de `main`: funciones por rango y huecos conocidos
      (`0x4C0708`, `0x4DCFEC`); documentar si son código o datos y comparar contra el
      CSV del intento fallido (sin adoptarlo).
- [x] Implementar el descubrimiento de funciones por referencias reales
      (`JAL`/`J`/branch/tablas/vtables) y generar el mapa del módulo; **no** usar el
      CSV del recomp.
- [x] Importar `mission22.bin` (3.392 B) en su base `0x154000` y exportar funciones y
      símbolos.
- [x] Documentar el ABI de overlay: punto de entrada, `_static_init`, convención de
      llamada y uso de `gp`.
- [x] Importar `menu.bin` en `0x100000` y registrar el conteo de funciones (sin
      decompilar todavía).

## Fase 3 — Registro y convenciones

- [x] Escribir `decomp/README.md` con el layout y la convención de nombres
      (`sub_`, `g_`, `s_`, `v_`, `f_`) y el formato de `symbols/*.csv`.
- [x] Crear `decomp/symbols/main.csv` y `decomp/symbols/mission22.csv` con el formato
      definido (address, name, size, kind, source).
- [x] Crear `decomp/structs/` con una plantilla y el primer struct identificado del
      motor.
- [x] Implementar `scripts/validate-decomp.mjs`: módulos con hash, símbolos dentro
      del rango del módulo, sin duplicados y sin archivos binarios en `decomp/`.

## Fase 4 — Piloto `mission22`

- [x] Decompilar `mission22.bin` completo a `decomp/src/mission22/mission22.c`.
- [x] Verificar `mission22` estructuralmente (hash, 832/832 instrucciones, prólogos/
      epílogos, llamadas) y documentar en `decomp/modules/mission22.md` por qué no hay
      byte-match (MWCC propietario, pseudocódigo, LLVM sin `lq`/`sq`).
- [x] Documentar funciones, structs, ABI y evidencia del módulo.

## Fase 5 — Arranque de `menu.bin`

- [x] Triar las funciones de `menu.bin` en subsistemas (init, input, render, audio,
      navegación) y volcarlo en `decomp/modules/menu.md`.
- [x] Elegir el primer subsistema y decompilarlo con el mismo ciclo que `mission22`.
- [x] Actualizar el estado del módulo y los símbolos en `decomp/`.

## Fase 6 — Gate y cierre

- [ ] Integrar `validate-decomp.mjs` al flujo local (y a CI cuando exista).
- [ ] Actualizar `docs/roadmap.md` (fase 5) y `docs/analysis/02` con lo aprendido.
- [ ] Revisar que no haya contenido del juego versionado y cerrar el change.
