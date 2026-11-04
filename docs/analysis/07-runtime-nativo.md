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
   (que se carga en runtime) no existe para el traductor.
2. **Cabecera `MWo3` en `recomp/main.cpp`**: la imagen del overlay se carga *verbatim*
   en su base, cabecera incluida. El parche lee `base` (`+0x08`) y `text` (`+0x0C`) y
   marca como ejecutable sólo el rango de texto; el resto (data, tablas de punteros)
   queda legible pero no ejecutable.
3. **Prólogos como semillas** (`recomp/main.cpp`): las funciones que el juego llama
   por tablas construidas en runtime no aparecen en ninguna palabra ni en ningún
   `jal`. Cada `addiu sp,sp,-N` del rango de texto se siembra como entrada.
4. **`Image::raw(..., executable_size)`** (`recomp/elf.cpp`, `recomp/elf.hpp`):
   soporte del punto 2 (los bytes siguen legibles; `Image::executable` corta en texto).

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

El log de la corrida muestra `[ee-live] switched in the library of window
0x00100000` y `[vu-live] N new vector programs compiled`, es decir el runtime
traduce y compila lo que falta mientras el juego corre, sin `missing code`.

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

- `cross` avanza el diálogo. **Mantenerlo pulsado sólo acelera el texto**: para pasar
  de línea hacen falta pulsaciones cortas y repetidas (~cada 2 s).
- `start` sostenido (**Skip**) corta la cutscene y vuelve al menú principal.
- El diálogo se dibuja con retratos intercambiables y texto con efecto de máquina de
  escribir; no hubo `missing code` en ninguna de las corridas.

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
