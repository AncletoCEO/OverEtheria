# AI Agents Context

> Contexto para agentes de IA en este repositorio. Se lee antes de actuar.

## Jerarquía de contexto

1. `AGENTS.md` (este archivo): marco común y guardrails.
2. `PRODUCT.md`: qué es el proyecto, estructura y comandos.
3. `docs/analysis/`: análisis medido del disco, del ELF y del intento anterior.
4. `docs/roadmap.md`: fase vigente y próximos hitos.

Ante conflicto, prevalece el documento más específico y, por encima de todo,
**la medición reproducible**.

## Guardrails

- **Nunca versionar contenido del juego**: ISO, ELF, `.BIN`, `.PSS`, `.IRX`,
  capturas o C++ generado. `.gitignore` ya los excluye; verificar `git status`
  antes de cada commit.
- **Nunca ejecutar `git add .`** sin revisar antes que el ISO (4,4 GB) esté
  ignorado. Si aparece en `git status`, frenar y corregir `.gitignore`.
- **No afirmar sin medir**: cada conclusión técnica debe apoyarse en un artefacto
  (log, dump de RAM/VRAM, savestate, byte del ELF) y quedar registrada con su
  comando de reproducción.
- **No repetir caminos muertos**: `docs/analysis/03-intento-anterior.md`
  §"Descartado" contiene hipótesis ya refutadas con evidencia.
- **Overlays**: ningún análisis del juego completo es válido si ignora los 25
  módulos `MWo` de `OL.BIN` (ver `docs/analysis/02-ejecutable-y-overlays.md`).
- **Licencias**: el runtime (fork PS2Recomp) es GPLv3; no copiar código de PCSX2
  (GPLv3) ni de binarios propietarios al código MIT de este repo.

## Memoria persistente

<!-- LOCKED: memory-boundary -->
### Frontera: memoria del repo vs memoria del agente

Hay **dos memorias distintas** y no se mezclan:

| Memoria | Qué guarda | Dónde vive | Herramientas |
|---|---|---|---|
| **Del repositorio** | Reglas y decisiones **del proyecto**: convenciones, contratos, por qué se eligió algo | `.ancleto/memory.db` (local; se versiona cuando el equipo lo decida) | `searchMemory`, `recordRule`, `recordDecision` |
| **Del agente** | Notas **de sesión**: observaciones transitorias, contexto entre compactaciones | Servicio externo del agente | Las de ese servicio |

Regla: **una entrada vive en una sola memoria, nunca en ambas.**
<!-- /LOCKED: memory-boundary -->

## Flujo spec-driven (aspec)

- Cambios con alcance incierto o arquitectura: artifacts en `aspec/changes/<name>/`.
- Fixes menores y documentación: commit directo.
- Cierre: archivar el change.

<!-- LOCKED: artifacts-language -->
- **Idioma de los artifacts**: el contenido de `proposal.md`, `design.md`, `tasks.md` y `specs/`
  se escribe en el idioma de la conversación con el usuario (o en el `language` configurado en `.ancletorc`).
  Los keywords (`Requirement`, `Scenario`, `SHALL`, `WHEN`/`THEN`/`AND`, `ADDED/MODIFIED/REMOVED/RENAMED
  Requirements`) y los nombres de archivos y directorios son literales en inglés y **no se traducen**.
<!-- /LOCKED: artifacts-language -->
