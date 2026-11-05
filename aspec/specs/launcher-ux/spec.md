# Spec: launcher-ux

> Capacidad: la preparación informa su avance y se explica en lenguaje de usuario,
> sin nombres de scripts ni códigos internos a la vista.

## Requirements

### Requirement: Detección de éxito por plataforma

El launcher SHALL reconocer el ejecutable del juego con el nombre que usa cada
plataforma (`ps2run.exe` en Windows, `ps2run` en Linux/macOS) y SHALL informar el
resultado real de la preparación.

#### Scenario: Preparación correcta en Linux

- **WHEN** la preparación termina con código 0 y el ejecutable existe
- **THEN** el launcher muestra «listo para jugar» y habilita «Jugar»

#### Scenario: Preparación incompleta

- **WHEN** la preparación termina con código 0 pero falta el ejecutable
- **THEN** el launcher informa qué falta, sin decir «falló» cuando el proceso terminó bien

### Requirement: Progreso visible

El launcher SHALL mostrar el avance de la preparación con un porcentaje y un texto corto
que indique el paso actual.

#### Scenario: Construcción en curso

- **WHEN** la preparación está construyendo el juego
- **THEN** la UI muestra un porcentaje que avanza y el paso («construyendo el juego»)

#### Scenario: Copia del contenido

- **WHEN** se copian los 4,5 GB del contenido
- **THEN** el porcentaje refleja el avance real de la copia, no sólo que empezó

### Requirement: Textos para el usuario

Los textos visibles del launcher SHALL explicar qué hace la aplicación y qué puede hacer
el usuario, sin nombres de scripts, rutas internas ni códigos de error.

#### Scenario: Mensaje de error

- **WHEN** la preparación falla
- **THEN** el mensaje dice qué paso falló y qué revisar, y el detalle técnico queda en
  el registro

### Requirement: Registro en vivo

El launcher SHALL mostrar el registro de la preparación mientras se escribe, y SHALL
permitir abrirlo con un clic.

#### Scenario: Seguimiento

- **WHEN** el usuario abre el registro durante la preparación
- **THEN** ve las líneas nuevas sin esperar a que el proceso termine
