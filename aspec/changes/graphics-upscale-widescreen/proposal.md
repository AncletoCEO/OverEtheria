# Proposal: Upscale interno y widescreen nativo (Hor+) sin distorsión

## Problem

El juego corre nativo y el launcher ya expone `16:9` y `scale = 1..3`, pero ambos se
aplican mal:

1. **Widescreen por estiramiento.** `--widescreen` expande el framebuffer 4:3 a la
   ventana panorámica: los personajes se ven anchos y chatos, los círculos del escenario
   pasan a elipses y el HUD, las fuentes y los diálogos se deforman con la misma escala.
2. **Cinemáticas deformadas.** Los 61 videos `.PSS` del disco se reprodujeron en 4:3 y
   se estiran a 16:9 como cualquier frame.
3. **Escalado interno limitado y con artefactos.** `PS2_SCALE` llega a 3× y no hay
   corrección de *half-pixel offset*: al multiplicar coordenadas aparecen costuras
   (*texture seams*) entre primitivas de color y de profundidad, y el filtrado puede
   mezclar texels fuera del atlas.
4. **Sin control de presentación.** No se puede elegir entre 4:3, 16:9 o 21:9, ni entre
   escalado entero, bilineal o nitidez, ni decidir cómo se compone el HUD.

Medido en el repo: `launcher/src/platform.cpp` pasa `--widescreen` y `PS2_SCALE`;
el runtime ya acepta `--patches`/`--toggles` (pnach) y tiene su propio quick menu (F1)
con `PS2_SCALE` y `PS2_LOOK`. El rasterizador GS es propio (`runtime/src/gs/raster.cpp`),
así que el factor de escala y el muestreo se pueden corregir en código.

## Proposed change

1. **Hor+ FOV**: en vez de estirar, ampliar el campo de visión horizontal de la matriz
   de proyección (factor `(16/9)/(4/3) = 1.333…`, o `0.75` sobre la escala horizontal).
   Se aplica con un parche de memoria al arranque/carga (sintaxis `.pnach` o tabla de
   toggles del runtime) sobre las constantes localizadas en `SLES_537.68` y
   `SLPM_660.33`; si la constante no es estable, un hook en la función de cámara que
   ya está en `decomp/symbols/`.
2. **Frustum lateral**: auditar y ampliar los planos de *culling* laterales para que no
   desaparezcan objetos en los bordes del nuevo cono de visión.
3. **HUD 2D en área segura 4:3**: la escena 3D ocupa el ancho completo y la capa 2D se
   compone centrada en una ventana virtual 4:3 (por defecto), con modo «extendido a
   bordes» opcional.
4. **FMV 4:3 con pillarbox**: el reproductor `.PSS` fuerza su relación original y el
   compositor agrega barras laterales limpias.
5. **Escalado interno GS 1×–6×** con corrección de centro de texel (`+0.5 / scale`),
   *clamp to edge* en el filtrado y opciones de presentación (entero, bilineal,
   nitidez tipo CAS).
6. **Launcher**: pestaña «Video» con resolución interna, relación de aspecto, modo de
   HUD y filtro; todo persistido en `launcher.ini` y traducido a argumentos/entorno de
   `ps2run`.

## Scope

**In of scope**

- Localizar las constantes de proyección en ambas versiones y aplicar Hor+.
- Ampliar el frustum lateral.
- Composición del HUD en 4:3 y FMV con pillarbox.
- Escalado interno 2×–6× estable y corrección de costuras.
- Opciones de video en el launcher y su persistencia.
- Mediciones antes/después (capturas 4:3 vs 16:9 con proporciones).

**Out of scope**

- Reescritura del renderer o del motor.
- Texturas HD o packs externos.
- Interpolación de frames o cambio de la tasa lógica del juego.
- Modo 21:9 como requisito bloqueante (se implementa como opción si Hor+ lo permite).

## Risks

- **Las constantes de FOV viven en overlays**: `menu`/`prg_player_0` y las misiones
  pueden tener sus propias cámaras. *Mitigación*: empezar por `main` y una misión, y
  cubrir el resto con el hook de cámara en vez de parchear cada módulo.
- **Culling prematuro**: ampliar el FOV sin el frustum deja pop-in en los bordes.
  *Mitigación*: medir con una escena con objetos en los extremos y comparar capturas.
- **Costuras al escalar**: el desfase de medio píxel es sensible al redondeo.
  *Mitigación*: pruebas en 2×, 3×, 4× y 6× con la misma escena y un patrón de rejilla.
- **Rendimiento en 4×/6×**: el rasterizador es CPU. *Mitigación*: medir fps por
  multiplicador y dejar 3× como valor recomendado para 1080p.
- **FMV y HUD son 2D con coordenadas propias**: forzar 4:3 puede recortar UI que el
  juego ya dibuja a pantalla completa. *Mitigación*: modo seguro 4:3 por defecto y
  modo extendido como opción.

## Decisiones

### hor-plus-fov

- **memory_key**: `hor-plus-fov`
- **Elección**: ampliar el FOV horizontal (Hor+) en la matriz de proyección; no
  estirar ni recortar verticalmente.
- **Descartado**: `--widescreen` por estiramiento (deforma geometría, HUD y FMV) y
  Vert- (pierde visión vertical).
- **Justificación**: es la única forma de mantener proporciones 1:1 y ganar campo de
  visión; el factor es `(16/9)/(4/3)`.
- **Refs**: `docs/analysis/07-runtime-nativo.md`, `launcher/src/platform.cpp`,
  `tools/ps2-native-recomp/runtime/src/gs/raster.cpp`.
- **Estado**: aceptada (2026-11-04).

### hud-safe-area

- **memory_key**: `hud-safe-area`
- **Elección**: componer la capa 2D en una ventana virtual 4:3 centrada; la escena 3D
  ocupa el ancho completo.
- **Descartado**: estirar el HUD con la escena o reescribir cada elemento de UI.
- **Justificación**: conserva proporciones de retratos, textos y barras sin tocar el
  código del juego; el modo «extendido» queda como opción.
- **Refs**: `aspec/changes/graphics-upscale-widescreen/specs/graphics/spec.md`.
- **Estado**: aceptada (2026-11-04).

### fmv-pillarbox

- **memory_key**: `fmv-pillarbox`
- **Elección**: los `.PSS` se presentan en 4:3 con pillarbox.
- **Descartado**: estirarlos al ancho de la ventana.
- **Justificación**: los videos se masterizaron en 4:3; el estiramiento es el defecto
  más visible en las cinemáticas.
- **Refs**: `docs/analysis/07-runtime-nativo.md` (cutscene medida).
- **Estado**: aceptada (2026-11-04).

### gs-upscale-internal

- **memory_key**: `gs-upscale-internal`
- **Elección**: multiplicar la resolución interna del rasterizador GS (1×–6×) con
  corrección de centro de texel y clamp, en vez de escalar la ventana.
- **Descartado**: reescalado de ventana (borroso) y dejarlo en 1×–3×.
- **Justificación**: el GS es propio y ya recibe `PS2_SCALE`; el desfase de medio píxel
  es la causa de las costuras.
- **Refs**: `patches/ps2-native-recomp-sword.patch`,
  `runtime/src/gs/raster.cpp`.
- **Estado**: aceptada (2026-11-04).
