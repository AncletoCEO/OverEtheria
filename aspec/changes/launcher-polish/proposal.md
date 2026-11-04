# Proposal: Pulido del launcher y distribución

## Problem

El launcher funciona, pero quedan asperezas para un usuario que no es el autor: el
progreso de la preparación se lee en crudo, en Linux el selector de archivos depende de
`zenity`, y no hay paquete portable (Windows/Linux) con el launcher, los scripts y los
parches listos para usar.

## Scope

**In of scope**

- Progreso de preparación línea a línea y errores legibles en la UI.
- Selector de archivos propio (sin `zenity`) en Linux.
- Empaquetado portable y notas de release: Windows `.zip` y Linux AppImage.
- Verificación de que el paquete arranca en una carpeta limpia.

**Out of scope**

- Cambios al runtime o al pipeline.
- Distribuir contenido del juego.

## Decisions

### portable-package-first

- **memory_key**: `launcher-packaging`
- **Elección**: distribuir el launcher con los scripts y parches, sin binarios del
  juego; el usuario prepara desde su ISO en el primer arranque.
- **Descartado**: publicar binarios compilados del juego.
- **Justificación**: no se distribuye obra derivada del juego y el paquete sigue siendo
  útil (la validación del ISO y la preparación son locales).
- **Refs**: `launcher/README.md`, `.github/workflows/release.yml`.
- **Estado**: aceptada (2026-11-03).
