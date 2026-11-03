# Tasks: Recompilación nativa y portabilidad

> Change `native-recomp-port`. Cada tarea se verifica sola; los gates separan hitos y
> nada se declara jugable sin evidencia.

## Fase 0 — Toolchain y build reproducible

- [x] Elegir toolchain portable (w64devkit GCC 16.2 + CMake 4.4.5 + Python 3.12.10,
      sin admin) y registrar versiones en `docs/analysis/05-entorno.md`.
- [x] Clonar el fork `AncletoCEO/Ps2Recomp-of-etheria` en el commit pineado y compilar
      `ps2_recomp` y `ps2_analyzer`.
- [x] Extraer `SLES_537.68` y `OL.BIN` a `work/`; generar el C++ de `main` y de cada
      overlay con su CSV y su base.
- [ ] Correr `split_monsters.py` y `validate_csv.py` (0 SHADOW / 0 MIDFUNC / 0 MISSING).
- [ ] Compilar el juego (`MinGW Makefiles` o `Unix Makefiles`, `-j4`) y correr 60 s;
      guardar el baseline de logs (`vblank`, `gs:present`, `frame-loop`).
- [ ] Documentar tiempos, flags, memoria y problemas del build.

**Gate**: binario nuevo que arranca y emite el baseline sin crash.

## Fase 1 — Overlays (`SIMB`/`MWo`)

- [ ] Implementar el loader `SIMB`/`MWo`: copiar text/data, limpiar bss y ejecutar
      `_static_init` (rango vacío en `mission22`, 2 punteros en `menu`).
- [ ] Implementar el **overlay bank**: registrar la tabla de funciones de cada módulo
      en su base (`0x100000` o `0x154000`).
- [ ] Implementar el dispatch: llamadas de `main` al overlay y del overlay a `main`.
- [ ] Probar `prg_player_0.bin` (229 KB) y `mission22.bin`; verificar `pc` dentro de
      `0x100000`/`0x154000` en los logs.
- [ ] Probar `menu.bin` (369 KB, 1.029 funciones) y registrar el comportamiento.
- [ ] Gate del CSV por overlay (sin funciones truncadas ni sombreadas).

**Gate**: un overlay ejecuta su código recompilado y vuelve, sin "función no
encontrada".

## Fase 2 — Menú visible

- [ ] Reproducir el menú negro con el build nuevo y el baseline medido.
- [ ] Instrumentar el pase único de subida de texturas con los símbolos de la decomp
      (`menu`, `main`).
- [ ] Comparar VRAM/registros contra un savestate de PCSX2 en la misma fase.
- [ ] Corregir el gate del atlas PSMT8/CLUT o la readiness del loader.
- [ ] Verificar con los triages apagados.

**Gate**: frame presentado con `rgbNZ > 0` y el menú visible.

## Fase 3 — Primera misión jugable

- [ ] Cargar `mission01`/`mission02` y ejecutar el gameplay básico.
- [ ] Implementar pad (SIO2 o HLE completo), cámara y colisiones.
- [ ] Medir el tick y corregir el timing (~9/s vs 60 fps).
- [ ] Gate de misión: entrada del jugador, avance y fin de misión.

**Gate**: una misión jugable de punta a punta (aunque sea sin audio).

## Fase 4 — Backends portables

- [ ] Definir interfaces de backend: render, audio, input, filesystem y tiempo.
- [ ] Implementar el backend de escritorio (raylib/GL) y un backend nulo/headless.
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
