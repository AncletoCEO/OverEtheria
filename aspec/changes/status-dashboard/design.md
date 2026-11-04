# Design: Estado automatizado del port y dashboard en GitHub Pages

## Approach

El diseño separa **datos**, **presentación generada** y **presentación interactiva**:

1. Los datos editables viven en `docs/status/port_status.json` y
   `docs/status/milestones.json`. Nada más se edita a mano.
2. `scripts/generate-status.py` transforma datos + metadata de decomp en tres artefactos
   deterministas: `modules_tree.json` y los dos SVG. El script es la única pieza que
   conoce el layout del treemap y el formato SVG.
3. El sitio consume **sólo JSON** (`port_status.json`, `milestones.json`,
   `modules_tree.json`) y dibuja con D3. No consume los SVG, así que el drill-down no
   depende de parsear SVG.
4. El README consume **sólo los SVG** (imágenes), de modo que el resumen ejecutivo se ve
   sin JavaScript y sin desplegar el sitio.
5. CI ejecuta `--check` y despliega. Si los artefactos no coinciden con las fuentes, el
   workflow falla antes de publicar.

Se implementa en este orden porque cada paso valida al anterior: datos → generador →
SVG (README) → sitio → CI.

## Architecture

```text
docs/
  STATUS.md                     reporte técnico (se escribe a mano, enlaza a los JSON)
  status/
    port_status.json            fuente: mapas runtime/game, plataformas, 25 misiones
    milestones.json             fuente: hitos medidos
    modules_tree.json           generado: totales por módulo + top funciones
    port_status.svg             generado: treemap de subsistemas y flujo
    modules_status.svg          generado: treemap main + overlays
site/
  index.html                    página única
  assets/site.css               estilos (tema oscuro, responsive, print)
  assets/app.js                 carga JSON, contadores, split bar, treemaps, tablas
  vendor/d3-7.9.0.min.js        copia local + LICENSE
scripts/
  generate-status.py            generador y verificador (--check)
.github/workflows/
  pages.yml                     verify + deploy a GitHub Pages
```

### Esquema de `port_status.json`

```jsonc
{
  "schema": 1,
  "generatedFrom": { "modules": "decomp/modules.json", "symbols": "decomp/symbols" },
  "maps": {
    "runtime": {
      "title": "Runtime y subsistemas PS2",
      "areas": [
        {
          "name": "Ejecutable y overlays MWo3",
          "items": [
            {
              "name": "Ventana 0x100000 + menu.bin",
              "status": "working",          // working | partial | pending
              "evidence": "commit 0e9aa16",
              "measured": "log ee-live switched in window 0x00100000",
              "note": "opcional, tooltip"
            }
          ]
        }
      ]
    },
    "game": { "title": "Flujo del juego y modos", "areas": [] }
  },
  "platforms": [
    { "name": "Windows x86-64", "status": "working", "evidence": "release v0.1.1" }
  ],
  "missions": [
    { "name": "mission01", "status": "partial", "evidence": "inicio de misión jugable" }
  ]
}
```

Reglas de validación que aplica el generador (y `--check`):

- `schema` debe ser `1`.
- Cada ítem necesita `name`, `status` dentro del enum y `evidence` no vacío.
- `measured` es obligatorio para `working` y `partial` (no se afirma sin medir).
- No se permiten ítems duplicados dentro de un área ni áreas vacías.
- Todo ítem de `missions` debe corresponder a un módulo de `decomp/modules.json`
  (excepto las misiones 13, 14 y 23, que no existen en `OL.BIN`).

### Esquema de `milestones.json`

Lista ordenada por fecha con `date`, `commit`, `title`, `metric` y `repro`. El generador
rechaza fechas no ISO, commits que no sean SHA de 7–40 hex y entradas sin `repro`.

### Generador (`scripts/generate-status.py`)

Módulos internos, todos en un archivo para no fragmentar:

1. **Carga**: `modules.json`, `port_status.json`, `milestones.json` y los CSV de
   `decomp/symbols/`. De cada CSV usa `name,address,size` (encabezado ya existente).
2. **Agregación**: por módulo calcula funciones, bytes cubiertos, `.text` declarado,
   porcentaje y estado; agrega `main` desde `modules.json.programs`.
3. **Squarified treemap**: función pura `squarify(items, x, y, w, h)` que devuelve
   rectángulos; ordena por tamaño descendente con desempate por nombre para que el
   resultado sea estable.
4. **SVG**: emite `<svg>` con `viewBox`, fondo `#0d1117`, celdas con `fill` por estado,
   `<title>` (nombre, estado, evidencia, nota), leyenda y título. Sin fuentes externas,
   sin `<image>` y sin estilos que dependan del tema del host.
5. **`modules_tree.json`**: totales de los 26 módulos + `topFunctions` por módulo
   (por defecto 200, configurable con `--top`), más un flag `truncated`.
6. **`--check`**: escribe en memoria, compara con los archivos en disco y devuelve
   exit code 1 con la lista de archivos desactualizados. `--write` (default) regenera.

Colores por estado: `working` `#2f9e5b`, `partial` `#d9a521`, `pending` `#30363d`.
El texto de cada celda se elide a una línea y el detalle completo queda en `<title>`.

### Sitio (`site/`)

- Una sola página con secciones `#recomp`, `#overlays`, `#missions`, `#milestones`.
- `app.js` resuelve la base de datos en un solo lugar: intenta `./status/<archivo>.json`
  (layout del deploy, donde el workflow copia `docs/status/*.json` a `site/status/`) y, si
  no existe, cae a `../docs/status/<archivo>.json` (servidor local sobre la raíz del repo).
  Así el mismo HTML funciona en local y en Pages sin rutas duplicadas.
- Contadores: animación con `requestAnimationFrame` que respeta
  `prefers-reduced-motion`; si el usuario lo pide, se pinta el valor final sin animar.
- Treemaps: D3 `treemap`/`treemapSquarify`, zoom con transición al hacer click, breadcrumb
  y tooltip flotante. El drill-down usa `topFunctions`; si `truncated` es true se muestra
  "N funciones, mostrando las M más grandes".
- Tabla de módulos: una fila por módulo con `<meter>` de cobertura y estado en runtime.
- Hitos: tarjetas cronológicas con commit enlazado a GitHub y comando de reproducción.
- Sin imágenes del juego: el hero usa un diagrama SVG propio del mapa de memoria EE
  (`0x00100000` ventana de overlays, `0x004C0000` main, `0x00A93700` heap).
- Accesibilidad: contraste AA, `aria-label` en los treemaps, navegación por teclado en
  breadcrumb y tabla con `<caption>`.

### CI (`.github/workflows/pages.yml`)

- `verify`: Python 3.12 del runner, `python scripts/generate-status.py --check`.
  Falla si hay artefactos desactualizados o datos inválidos.
- `deploy`: `actions/upload-pages-artifact` con `site/` y `docs/status/*.json` copiados a
  `site/status/`; `actions/deploy-pages`. Permisos `pages: write`, `id-token: write`.
- Sin secretos ni contenido del juego.

## Validation

- **Determinismo**: correr el generador dos veces y comparar SHA-256 de los tres
  artefactos; deben ser idénticos. Se automatiza en `tasks.md` con un comando único.
- **Integridad de datos**: el generador rechaza ítems sin evidencia y estados inválidos;
  se prueba con un JSON temporal inválido en `work/` (no versionado).
- **README**: render local en Markdown con los dos `<img>`/`![...]`; verificar que los SVG
  abren sin recursos externos y que los tooltips aparecen.
- **Sitio**: `python -m http.server` sobre la raíz; consola sin errores, sin peticiones
  externas (DevTools/Network), drill-down y breadcrumb funcionando, `prefers-reduced-motion`
  respetado.
- **CI**: PR de prueba que cambia `port_status.json` sin regenerar debe fallar en
  `verify`; con los artefactos regenerados debe pasar y desplegar.
- **Guardrail de contenido**: `git status --short` no debe mostrar `.iso`, `.bin`, `.elf`,
  `.pss` ni capturas; los SVG son geometría propia.
