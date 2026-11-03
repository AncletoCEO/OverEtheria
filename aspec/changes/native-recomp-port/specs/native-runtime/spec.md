# Spec: native-runtime

> Capacidad nueva: runtime de recompilación nativo, con overlays y backends de
> plataforma. El contenido del juego lo aporta el usuario; el repo solo lleva código.

## ADDED Requirements

### Requirement: Build reproducible

El sistema SHALL construir el ejecutable nativo desde el ISO del usuario con un
toolchain pineado y un fork del runtime en un commit fijo, sin pasos manuales
ocultos.

#### Scenario: Build de cero

- **WHEN** se ejecuta el comando de build con un ISO válido y el commit pineado
- **THEN** se generan el C++ recompilado, se corre el splitter y se produce el
  ejecutable, con las versiones de toolchain registradas

#### Scenario: Gate del CSV

- **WHEN** el mapa de funciones de un módulo tiene funciones truncadas o sombreadas
- **THEN** el build falla antes de compilar y reporta el módulo y el rango

### Requirement: Soporte de overlays `MWo`

El sistema SHALL cargar los módulos `MWo` de `OL.BIN` en su dirección de carga,
registrar sus funciones recompiladas y ejecutar sus inicializadores estáticos.

#### Scenario: Carga de un módulo

- **WHEN** el juego pide cargar `mission22.bin` o `menu.bin`
- **THEN** el runtime copia text y data, limpia bss, ejecuta `_static_init` y deja
  el módulo ejecutable en `0x154000` o `0x100000`

#### Scenario: Dispatch entre main y overlay

- **WHEN** el código de `main` llama a una dirección del overlay (o el overlay llama
  a `main`)
- **THEN** la llamada resuelve a la función recompilada del módulo activo y no a una
  dirección sin registrar

#### Scenario: Dos módulos con la misma base

- **WHEN** se carga `menu.bin` después de `prg_player_0.bin` (ambos en `0x100000`)
- **THEN** el overlay bank reemplaza la tabla del módulo anterior y no quedan
  entradas obsoletas

### Requirement: Menú visible

El sistema SHALL presentar un frame con contenido RGB cuando el juego alcanza el
menú, sin parches de triage activos.

#### Scenario: Frame de menú con píxeles

- **WHEN** el juego alcanza el menú con los triages apagados
- **THEN** el frame presentado tiene `rgbNZ > 0` y se corresponde con el menú real

### Requirement: Backend de plataforma aislado

El sistema SHALL separar el core del runtime (memoria, scheduler, overlays, GS/VU)
de los backends de render, audio, input, filesystem y tiempo, para que un target
nuevo solo implemente esos backends.

#### Scenario: Build en dos plataformas

- **WHEN** se compila el mismo commit en Windows y Linux
- **THEN** ambos builds producen el mismo comportamiento lógico y los mismos logs de
  arranque

#### Scenario: Backend nulo

- **WHEN** se ejecuta con el backend nulo/headless
- **THEN** el juego arranca y corre sin ventana ni audio, y el core no falla por
  APIs de plataforma

### Requirement: Contenido del juego fuera del repo

El sistema SHALL obtener el ISO y la BIOS del usuario en runtime o build, y SHALL
rechazar releases o commits que incluyan contenido del juego.

#### Scenario: Release sin assets

- **WHEN** se genera un release
- **THEN** el artefacto no contiene ISO, ELF, `.BIN`, `.PSS` ni assets, y el build
  valida el MD5 del ISO provisto por el usuario
