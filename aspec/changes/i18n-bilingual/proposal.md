# Proposal: Soporte bilingüe integral (inglés por defecto, español de primera clase)

## Problem

El repositorio y el launcher están redactados casi exclusivamente en español, lo que
limita la contribución externa y hace que las salidas de diagnóstico no sean comparables
con el resto del ecosistema de emulación/decompilación de PS2. El issue #12 pide invertir
la convención: **inglés por defecto** en código, comentarios, logs y documentación raíz;
**español como opción de primera clase** en la UI y en réplicas de documentación.

Hechos medidos en el árbol actual:

- `launcher/src/main.cpp` tiene ~40 literales de UI en español (`Juego`, `Video`,
  `Controles`, `Guardado`, `Elegir ISO.`, `Preparar juego`, `Jugar`, `Detener`, …).
- `launcher/src/config.cpp` define las etiquetas de los 26 controles en español
  (`D-pad arriba`, `Stick izq. arriba`, `Cruz (confirmar, saltar)`, …).
- La configuración del launcher **no es `config.json`**: es `launcher.ini`
  (`key = value`) en `data_dir()`, escrita por `save_config()`.
- `README.md`, `PRODUCT.md`, `AGENTS.md`, `docs/roadmap.md` y `docs/analysis/` están en
  español.
- El launcher ya usa Dear ImGui en modo inmediato y ya tiene una función `clean()` para
  UTF-8, así que el cambio de idioma en caliente no requiere reconstruir la UI.

No existe hoy ningún catálogo de cadenas, ni selector de idioma, ni persistencia de la
preferencia, ni salidas de CLI en inglés.

## Proposed change

Una capa de localización única y liviana, aplicada de forma consistente:

1. **Launcher (`launcher/src/i18n.hpp` / `i18n.cpp`)**:
   - `enum class Key` con una clave por cadena y un catálogo `en`/`es` validado en
     compilación (todas las claves con ambos idiomas, sin duplicados).
   - `tr(Key)` devuelve la cadena del idioma activo; si falta una traducción, cae a inglés.
   - `detect_system_language()` lee el locale del SO y cae a `en`; `parse_language()`
     normaliza `en`, `es`, `en-US`, `es-AR`, etc.
   - Selector `Language: [English | Español]` en la cabecera de ImGui, con cambio en
     caliente y persistencia en `launcher.ini` (`language = en|es`).
   - CLI: `--lang en|es` y variable `OE_LANG`; `--help` en inglés por defecto y en español
     si se pide.
2. **Código y comentarios en inglés**: traducir comentarios y mensajes internos de
   `launcher/src/`, `scripts/` y `CMakeLists.txt`; las cadenas visibles pasan por `tr()`.
3. **Documentación bilingüe**:
   - `README.md` en inglés (principal) + `README.es.md` en español, con switcher
     `[ English | [Español](README.es.md) ]` y viceversa.
   - `PRODUCT.md` y `AGENTS.md` con la política de idioma explícita.
   - `docs/roadmap.md` en inglés + `docs/es/roadmap.md`; `docs/STATUS.md` (cuando exista
     por el change `status-dashboard`) + `docs/es/STATUS.md`.
   - `docs/analysis/*` se mantiene en español como registro de medición; el índice nuevo
     `docs/es/README.md` lo aclara.
4. **Dashboard (`site/`)** — depende de `status-dashboard`: selector `EN | ES` y etiquetas,
   tooltips e hitos localizados, con preferencia en `localStorage`.
5. **Verificación**: catálogo completo (test de compilación/CI), paridad de los dos
   READMEs y builds de Windows/Linux sin regresiones.

## Scope

**In of scope**

- Módulo i18n del launcher, catálogo en/es, selector, persistencia y CLI.
- Traducción al inglés de comentarios y mensajes de `launcher/`, `scripts/` y
  `CMakeLists.txt`.
- `README.md` en inglés, `README.es.md` en español y switchers.
- Política de idioma en `AGENTS.md`/`PRODUCT.md` (preservando el bloque LOCKED de idioma
  de los artifacts de aspec).
- `docs/roadmap.md` + `docs/es/roadmap.md`; `docs/STATUS.md` + `docs/es/STATUS.md` cuando
  el change de status los cree.
- i18n del sitio de GitHub Pages (cuando exista).

**Out of scope**

- Traducir `docs/analysis/*`: son mediciones fechadas y su traducción rompería referencias
  y evidencia; se mantienen en español.
- Traducir los artifacts de `aspec/` (proposal/design/tasks/specs): el bloque
  `LOCKED: artifacts-language` de `AGENTS.md` sigue vigente.
- Traducir contenido del juego, nombres propios del juego o textos in-game.
- Localizar herramientas de terceros (`ps2-native-recomp`, ImGui, SDL2).
- Rediseñar la UI del launcher más allá del selector.
- Traducciones adicionales (fr/de/it/ja) en esta iteración.

## Risks

- **Explosión de alcance documental**: querer traducir todo `docs/`. *Mitigación*: alcance
  cerrado a README/PRODUCT/AGENTS/roadmap/STATUS y a `docs/es/`; `docs/analysis/` queda
  como evidencia en español con nota explícita.
- **Deriva entre `README.md` y `README.es.md`**: *Mitigación*: script de paridad
  (`scripts/check-docs.mjs`) que compara títulos, enlaces y bloques de código en CI.
- **Claves i18n incompletas o duplicadas**: *Mitigación*: catálogo indexado por `enum` con
  `static_assert` de tamaño y test que recorre todas las claves exigiendo `en` y `es`.
- **Configuración existente**: usuarios con `launcher.ini` sin `language`. *Mitigación*:
  ausencia ⇒ detección del SO ⇒ fallback `en`; nunca se borra el archivo.
- **UTF-8 en ImGui**: acentos y `ñ` ya pasan por `clean()`. *Mitigación*: test visual de
  todas las cadenas `es` y comparación con la salida actual.
- **Conflicto con la regla LOCKED de artifacts**: *Mitigación*: la política distingue
  explícitamente código/docs de producto (inglés) de artifacts de aspec (idioma de la
  conversación).
- **El sitio aún no existe**: *Mitigación*: la tarea de i18n del sitio se marca como
  dependiente de `status-dashboard` y no bloquea el resto del change.
- **Regresión de build**: tocar `app.hpp`/`config.cpp` afecta ambos OS. *Mitigación*: CI
  existente de `launcher.yml` en Windows y Linux como gate.

## Decisiones

### i18n-english-default

- **memory_key**: `i18n-english-default`
- **Elección**: inglés por defecto en código, comentarios, logs, commits y `README.md`;
  español seleccionable y documentado en réplicas.
- **Descartado**: mantener español como idioma principal y añadir inglés sólo en la UI.
- **Justificación**: el issue #12 busca accesibilidad global y comparabilidad de logs;
  el español se conserva como opción de primera clase, no como traducción de segunda.
- **Refs**: issue #12, `README.md`, `launcher/src/main.cpp`.
- **Estado**: propuesta (2026-11-04).

### i18n-launcher-ini

- **memory_key**: `i18n-launcher-ini`
- **Elección**: persistir el idioma en `launcher.ini` con la clave `language = en|es`.
- **Descartado**: crear un `config.json` nuevo (el issue lo menciona, pero el launcher ya
  usa `launcher.ini`) o duplicar configuración.
- **Justificación**: `save_config()`/`load_config()` ya son la fuente de verdad y el
  formato `key = value` tolera la clave nueva sin migración.
- **Refs**: `launcher/src/config.cpp`, `launcher/src/app.hpp`.
- **Estado**: propuesta (2026-11-04).

### i18n-keys-not-literals

- **memory_key**: `i18n-keys-not-literals`
- **Elección**: toda cadena visible del launcher pasa por `tr(Key::...)`; el catálogo es
  un array indexado por `enum` con `static_assert`.
- **Descartado**: `std::map<std::string, std::string>` con búsquedas por texto o literales
  bilingües inline.
- **Justificación**: detecta claves faltantes en compilación, evita colisiones y mantiene
  el cambio de idioma en caliente sin recompilar ni reiniciar.
- **Refs**: `launcher/src/main.cpp`, `launcher/src/config.cpp`.
- **Estado**: propuesta (2026-11-04).

### i18n-docs-scope

- **memory_key**: `i18n-docs-scope`
- **Elección**: traducir sólo documentación de producto (`README`, `PRODUCT`, `AGENTS`,
  `roadmap`, `STATUS`) y crear réplicas en `docs/es/`; `docs/analysis/` queda en español.
- **Descartado**: traducir todo `docs/` de una vez.
- **Justificación**: `docs/analysis/` es evidencia fechada con comandos de reproducción;
  reescribirla no aporta y arriesga perder precisión. El índice bilingüe aclara qué está
  en cada idioma.
- **Refs**: `docs/analysis/`, `docs/roadmap.md`, issue #12.
- **Estado**: propuesta (2026-11-04).

### i18n-artifacts-language-locked

- **memory_key**: `i18n-artifacts-language-locked`
- **Elección**: los artifacts de aspec (`proposal`, `design`, `tasks`, `specs`) siguen
  escribiéndose en el idioma de la conversación, según el bloque LOCKED de `AGENTS.md`.
- **Descartado**: forzar inglés también en `aspec/`.
- **Justificación**: la política de producto no debe romper una regla ya fijada del flujo
  spec-driven; los artifacts son comunicación con el equipo, no documentación de producto.
- **Refs**: `AGENTS.md` §`LOCKED: artifacts-language`.
- **Estado**: propuesta (2026-11-04).
