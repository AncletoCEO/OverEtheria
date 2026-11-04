# Proposal: Progreso visible y textos para el usuario en la preparación

## Problem

Con la preparación funcionando, quedan tres problemas de experiencia, uno de ellos un
bug real (issue #14):

1. **Falso fallo en Linux (issue #14).** El log muestra que la preparación terminó bien
   (`[prepare] listo: …/build/native-sword/ps2run`), pero el launcher dice
   «La preparación falló (código 0)». La causa: `game_exe()` busca
   `build/native-<id>/ps2run.exe`, y en Linux el binario es `ps2run` sin extensión, así
   que `game_built()` da falso con un script que salió 0.
2. **Sin progreso.** Mientras se construye (minutos) y mientras se copian 4,5 GB de
   contenido, la UI sólo dice «Construyendo…». El usuario no sabe si avanzó, si se
   colgó, ni cuánto falta; tiene que abrir el registro.
3. **Texto de desarrollador.** Los mensajes hablan de `port.sh`, `setup.sh`,
   `native-sword`, `entries.txt` y códigos de salida. Para quien sólo quiere jugar, no
   explican qué pasa ni qué hacer.

## Proposed change

1. **Detección de éxito multiplataforma**: `ps2run.exe` en Windows y `ps2run` en
   Linux/macOS; el mismo criterio para el ELF y para el mensaje final.
2. **Progreso legible**: la preparación emite líneas `[progress] <0-100> <texto>` en su
   registro (por fase y, dentro de la copia del contenido, por porcentaje de MB), y el
   launcher muestra una barra con porcentaje y un texto corto en lenguaje de usuario.
   El registro se escribe en vivo (streaming) en vez de volcarse al final.
3. **Textos para el usuario**: revisar los mensajes del launcher y del registro de
   preparación para que digan qué se está haciendo y qué hacer si falla, sin nombres de
   scripts ni códigos internos; los detalles técnicos quedan en el registro.
4. **Errores accionables**: si algo falla, mostrar el paso que falló y una sugerencia
   (por ejemplo, «revisá que el ISO sea la copia PAL o japonesa», «quedó sin espacio»),
   con el registro a un clic.

## Scope

**In of scope**

- Corrección de `game_exe`/`game_built` por plataforma (issue #14).
- Protocolo de progreso entre `prepare-game.ps1`/`.sh` y el launcher.
- Barra de progreso, porcentaje y textos nuevos en la pestaña «Juego».
- Streaming del registro y su lectura incremental.
- Revisión de todos los textos visibles del launcher (pestañas, botones, avisos).

**Out of scope**

- Cambiar el pipeline de recompilación o sus pasos.
- Traducción a otros idiomas (va en `i18n-bilingual`).
- Barra de progreso dentro de `port.sh` (se aproxima por fases).

## Risks

- **El progreso se desincroniza**: `port.sh` no reporta porcentaje. *Mitigación*: pesos
  por fase y, donde sí hay datos (copia del contenido), porcentaje real por MB.
- **El registro en vivo cuesta más**: escribir por línea puede ser lento con miles de
  líneas. *Mitigación*: escribir en bloque por lectura y limitar la frecuencia de la UI.
- **Textos ambiguos al traducir**: frases demasiado coloquiales pueden no encajar con
  `i18n-bilingual`. *Mitigación*: claves de texto centralizadas y frases cortas.

## Decisiones

### progress-line-protocol

- **memory_key**: `progress-line-protocol`
- **Elección**: la preparación escribe `[progress] <n> <texto>` en su registro y el
  launcher lee la última línea para la barra.
- **Descartado**: un archivo de estado aparte o IPC entre procesos.
- **Justificación**: el registro ya existe, se ve en la UI y sirve para depurar; una
  línea por paso no cuesta nada y no agrega otra fuente de verdad.
- **Refs**: `scripts/prepare-game.ps1`, `scripts/prepare-game.sh`,
  `launcher/src/main.cpp`.
- **Estado**: aceptada (2026-11-04).

### user-facing-copy

- **memory_key**: `launcher-user-copy`
- **Elección**: los textos de la UI hablan de «tu juego», «el contenido» y «revisá…»;
  los nombres de scripts y los códigos quedan en el registro técnico.
- **Descartado**: dejar los mensajes actuales con nombres de archivos internos.
- **Justificación**: el launcher es la primera experiencia de quien sólo quiere jugar;
  el detalle técnico sigue disponible para diagnosticar.
- **Refs**: `launcher/src/main.cpp`, `launcher/README.md`.
- **Estado**: aceptada (2026-11-04).
