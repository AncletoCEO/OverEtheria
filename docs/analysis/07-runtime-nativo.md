# Runtime nativo: `ps2-native-recomp`

Este documento registra el cambio de herramienta y el primer arranque jugable
medido. Reemplaza como estado vigente a `recomp/baseline.md`, que describe el
intento con PS2Recomp.

## Herramienta

- **Base**: [`exoteric33/ps2-native-recomp`](https://github.com/exoteric33/ps2-native-recomp)
  (MIT, derivado de `ps2-web-recomp`).
- **Por qué**: traduce el código que descubre mientras juega (`[ee-live]`), captura
  y registra overlays, compila VU1 al vuelo y ya corría 19 juegos. Con PS2Recomp el
  juego llevaba un mes sin imagen; con esta herramienta el menú se ve en la primera
  sesión.
- **Estado**: clon local en `tools/ps2-native-recomp` (ignorado). Los parches propios
  viven en `patches/ps2-native-recomp-sword.patch`.

## Build

```bash
# toolchain en tools/: llvm-mingw UCRT 20261020 (clang 23), Ninja, CMake, Python
export PATH="/c/repos/etheria/tools/llvm-mingw/bin:$PATH"   # + ninja, cmake, python

cd tools/ps2-native-recomp
bash scripts/setup.sh --native-only          # eerecomp, vurecomp y runtime
bash scripts/port.sh sword isos/sword.iso --native-only
build/native-sword/ps2run games/sword/disc/SLES_537.68 --disc games/sword/disc.iso --window
```

`isos/sword.iso` es un hardlink local al ISO del usuario (nunca se versiona).

## Parches propios

`patches/ps2-native-recomp-sword.patch` se aplica sobre el clon:

```bash
git -C tools/ps2-native-recomp apply ../../patches/ps2-native-recomp-sword.patch
```

1. **`scripts/patch-elf-window.py`** (invocado desde `port.sh` tras extraer el ELF):
   convierte el `PT_LOAD` de `0x100000` en una **ventana de código**
   (`filesz=0 memsz=0xA1B40`). Sin eso el tool no pasa `--overlays` y el menú
   (que se carga en runtime) no existe para el traductor. La ruta se resuelve
   relativa al clon; `PS2_ELF_WINDOW_PATCH` la sobreescribe.
2. **Cabecera `MWo3` en `recomp/main.cpp`**: la imagen del overlay se carga *verbatim*
   en su base, cabecera incluida. El parche lee `base` (`+0x08`) y `text` (`+0x0C`) y
   marca como ejecutable sólo el rango de texto; el resto (data, tablas de punteros)
   queda legible pero no ejecutable.
3. **Prólogos como semillas** (`recomp/main.cpp`): las funciones que el juego llama
   por tablas construidas en runtime no aparecen en ninguna palabra ni en ningún
   `jal`. Cada `addiu sp,sp,-N` del rango de texto se siembra como entrada.
4. **`Image::raw(..., executable_size)`** (`recomp/elf.cpp`, `recomp/elf.hpp`):
   soporte del punto 2 (los bytes siguen legibles; `Image::executable` corta en texto).
5. **Modo carpeta en `runtime/src/disc.cpp`**: leer el disco extraído sin ISO.

El clon del runtime queda **fijado** al commit
`263508314076fda7837b51434222578331047273` (ver `tools.lock.toml`): el parche se genera
contra ese commit y `prepare-game` lo restaura antes de aplicarlo, así un clon viejo o
con un parche anterior no rompe la preparación.

La lista completa de entradas del menú se regenera con
`scripts/make-overlay-entries.py` y se guarda en `games/sword/entries.txt`
(92.256 líneas: programa principal + todo el texto del menú + `_static_init`).

## Medición

Rama `visual/advance-display-and-main-loop`, 2026-11-03:

| Hito | Evidencia |
|---|---|
| Menú de selección de video | `Select video format / NTSC / PAL`, ~50 fps |
| Diálogo de memory card | texto del juego, cursor y opciones Yes/No |
| Menú principal | `THE SWORD OF ETHERIA — Story Mode / Start New`, ~50 fps |
| Cutscene inicial | escena 3D, retrato y diálogo, ~33 fps (compilando VU en vivo) |
| Diálogo con varios personajes | el texto avanza con cruz y cambia de retrato, ~36 fps |
| Diálogo a dos voces | dos retratos simultáneos (Almira y Cain) con caja superior e inferior, ~39 fps |
| Gameplay (inicio de misión) | escena 3D de combate con tutorial `Tap ⬜ for combo attack`, ~48 fps |
| 60 Hz (NTSC) | `SetGsCrt mode 0x2` y 60.0 fps en la ventana |
| 50 Hz (PAL) | `SetGsCrt mode 0x3` y ~50 fps |
| Idiomas | English, Français, Deutsch, Italiano y Español renderizan su texto y acentos |
| Memory card | el runtime emula la tarjeta de 8 MB (`--memcard`); el juego la detecta y ofrece `Load Game` |

El log de la corrida muestra `[ee-live] switched in the library of window
0x00100000` y `[vu-live] N new vector programs compiled`, es decir el runtime
traduce y compila lo que falta mientras el juego corre, sin `missing code`.

La corrida de 8 minutos (480 s, pulsos de cruz cada ~3 s) atravesó la cutscene
completa y entró al gameplay sin una sola detención por `missing code`; la ventana
quedó entre 36 y 50 fps (VU compilando al vuelo al principio de cada escena).

## Estados guardados

`ps2run` acepta `--save-state <frame>:<archivo>` y `--load-state <archivo>|newest`:

```powershell
# guardar durante la corrida
ps2run ... --save-state 16000:work\state-gameplay.state
# retomar directo en gameplay (sin repetir la cutscene)
ps2run games/sword/disc/SLES_537.68 --disc games/sword/disc.iso --window `
  --load-state work\state-gameplay.state
```

Esto es la vía para iterar misiones: un estado por escena, y las corridas siguientes
arrancan ahí.

## Reproducción de la corrida

Un comando, con la secuencia de botones ya medida:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/play-sword.ps1 `
  -Seconds 120 -Cutscene Fast -Shot work/shot.png
```

Equivale a lanzar `ps2run` con estos `--press`:

```powershell
$exe = 'tools\ps2-native-recomp\build\native-sword\ps2run.exe'
$presses = @(
  '300:cross:8','600:cross:8','900:cross:8',      # video PAL -> menú
  '1400:left:8','1500:cross:8',                   # "No memory card": Yes
  '3000:cross:6','3200:cross:6','3400:cross:6'    # Story Mode -> Start New
)
& $exe games/sword/disc/SLES_537.68 --disc games/sword/disc.iso --window `
  @($presses | ForEach-Object { '--press', $_ })
```

La ventana se captura con `PrintWindow` (`scripts/capture-window.ps1`) porque el
`play.py` del tool necesita Pillow, que el Python embebido no trae. Si la política de
ejecución bloquea el script:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\capture-window.ps1 -Out work\shot.png
```

### Input medido

- El menú de video se elige en horizontal: **izquierda = NTSC (60 Hz)**, derecha =
  PAL (50 Hz); cruz confirma. Después viene el menú de idioma (English, Français,
  Deutsch, Italiano, Español) y sólo entonces el attract con «PRESS START».
- `cross` avanza el diálogo. **Mantenerlo pulsado sólo acelera el texto**: para pasar
  de línea hacen falta pulsaciones cortas y repetidas (~cada 2 s).
- `start` sostenido (**Skip**) corta la cutscene y vuelve al menú principal.
- El diálogo se dibuja con retratos intercambiables y texto con efecto de máquina de
  escribir; no hubo `missing code` en ninguna de las corridas.

## Versiones del juego

| Disco | Serial | Estado medido |
|---|---|---|
| PAL (`Sword of Etheria, The (Europe)`) | `SLES_537.68` | completo: menú, memory card, menú principal, cutscene y gameplay |
| PAL *undub* v1.0 | `SLES_537.68` | mismo ELF que PAL (SHA-256 idéntico): usa el mismo build |
| Japón (`Oz`) | `SLPM_660.33` | compila (223 unidades) y llega al attract «PRESS START BUTTON / OZ» a 60 fps |

Notas de la versión japonesa:

- Su ELF no trae `PT_LOAD` en `0x100000`: `scripts/patch-elf-window.py` reutiliza una
  entrada ejecutable vacía para crear la ventana.
- Los overlays están en las mismas bases (`0x100000` y `0x154000`), pero su
  `menu.bin` mide `0x55640` de texto y no tiene `_static_init` (rango vacío).
- **Necesita `--memcard`**: sin tarjeta la pantalla queda negra (el launcher siempre
  pasa una).
- El registro del menú se automatiza con `scripts/register-overlay.py`, que saca
  `menu.bin` de `OL.BIN`, escribe la imagen completa y una imagen de `_static_init`
  aparte, y emite las entradas del rango de texto.

## Contenido extraído: jugar sin ISO

Igual que en Yakumo, el ISO se usa **una sola vez**: la preparación extrae todo su
contenido a una carpeta y después el juego lee de ahí.

- Extractor: `scripts/extract-disc.py` (ISO 9660, capas simples y dobles). Escribe el
  árbol de archivos sin el `;1` y un marcador `.extracted` con serial y tamaño.
- Runtime: `patches/ps2-native-recomp-sword.patch` agrega el modo carpeta a
  `runtime/src/disc.cpp`. Cada archivo ocupa un rango de sectores virtuales y un
  `read(lba, count)` se sirve del archivo que lo contiene; el juego pide sectores y no
  nota la diferencia. Lo que pasa el final de un archivo se rellena con ceros, como el
  relleno del disco.
- Uso: `ps2run ... --disc <carpeta>` (el launcher lo hace solo si `.extracted` existe).

Tamaño medido: 87 archivos, 4,5 GB en `work/game/disc`; el ISO se puede borrar después.

## Memory card

El runtime trae la emulación de tarjeta PS2 en `runtime/src/iop/sio2.cpp`; sólo hay que
pasar `--memcard <archivo>`. Sin el archivo el juego muestra el warning de «No memory
card»; con el archivo (aunque falte, se crea al guardar) el warning desaparece, el
menú principal ofrece `Load Game` y el guardado escribe en esa tarjeta.

Una tarjeta ya formateada se puede crear con el propio tool:

```bash
python scripts/mcformat.py games/sword/memcard.ps2   # 8 MB formateada
```

El juego **no permite guardar hasta terminar el tutorial**, que es largo; por eso la
primera versión da el guardado por funcionando cuando la tarjeta se detecta y `Load
Game` aparece. Falta el gate manual de guardar y recargar después del tutorial.

## Launcher

`launcher/` es una aplicación propia (MIT, C++20 + SDL2 + ImGui) que prepara y lanza el
juego sin editar archivos a mano:

```bash
cmake -S launcher -B build/launcher -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/launcher
build/launcher/bin/overetheria-launcher
```

- **Primer arranque**: pide el ISO, lo valida (`SYSTEM.CNF` con `SLES_537.68`) y
  ejecuta `scripts/prepare-game.ps1` (Windows) o `.sh` (Linux), con registro visible.
- **Video**: escala interna 1×/2×/3×, pantalla completa, 16:9 y PAL/NTSC.
- **Controles**: tabla de 26 acciones; «Cambiar» captura la tecla o el botón del mouse
  y escribe `keys.ini` en la carpeta quick del runtime.
- **Guardado**: ruta de la memory card, abrir carpeta y restablecer.
- **Jugar/Detener** y CLI para CI: `--version`, `--data-dir`, `--check-iso`,
  `--prepare`, `--play`.

Los datos (configuración, tarjeta, `keys.ini`, savestates) viven en `data/` junto al
ejecutable o, si no se puede escribir, en `%APPDATA%/OverEtheria`. Ver
[`launcher/README.md`](../../launcher/README.md) y el change
`aspec/changes/native-launcher/`.

### Progreso de la preparación

Los scripts `prepare-game.ps1`/`.sh` escriben `[progress] <0-100> <texto>` en su
registro al empezar y terminar cada fase; el launcher lee la última línea y muestra una
barra con el porcentaje y el paso actual. Dentro de la copia del contenido,
`extract-disc.py --progress-base/--progress-end` traduce los MB copiados a porcentaje
real. El registro se escribe en vivo (streaming), no al final.

El nombre del ejecutable también depende de la plataforma (`ps2run.exe` en Windows,
`ps2run` en Linux/macOS); `--print-paths` lo imprime y `--last-progress <log>` permite
ver qué porcentaje entiende el launcher (útil para diagnóstico y CI).

## Receta para el próximo overlay

`OL.BIN` carga módulos en `0x100000` y `0x154000`, ambas dentro de la ventana
`0x100000..0x1A1B40` que declara el ELF. Para registrar la primera misión:

1. correr el juego hasta que cargue el overlay de misión con
   `PS2_DUMP=... explore_ram.bin` (o `--misses`) y localizar su base;
2. guardar la imagen de RAM desde esa base como
   `games/sword/overlays/<base>_<crc>.bin` (la cabecera `MWo3` ya trae su rango de
   texto);
3. si el juego se detiene con `missing code`, agregar la dirección a
   `entries.txt` (o sembrar el texto con `scripts/make-overlay-entries.py`);
4. reconstruir con `port.sh ... --no-explore` y repetir.

El límite conocido es `windows.py`/`ee_live`: captura 16 KiB por ventana y corta en
`0x40000`; un overlay de misión más grande que eso hay que cargarlo a mano como en el
paso 2.

## Pendiente

- Reportar al upstream los parches 1–4 (son genéricos: ventana sin `PT_LOAD`,
  cabecera `MWo3`, prólogos) y el límite de 16 KiB de `windows.py list`.
- El `trim` de `scripts/windows.py` asume ventanas de 16 KiB; con la ventana de
  `0xA1B40` conviene revisarlo antes de dejarlo activo.
- Las 25 misiones y el resto de overlays siguen sin explorar: el mismo método
  (ventana + entradas) se repite por módulo.
- Persistencia: `play.py`/savestates para no repetir el arranque en cada corrida.
