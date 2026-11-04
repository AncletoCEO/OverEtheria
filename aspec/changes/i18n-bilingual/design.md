# Design: Soporte bilingüe integral (inglés por defecto, español de primera clase)

## Approach

Una sola capa de localización por superficie, con el mismo contrato en las tres:

1. **Launcher**: catálogo compilado indexado por `enum`, resolución de idioma al arrancar
   y cambio en caliente (ImGui es modo inmediato: basta con que cada frame llame a
   `tr()`).
2. **Documentación**: inglés como documento principal, español como réplica con switcher y
   un script de paridad que evita la deriva.
3. **Sitio**: diccionario de cadenas en JS, atributos `data-i18n` y preferencia en
   `localStorage`; el idioma por defecto sale de `navigator.language` con fallback `en`.

La regla de precedencia es única para launcher y sitio:
`--lang`/`localStorage` > `OE_LANG`/`navigator.language` > archivo de configuración >
locale del SO > `en`.

El cambio se implementa en orden de riesgo: primero el catálogo y el launcher (testeable
en CI), después la traducción de comentarios, luego la documentación y por último el sitio
(que depende de `status-dashboard`).

## Architecture

### Launcher

```text
launcher/src/
  i18n.hpp        contrato: Key, Lang, tr(), parse/detect/set
  i18n.cpp        catálogo en/es + validación estática + detección de locale
  app.hpp         Config.language; Binding.label pasa a ser i18n::Key
  config.cpp      carga/guarda `language` en launcher.ini; etiquetas por clave
  main.cpp        literales → tr(Key::...), selector en la cabecera, CLI --lang
  platform.cpp    mensajes de error/proceso → tr(Key::...)
  tests/i18n_test.cpp  catálogo completo + parse/detect (CI)
```

**Contrato** (`i18n.hpp`):

```cpp
namespace oe::i18n {

enum class Lang { En, Es };

enum class Key {
    AppTitle,
    TabGame, TabVideo, TabControls, TabSave,
    SelectIso, Check, PrepareGame, Play, Stop,
    // ... una por cadena visible
    Count
};

void set_language(Lang lang);
Lang language();
const char *tr(Key key);                 // nunca nullptr; fallback a inglés
Lang parse_language(std::string_view text);  // "es-AR" -> Es; desconocido -> En
Lang detect_system_language();           // locale del SO; fallback En
const char *language_code(Lang lang);    // "en" | "es"

}  // namespace oe::i18n
```

**Catálogo** (`i18n.cpp`): dos arrays paralelos, indexados por `Key`, con
`static_assert` de tamaño y un test que recorre `0..Count` exigiendo ambas cadenas no
vacías. Si una entrada `es` queda vacía, `tr()` devuelve la `en` (nunca una clave cruda).

**Configuración** (`app.hpp` / `config.cpp`):

- `Config` gana `std::string language = "en";`.
- `load_config()`: `else if (key == "language") c.language = value;`.
- `save_config()`: `out << "language = " << c.language << "\n";`.
- Archivos viejos sin `language`: no se reescriben hasta que el usuario cambia algo; al
  arrancar se resuelve por detección y se usa sin migración.

**Selector**: en la cabecera, antes de las pestañas:

```text
Language: [ English | Español ]
```

Al cambiar: `i18n::set_language(lang)`, `config.language = language_code(lang)` y
`save_config(config)`. El siguiente frame ya se dibuja en el idioma nuevo; no hay reinicio.

**Etiquetas de controles**: `Binding.label` deja de ser `const char *` y pasa a ser
`i18n::Key`; `default_bindings()` usa claves (`Key::BindingDpadUp`, …) y la UI hace
`tr(config.bindings[i].label)`. El nombre de `keys.ini` (`Binding::name`) no se toca: es
contrato con el runtime y no se localiza.

**CLI**:

- `--lang en|es` y `OE_LANG=en|es`.
- `--help` se imprime en el idioma resuelto; por defecto inglés.
- Precedencia: `--lang` > `OE_LANG` > `launcher.ini` > locale del SO > `en`.
- `--version` y `--data-dir` no cambian de formato (los consume CI).

**Detección de locale**:

- Windows: `GetUserDefaultUILanguage()` y `GetLocaleInfoEx` (LCID → nombre).
- Linux/macOS: `LANG`/`LC_ALL` y, si están vacíos, `setlocale(LC_MESSAGES, "")`.
- Normalización: primer subtag `es` ⇒ `Es`; cualquier otro o desconocido ⇒ `En`.

### Código y comentarios

- Traducir comentarios de `launcher/src/*.cpp`, `launcher/src/*.hpp`,
  `launcher/CMakeLists.txt`, `CMakeLists.txt` raíz si existe y `scripts/*.{mjs,py,ps1,sh}`.
- Mensajes de log/proceso del launcher: inglés por defecto y claves `tr()` cuando son
  visibles en la UI.
- No se traducen identificadores, nombres de archivo ni claves de configuración.
- Auditoría: `rg` sobre `launcher/src` (excluyendo la columna `es` de `i18n.cpp`) y sobre
  `scripts/` buscando texto en español en comentarios y literales de log.

### Documentación

```text
README.md                 English (principal, con switcher a README.es.md)
README.es.md              Spanish (con switcher a README.md)
PRODUCT.md                English (política de idioma incluida)
AGENTS.md                 English, preservando LOCKED blocks carácter por carácter
docs/README.md            índice EN (qué hay en docs/ y en docs/es/)
docs/es/README.md         índice ES
docs/roadmap.md           English
docs/es/roadmap.md        Spanish
docs/STATUS.md            English   (cuando lo cree status-dashboard)
docs/es/STATUS.md         Spanish   (cuando lo cree status-dashboard)
docs/analysis/*           Spanish (evidencia fechada; sin cambios)
```

- Switcher en la primera línea de ambos READMEs:
  `[ English | [Español](README.es.md) ]` y `[ [English](README.md) | Español ]`.
- `AGENTS.md`: se traduce el texto, pero los bloques `<!-- LOCKED: ... -->` y su contenido
  se mantienen **literalmente** (incluido `LOCKED: artifacts-language`).
- `PRODUCT.md`: añade una sección `Language policy` que fija inglés para código/docs de
  producto y español para `docs/analysis/` y réplicas.
- `docs/README.md` aclara qué documentación está en inglés y cuál en español, para que no
  parezca una traducción incompleta.

### Sitio (`site/`, depende de `status-dashboard`)

```text
site/assets/i18n.js   STRINGS = { en: {...}, es: {...} }; applyLanguage(lang)
site/index.html       data-i18n="key" en textos fijos; selector EN | ES
site/assets/app.js    usa STRINGS para contadores, tooltips, tabla e hitos
```

- El idioma inicial: `localStorage["oe.lang"]` > `navigator.language` (`es*` ⇒ `es`) >
  `en`.
- `applyLanguage()` recorre `[data-i18n]`, `[data-i18n-aria]` y `[data-i18n-title]`; los
  textos generados por D3 (tooltips, breadcrumb, leyenda) consultan `STRINGS` en cada
  render.
- El selector no recarga la página ni vuelve a pedir los JSON: re-renderiza.
- `lang` del `<html>` se actualiza (`document.documentElement.lang`).

### Paridad de documentación

`scripts/check-docs.mjs` (Node, sin dependencias):

- Extrae encabezados `##`/`###` y enlaces relativos de `README.md` y `README.es.md`.
- Falla si un enlace relativo del README inglés no existe en el árbol, o si un archivo
  enlazado no tiene su contraparte esperada (`README.es.md`, `docs/es/...`).
- Compara la cantidad de encabezados de primer y segundo nivel; permite un mapa de
  excepciones en `docs/i18n-map.json` para secciones que legítimamente difieren.
- Se ejecuta en CI junto con el build del launcher.

## Validation

| Superficie | Verificación | Criterio |
|---|---|---|
| Catálogo | `launcher/tests/i18n_test.cpp` (ctest) en Windows y Linux | todas las `Key` tienen `en` y `es`; `parse_language("es-AR") == Es`; `parse_language("xx") == En` |
| Launcher (aceptación 1) | arranque sin `launcher.ini` en entorno EN | UI íntegramente en inglés |
| Cambio en caliente | click en `Español` | todas las pestañas/botones/estados cambian sin reiniciar |
| Persistencia | reiniciar el launcher | sigue en español; `launcher.ini` contiene `language = es` |
| CLI | `--lang es --help`, `OE_LANG=es --help` | salida en español; sin flag, en inglés |
| Comentarios | auditoría `rg` en `launcher/src` y `scripts/` | 0 comentarios/literales de log en español fuera del catálogo |
| Docs | `node scripts/check-docs.mjs` | README EN y ES con la misma estructura y enlaces válidos |
| Sitio | servidor local + selector EN/ES | etiquetas, tooltips e hitos cambian; sin recarga; `localStorage` persiste; consola limpia |
| Build/CI | `launcher.yml` en `ubuntu-latest` y `windows-latest` | ambos jobs verdes; release sin cambios de contrato |
| Guardrail | `git status --short` | sin ISO, `.bin`, `.elf`, capturas ni `work/` |
