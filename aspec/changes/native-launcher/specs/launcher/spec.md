# Spec: launcher

> Capacidad nueva: una aplicación de escritorio que prepara y lanza el juego con el ISO
> del usuario, sin que éste edite archivos ni recuerde argumentos.

## ADDED Requirements

### Requirement: Primer arranque con ISO del usuario

El launcher SHALL pedir el ISO en el primer arranque, comprobar que es la copia
esperada y preparar el juego desde él, sin incluir ni descargar contenido del juego.

#### Scenario: ISO válido

- **WHEN** el usuario elige un ISO cuyo `SYSTEM.CNF` nombra `SLES_537.68`
- **THEN** el launcher lo marca como reconocido, habilita la preparación y ejecuta
  `scripts/prepare-game` con esa ruta

#### Scenario: ISO de otro juego

- **WHEN** el ISO no contiene `SYSTEM.CNF` o nombra otro serial
- **THEN** el launcher muestra el motivo y no habilita la preparación

#### Scenario: Juego ya construido

- **WHEN** `build/native-sword/ps2run` existe en la carpeta del runtime
- **THEN** el launcher habilita «Jugar» sin repetir la preparación

### Requirement: Ajustes de video y controles

El launcher SHALL exponer resolución interna, pantalla completa, 16:9, formato de video
(PAL 50 Hz o NTSC 60 Hz) y la asignación de controles, y SHALL aplicarlos al lanzar.

#### Scenario: NTSC 60 Hz

- **WHEN** el usuario elige NTSC
- **THEN** el juego se lanza con `--ntsc` y el runtime informa 60 Hz

#### Scenario: Cambiar una tecla

- **WHEN** el usuario pulsa «Cambiar» en una acción y luego una tecla
- **THEN** esa acción queda con la tecla nueva y `keys.ini` la conserva para el juego

### Requirement: Memory card

El launcher SHALL lanzar el juego con una memory card de 8 MB en la carpeta de datos y
SHALL permitir abrir su carpeta o restablecerla.

#### Scenario: Primera partida

- **WHEN** no existe el archivo de la tarjeta
- **THEN** el juego se lanza igualmente y la formatea al guardar

### Requirement: Preparación observable

El launcher SHALL mostrar el progreso y el resultado de la preparación, y SHALL
distinguir éxito de fallo.

#### Scenario: Preparación fallida

- **WHEN** el script de preparación termina con error
- **THEN** el launcher lo informa y deja el registro visible

### Requirement: Verificación en CI

El repositorio SHALL compilar el launcher en CI y SHALL fallar si se versiona contenido
del juego.

#### Scenario: Contenido versionado

- **WHEN** un commit incluye un ISO, ELF, `.bin`, `.pss`, C++ generado o C decompilado
- **THEN** el job de CI falla nombrando los archivos
