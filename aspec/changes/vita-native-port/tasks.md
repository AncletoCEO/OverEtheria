# Tasks: Port nativo a PS Vita reutilizando el pipeline de PC

## Fase 0 — Re-verificación contra el commit pineado

- [ ] Revisar en `tools/ps2-native-recomp` (commit
      `263508314076fda7837b51434222578331047273`) cada punto del issue #10: guardas de
      `live_build`/`ee_live`/`vu_live`, builtins de `vu_ops.hpp`, `queue.cpp`,
      `os.hpp`, `open_folder()` y defaults de `host/main.cpp`.
- [ ] Registrar en `docs/analysis/08-port-vita.md` qué se confirma, qué cambió de línea y
      qué no aplica, con el comando de verificación.

**Gate**: cada afirmación del issue queda confirmada o corregida con evidencia del código
pineado antes de editar cualquier archivo.

## Fase 1 — Paquete AOT y descriptores (todo en PC)

- [ ] Modificar `open_folder()` en `patches/ps2-native-recomp-sword.patch` para mantener
      un pool LRU de 8 `FILE*` con reapertura por archivo.
- [ ] Agregar el contador opcional de descriptores (`PS2_DISC_FD_STATS=1`).
- [ ] Crear `scripts/prepare-vita-aot.py`: extrae los 24 módulos no vacíos de `OL.BIN`,
      escribe `games/sword/overlays/<base>_<crc>.bin` y sus entradas, y recolecta VU1.
- [ ] Implementar `--check` en `prepare-vita-aot.py` (módulos faltantes, entradas
      duplicadas, VU1 sin `.cpp`).
- [ ] Compilar en PC con `[ee-live]`/`[vu-live]` desactivados y correr el recorrido
      menú → cutscene → primera misión.

**Gate 1**: sin `missing code` en todo el recorrido y máximo de descriptores ≤ 8
(medido con `PS2_DISC_FD_STATS=1`).

## Fase 2 — Portabilidad ARMv7/NEON y runtime Vita

- [ ] Agregar la rama `__ARM_NEON` en `runtime/include/ps2/vu_ops.hpp` (`vfix`, `vftoi`,
      `vitof`, flags y reducciones) y revisar `mmi.hpp`.
- [ ] Agregar test comparativo NEON vs x86 para vectores de borde.
- [ ] Extender las guardas de `CMakeLists.txt`, `ee_live.cpp` y `vu_live.cpp` a `__vita__`.
- [ ] Crear `runtime/src/vita_runtime.cpp` (heap/stack, logs a `ux0:`, `env.txt`,
      handlers de OOM/terminate, memcpy/memset NEON si hay ganancia medida).
- [ ] Agregar el bloque `__vita__` en `queue.cpp` (semáforos, sin `sleep_for(1ms)`).
- [ ] Tolerar `ENOSYS`/`EINVAL`/`EBADF` de `fsync` en `os.hpp` bajo `__vita__`.
- [ ] Ajustar `host/main.cpp` con rutas por defecto `ux0:data/overetheria/` cuando no hay
      argumentos.

**Gate**: el runtime y el código generado compilan para ARMv7 con NEON; los tests
comparativos de `vfix`/`vftoi`/`vitof` pasan.

## Fase 3 — Build del VPK

- [ ] Adaptar `CMakeLists.txt` para `vita.toolchain.cmake`, `-O2`/`-Os` en código
      generado y `pthread` con `--whole-archive`.
- [ ] Crear `scripts/build-vita.sh` con configuración, build y empaquetado
      (`vita_create_self` + `vita_create_vpk`, `TITLEID = ETHR00001`).
- [ ] Verificar que el `.vpk` no incluye `disc/`, `memcard.ps2`, ISO ni assets.

**Gate 2**: `scripts/build-vita.sh` produce `OverEtheria.vpk` sin errores ni símbolos sin
resolver, y el listado del `.vpk` sólo tiene código propio.

## Fase 4 — Ejecución en Vita3K (M1)

- [ ] Instalar el `.vpk` en Vita3K y preparar `ux0:data/overetheria/disc/` con el disco
      extraído del usuario.
- [ ] Verificar `log.txt`/`err.txt`, `env.txt` y la creación/lectura de `memcard.ps2`.
- [ ] Verificar controles (`SDL_GameController`) y audio (`SceAudio`).
- [ ] Recorrer menú de video → menú principal → cutscene → entrada a gameplay.

**Gate 3**: log y captura muestran el recorrido completo sin crash ni OOM, con la memory
card detectada y `Load Game` disponible.

## Fase 5 — GPU y rendimiento (M2)

- [ ] Implementar `runtime/src/gs/gpu/gpu_vitagl.cpp` sobre OpenGL ES 2.0/vitaGL
      traduciendo `gs.wgsl` y `blit.wgsl`.
- [ ] Empaquetar la semilla de shaders `.gxp` y copiarla a `ux0:data/shader_cache/`.
- [ ] Fijar afinidad de hilos (Core 0 EE; Cores 1–2 VU1/GS/audio) y medir.
- [ ] Agregar `-ffunction-sections` + `--section-ordering-file` para funciones calientes.
- [ ] Comparar frame-time y regresiones visuales contra M1.

**Gate 4**: mejora medible de frame-time en Vita3K/consola sin regresiones visuales
respecto a M1.

## Fase 6 — Documentación, CI y cierre

- [ ] Documentar el port en `docs/analysis/08-port-vita.md` (toolchain, layout en `ux0:`,
      `env.txt`, gates y límites).
- [ ] Agregar job de CI opcional con VitaSDK (build del `.vpk` sin contenido del juego).
- [ ] Actualizar `README.md` §Estado y `docs/roadmap.md` con el estado de Vita.
- [ ] Correr la reproducción de PC en Windows/Linux para descartar regresiones.
- [ ] Revisar `git status` (sin `.vpk`, `.bin`, `.elf`, ISO, `disc/`).
- [ ] Sincronizar el spec y archivar el change.
