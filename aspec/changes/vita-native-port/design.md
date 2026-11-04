# Design: Port nativo a PS Vita reutilizando el pipeline de PC

## Approach

El port se construye como **una capa de plataforma sobre lo que ya funciona**, no como
un runtime nuevo. La regla de oro: *todo cambio se valida en PC antes de cruzar a Vita*.

1. **AOT primero**: el paquete de Vita se genera en PC con el mismo `eerecomp`/`vurecomp`.
   Si en PC el juego corre sin `[ee-live]`/`[vu-live]`, el paquete AOT está completo y
   Vita no necesita compilador.
2. **Una sola frontera de parche**: los cambios al runtime de `ps2-native-recomp` se
   agregan a `patches/ps2-native-recomp-sword.patch` (o a un parche Vita aplicado después),
   porque `prepare-game` restaura el commit pineado antes de aplicar.
3. **M1 antes que M2**: primero el juego corre en Vita con el rasterizador de CPU y SDL2;
   recién después se reemplaza el render por vitaGL.
4. **Verificación por gate**: ninguna fase avanza sin su medición, registrada con comando
   de reproducción.

Antes de tocar código, un task de **re-verificación** contrasta cada punto del issue #10
(rutas, líneas y límites) contra el commit pineado `263508314076fda7837b51434222578331047273`
y deja el resultado en `docs/analysis/`. El issue es la hipótesis; el código pineado es la
fuente.

## Architecture

### Pipeline completo

```text
PC (Windows/Linux)                                    PS Vita (VitaSDK)
─────────────────────────────────────────────         ─────────────────────────────
ISO del usuario
  └─ extract-disc.py ──► disc/ (87 archivos)
  └─ OL.BIN ──► prepare-vita-aot.py
                 ├─ register-overlay.py  ──► games/sword/overlays/<base>_<crc>.bin
                 ├─ make-overlay-entries.py ──► games/sword/entries.txt
                 └─ vurecomp             ──► games/sword/vu/*.cpp
  └─ eerecomp ──► C++ generado (AOT, sin ee_live)
                 │
                 └──────────────► arm-vita-eabi-g++  ──► eboot.bin ──► OverEtheria.vpk
                                  runtime + host SDL2 + gs/raster.cpp
```

### Fase 1 — Paquete AOT y descriptores

**`scripts/prepare-vita-aot.py`** (nuevo, Python stdlib + llamadas a las tools del clon):

- Lee `decomp/modules.json` y descarta `mission98.bin` (192 B de ceros).
- Para cada módulo no vacío:
  - extrae el blob de `OL.BIN` respetando `offset`/`size` del TOC `SIMB`;
  - escribe `games/sword/overlays/<base>_<crc>.bin` con la cabecera `MWo3` intacta;
  - genera sus entradas con `scripts/register-overlay.py` y/o
    `scripts/make-overlay-entries.py`, partiendo de `decomp/symbols/<módulo>.csv` y de los
    prólogos del rango de texto;
  - anexa las entradas a `games/sword/entries.txt` sin duplicar.
- Recolecta los programas VU1 de `games/sword/vu/` y verifica que exista su `.cpp` AOT.
- `--check` informa qué módulos faltan sin escribir nada.

**`disc.cpp` (`open_folder`)**: pool de 8 `FILE*` con LRU.

- Estructura por archivo: rango de sectores, `FILE*` (o `nullptr`) y contador de uso.
- `read(lba, count)`: localiza el archivo; si su `FILE*` es `nullptr`, cierra el LRU y
  hace `fopen`; mueve el puntero y lee.
- `close_folder()`: cierra todos.
- Instrumentación opcional (`PS2_DISC_FD_STATS=1`) que imprime el máximo de descriptores
  simultáneos al salir, para el gate.

### Fase 2 — Portabilidad y runtime Vita

**`runtime/include/ps2/vu_ops.hpp`** (y `mmi.hpp` si aplica): rama
`#elif defined(__ARM_NEON)` con `<arm_neon.h>`:

- `vfix`: `vandq_u32`, `vminq_u32`, `vcgtq_s32`, `vorrq_u32` con la misma semántica de
  saturación que el camino `__SSE4_1__`.
- `vftoi` / `vitof`: `vcvtq_s32_f32` / `vcvtq_f32_s32` con saturación explícita.
- `flags`: extracción de signo/cero/overflow por lane.
- Reducciones (`__builtin_reduce_or`): `vorr_u32(vget_low_u32(v), vget_high_u32(v))`.

`CMakeLists.txt`: aceptar `VITA` (GCC de VitaSDK o Clang con `--target=arm-vita-eabi`) y
excluir `live_build.cpp`/`ee_live.cpp`/`vu_live.cpp` con `#if defined(__EMSCRIPTEN__) ||
defined(__vita__)`.

**`runtime/src/vita_runtime.cpp`** (nuevo, compilado con `-fno-lto` y no descartable):

```cpp
extern "C" unsigned int _newlib_heap_size_user = 160u * 1024u * 1024u;
extern "C" unsigned int sceLibcHeapSize = 8u * 1024u * 1024u;
extern "C" unsigned int sceUserMainThreadStackSize = 8u * 1024u * 1024u;
extern "C" unsigned int _pthread_stack_default_user = 256u * 1024u;
```

Además:

- Redirección de `stdout`/`stderr` a `ux0:data/overetheria/log.txt` y `err.txt` antes de
  `main()`.
- Lectura de `ux0:data/overetheria/env.txt` (`KEY=VALUE`) con `setenv()`.
- `std::set_terminate` y `operator new` con reporte de `mallinfo()` por `sceIoWrite`.
- `memcpy`/`memset` inline con NEON para bloques `<= 512` B (medir antes/después; si no
  hay ganancia, no se mantiene).

**`queue.cpp`**: bloque `#elif defined(__vita__)` con semáforos (`sceKernelCreateSema`,
`sceKernelWaitSema`, `sceKernelSignalSema`) o `std::condition_variable`, sin el
`sleep_for(1ms)`.

**`os.hpp`**: bajo `#ifdef __vita__`, tratar `ENOSYS`, `EINVAL` y `EBADF` de `fsync` como
no fatales.

**`host/main.cpp`**: cuando no hay argumentos, usar por defecto:

```text
ELF:         ux0:data/overetheria/disc/SLES_537.68
Disco:       ux0:data/overetheria/disc
Memory card: ux0:data/overetheria/memcard.ps2
Ventana:     activa
```

**Build**: `scripts/build-vita.sh` configura CMake con `vita.toolchain.cmake`, compila
`ps2runtime` con `-O3` y el código generado con `-O2`, enlaza `pthread` con
`--whole-archive` y empaqueta con `vita_create_self` + `vita_create_vpk`
(`TITLEID = ETHR00001`). El `.vpk` no incluye `disc/`, `memcard.ps2` ni ISO.

### Fase 3 — Ejecución (M1)

- Layout esperado en la consola/emulador:
  `ux0:data/overetheria/{disc/,memcard.ps2,log.txt,err.txt,env.txt}`.
- Mapeo de controles: `SDL_GameController` de VitaSDK; audio `SceAudio`; guardado por
  `sio2.cpp` con el `fsync` tolerante.
- Afinidad inicial: Core 0 = EE; Cores 1–2 = VU1 + GS/render + audio/IO.
- `env.txt` documentado con las variables que hoy se pasan por CLI (`PS2_*`, `--ntsc`).

### Fase 4 — GPU (M2)

- `runtime/src/gs/gpu/gpu_vitagl.cpp` implementa `ps2::gs::gpu` sobre OpenGL ES 2.0
  (`vitaGL`), traduciendo `gs.wgsl` y `blit.wgsl`.
- Flags de vitaGL: `STORE_DEPTH_STENCIL=1`, `HAVE_VERTEX_LAYOUT_CACHE=1`,
  `HAVE_SHADER_CACHE=1`, `NO_SPLASHSCREEN=1`.
- Semilla de shaders `.gxp` en `app0:shader_cache/`, copiada a
  `ux0:data/shader_cache/<TITLEID>/` en el primer arranque.
- `-ffunction-sections` + `--section-ordering-file` para agrupar funciones calientes.

### Riesgo de regresión en PC

`disc.cpp`, `vu_ops.hpp`, `queue.cpp` y `os.hpp` son compartidos. Cada fase cierra con la
reproducción de `docs/analysis/07-runtime-nativo.md` en Windows (y Linux si hay runner),
comparando FPS y ausencia de `missing code`.

## Validation

| Gate | Comando / evidencia | Criterio |
|---|---|---|
| 0. Re-verificación | diff de cada punto del issue #10 contra el commit pineado, en `docs/analysis/` | cada afirmación queda confirmada o corregida antes de editar |
| 1. AOT en PC | `ps2run` sin `[ee-live]`/`[vu-live]` + `PS2_DISC_FD_STATS=1` | menú → cutscene → primera misión sin `missing code`; máximo de descriptores ≤ 8 |
| 2. Build Vita | `scripts/build-vita.sh` | `OverEtheria.vpk` generado, sin símbolos sin resolver |
| 3. Ejecución M1 | `ux0:data/overetheria/log.txt` + captura en Vita3K | menú de video, menú principal, cutscene y gameplay sin crash ni OOM |
| 4. Rendimiento M2 | frame-time M1 vs M2 en Vita3K/consola | sin regresión visual y mejora medible de frame-time |

Pruebas adicionales:

- **NEON**: test comparativo de `vfix`/`vftoi`/`vitof` contra resultados x86 para un set
  de vectores de borde (saturación, NaN, ±0).
- **Descriptores**: correr el disco completo con el pool y con `strace`/contador; nunca
  más de 8 `FILE*` simultáneos.
- **Contenido**: `git status --short` sin `.vpk`, `.bin`, `.elf`, ISO ni `disc/`.
- **PC**: la corrida de reproducción de `07-runtime-nativo.md` sigue pasando en Windows.
