## ADDED Requirements

### Requirement: Fuente única de estado

El proyecto SHALL mantener el estado del port en `docs/status/port_status.json` y
`docs/status/milestones.json` como única fuente editable, y SHALL exigir evidencia
verificable en cada ítem publicado.

#### Scenario: Ítem sin evidencia

- **WHEN** un ítem de `port_status.json` no declara `evidence` o declara `working`/`partial`
  sin `measured`
- **THEN** el generador rechaza el archivo, nombra el ítem y no escribe artefactos

#### Scenario: Misión inexistente

- **WHEN** `missions` incluye un módulo que no existe en `decomp/modules.json`
- **THEN** el generador falla indicando que las misiones 13, 14 y 23 no existen en `OL.BIN`

### Requirement: Generación determinista de artefactos

El sistema SHALL generar `docs/status/modules_tree.json`,
`docs/status/port_status.svg` y `docs/status/modules_status.svg` desde los datos
declarativos y la metadata de decomp, con el mismo resultado byte a byte en cada corrida.

#### Scenario: Dos corridas

- **WHEN** se ejecuta `python scripts/generate-status.py` dos veces sin cambiar las fuentes
- **THEN** los SHA-256 de los tres artefactos son idénticos

#### Scenario: Conteo de módulos

- **WHEN** el generador agrega `main` y los overlays
- **THEN** reporta 8.815 funciones en `main`, 4.925 en los 24 overlays con código y
  8.017.984 B de `.text` totales

#### Scenario: Drill-down acotado

- **WHEN** un módulo supera el límite `--top` de funciones
- **THEN** `modules_tree.json` incluye sus totales completos, las funciones más grandes y
  un flag `truncated` verdadero

### Requirement: Verificación en CI

El sistema SHALL verificar en integración continua que los artefactos commiteados
coinciden con las fuentes y SHALL impedir el despliegue si no coinciden.

#### Scenario: Datos cambiados sin regenerar

- **WHEN** un push modifica `port_status.json` o `milestones.json` sin regenerar los
  artefactos
- **THEN** el job `verify` falla y lista los archivos desactualizados

#### Scenario: Artefactos sincronizados

- **WHEN** los artefactos coinciden con las fuentes
- **THEN** `python scripts/generate-status.py --check` termina con código 0 y el sitio se
  despliega en GitHub Pages

### Requirement: Resumen de estado en el README

El `README.md` SHALL mostrar el estado resumido con los dos SVG autogenerados y SHALL
enlazar al dashboard y a `docs/STATUS.md`.

#### Scenario: Lectura sin JavaScript

- **WHEN** se abre el `README.md` en GitHub
- **THEN** se ven los treemaps de subsistemas y de módulos, con tooltip por celda y una
  tabla resumida coherente con `port_status.json`

### Requirement: Dashboard estático autocontenido

El sitio de GitHub Pages SHALL renderizar contadores, split bar, treemaps con drill-down,
tabla de módulos e hitos usando sólo recursos locales del repositorio.

#### Scenario: Sin red externa

- **WHEN** se abre el sitio servido localmente o en Pages
- **THEN** no hay peticiones a CDNs ni errores de consola, y D3 se carga desde
  `site/vendor/`

#### Scenario: Movimiento reducido

- **WHEN** el sistema operativo informa `prefers-reduced-motion: reduce`
- **THEN** los contadores muestran el valor final sin animación y los treemaps no animan
  el zoom

#### Scenario: Drill-down de un overlay

- **WHEN** el usuario hace click en `menu`, `prg_player_0` o una misión
- **THEN** el treemap hace zoom a sus funciones, muestra dirección y tamaño, y el
  breadcrumb permite volver a la vista de áreas

### Requirement: Cero contenido propietario en el reporte

El sistema SHALL publicar sólo geometría, datos y texto propios, sin capturas ni assets
del juego.

#### Scenario: Revisión de artefactos

- **WHEN** se revisa el change antes de commitear
- **THEN** `git status --short` no muestra `.iso`, `.bin`, `.elf`, `.pss`, capturas ni
  archivos de `work/`, y los SVG no contienen `<image>` ni datos embebidos del juego
