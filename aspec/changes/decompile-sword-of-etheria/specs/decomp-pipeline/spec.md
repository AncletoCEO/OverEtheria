# Spec: decomp-pipeline

> Capacidad nueva: extracción, registro y verificación del pipeline de
> decompilación anotada. Los binarios del juego nunca forman parte de esta
> capacidad; solo sus metadatos.

## ADDED Requirements

### Requirement: Extracción reproducible de overlays

El sistema SHALL extraer los 25 módulos `MWo` de `OL.BIN` usando el TOC del
contenedor `SIMB`, respetando la base y el tamaño declarados por cada header.

#### Scenario: Extracción completa

- **WHEN** se ejecuta el extractor sobre un `OL.BIN` válido
- **THEN** se escriben exactamente 25 módulos en `work/overlays/`, cada uno en su
  offset alineado a 2048 B y con su base (`0x100000` o `0x154000`) registrada

#### Scenario: Módulo inconsistente

- **WHEN** el tamaño del TOC no coincide con `0x40 + sz_text + sz_data` de un header
- **THEN** el extractor falla con un mensaje que nombra el módulo y no escribe el
  archivo incompleto

### Requirement: Registro de módulos versionado

El sistema SHALL mantener `decomp/modules.json` con los metadatos de cada módulo
(nombre, id, base, tamaños, offset y hash) y SHALL rechazar la validación si falta
un módulo o su hash no coincide.

#### Scenario: Registro completo

- **WHEN** se valida `decomp/modules.json` contra el `OL.BIN` de referencia
- **THEN** los 25 módulos están presentes y cada hash coincide con el blob extraído

#### Scenario: Sin contenido del juego en git

- **WHEN** se ejecuta `git status --short` después de extraer los módulos
- **THEN** no aparece ningún `.bin`, `.elf` ni archivo de `work/` como versionable

### Requirement: Ingesta por dirección de carga

El sistema SHALL importar cada módulo en Ghidra en su dirección de carga, de modo
que las funciones exportadas queden dentro del rango `[base, base + sz_text)`.

#### Scenario: Funciones dentro del módulo

- **WHEN** se importa `mission22.bin` en `0x154000` y se exportan sus funciones
- **THEN** todas las direcciones exportadas caen en `0x154000` … `0x154D40` y
  ninguna se atribuye a `main` ni a otro módulo

#### Scenario: Cobertura de main auditada

- **WHEN** se ingesta `SLES_537.68`
- **THEN** el informe de cobertura enumera los rangos de `main` sin función y
  clasifica cada hueco como código, datos o relleno, con evidencia

### Requirement: Mapa de funciones propio

El sistema SHALL construir el mapa de funciones desde Ghidra y las referencias
reales del binario, y NO SHALL adoptar como verdad el CSV del intento fallido.

#### Scenario: Referencias como entradas

- **WHEN** una instrucción `JAL`/`J`, un branch o una tabla de punteros referencia
  una dirección dentro del rango del módulo
- **THEN** esa dirección aparece como entrada de función en el mapa del módulo

#### Scenario: CSV histórico no confiable

- **WHEN** se intenta usar `ghidra_functions.csv` del recomp como mapa de funciones
- **THEN** el pipeline lo trata como referencia histórica y exige la auditoría de
  cobertura antes de aceptar cualquier entrada

### Requirement: Verificación de la decompilación

El sistema SHALL verificar cada módulo decompilado contra el original antes de
marcarlo como completo, y SHALL registrar las diferencias cuando no haya match
exacto.

#### Scenario: Piloto mission22 verificado

- **WHEN** se ensambla `decomp/src/mission22/mission22.c` con el ensamblador MIPS
- **THEN** los bytes resultantes coinciden con los 3.392 B de text originales, o bien
  cada diferencia queda documentada en `decomp/modules/mission22.md`

#### Scenario: Sin evidencia no hay cierre

- **WHEN** un módulo se marca como decompilado en `decomp/modules.json`
- **THEN** existe su informe en `decomp/modules/` con el comando de verificación y
  el resultado, y `scripts/validate-decomp.mjs` pasa

### Requirement: Convenciones de conocimiento

El sistema SHALL documentar en `decomp/README.md` el layout, la convención de
nombres y el formato de `symbols/*.csv`, y SHALL validar que todo símbolo esté
dentro del rango de su módulo y no duplique direcciones.

#### Scenario: Símbolo fuera de rango

- **WHEN** un CSV de símbolos declara una dirección fuera del módulo que lo contiene
- **THEN** `scripts/validate-decomp.mjs` falla y reporta el símbolo y el rango
  esperado
