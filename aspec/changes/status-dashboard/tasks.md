# Tasks: Estado automatizado del port y dashboard en GitHub Pages

## Fase 1 — Datos declarativos

- [ ] Crear `docs/status/port_status.json` con los dos mapas (`runtime`, `game`), las
      áreas del issue #11, las plataformas y las 25 misiones.
- [ ] Cargar cada ítem con `status`, `evidence` y `measured` reales de
      `docs/analysis/07-runtime-nativo.md` y `decomp/analysis/decompilation-summary.md`.
- [ ] Crear `docs/status/milestones.json` con los 6 hitos medidos (extracción/decomp,
      baseline de `main`, arranque nativo, overlays `MWo3`, cutscene+combate, NTSC/idiomas/
      memory card/launcher) y su commit real.
- [ ] Validar ambos archivos con `python -m json.tool` y revisar que no haya ítems sin
      evidencia.

**Gate**: los dos JSON parsean, cubren todas las áreas del issue y cada ítem
`working`/`partial` tiene medición verificable.

## Fase 2 — Generador y artefactos estáticos

- [ ] Implementar `scripts/generate-status.py` (sólo stdlib): carga, validación de
      esquema, agregación desde `decomp/modules.json` y `decomp/symbols/*.csv`.
- [ ] Implementar `squarify()` estable (orden por tamaño y nombre) y el emisor SVG con
      leyenda, `<title>` y colores por estado.
- [ ] Emitir `docs/status/modules_tree.json` con totales de `main` + 25 overlays y top de
      funciones por módulo (`--top`, default 200).
- [ ] Emitir `docs/status/port_status.svg` y `docs/status/modules_status.svg`.
- [ ] Implementar `--check` con exit code 1 y listado de archivos desactualizados.

**Gate**: `python scripts/generate-status.py` produce los tres artefactos y una segunda
corrida deja los SHA-256 idénticos; `--check` pasa después de generar y falla si se toca
un JSON sin regenerar.

## Fase 3 — Reporte técnico

- [ ] Redactar `docs/STATUS.md`: estado por plataforma, por subsistema, tabla de los 26
      módulos con cobertura y estado en runtime, y problemas conocidos (fin de misión,
      cámara, guardado post-tutorial, port a Vita).
- [ ] Enlazar cada afirmación a su evidencia (commit o documento con comando).

**Gate**: `docs/STATUS.md` no repite números que no estén también en los JSON o en la
metadata de decomp.

## Fase 4 — Sitio interactivo

- [ ] Crear `site/index.html` con hero, navegación, cuatro secciones y diagrama SVG del
      mapa de memoria EE (sin imágenes del juego).
- [ ] Crear `site/assets/site.css` (tema oscuro, responsive, foco visible, print).
- [ ] Vendorizar D3 v7 en `site/vendor/` con su licencia y sin CDN.
- [ ] Implementar `site/assets/app.js`: fetch de los tres JSON, contadores animados con
      `prefers-reduced-motion`, split bar, treemaps con drill-down/breadcrumb/tooltip,
      tabla de módulos e hitos.
- [ ] Verificar accesibilidad básica: contraste AA, `aria-label`, navegación por teclado.

**Gate**: con `python -m http.server` en la raíz, el sitio carga sin errores de consola,
sin peticiones externas y el drill-down muestra funciones de `menu`, `prg_player_0` y una
misión.

## Fase 5 — README y CI

- [ ] Actualizar `## Estado` del `README.md`: enlaces al dashboard y a `docs/STATUS.md`,
      más los dos SVG embebidos y la tabla resumida.
- [ ] Crear `.github/workflows/pages.yml` con jobs `verify` (`--check`) y `deploy`
      (Pages), copiando `docs/status/*.json` a `site/status/`.
- [ ] Probar en un PR que un cambio de JSON sin regenerar falla en `verify`.

**Gate**: el workflow queda verde en `main` y la URL de Pages sirve el dashboard con los
datos del repo.

## Fase 6 — Cierre

- [ ] Registrar en `docs/analysis/07-runtime-nativo.md` o `README.md` la URL del
      dashboard y el comando de regeneración.
- [ ] Revisar `git status`: sin ISO, `.bin`, `.elf`, capturas ni `work/`.
- [ ] Sincronizar el spec y archivar el change.
