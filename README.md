# Sword of Etheria — recompilación + decompilación

Proyecto de preservación y estudio de **Sword of Etheria** (*The Sword of Etheria*,
PS2 PAL, `SLES_537.68`), con dos objetivos:

1. **Jugarlo nativo en PC** (Windows/Linux), sin emulador.
2. **Decompilarlo de forma anotada** para poder portearlo a otras plataformas
   y modificarlo con conocimiento del motor.

El repositorio **no contiene ni distribuirá contenido del juego**: ni ISO, ni ELF,
ni `.BIN`, ni películas. Cada usuario aporta su propia copia del disco.

## Estado

**Fase 0 — análisis e infraestructura (2026-11-03).** Todavía no hay build en este
repo. El trabajo previo vive en `tools/legacy-recomp/` (fuera de git) y se resume en
[`docs/analysis/03-intento-anterior.md`](docs/analysis/03-intento-anterior.md).

Hallazgos principales del análisis inicial:

- El disco es la versión PAL Europa correcta (MD5 `b9c5115b77b7f05fbf14a67df8d3f99d`).
- El ELF fue compilado con **Metrowerks CodeWarrior PS2 2.4.x** (`MW MIPS C Compiler (2.4.1.01)`).
- **El juego usa overlays**: 25 módulos `MWo` en `OL.BIN` (misiones, `menu.bin`,
  `prg_player_0.bin`), ~2,35 MB de código que el intento anterior **nunca compiló**.
  Esto es el gate real para "juego completo".
- El intento anterior llegó al menú lógico pero con la pantalla negra; el bloqueo
  medido es la subida del atlas de texturas en el pase único de arranque.

Detalle completo en [`docs/analysis/`](docs/analysis/) y plan en
[`docs/roadmap.md`](docs/roadmap.md).

## Verificación del disco

```powershell
node scripts/inspect-disc.mjs "Sword of Etheria.iso"
```

El script (sin dependencias) imprime la tabla de archivos del ISO, el formato de
cada contenedor, los overlays `MWo` y los datos del ELF. También verifica el MD5
con `--md5`.

## Layout

```
docs/            análisis, formatos y roadmap (versionado)
scripts/         herramientas propias de inspección (versionado)
aspec/           configuración del flujo spec-driven
work/            ELF, C++ generado, builds y savestates (ignorado)
tools/           clones externos: REA, PS2Recomp, PCSX2, legado (ignorado)
tools.lock.toml  pins y licencias de las herramientas
```

## Modelo legal

- Solo se trabaja con una copia original del disco.
- El repo contiene **código y documentación propios**, nunca assets del juego.
- El runtime de PS2Recomp es **GPLv3** (fork `AncletoCEO/Ps2Recomp-of-etheria`);
  este repo es **MIT** y enlaza ese runtime como herramienta externa.
