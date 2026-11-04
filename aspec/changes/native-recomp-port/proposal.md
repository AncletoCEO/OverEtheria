# Proposal: Recompilación nativa y portabilidad de Sword of Etheria

## Problem

El juego no tiene un build nativo reproducible y el intento anterior no sirve como
base: su `work/` (18k `.cpp` + binario de 382 MB) desapareció y su pantalla quedó
negra. Además, la decompilación anotada que ya existe **no es compilable**: son
4.925 funciones de pseudocódigo, no una fuente que produzca un ejecutable.

Los hechos medidos que condicionan el port:

1. **El 29 % del código vive en overlays.** `OL.BIN` trae 25 módulos `MWo`
   (2,35 MB de text) que el recomp previo **nunca compiló**: su CSV tiene 0 funciones
   por debajo de `0x4C0000`. PS2Recomp no soporta overlays.
2. **El menú sigue negro.** El pipeline GS/VU1 está verificado byte a byte, pero el
   pase único de subida de texturas del arranque procesa 1 asset en vez de 6 y nunca
   sube el atlas PSMT8 ni su CLUT.
3. **No hay capa de plataforma.** El runtime actual mezcla lógica del juego con
   emulación de hardware PS2 (GS, VU1, DMA, IOP, SPU2) y usa rutas/decisiones de
   escritorio. Portear a otra consola hoy implicaría bifurcar el runtime.
4. **No hay build reproducible en este repo.** El toolchain (WSL2 o MSVC), el pin del
   fork y el gate del CSV están documentados, pero no ejecutados acá.

El objetivo del usuario es **jugar en PC y portear el juego a otras consolas de forma
nativa**, no depender de PCSX2. La decompilación hecha es soporte (símbolos, ABI de
overlays, mapa de módulos), no el entregable jugable.

## Proposed change

Construir el track de **recompilación nativa portable** sobre PS2Recomp, con dos
invariantes: el código recompilado del juego no se toca a mano y toda dependencia de
plataforma queda detrás de un backend.

1. **Build reproducible**: toolchain pineado (WSL2 o MSVC), fork de PS2Recomp en un
   commit fijo, extracción del ISO, generación de los `.cpp`, splitter, gate del CSV
   y compilación. Un comando, de cero a binario.
2. **Overlays**: loader `SIMB`/`MWo` en el runtime (copiar text/data, limpiar bss,
   ejecutar `_static_init`), **overlay bank** (tabla de funciones por módulo en su
   base) y dispatch de llamadas `main ↔ overlay`.
3. **Menú visible**: cerrar el lead medido del atlas de texturas usando los símbolos
   de la decomp; comparar contra savestates de PCSX2.
4. **Primera misión jugable**: cargar una misión, pad, cámara, timing de tick.
5. **Backends portables**: interfaces de render, audio, input, FS y tiempo; backend
   de escritorio (raylib/GL) y un backend nulo/headless. El core (memoria, scheduler,
   overlays, GS/VU emulados) no conoce la plataforma.
6. **Targets**: Windows/Linux como baseline; después 1–2 consolas elegidas por
   toolchain disponible y viabilidad legal, con el mismo core y otro backend.
7. **Release/CI**: binarios por tag, sin contenido del juego, con validación de MD5
   del ISO del usuario.

El change es grande y se ejecuta por hitos: build → overlays → menú → misión →
backend portable → consola. Cada hito tiene un gate medible.

## Scope

**In of scope**

- Toolchain y build reproducible del recomp (Windows/Linux).
- Cambios al fork del runtime: loader de overlays, overlay bank, dispatch.
- Fix del menú negro y de la primera misión.
- Abstracción de backends (render/audio/input/FS/tiempo) y backend de escritorio.
- Uso de los símbolos/mapa de la decomp para nombrar y diagnosticar.
- CI y release reproducible; documentación de plataformas.
- Un target de consola a definir (no se implementan SDKs propietarios sin decisión).

**Out of scope**

- Matching decompilation byte a byte (requiere MWCC 2.4.x; change aparte).
- Port desde la decomp reescribiendo el motor (camino de años).
- Distribuir ISO, BIOS, ELF, `.BIN` o assets.
- Jugar en PCSX2 (ya disponible; no es el objetivo).
- Compatibilidad con todas las consolas a la vez.
- Reescritura completa del renderer o del motor.

## Risks

- **PS2Recomp es experimental y no soporta overlays**: el overlay bank es una
  extensión nueva del runtime. *Mitigación*: implementarlo aislado, con tests por
  módulo (`prg_player_0`, `menu`, `mission22`) y logs de `pc` en `0x100000`/`0x154000`.
- **El menú negro puede esconder más de un problema**: el lead del atlas está medido,
  pero el timing del loader (~9 ticks/s) es frágil. *Mitigación*: comparar contra
  savestates de PCSX2 antes de encadenar deducciones.
- **Portabilidad real**: el core aún emula GS/VU1/IOP; llevarlo a una consola implica
  portar o reemplazar esos backends. *Mitigación*: interfaces desde el inicio y un
  backend nulo/headless como contrato.
- **Rendimiento**: GS/VU emulados son lentos. *Mitigación*: medir por hito; no
  optimizar antes de tener el juego completo.
- **Licencias**: el runtime del fork es GPLv3; el repo es MIT y el binario que enlaza
  el runtime queda cubierto por GPL. *Mitigación*: mantener la frontera documentada y
  no copiar código de PCSX2.
- **Contenido con copyright**: *Mitigación*: ISO/BIOS del usuario, `.gitignore`,
  releases sin assets y validación MD5.
- **Explosión de alcance**: 25 misiones + cinemáticas + audio. *Mitigación*: hitos
  con gate; una misión primero, no el juego completo.

## Decisiones

### recomp-native-path

- **memory_key**: `recomp-native-path`
- **Elección**: llegar al juego nativo con **recompilación estática (PS2Recomp) +
  runtime**, usando la decompilación como soporte.
- **Descartado**: matching decompilation y port reescribiendo el motor desde el
  pseudocódigo.
- **Justificación**: el recomp ya existe, arranca y corre el bucle del juego; la decomp
  no es compilable y el byte-match requiere MWCC 2.4.x. Es el único camino a un
  ejecutable nativo en el corto/mediano plazo.
- **Refs**: `docs/analysis/03-intento-anterior.md`,
  `docs/analysis/04-estrategia-decomp.md`, `decomp/analysis/decompilation-summary.md`.
- **Estado**: aceptada (2026-11-03).

### overlay-bank-first

- **memory_key**: `overlay-bank-first`
- **Elección**: implementar el **overlay bank** y el loader `SIMB`/`MWo` antes de
  perseguir el juego completo.
- **Descartado**: seguir solo con `main` y asumir que el juego entero está ahí.
- **Justificación**: 25 módulos y 2,35 MB de text (29 % del código) viven en overlays;
  sin ellos no hay misiones ni menú real. PS2Recomp no los soporta.
- **Refs**: `docs/analysis/02-ejecutable-y-overlays.md`,
  `decomp/analysis/overlay-abi.md`, `docs/formats/mwo.md`.
- **Estado**: aceptada (2026-11-03).

### portable-backend

- **memory_key**: `portable-backend`
- **Elección**: separar **core del runtime** (memoria, scheduler, overlays, GS/VU) de
  **backends de plataforma** (render, audio, input, FS, tiempo) con interfaces.
- **Descartado**: bifurcar el runtime por consola o meter `#ifdef` de plataforma en el
  código del juego.
- **Justificación**: el objetivo es portear a otras consolas; sin una frontera clara
  cada target duplica el trabajo y rompe el core.
- **Refs**: `docs/analysis/04-estrategia-decomp.md`,
  `docs/analysis/06-herramientas.md`.
- **Estado**: aceptada (2026-11-03).

### no-legacy-artifacts

- **memory_key**: `no-legacy-artifacts`
- **Elección**: reconstruir el build desde las fuentes pineadas; del intento anterior
  se usa **solo la evidencia**, no sus artefactos.
- **Descartado**: reutilizar `work/`, el binario o el CSV de 20.434 funciones.
- **Justificación**: el intento falló y sus artefactos no existen o son engañosos
  (10.057 solapamientos; 0 funciones de overlay).
- **Refs**: `docs/analysis/03-intento-anterior.md`,
  `decomp/analysis/main-coverage.md`.
- **Estado**: aceptada (2026-11-03).

### decomp-as-support

- **memory_key**: `decomp-as-support`
- **Elección**: usar los símbolos, el mapa de módulos y el ABI de overlays de la decomp
  para acelerar el runtime.
- **Descartado**: esperar a tener la decomp completa o portar desde el pseudocódigo.
- **Justificación**: ya hay 4.925 funciones y 98,81 % de cobertura; los 313 targets del
  menú y el ABI de overlays son insumo directo para el loader y el fix del menú.
- **Refs**: `decomp/analysis/decompilation-summary.md`,
  `decomp/modules/menu.md`.
- **Estado**: aceptada (2026-11-03).

### portable-mingw-toolchain

- **memory_key**: `portable-mingw-toolchain`
- **Elección**: usar **w64devkit (GCC 16.2.0 + GNU Make 4.4.1)** con **CMake 4.4.5**
  y **Python 3.12.10 embebido**, todo en `tools/` y sin admin.
- **Descartado**: WSL2 (admin + reboot) y MSVC Build Tools (UAC + ~6 GB).
- **Justificación**: la shell no está elevada; el toolchain portable cubre C++20, make
  y los scripts sin permisos. Riesgo: no es el path documentado (MSVC/Linux) y puede
  requerir ajustes de CMake/FFmpeg; WSL2/MSVC quedan como fallback.
- **Refs**: `docs/analysis/05-entorno.md`, `tools.lock.toml`.
- **Estado**: aceptada (2026-11-03, durante implementación). Reemplazada en la
  Revisión 2 por llvm-mingw UCRT.

## Revisión 2 — cambio de herramienta (2026-11-03)

La Fase 0 se completó con PS2Recomp, pero el juego seguía sin imagen después de un mes
de trabajo. Se reemplaza la base del runtime por **`ps2-native-recomp`** (MIT) y se
mantiene PS2Recomp sólo como evidencia histórica (`recomp/baseline.md`).

### recomp-native-path (reemplaza la decisión anterior)

- **memory_key**: `recomp-native-path`
- **Elección**: llegar al juego nativo con **`ps2-native-recomp`**, que traduce el
  código que descubre en runtime, captura overlays y compila VU1 al vuelo.
- **Descartado**: seguir con PS2Recomp (sin soporte de overlays y sin imagen tras un
  mes) y el matching decompilation.
- **Justificación**: medido el 2026-11-03: con `ps2-native-recomp` el juego muestra el
  menú de video, el diálogo de memory card, el menú principal y la cutscene inicial en
  la primera sesión. Ver `docs/analysis/07-runtime-nativo.md`.
- **Estado**: aceptada (2026-11-03).

### overlay-registration

- **memory_key**: `overlay-registration`
- **Elección**: registrar los overlays como **ventanas de código** del ELF
  (`PT_LOAD` sintético sin contenido) más una imagen por contenido, con la cabecera
  `MWo3` indicando el rango de texto.
- **Descartado**: parchear el binario del juego o asumir que todo el overlay es código.
- **Justificación**: `menu.bin` se carga *verbatim* en `0x100000`; si la imagen no
  incluye la cabecera, sus checks no coinciden con RAM y el módulo nunca entra en
  juego. Incluir la data sin marcar el rango de texto produce entradas falsas
  (`no entry for 0016F37C`).
- **Refs**: `docs/analysis/07-runtime-nativo.md`,
  `patches/ps2-native-recomp-sword.patch`.
- **Estado**: aceptada (2026-11-03).

### runtime-discovery-fallback

- **memory_key**: `runtime-discovery-fallback`
- **Elección**: cuando una función sólo se conoce por tablas construidas en runtime,
  sembrarla por su **prólogo** (`addiu sp,sp,-N`) y, si hace falta, sembrar todo el
  rango de texto del overlay.
- **Descartado**: iterar una dirección por corrida (minutos por función).
- **Justificación**: el menú del juego llama funciones cortas sin prólogo ni puntero
  estático (`0x1518A0`, `0x1518B0`); la lista completa de entradas del menú permite
  que el juego pase el menú y llegue a la cutscene sin `missing code`.
- **Refs**: `scripts/make-overlay-entries.py`.
- **Estado**: aceptada (2026-11-03, workaround local; candidato a upstream).
