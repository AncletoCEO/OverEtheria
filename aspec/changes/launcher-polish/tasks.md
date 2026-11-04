# Tasks: Pulido del launcher y distribución

## Fase 1 — CI de release

- [ ] Workflow `release.yml` en tags `v*` y `workflow_dispatch`.
- [ ] Windows: launcher + SDL2.dll + `scripts/` + `patches/` en un `.zip`.
- [ ] Linux: launcher + `scripts/` + `patches/` en un AppImage (linuxdeploy).
- [ ] Publicar los artefactos en el Release de GitHub.

**Gate**: el workflow produce los dos paquetes desde un tag.

## Fase 2 — Paquete utilizable

- [ ] Verificar el `.zip` en una carpeta limpia de Windows (arranca, valida ISO).
- [ ] Verificar el AppImage en Linux (FUSE o `--appimage-extract-and-run`).
- [ ] Incluir README y notas de release con requisitos (ISO + toolchain).

**Gate**: un usuario con el paquete y el toolchain prepara el juego desde la UI.

## Fase 3 — UI

- [ ] Progreso de la preparación línea a línea.
- [ ] Errores con la línea exacta del registro.
- [ ] Selector de archivos propio en Linux (sin `zenity`).

## Fase 4 — Cierre

- [ ] Sincronizar el spec y archivar el change.
