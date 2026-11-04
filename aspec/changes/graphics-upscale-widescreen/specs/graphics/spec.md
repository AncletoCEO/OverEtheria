# Spec: graphics

> Capacidad nueva: presentación panorámica sin distorsión, HUD y cinemáticas en su
> relación original, y escalado interno del GS configurable.

## ADDED Requirements

### Requirement: Widescreen Hor+ sin distorsión

El sistema SHALL ampliar el campo de visión horizontal en relaciones panorámicas en
lugar de estirar la imagen, manteniendo la relación de aspecto de la geometría 3D.

#### Scenario: Geometría en 16:9

- **WHEN** el usuario elige 16:9 con Hor+ activo
- **THEN** los objetos circulares siguen siendo circulares y el campo de visión
  horizontal es mayor que en 4:3, sin recortar el vertical

#### Scenario: 21:9 opcional

- **WHEN** el usuario elige 21:9
- **THEN** el FOV horizontal se amplía con el mismo criterio, o la opción queda
  deshabilitada si el juego no lo soporta

### Requirement: Culling coherente con el nuevo FOV

El sistema SHALL ampliar los planos laterales de *frustum culling* al ampliar el FOV.

#### Scenario: Objetos en los bordes

- **WHEN** la cámara gira en combate o en una cutscene panorámica
- **THEN** los objetos y enemigos de los extremos no desaparecen ni parpadean

### Requirement: HUD 2D en área segura 4:3

El sistema SHALL componer la interfaz 2D en una ventana virtual 4:3 centrada por
defecto, con un modo extendido opcional.

#### Scenario: Diálogo en 16:9

- **WHEN** el juego dibuja un diálogo con retratos en 16:9
- **THEN** los retratos, textos y barras conservan sus proporciones 4:3

### Requirement: Cinemáticas en 4:3 con pillarbox

El sistema SHALL presentar los videos `.PSS` en su relación 4:3 original con barras
laterales limpias.

#### Scenario: FMV en pantalla panorámica

- **WHEN** se reproduce una cinemática en 16:9 o pantalla completa
- **THEN** el video se ve en 4:3 con pillarbox y sin estiramiento

### Requirement: Escalado interno del GS

El sistema SHALL renderizar a un múltiplo entero de la resolución de la consola
(1×–6×) y SHALL corregir el desfase de medio píxel y las costuras de textura.

#### Scenario: 3× a 1080p

- **WHEN** el usuario elige 3×
- **THEN** la escena se renderiza a la resolución multiplicada, sin costuras visibles
  entre primitivas ni texels mezclados fuera del atlas

#### Scenario: Coste por multiplicador

- **WHEN** se mide 2×, 3×, 4× y 6×
- **THEN** se registra el fps de cada uno y se documenta el recomendado

### Requirement: Ajustes de video en el launcher

El launcher SHALL exponer resolución interna, relación de aspecto, modo de HUD y filtro
de presentación, y SHALL persistirlos entre ejecuciones.

#### Scenario: Persistencia

- **WHEN** el usuario cambia la resolución interna y reinicia el launcher
- **THEN** el ajuste sigue seleccionado y se aplica al lanzar el juego
