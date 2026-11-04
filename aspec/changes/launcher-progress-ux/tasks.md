# Tasks: Progreso visible y textos para el usuario

## Fase 1 — Bug del issue #14

- [ ] `game_exe()` devuelve `ps2run.exe` en Windows y `ps2run` en Linux/macOS.
- [ ] `game_built()` y el mensaje final usan esa ruta.
- [ ] Verificar en Linux: preparación con éxito → «listo para jugar», no «falló (código 0)».
- [ ] Añadir una prueba de humo que cubra el nombre del binario por plataforma.

**Gate**: con la preparación ya hecha, el launcher muestra el juego como listo.

## Fase 2 — Protocolo de progreso

- [ ] `prepare-game.ps1` y `.sh` emiten `[progress] <n> <texto>` al empezar y terminar
      cada fase (clonar, herramientas, construir, menú, contenido, listo).
- [ ] La copia del contenido reporta porcentaje real por MB (`extract-disc.py --progress`).
- [ ] El registro se escribe en vivo (streaming), no al final.
- [ ] Documentar el protocolo en `docs/analysis/07-runtime-nativo.md`.

**Gate**: el registro muestra el avance durante la preparación, no sólo al terminar.

## Fase 3 — Barra y textos en el launcher

- [ ] Leer la última línea `[progress]` y mostrar barra + porcentaje + texto corto.
- [ ] Textos de usuario en la pestaña «Juego» (qué hace, qué falta, qué revisar).
- [ ] Mensajes de error accionables, con el registro a un clic.
- [ ] Revisar botones, pestañas y avisos de «Video», «Controles» y «Guardado».

**Gate**: preparar se entiende sin abrir el registro; el porcentaje avanza y llega a 100.

## Fase 4 — Verificación y cierre

- [ ] Probar preparación completa y una fallida (ISO inválido, sin espacio).
- [ ] Capturas de la UI con progreso y con error.
- [ ] Sincronizar el spec y archivar el change.
