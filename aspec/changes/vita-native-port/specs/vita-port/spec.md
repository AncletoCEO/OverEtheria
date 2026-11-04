## ADDED Requirements

### Requirement: Paquete AOT completo de overlays y VU1

El sistema SHALL generar en PC el código de los 24 módulos `MWo` con código y de los
programas VU1 necesarios, y SHALL ejecutar el juego sin compilador en runtime.

#### Scenario: Recorrido sin compilador

- **WHEN** se compila el juego con `[ee-live]` y `[vu-live]` desactivados y se recorre
  menú, cutscene y primera misión
- **THEN** no se produce ninguna detención por `missing code` ni se invoca un compilador
  externo

#### Scenario: Overlay sin registrar

- **WHEN** un módulo de `OL.BIN` no vacío no está en `games/sword/overlays/` o no tiene
  entradas
- **THEN** `scripts/prepare-vita-aot.py --check` falla y nombra el módulo y lo que falta

#### Scenario: Stub vacío

- **WHEN** se prepara el paquete AOT
- **THEN** `mission98.bin` (192 B de ceros) se excluye explícitamente y no se cuenta como
  módulo con código

### Requirement: Portabilidad ARMv7/NEON

El sistema SHALL compilar el runtime y el código generado para ARMv7 con NEON sin depender
de builtins exclusivos de Clang.

#### Scenario: Compilación con GCC de VitaSDK

- **WHEN** se compila con `arm-vita-eabi-g++` o Clang con `--target=arm-vita-eabi`
- **THEN** no se usan `__builtin_elementwise_min`, `__builtin_convertvector` ni
  `__builtin_reduce_or` en el camino ARM, y el build termina sin errores

#### Scenario: Equivalencia de conversiones VU

- **WHEN** se ejecutan los tests comparativos de `vfix`, `vftoi` y `vitof` con vectores de
  borde (saturación, NaN, ±0)
- **THEN** los resultados coinciden con el camino x86 de referencia

### Requirement: Runtime Vita con memoria y diagnóstico

El sistema SHALL arrancar en Vita con heap, stack y redirección de diagnóstico configurados
antes de `main()`, de modo que un fallo deje evidencia en la tarjeta.

#### Scenario: Arranque sin consola

- **WHEN** la aplicación arranca en Vita
- **THEN** `stdout` y `stderr` se escriben en `ux0:data/overetheria/log.txt` y `err.txt`, y
  `env.txt` se aplica con `setenv()`

#### Scenario: Falta de memoria

- **WHEN** una reserva falla o el proceso aborta
- **THEN** el handler escribe el estado de `mallinfo()` en `ux0:data/overetheria/` antes de
  terminar

#### Scenario: Guardado en `ux0:`

- **WHEN** `fsync` devuelve `ENOSYS`, `EINVAL` o `EBADF` al escribir la memory card
- **THEN** el guardado se considera exitoso si los datos se escribieron, y el juego no
  falla

### Requirement: Espera de colas sin sondeo

El sistema SHALL sincronizar los hilos de EE, VU1 y GS en Vita con semáforos o variables de
condición, sin esperas fijas de 1 ms.

#### Scenario: Despertar de un hilo

- **WHEN** el hilo productor publica trabajo en una cola
- **THEN** el consumidor despierta por semáforo/condvar y no por `sleep_for(1ms)`

### Requirement: Host Vita sin argumentos

El host SHALL arrancar con rutas por defecto cuando no recibe argumentos de línea de
comandos.

#### Scenario: Arranque desde el LiveArea

- **WHEN** el usuario abre el juego sin argumentos
- **THEN** usa `ux0:data/overetheria/disc/SLES_537.68`, `--disc ux0:data/overetheria/disc`
  y `ux0:data/overetheria/memcard.ps2`, con ventana activa

### Requirement: Build reproducible del VPK

El sistema SHALL producir `OverEtheria.vpk` desde el código del repo y el contenido que
aporta el usuario, con un comando documentado.

#### Scenario: Build limpio

- **WHEN** se ejecuta `scripts/build-vita.sh` con VitaSDK instalado
- **THEN** se genera `OverEtheria.vpk` sin errores ni símbolos sin resolver

#### Scenario: Paquete sin contenido del juego

- **WHEN** se lista el contenido del `.vpk`
- **THEN** no incluye `disc/`, ISO, `memcard.ps2`, `.bin` de overlays ni assets del juego

### Requirement: Ejecución en Vita3K (M1)

El sistema SHALL ejecutar el juego en Vita3K con el rasterizador de CPU y SDL2.

#### Scenario: Recorrido de bring-up

- **WHEN** se instala el `.vpk` y se coloca el disco extraído en `ux0:data/overetheria/disc/`
- **THEN** el log y la captura muestran menú de video, menú principal, cutscene y entrada a
  gameplay sin crash ni OOM

#### Scenario: Memory card detectada

- **WHEN** existe `ux0:data/overetheria/memcard.ps2`
- **THEN** el juego la detecta, ofrece `Load Game` y puede escribir en ella

### Requirement: Backend GPU vitaGL (M2)

El sistema SHALL ofrecer un backend de render sobre `vitaGL` que reemplace al rasterizador
de CPU sin cambiar el comportamiento del juego.

#### Scenario: Comparación M1 vs M2

- **WHEN** se ejecuta la misma escena con `gs/raster.cpp` y con `gpu_vitagl.cpp`
- **THEN** el frame-time de M2 es menor y no hay regresiones visuales medibles

### Requirement: Contenido del usuario fuera del repositorio

El sistema SHALL mantener el ISO, el disco extraído, los overlays y el `.vpk` fuera de git
y fuera de las releases.

#### Scenario: Revisión antes de commitear

- **WHEN** se ejecuta `git status --short` después de preparar el paquete AOT y compilar el
  `.vpk`
- **THEN** no aparecen `.iso`, `.bin`, `.elf`, `.pss`, `disc/`, `.vpk` ni capturas
