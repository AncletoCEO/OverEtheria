# Proposal: Estado automatizado del port y dashboard en GitHub Pages

## Problem

El estado del proyecto se mantiene a mano en tres lugares que ya divergen entre sí:
la tabla `## Estado` del `README.md`, las mediciones de `docs/analysis/07-runtime-nativo.md`
y los agregados de `decomp/analysis/decompilation-summary.md`. Cada avance obliga a
editar tablas en varios archivos y no existe una vista que cruce las dos dimensiones
que importan: **qué subsistema del runtime funciona** y **cuánto código de cada módulo
`MWo` está cubierto y ejecutado**.

Números medidos que el reporte debe poder publicar sin recalcularlos a mano:

- **13.740 funciones** catalogadas: 8.815 en `decomp/symbols/main.csv` + 4.925 en los
  24 CSV de overlays (verificado: 25 archivos, 13.740 filas de datos).
- **8.017.984 B de `.text`** (5.667.968 de `main` + 2.350.016 de `OL.BIN`, ~8,02 MB).
- **25 módulos `MWo`**, 24 con código (`mission98.bin` son 192 B de ceros) y 98,81 % de
  cobertura de decompilación en overlays.
- Plataformas: Windows x86-64 y Linux x86-64 publicadas (v0.1.1); PS Vita pendiente.

Además, no hay sitio público de progreso ni un gate que impida publicar un SVG
desactualizado. El issue #11 pide replicar la arquitectura de `HenryKun55/celosia`
(JSON declarativo → generador Python → SVG para el README + sitio estático con D3.js)
adaptada a nuestros overlays y a nuestros guardrails.

## Proposed change

Un pipeline declarativo **datos → generador → artefactos versionados**, con el sitio
estático servido desde GitHub Pages y verificado en CI:

1. **Fuente de verdad declarativa** en `docs/status/`:
   - `port_status.json`: dos mapas (`runtime` y `game`) con áreas, features, estado
     (`working` / `partial` / `pending`), evidencia (commit o documento) y nota de
     medición; más plataformas y las 25 misiones.
   - `milestones.json`: cronología de hitos medidos (fecha, commit, métrica, comando
     de reproducción).
2. **Generador propio MIT** `scripts/generate-status.py`, sólo stdlib de Python:
   - lee `decomp/modules.json`, `decomp/symbols/*.csv` y los JSON declarativos;
   - emite `docs/status/modules_tree.json` (totales por módulo + top de funciones para
     el drill-down, acotado para no inflar el bundle);
   - emite `docs/status/port_status.svg` y `docs/status/modules_status.svg` con
     *squarified treemap*, leyenda y `<title>` con commit/fecha/nota;
   - soporta `--check` para que CI falle si los artefactos no coinciden con las fuentes.
3. **Reporte técnico** `docs/STATUS.md`: estado por plataforma, por subsistema, tabla de
   los 26 módulos (`main` + 25 overlays), huecos conocidos y problemas medidos.
4. **Sitio estático** en `site/`: HTML + CSS + JS propios (sin frameworks), D3 v7
   vendorizado, contadores animados, *split bar* del mapa de memoria EE, treemaps con
   drill-down a funciones y tabla de módulos.
5. **Integración**: `README.md` embebe los dos SVG y enlaza al dashboard y a
   `docs/STATUS.md`; `.github/workflows/pages.yml` corre `--check` y despliega
   `site/` + `docs/status/*.json`.

## Scope

**In of scope**

- Esquema y contenido de `port_status.json` y `milestones.json` con evidencia por ítem.
- Generador Python determinista, `--check` y SVGs embebibles en Markdown.
- `docs/STATUS.md` y actualización de la sección `## Estado` del README.
- Sitio estático `site/` (ES) con treemaps, drill-down, tablas e hitos.
- Workflow de GitHub Pages con verificación de artefactos.
- Tests de determinismo y de integridad de datos (sin dependencias externas).

**Out of scope**

- Backend, base de datos o telemetría en vivo: el sitio es estático.
- Publicar capturas del juego, arte con copyright o cualquier asset propietario.
- Automatizar la medición (FPS, cobertura): los datos se actualizan a mano con evidencia.
- Traducción del sitio a varios idiomas en esta iteración (base en español).
- Reemplazar `docs/analysis/` o `docs/roadmap.md`: el dashboard los enlaza, no los sustituye.

## Risks

- **Los JSON se desactualizan igual que las tablas**: *Mitigación*: cada ítem exige
  `evidence` y `measured`; el generador falla si faltan, y `--check` corre en cada push.
- **Artefactos generados y revisión**: diffs grandes de SVG/JSON. *Mitigación*:
  generación determinista (orden estable, sin timestamps), un commit por regeneración y
  gate de `--check` que muestra sólo el diff real.
- **El SVG embebido no respeta el tema claro/oscuro de GitHub**: *Mitigación*: fondo
  propio oscuro con contraste verificado, igual que la referencia, y texto legible en
  ambos modos.
- **`modules_tree.json` demasiado grande**: 13.740 funciones. *Mitigación*: totales
  completos por módulo + top N funciones configurables por módulo para el drill-down.
- **D3 vendorizado y CSP**: *Mitigación*: copia local con licencia, sin CDNs ni
  peticiones de red; verificación de consola limpia.
- **Licencia de la referencia**: `celosia` es GPL-3.0. *Mitigación*: no se copia código;
  se reimplementa el algoritmo y el frontend bajo MIT, con revisión explícita.
- **Afirmar sin medir**: *Mitigación*: todo estado publicado referencia un commit o un
  documento con su comando de reproducción.

## Decisiones

### status-single-source

- **memory_key**: `status-single-source`
- **Elección**: `docs/status/*.json` es la única fuente editable; SVG, `modules_tree.json`
  y las tablas del README se **generan** y se commitean.
- **Descartado**: editar tablas y SVG a mano, y generar en CI sin commitear.
- **Justificación**: el estado ya divergía en tres archivos; commitear los artefactos
  permite revisarlos en el diff y que el README funcione sin build.
- **Refs**: issue #11, `README.md` §Estado, `docs/analysis/07-runtime-nativo.md`.
- **Estado**: propuesta (2026-11-04).

### status-generator-stdlib

- **memory_key**: `status-generator-stdlib`
- **Elección**: generador en Python **sólo stdlib**, determinista y con `--check`.
- **Descartado**: dependencias tipo Pillow/Graphviz o un generador en Node.
- **Justificación**: el repo ya usa Python embebido sin pip; el treemap y el SVG se
  emiten a mano y el CI no necesita instalar nada.
- **Refs**: `tools.lock.toml` (python 3.12.10), issue #11.
- **Estado**: propuesta (2026-11-04).

### status-site-static-mit

- **memory_key**: `status-site-static-mit`
- **Elección**: sitio estático propio en `site/` con D3 v7 vendorizado, sin frameworks
  y sin peticiones de red.
- **Descartado**: copiar `docs/index.html`/`app.js` de `celosia` (GPL-3.0) o usar un CDN.
- **Justificación**: cumple MIT, CSP y el guardrail de no versionar assets del juego;
  el sitio sigue funcionando si GitHub Pages cambia de CDN.
- **Refs**: `AGENTS.md` §Guardrails, issue #11.
- **Estado**: propuesta (2026-11-04).
