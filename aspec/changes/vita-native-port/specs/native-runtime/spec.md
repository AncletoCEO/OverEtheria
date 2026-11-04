## ADDED Requirements

### Requirement: Acceso al disco con descriptores acotados

El sistema SHALL leer el disco extraído manteniendo como máximo 8 descriptores de archivo
abiertos simultáneamente, reabriendo el archivo desalojado cuando vuelva a pedirse.

#### Scenario: Disco completo

- **WHEN** el juego recorre un disco extraído de 87 archivos en modo carpeta
- **THEN** el runtime nunca tiene más de 8 `FILE*` abiertos a la vez y todas las lecturas
  devuelven los bytes del archivo correcto

#### Scenario: Archivo desalojado

- **WHEN** se pide un sector de un archivo cuyo descriptor fue cerrado por la política LRU
- **THEN** el runtime lo reabre, se posiciona en el sector pedido y devuelve los datos sin
  error

#### Scenario: Cierre del disco

- **WHEN** se llama a `close_folder()`
- **THEN** todos los descriptores abiertos se cierran y una lectura posterior falla de
  forma explícita

#### Scenario: Sin regresión en PC

- **WHEN** se corre la reproducción de `docs/analysis/07-runtime-nativo.md` en Windows y
  Linux con el pool activo
- **THEN** el juego llega a gameplay igual que antes y los FPS medidos no bajan
