# Tasks: Recompilación nativa y portabilidad

> Change `native-recomp-port`. Cada tarea se verifica sola; los gates separan hitos y
> nada se declara jugable sin evidencia.
>
> **Revisión 2 (2026-11-03)**: la Fase 0 se completó con PS2Recomp, pero el juego
> seguía sin imagen. Se cambió la base a `ps2-native-recomp` y se reescribieron las
> fases 1–3. Ver `proposal.md` (Revisión 2) y `docs/analysis/07-runtime-nativo.md`.

## Fase 0 — Toolchain y build reproducible

- [x] Elegir toolchain portable sin admin y registrar versiones.
- [x] Clonar el fork de recompilación en un commit fijo y compilar sus herramientas.
- [x] Extraer `SLES_537.68` y `OL.BIN` a `work/`; generar el C++ de `main` y overlays.
- [x] Correr el gate del CSV (0 SHADOW / 0 MIDFUNC / 0 MISSING).
- [x] Compilar el juego y correr 60 s con baseline de logs.
- [x] Documentar tiempos, flags, memoria y problemas del build.

**Gate**: binario nuevo que arranca y emite el baseline sin crash. ✅ (PS2Recomp)

## Fase 1 — Runtime nativo (`ps2-native-recomp`)

- [x] Clonar `ps2-native-recomp`, compilar `eerecomp`/`vurecomp` y el runtime
      (`scripts/setup.sh --native-only`).
- [x] Construir el juego desde el ISO (`scripts/port.sh sword ... --native-only`):
      337 unidades, ~100 k instrucciones.
- [x] Convertir el `PT_LOAD` de `0x100000` en ventana de código
      (`scripts/patch-elf-window.py`, hook en `port.sh`).
- [x] Registrar `menu.bin` como overlay: imagen completa en `0x100000` con rango de
      texto desde la cabecera `MWo3` (parche en `recomp/main.cpp`/`elf.cpp`).
- [x] Registrar el `_static_init` del menú (`0x1A1B00`) como módulo aparte.
- [x] Sembrar prólogos y el rango de texto del menú
      (`scripts/make-overlay-entries.py`).
- [x] Documentar parches y reproducción (`docs/analysis/07-runtime-nativo.md`,
      `patches/ps2-native-recomp-sword.patch`).

**Gate**: un overlay ejecuta su código traducido y vuelve, sin "missing code". ✅
(`0x1A1B00` y `0x1523C0` resueltos; el juego pasa el menú).

## Fase 2 — Imagen en pantalla

- [x] Menú de selección de video (`Select video format / NTSC / PAL`), ~50 fps.
- [x] Diálogo de memory card con texto del juego y opciones Yes/No.
- [x] Menú principal (`THE SWORD OF ETHERIA — Story Mode / Start New`).
- [x] Cutscene inicial: escena 3D, retrato y diálogo, ~33 fps.
- [x] Captura reproducible de la ventana (`scripts/capture-window.ps1`).
- [ ] Savestates/`play.py` para no repetir el arranque en cada corrida.

**Gate**: frame presentado con el menú real. ✅

## Fase 3 — Primera misión jugable

- [ ] Registrar el overlay de la primera misión con el mismo método
      (ventana + entradas).
- [ ] Verificar input, cámara y colisiones.
- [ ] Medir el tick y corregir el timing.
- [ ] Gate de misión: entrada del jugador, avance y fin de misión.

**Gate**: una misión jugable de punta a punta (aunque sea sin audio).

## Fase 4 — Backends portables

- [ ] Definir interfaces de backend: render, audio, input, filesystem y tiempo.
- [ ] Implementar el backend de escritorio y un backend nulo/headless.
- [ ] Quitar rutas y decisiones hardcodeadas; configurar el ISO por archivo de config.
- [ ] Compilar en Windows y Linux; agregar CI de build.
- [ ] Gate de portabilidad: mismo binario lógico y mismos logs en ambos.

**Gate**: el core compila y corre sin conocer la plataforma.

## Fase 5 — Target de consola

- [ ] Elegir 1–2 targets por toolchain disponible y viabilidad legal (no asumir SDKs).
- [ ] Portar el backend de render/audio/input al target.
- [ ] Empaquetar y probar boot + menú + misión.
- [ ] Documentar limitaciones y requisitos legales.

**Gate**: el juego arranca, muestra el menú y corre una misión en el target.

## Fase 6 — Release y CI

- [ ] Release reproducible por tag, con validación MD5 del ISO del usuario.
- [ ] Sin contenido del juego en el repo ni en los artefactos.
- [ ] Documentar plataformas, rendimiento y deuda (matching, audio, cinemáticas).
- [ ] Cerrar el change.
