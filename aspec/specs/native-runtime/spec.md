# Spec: native-runtime

> Capacidad: runtime de recompilación nativo, con overlays y backends de
> plataforma. El contenido del juego lo aporta el usuario; el repo solo lleva código.

## Requirements

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

El sistema SHALL registrar los módulos `MWo` de `OL.BIN` en su dirección de carga y
servir su código traducido cuando el juego salta a él, incluidos sus inicializadores
estáticos.

#### Scenario: Registro de una ventana de código

- **WHEN** el ELF no declara una ventana en la dirección donde el juego carga
  `menu.bin` (`0x100000`)
- **THEN** el pipeline la crea como `PT_LOAD` sin contenido y registra una imagen del
  overlay en esa base

#### Scenario: Imagen que coincide con RAM

- **WHEN** el juego carga un overlay *verbatim* en su base
- **THEN** la imagen registrada incluye la cabecera `MWo3` y coincide palabra a palabra
  con la RAM, de modo que las comprobaciones de contenido del runtime pasan

#### Scenario: Rango de texto desde la cabecera

- **WHEN** la imagen de overlay trae texto y data
- **THEN** el traductor analiza como código sólo el rango de texto que declara la
  cabecera y usa la data como tabla de punteros

#### Scenario: Función que sólo conoce una tabla de runtime

- **WHEN** el juego llama a una función corta que no aparece en ninguna palabra ni en
  ningún `jal`
- **THEN** la entrada se siembra por su prólogo o por el rango de texto del overlay y
  el juego no se detiene con `missing code`

#### Scenario: Dos módulos con la misma base

- **WHEN** se carga `menu.bin` después de `prg_player_0.bin` (ambos en `0x100000`)
- **THEN** el runtime usa la imagen cuyo contenido coincide con RAM y descarta la
  anterior

### Requirement: Traducción en runtime

El sistema SHALL traducir y compilar el código y los programas VU1 que descubre
mientras el juego corre, sin detenerlo cuando falte una dirección.

#### Scenario: Ventana descubierta en juego

- **WHEN** el juego ejecuta una ventana de código que el build no tradujo
- **THEN** el runtime la traduce en vivo, la enlaza y sigue, y deja la imagen y las
  entradas en el directorio del juego para el siguiente build

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
