# Tasks: Validación de gameplay y guardado

## Fase 1 — Combatir y moverse

- [ ] Probar cuadrado (combo), cámara (stick derecho) y movimiento (stick izquierdo)
      en la misión inicial, con capturas de cada estado.
- [ ] Verificar colisiones y pausa (start).
- [ ] Medir el tick del juego y compararlo con 50/60 Hz.

**Gate**: el jugador se mueve, ataca y recibe daño en la primera misión.

## Fase 2 — Guardado real

- [ ] Avanzar el tutorial hasta el primer punto de guardado.
- [ ] Guardar en la memory card y comprobar que el archivo cambia (mtime/tamaño) y que
      el log del runtime cuenta páginas escritas.
- [ ] Reiniciar el juego y cargar desde `Load Game`.

**Gate**: partida guardada y recargada desde el título.

## Fase 3 — Versión japonesa

- [ ] Confirmar el menú principal de `Oz` (después del attract).
- [ ] Verificar que la primera misión japonesa carga y responde a input.
- [ ] Documentar diferencias (texto, audio, nombres).

**Gate**: la versión japonesa llega a gameplay.

## Fase 4 — Cierre

- [ ] Registrar las mediciones en `docs/analysis/07-runtime-nativo.md`.
- [ ] Sincronizar el spec y archivar el change.
