# Tasks: Soporte bilingüe integral (inglés por defecto, español de primera clase)

## Fase 1 — Auditoría y catálogo

- [ ] Inventariar todas las cadenas visibles de `launcher/src/main.cpp` y
      `launcher/src/config.cpp` y asignarles una clave `i18n::Key`.
- [ ] Crear `launcher/src/i18n.hpp` con `Lang`, `Key`, `tr()`, `parse_language()`,
      `detect_system_language()` y `language_code()`.
- [ ] Crear `launcher/src/i18n.cpp` con los catálogos `en`/`es`, `static_assert` de tamaño
      y fallback a inglés.
- [ ] Agregar `launcher/tests/i18n_test.cpp` y registrarlo en CMake/ctest.

**Gate**: el catálogo compila, el test recorre todas las `Key` con `en` y `es` no vacíos y
`parse_language()` normaliza `es-AR`/`en-US`/desconocido.

## Fase 2 — Launcher bilingüe

- [ ] Añadir `language` a `Config` y a `load_config()`/`save_config()` (`launcher.ini`).
- [ ] Reemplazar los literales de `main.cpp` por `tr(Key::...)` (pestañas, botones,
      estados, banners, diálogos de confirmación).
- [ ] Convertir `Binding::label` a `i18n::Key` y traducir las 26 etiquetas de controles.
- [ ] Añadir el selector `Language: [ English | Español ]` en la cabecera con cambio en
      caliente y guardado inmediato.
- [ ] Resolver el idioma al arrancar con la precedencia
      `--lang` > `OE_LANG` > `launcher.ini` > locale del SO > `en`.
- [ ] Implementar `--lang en|es` y `--help` localizado; mantener `--version` y
      `--data-dir` con el mismo formato.
- [ ] Traducir mensajes de error/proceso de `platform.cpp` que lleguen a la UI o al log.

**Gate (aceptación 1)**: primera ejecución sin configuración en entorno inglés muestra todo
en inglés; al elegir Español cambia en caliente; al reiniciar persiste; `--lang es --help`
sale en español.

## Fase 3 — Comentarios y mensajes en inglés

- [ ] Traducir comentarios de `launcher/src/*.{cpp,hpp}` y `launcher/CMakeLists.txt`.
- [ ] Traducir comentarios y mensajes de ayuda de `scripts/*.{mjs,py,ps1,sh}`.
- [ ] Traducir comentarios de los `CMakeLists.txt` del repo.
- [ ] Auditar con `rg` que no queden comentarios ni literales de log en español fuera del
      catálogo `es`.

**Gate (aceptación 2)**: la auditoría no encuentra texto en español en comentarios ni en
logs de `launcher/` y `scripts/`; el build sigue verde.

## Fase 4 — README bilingüe

- [ ] Traducir `README.md` a inglés técnico (requisitos, build, estado, legal, historial).
- [ ] Crear `README.es.md` con la versión española completa y sincronizada.
- [ ] Añadir el switcher en la primera línea de ambos documentos.
- [ ] Crear `scripts/check-docs.mjs` (encabezados + enlaces relativos + contrapartes).
- [ ] Ejecutar la verificación de paridad y corregir diferencias.

**Gate (aceptación 3)**: `README.md` en inglés con enlace visible a `README.es.md` y ambos
con la misma información de requisitos, compilación y estado; `check-docs.mjs` pasa.

## Fase 5 — Documentación y política de agentes

- [ ] Actualizar `AGENTS.md` a inglés preservando los bloques `LOCKED` **literalmente**.
- [ ] Actualizar `PRODUCT.md` con la sección de política de idioma.
- [ ] Traducir `docs/roadmap.md` a inglés y crear `docs/es/roadmap.md`.
- [ ] Crear `docs/README.md` (índice EN) y `docs/es/README.md` (índice ES), aclarando que
      `docs/analysis/` es evidencia en español.
- [ ] Cuando `status-dashboard` cree `docs/STATUS.md`, crear `docs/es/STATUS.md` y enlazar
      ambos.

**Gate**: la política queda escrita y es coherente con `LOCKED: artifacts-language`; el
roadmap existe en ambos idiomas con el mismo contenido.

## Fase 6 — Dashboard bilingüe (depende de `status-dashboard`)

- [ ] Crear `site/assets/i18n.js` con `STRINGS.en`/`STRINGS.es` y `applyLanguage()`.
- [ ] Añadir `data-i18n`, `data-i18n-aria` y `data-i18n-title` al HTML.
- [ ] Localizar contadores, split bar, tooltips de treemaps, tabla de módulos e hitos.
- [ ] Añadir el selector `EN | ES` en la cabecera con persistencia en `localStorage` y
      actualización de `<html lang>`.
- [ ] Verificar que el cambio de idioma no recarga ni vuelve a pedir los JSON.

**Gate**: el sitio cambia de idioma sin recargar, persiste tras refrescar, no hay claves
sin traducir visibles y la consola queda limpia.

## Fase 7 — CI y cierre

- [ ] Agregar `check-docs.mjs` y `ctest` del catálogo a `launcher.yml`.
- [ ] Verificar los jobs de Windows y Linux y el workflow de release sin cambios de
      contrato.
- [ ] Revisar `git status` (sin contenido del juego ni capturas).
- [ ] Registrar la política en `AGENTS.md`/`PRODUCT.md` y sincronizar el spec.
- [ ] Archivar el change.
