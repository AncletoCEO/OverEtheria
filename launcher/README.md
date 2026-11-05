# OverEtheria launcher

Interfaz de escritorio para preparar y jugar **Sword of Etheria** recompilado con
`ps2-native-recomp`. Es código propio (MIT): no contiene ni descarga contenido del
juego. Pide tu ISO en el primer arranque y construye el juego **en tu equipo**.

## Qué hace

- **Primer arranque**: elegís tu ISO (PAL, `SLES_537.68`); el launcher comprueba el
  volumen ISO 9660 y `SYSTEM.CNF` antes de aceptarlo. Después construye el juego con
  `scripts/prepare-game.ps1` (parche del runtime + `setup.sh` + `port.sh`).
- **Video**: resolución interna 1×/2×/3×, pantalla completa, 16:9 y formato
  PAL (50 Hz) o NTSC (60 Hz).
- **Controles**: tabla de las 26 acciones; «Cambiar» captura la próxima tecla o botón
  del mouse y escribe `keys.ini` del runtime.
- **Guardado**: memory card de 8 MB; si el archivo no existe, el juego la formatea al
  guardar. Podés abrir la carpeta o restablecer la tarjeta.

## Contenido extraído

«Preparar juego» extrae **todo el ISO** a `data/game/disc` (87 archivos, ~4,5 GB) y el
juego lee de esa carpeta: **el ISO sólo se necesita una vez**. El runtime lo soporta
con el parche de `patches/` (`--disc` acepta una carpeta). La extracción es reanudable
y deja `.extracted` como marcador; «Jugar» la usa automáticamente y, si no existe,
cae al ISO.

## Versiones soportadas

| Disco | Serial | Estado |
|---|---|---|
| PAL (`Sword of Etheria, The (Europe)`) | `SLES_537.68` | completo |
| PAL *undub* v1.0 | `SLES_537.68` | completo (mismo ejecutable) |
| Japón (`Oz`) | `SLPM_660.33` | compila y muestra el attract «OZ» a 60 fps; menú y misiones por verificar |
- **Jugar/Detener**: lanza `ps2run` con el ISO, la tarjeta, la resolución y el formato
  elegidos. El juego escribe su salida en `data/game.log` y en `games/<id>/logs`; el
  botón «Registro del juego» abre el más reciente, y si el juego se cierra al empezar el
  launcher lo avisa.

## Compilar

Necesita CMake ≥ 3.20, Ninja y un compilador C++20. SDL2 se reutiliza de
`tools/ps2-native-recomp/third_party/sdl2` si está; si no, se descarga y compila.
ImGui se descarga en la configuración.

```bash
cmake -S launcher -B build/launcher -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/launcher
build/launcher/bin/overetheria-launcher
```

Variante de consola (CI y pruebas sin ventana): `-DOE_CONSOLE=ON`.

### Línea de comandos

```bash
overetheria-launcher --version
overetheria-launcher --data-dir
overetheria-launcher --check-iso "/ruta/Sword of Etheria.iso"   # 0 = reconocido
```

## Dónde guarda

`<carpeta del exe>/data` si se puede escribir (copia portable); si no,
`%APPDATA%/OverEtheria` (Windows) o `~/.local/share/OverEtheria` (Linux).

```
data/launcher.ini     ajustes y controles
data/memcard.ps2      memory card (partidas del juego)
data/quick/           keys.ini y savestates del runtime
data/prepare.log      salida de la preparación
```

## Estado

Primera versión: ISO + preparación + video + controles + tarjeta + lanzar. El
guardado del juego está en verificación; el idioma se elige en el primer arranque del
juego (el launcher no lo fuerza). Falta pulir: diálogo de carpeta propio en Linux sin
`zenity`, y mostrar el progreso de la preparación línea a línea.
