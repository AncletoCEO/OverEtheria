# Tasks: Launcher y primera experiencia de uso

## Fase 0 — Verificaciones previas

- [x] 60 Hz: elegir NTSC en el menú de video produce `SetGsCrt mode 0x2` y 60.0 fps.
- [x] Idiomas: English, Français, Deutsch, Italiano y Español se seleccionan y
      renderizan (incluye acentos: `APPUYEZ`, `DRÜCKEN`, `PULSA BOTÓN`).
- [x] Memory card: con `--memcard` el juego deja de mostrar el warning y ofrece
      `Load Game`; el guardado real ocurre después del tutorial (largo), así que se
      asume funcionando para esta versión.

**Gate**: los cinco idiomas y los dos formatos de video quedan documentados con
evidencia. ✅

## Fase 1 — Launcher

- [x] Esqueleto C++20 + SDL2 + ImGui, con CMake que reutiliza el SDL2 del runtime y
      descarga ImGui.
- [x] Validación del ISO por ISO 9660 + `SYSTEM.CNF` (`SLES_537.68`).
- [x] Configuración persistente (`data/launcher.ini`) con ruta del ISO, del runtime,
      de la tarjeta, escala, pantalla completa, 16:9 y PAL/NTSC.
- [x] Edición de controles: tabla de 26 acciones, captura de tecla/mouse y escritura
      de `keys.ini`.
- [x] Memory card: ruta configurable, abrir carpeta, restablecer.
- [x] Preparación del juego desde el launcher con registro en vivo.
- [x] Lanzar/Detener `ps2run` con los argumentos y el entorno correctos.
- [x] Modo consola (`-DOE_CONSOLE=ON`) y CLI (`--version`, `--data-dir`,
      `--check-iso`, `--prepare`, `--play`) para probar sin ventana.
- [x] Enlace estático del runtime C++ en Windows (el binario no depende de
      `tools/llvm-mingw/bin`).

**Gate**: `--prepare` construye el juego desde el ISO y `--play` lo lanza. ✅

## Fase 2 — CI y guardas

- [x] Workflow `launcher.yml`: build en Ubuntu y Windows, pruebas de humo en consola.
- [x] Job que falla si se versiona ISO/ELF/`.bin`/`.pss`/generado/decompilado.
- [x] Validación de sintaxis de `prepare-game.sh` y del parser de PowerShell.

**Gate**: CI verde en la rama de desarrollo.

## Fase 3 — Contenido extraído y versiones

- [x] Extractor `scripts/extract-disc.py` (ISO 9660, una o dos capas) con marcador
      `.extracted` y reanudable.
- [x] Modo carpeta en el runtime (`runtime/src/disc.cpp`): sectores virtuales por
      archivo y relleno de ceros al final.
- [x] La preparación extrae el contenido y el launcher juega desde la carpeta.
- [x] Detección de `SLES_537.68` (PAL y undub) y `SLPM_660.33` (Japón) con game id
      `sword`/`oz`.
- [x] Ventana `0x100000` para el ELF japonés reutilizando un `PT_LOAD` vacío.
- [ ] Registro del overlay del menú japonés (mismo método que PAL: extraer `menu.bin`
      de `OL.BIN`, sembrar el rango de texto).
- [ ] Probar el guardado real después del tutorial (gate manual).

**Gate**: jugar sin el ISO con la versión PAL. ✅

## Fase 4 — Pendiente para la próxima versión

- [ ] Progreso de la preparación línea a línea (hoy se lee el registro).
- [ ] File browser propio para Linux sin `zenity`.
- [ ] Empaquetado portable (`data/` junto al ejecutable) y notas de release.
