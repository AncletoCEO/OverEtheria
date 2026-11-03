# Proposal: Decompilación anotada de Sword of Etheria

## Problem

Sword of Etheria (PS2 PAL, `SLES_537.68`) no tiene código fuente ni símbolos: el
ELF retail está *stripped* y fue compilado con **Metrowerks CodeWarrior PS2 2.4.x**,
un toolchain propietario. El análisis del 2026-11-03 dejó tres hechos que condicionan
cualquier intento de decompilación:

1. El ejecutable contiene `main` (5,67 MB) pero **el 29 % del código vive en 25
   overlays `MWo`** dentro de `OL.BIN` (2,35 MB de text), cargados en `0x100000` y
   `0x154000`.
2. El intento de recompilación previo compiló **solo `main`**: su CSV de funciones
   tiene 20.434 entradas y **4** por debajo de `0x4C0000`, es decir, cero funciones
   de overlay.
3. Sin símbolos, sin structs y sin un mapa de módulos versionado, cada avance queda
   atado a la memoria de la sesión y al runtime de emulación. Las decisiones del
   intento anterior están en un `decisions.md` de 104 KB, no en artefactos
   reproducibles.
4. El recomp de `tools/` es un **intento fallido** y su CSV de 20.434 funciones
   **no es un baseline confiable**: tiene 10.057 solapamientos y splits artificiales
   del recompilador. El export fresco de Ghidra cubre solo el **14,47 %** de `main`;
   el mapa de funciones hay que construirlo en este proyecto, no heredarlo.

El resultado es que hoy no existe una fuente legible del juego ni un pipeline para
producirla. Portear a otras plataformas depende del runtime de PS2, y entender el
motor requiere arqueología de logs. Hace falta un track de decompilación con
convenciones, registro y verificación.

## Proposed change

Construir el **pipeline de decompilación anotada** del juego y probarlo de punta a
punta con el módulo más pequeño, dejando la base lista para `menu.bin` y las misiones:

1. **Toolchain de decomp**: Ghidra 12.x + JDK 21 y un ensamblador MIPS para
   verificación. Registro de versiones en `docs/`.
2. **Extracción reproducible**: script que lee `OL.BIN`, valida la tabla `SIMB`,
   extrae cada módulo `MWo` con su base y escribe metadatos en `decomp/modules.json`.
3. **Ingesta en Ghidra por módulo**: importar `main` y cada overlay en su dirección
   de carga, exportar funciones y auditar la cobertura (incluidos los huecos
   conocidos de `main`).
4. **Registro versionado** en `decomp/`: convención de nombres, símbolos por módulo,
   structs y estado de decompilación. Solo metadatos: nunca bytes del juego.
5. **Piloto `mission22.bin`** (3.392 B de text, el overlay **no vacío** más chico):
   decompilarlo completo, documentar el ABI de overlay y verificar el resultado
   contra el original.
6. **Arranque de `menu.bin`** (369 KB): ingesta, triage por subsistemas y
   decompilación del primer subsistema.
7. **Verificación y gate**: script que valide módulos, rangos de símbolos y
   cobertura; ningún módulo se declara decompilado sin evidencia.

Este change **no** intenta dejar el juego jugable; eso corresponde al track de
recompilación/runtime. Acá se produce el conocimiento legible y verificable que
después habilita ports limpios.

## Scope

**In of scope**

- Toolchain de decompilación y su documentación (`docs/analysis/05-entorno.md`).
- Extracción de `SLES_537.68` y de los 25 módulos de `OL.BIN` a `work/` (ignorado).
- Ingesta en Ghidra con base por módulo y export de funciones.
- `decomp/modules.json`, `decomp/symbols/`, `decomp/structs/` y convenciones.
- Decompilación completa de `mission22.bin` con verificación.
- Ingesta y primer subsistema de `menu.bin`.
- Scripts de validación y actualización de docs/roadmap.

**Out of scope**

- Build jugable, fixes de runtime, audio, películas y save (track de recompilación).
- **Matching decompilation** byte a byte (requiere MWCCPS2 2.4.x exacto).
- Decompilación del juego completo (misiones 01–25); este change deja el pipeline y
  el primer módulo.
- Extracción o distribución de assets con copyright.
- Reescritura del motor o renderer propio.

## Risks

- **Ghidra no decodifica MMI/R5900 con el lenguaje genérico**: se resuelve con la
  extensión `r5900:LE:32:default`; el riesgo residual es el código de VU1/VU0 micro
  (no cubierto por la decompilación escalar). *Mitigación*: extensión instalada y
  validada; para VU se lee asm y se documenta el límite.
- **Sin compilador original no hay byte-match**: el resultado es una decompilación
  anotada, no una fuente que recompile idéntica. *Mitigación*: verificar estructura
  y comportamiento; dejar la puerta abierta a MWCC si aparece.
- **Fronteras de funciones desconocidas** (binario sin símbolos): una función mal
  delimitada invalida el análisis. *Mitigación*: ingesta por base + auditoría de
  referencias (JAL/J/branch/tablas/vtables) y no por cercanía a epílogos.
- **Explosión de alcance**: `menu.bin` son 369 KB. *Mitigación*: gate del piloto
  `mission22` antes de tocar `menu.bin`; un subsistema cerrado por vez.
- **Heredar el CSV del recomp fallido como verdad**: 20.434 filas con 10.057
  solapamientos y splits artificiales; su 96,5 % de cobertura es engañoso.
  *Mitigación*: no usarlo como baseline; descubrimiento propio por referencias y
  `scripts/audit-coverage.mjs` como evidencia.
- **Contenido con copyright en git**: *Mitigación*: `work/` y `tools/` ignorados;
  `decomp/` solo guarda direcciones, nombres y tipos; gate en CI/local.
- **El pipeline se vuelve específico de esta sesión**: *Mitigación*: scripts
  reproducibles, JSON versionado y docs con comandos exactos.

## Decisiones

### decomp-annotated-not-matching

- **memory_key**: `decomp-annotated-not-matching`
- **Elección**: decompilación **anotada por módulo** (nombres, structs, ABI y docs),
  verificada por estructura/comportamiento.
- **Descartado**: matching decompilation byte a byte.
- **Justificación**: el `.comment` identifica CodeWarrior PS2 2.4.x, pero el string
  lo escribe MWLD y no fija el build exacto; sin el compilador y los flags originales
  el byte-match no es alcanzable. Además son ~8 MB de código y ~29k funciones sin
  símbolos.
- **Refs**: `docs/analysis/04-estrategia-decomp.md`,
  `docs/analysis/02-ejecutable-y-overlays.md`, `docs/analysis/06-herramientas.md`.
- **Estado**: aceptada (2026-11-03).

### decomp-overlays-first

- **memory_key**: `decomp-overlays-first`
- **Elección**: tratar cada overlay `MWo` como un módulo de primera clase, con su
  propia base y su propio mapa de funciones.
- **Descartado**: decompilar solo `main` y asumir que el resto está ahí.
- **Justificación**: 25 módulos y 2,35 MB de text (29 % del código) viven en
  `OL.BIN`; el CSV previo tiene 0 funciones de overlay y su gate de `missing-target`
  no podía verlas porque se entra por `jalr`.
- **Refs**: `docs/analysis/02-ejecutable-y-overlays.md`,
  `docs/formats/mwo.md`, `docs/formats/simb.md`.
- **Estado**: aceptada (2026-11-03).

### decomp-registry-in-repo

- **memory_key**: `decomp-registry-in-repo`
- **Elección**: versionar en `decomp/` el registro de módulos, símbolos y structs
  (metadatos), no los binarios.
- **Descartado**: dejar el conocimiento solo en `decisions.md` o en la memoria del
  agente.
- **Justificación**: es el activo que sobrevive a las sesiones y habilita el port;
  permite diffs revisables y validación automática sin distribuir contenido del
  juego.
- **Refs**: `AGENTS.md` (guardrails), `docs/roadmap.md` fase 5.
- **Estado**: aceptada (2026-11-03).

### decomp-no-legacy-csv

- **memory_key**: `decomp-no-legacy-csv`
- **Elección**: construir el mapa de funciones con Ghidra + referencias reales
  (`JAL`/`J`/branch/tablas/vtables) y auditar la cobertura; el CSV del recomp se usa
  solo como referencia histórica.
- **Descartado**: adoptar `ghidra_functions.csv` (20.434 filas, 10.057 solapamientos)
  como baseline de funciones.
- **Justificación**: es un artefacto del generador/splitter del intento fallido; su
  cobertura del 96,5 % es artificial frente al **61,69 %** del export R5900 de solo
  funciones (y al 14,47 % del primer intento con MIPS32, descartado). Heredarlo
  repetiría los errores que bloquearon el recomp.
- **Refs**: `docs/analysis/03-intento-anterior.md`,
  `decomp/analysis/main-coverage.md`, `scripts/audit-coverage.mjs`.
- **Estado**: aceptada (2026-11-03, corregida durante implementación).

### decomp-pilot-mission22

- **memory_key**: `decomp-pilot-mission22`
- **Elección**: validar el pipeline con `mission22.bin` (3.392 B), el overlay **no
  vacío** más chico, antes de `menu.bin`.
- **Descartado**: `mission98.bin` (192 B de ceros, stub vacío) y `menu.bin` (369 KB)
  como primer módulo.
- **Justificación**: `mission98` no tiene código (0 bytes no-cero) y no permite
  verificar nada. `mission22` empieza con `addiu sp,sp,-0xa0`, tiene 2.340 B
  no-cero y cierra el ciclo extracción → Ghidra → C → verificación sin el ruido de
  `menu.bin`.
- **Refs**: `docs/analysis/02-ejecutable-y-overlays.md`,
  `decomp/analysis/main-coverage.md`, `docs/roadmap.md` fase 5.
- **Estado**: aceptada (2026-11-03, corregida durante implementación).

### ghidra-12-1-4-jdk-21

- **memory_key**: `ghidra-12-1-4-jdk-21`
- **Elección**: pinear **Ghidra 12.1.4 + Temurin JDK 21.0.13** y usar **Zig 0.15.1**
  como ensamblador MIPS, todo en `tools/` (ignorado).
- **Descartado**: Ghidra 12.2 (exige JDK 25) y toolchains `mips-linux-gnu` nativos.
- **Justificación**: 12.1.4 es la versión del intento previo y la verificada por REA;
  JDK 21 LTS alcanza. Zig es un zip portable (92 MB) sin admin y su clang/LLVM
  ensambla `mipsel` (verificado byte a byte con `addiu`/`jr`/`nop`).
- **Refs**: `docs/analysis/05-entorno.md`, `docs/analysis/06-herramientas.md`,
  `tools.lock.toml`.
- **Estado**: aceptada (2026-11-03, durante implementación).

### ghidra-r5900-extension

- **memory_key**: `ghidra-r5900-extension`
- **Elección**: usar **ghidra-emotionengine-reloaded v2.1.39** con el lenguaje
  **`r5900:LE:32:default`**, instalada como módulo de procesador en
  `tools/ghidra/Ghidra/Processors/R5900`.
- **Descartado**: `MIPS:LE:32:default` (genérico) para el Emotion Engine.
- **Justificación**: el lenguaje genérico decodifica mal `sd`/`ld`/MMI y hunde la
  cobertura de funciones de **61,69 % a 14,47 %**. La extensión es la única forma de
  decompilar R5900 con fidelidad. Su zip trae `Module.manifest` vacío y no incluye
  `r5900.sla`: se completó el manifest y se compiló con `support/sleigh.bat`.
- **Refs**: `docs/analysis/05-entorno.md`, `docs/analysis/06-herramientas.md`,
  `decomp/analysis/main-coverage.md`, `tools.lock.toml`.
- **Estado**: aceptada (2026-11-03, durante implementación).
