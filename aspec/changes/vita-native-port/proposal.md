# Proposal: Port nativo a PS Vita reutilizando el pipeline de PC

## Problem

El juego ya corre en Windows y Linux sobre `ps2-native-recomp` (MIT, commit
`263508314076fda7837b51434222578331047273`): menú de video, memory card, menú principal,
cutscene y gameplay, 36–60 fps (`docs/analysis/07-runtime-nativo.md`). El objetivo es
llevar ese mismo juego a **PS Vita** sin reescribir el motor ni bifurcar el runtime.

La base a favor está medida:

- **24 overlays con código** en `decomp/symbols/` (4.925 funciones, 98,81 % de cobertura)
  y 2.350.016 B de `.text` de `OL.BIN`.
- El **modo carpeta** (`--disc <carpeta>`) ya existe en
  `patches/ps2-native-recomp-sword.patch` y el extractor `scripts/extract-disc.py` ya
  produce los 87 archivos del disco.
- El host es **SDL2** (ventana, audio y gamepad) y la memory card está emulada en
  `runtime/src/iop/sio2.cpp`; VitaSDK provee SDL2 nativo.
- El runtime ya está diseñado en **3 hilos** (EE, VU1, GS) con ring buffers lock-free,
  que calzan con los 3 cores de usuario del Cortex-A9.

Los bloqueos concretos, según el análisis del issue #10 (a re-verificar contra el commit
pineado antes de tocar código):

1. **No hay compilador en consola**: `[ee-live]` y `[vu-live]` usan `<dlfcn.h>`,
   `<spawn.h>` y un compilador externo; en Vita el paquete debe ser **100 % AOT**.
2. **Sólo `menu.bin` está registrado** en `games/sword/overlays/`. Si el juego carga
   `prg_player_0.bin` o una misión no precompilada, se detiene con `missing code`.
3. **`vu_ops.hpp` depende de builtins de Clang** (`__builtin_elementwise_min`,
   `__builtin_convertvector`, `__builtin_reduce_or`) en sus fallbacks genéricos, y
   `CMakeLists.txt` aborta si el compilador no es Clang. VitaSDK usa GCC (`arm-vita-eabi-g++`).
4. **Desfase de plataforma**: `queue.cpp` cae en `sleep_for(1ms)` fuera de
   Linux/Windows/Emscripten, y `os.hpp` exige `fsync() == 0`, que en `ux0:` puede devolver
   `ENOSYS`/`EINVAL`.
5. **Límite de descriptores**: `open_folder()` abre cada archivo con `fopen` y no lo
   cierra; el disco tiene **87 archivos** y en newlib de Vita `FOPEN_MAX` es 20.
6. **Host y renderer**: `host/main.cpp` asume `argc`/`argv` y el backend GPU usa
   `wgpu-native`, que no soporta ARMv7/SceGxm. El rasterizador de CPU
   (`runtime/src/gs/raster.cpp`) + SDL2 sí sirve para el bring-up.

## Proposed change

Un change por fases con gates medibles, donde **cada fase se valida primero en PC** y
sólo después se cruza a Vita:

1. **Fase 1 — Paquete AOT y disco (PC)**: pool LRU de 8 `FILE*` en `open_folder()` del
   parche, y `scripts/prepare-vita-aot.py` que registra los 24 módulos no vacíos de
   `OL.BIN` con sus entradas y recolecta los programas VU1. Gate: el juego corre en PC sin
   `[ee-live]`/`[vu-live]` y sin un solo `missing code`.
2. **Fase 2 — Portabilidad ARMv7/NEON y toolchain**: rama `__ARM_NEON` en `vu_ops.hpp`
   (y `mmi.hpp` si aplica), guardas `__vita__` para excluir `live_build`, `vita_runtime.cpp`
   con heap/stack, logs a `ux0:data/overetheria/`, `env.txt` y handlers de OOM/terminate;
   `CMakeLists.txt` y `host/main.cpp` con rutas por defecto. Gate: `OverEtheria.vpk`
   compila sin símbolos sin resolver.
3. **Fase 3 — Ejecución en Vita3K (M1)**: instalar el `.vpk`, disco en
   `ux0:data/overetheria/disc/`, memory card y controles. Gate: log + captura del menú de
   video, menú principal, cutscene y entrada a gameplay sin crash ni OOM.
4. **Fase 4 — GPU y rendimiento (M2)**: `gpu_vitagl.cpp` sobre OpenGL ES 2.0/vitaGL,
   afinidad de hilos en los 3 cores y ordenamiento de funciones calientes. Gate:
   comparación de frame-time M1 vs M2 sin regresiones visuales.
5. **Cierre**: documentar en `docs/analysis/`, script de build y job de CI opcional.

## Scope

**In of scope**

- Pool de descriptores en `disc.cpp` (beneficia también a Windows/Linux).
- Pipeline AOT completo de overlays y VU1 desde PC, reutilizando
  `register-overlay.py` y `make-overlay-entries.py`.
- Portabilidad NEON y compilación con VitaSDK; runtime Vita y host sin argumentos.
- Backend de render de CPU (M1) y backend vitaGL (M2).
- Script de build del `.vpk`, documentación y gates medibles.

**Out of scope**

- Distribuir el juego, el `.vpk` con contenido, ISO, BIOS o assets: el usuario aporta su
  copia y el paquete sólo lleva código.
- Reemplazar el renderer del juego o portar `wgpu-native` a Vita.
- `[ee-live]`/`[vu-live]` en consola: en Vita el build es AOT por diseño.
- Optimización fina antes de tener el juego corriendo en M1.
- Publicar el `.vpk` en Releases como si incluyera el juego.
- Soportar simultáneamente otras consolas en este change.

## Risks

- **Las referencias de línea del issue #10 son de un commit ajeno**: *Mitigación*: primer
  task del change re-verifica cada punto contra `263508314076fda7837b51434222578331047273`
  y documenta el resultado antes de editar.
- **AOT incompleto**: un overlay sin entradas se detiene con `missing code`. *Mitigación*:
  Gate 1 exige recorrer menú → cutscene → primera misión en PC con `[ee-live]` apagado.
- **NEON no equivalente al camino SSE**: diferencias de redondeo/saturación. *Mitigación*:
  tests comparativos de `vfix`/`vftoi`/`vitof` contra los resultados actuales en x86.
- **Memoria de Vita (160–172 MB útiles)**: heap, stack y código AOT compiten. *Mitigación*:
  heap de 160 MB, código con `-O2`/`-Os`, medir `mallinfo()` y el tamaño del ELF por gate.
- **Toolchain VitaSDK no disponible en CI/Windows**: *Mitigación*: build local documentado
  y job de CI opcional en contenedor; no bloquear el resto del repo.
- **`vitaGL` agrega complejidad antes de validar el juego**: *Mitigación*: M1 con
  `gs/raster.cpp` primero; vitaGL sólo después del Gate 3.
- **Licencias**: VitaSDK/vitaGL son MIT, el runtime es MIT, pero el `.vpk` enlaza código
  del usuario. *Mitigación*: no versionar binarios ni contenido; documentar que el usuario
  construye su propio `.vpk`.
- **Regresión en PC**: los cambios de disco/NEON tocan el camino que hoy funciona.
  *Mitigación*: correr la reproducción de `docs/analysis/07-runtime-nativo.md` en Windows y
  Linux después de cada fase.

## Decisiones

### vita-aot-only

- **memory_key**: `vita-aot-only`
- **Elección**: en Vita el build es **100 % AOT**: todos los overlays y programas VU1 se
  generan en PC y se enlazan estáticamente; no hay compilador en consola.
- **Descartado**: intentar `[ee-live]`/`[vu-live]` con un compilador embebido en Vita.
- **Justificación**: `dlopen`/`spawn` no existen en el entorno de la consola y el
  recompilador ya tiene el corte limpio por `__EMSCRIPTEN__`.
- **Refs**: issue #10 §3.2–3.3, `docs/analysis/07-runtime-nativo.md`.
- **Estado**: propuesta (2026-11-04).

### vita-reuse-sdl2-host

- **memory_key**: `vita-reuse-sdl2-host`
- **Elección**: reutilizar el host SDL2 y el rasterizador de CPU para M1.
- **Descartado**: escribir un renderer específico desde cero (camino de `celosia`) o
  portar `wgpu-native`.
- **Justificación**: `host/window.cpp` ya dibuja con `SDL_Renderer` + `SDL_Texture` y
  VitaSDK expone SDL2 sobre GXM/SceAudio/SceCtrl.
- **Refs**: issue #10 §0.3, §3.6.
- **Estado**: propuesta (2026-11-04).

### vita-raster-first

- **memory_key**: `vita-raster-first`
- **Elección**: validar el juego en Vita con `runtime/src/gs/raster.cpp` (M1) y recién
  después implementar `gpu_vitagl.cpp` (M2).
- **Descartado**: empezar por vitaGL.
- **Justificación**: separa "el juego corre en Vita" de "el juego corre rápido"; un fallo
  de shaders no bloquea el bring-up.
- **Refs**: issue #10 §3.6, §4 Fase 4.
- **Estado**: propuesta (2026-11-04).

### disc-descriptor-pool

- **memory_key**: `disc-descriptor-pool`
- **Elección**: `open_folder()` mantiene como máximo **8 `FILE*`** abiertos con política
  LRU y reapertura por rango.
- **Descartado**: abrir los 87 archivos y dejarlos abiertos, o cerrar/abrir por lectura.
- **Justificación**: en Vita `FOPEN_MAX` es 20 y el límite es por proceso; en PC el cambio
  es inocuo y evita agotar descriptores.
- **Refs**: issue #10 §3.5, `docs/analysis/07-runtime-nativo.md` §Contenido extraído.
- **Estado**: propuesta (2026-11-04).

### vita-patch-boundary

- **memory_key**: `vita-patch-boundary`
- **Elección**: los cambios al runtime viajan en `patches/ps2-native-recomp-sword.patch`
  (o en parches separados aplicados por el pipeline), nunca como fork divergente.
- **Descartado**: editar el clon de `tools/` a mano sin parche reproducible.
- **Justificación**: `prepare-game` restaura el commit pineado antes de aplicar el parche;
  un cambio fuera del parche se pierde en la próxima preparación.
- **Refs**: `AGENTS.md` §Guardrails, `docs/analysis/07-runtime-nativo.md` §Parches propios.
- **Estado**: propuesta (2026-11-04).
