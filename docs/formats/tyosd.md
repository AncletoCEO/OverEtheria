# Formato `TYOSD` (audio)

`SD.BIN` (715.327.488 B) es el banco de audio del juego y empieza con:

```
54 59 4F 53 44 20 76 2D 31 2E 32 38 6E   "TYOSD v-1.28n"
```

Es un contenedor del driver de sonido propio del juego (**TYOSD**), no un formato
Sony. El nombre aparece en los logs del intento anterior (`[TYOSD-*]`).

## Lo que ya está medido (intento previo)

Fuente: `tools/legacy-recomp/game/tyosd-573-hle.md` (2026-10-03/04).

- El EE abre `cdrom0:\SD.BIN;1` y habla por **SIF RPC con `sid = 0x573`**
  (custom del juego, sin bit 31).
- Protocolo observado:
  - `rpc=0x10000`: path en `send+4`; respuesta `recv[0]=1`, `recv[1]=tamaño`,
    `recv[2]=sectores`.
  - `rpc=0x20000` / `0x0`: poll; `recv[0]=1` (done).
  - `rpc=0x30000`: streaming; `send` 640 B (descriptor), `recv` 352 B.
- El HLE mínimo hizo que el juego avanzara (acks), pero **no sirve datos reales**
  del stream: el layout del descriptor de 640 B nunca se verificó.
- La cola de comandos de sonido es de **16 B por comando**:
  `A: 00001101 <ptr> 00000040/41 <ptr>`, doble buffer `0xb15a80` / `0xa96680`.
- El runtime no emula SPU2 (`0x1F8014xx` / `0x1F900xxx`), así que el consumidor
  (`*(gp-0x7A30)`) nunca se instala y el comando no completa.
- Módulos IOP involucrados: `LIBSD.IRX`, `SDRDRV.IRX`, `SDSTR3.IRX`, `SD_CALL.IRX`,
  `LIBSMF2.IRX`.

## Preguntas abiertas

- Layout del descriptor de 640 B (`0x30000`): lsn, count, destino guest.
- Estructura interna de `TYOSD v-1.28n`: ¿banco de samples? ¿streams? ¿tabla de
  offsets? (715 MB dan para mucho).
- ¿El audio se puede extraer offline (parser propio) o depende del driver?
- ¿Qué parte reproduce música por `LIBSMF2` (MIDI/sequence) y qué parte samples?

## Estrategia sugerida

1. Parsear el header y buscar la tabla de offsets/tamaños (probablemente análoga a
   `SIMB`).
2. Identificar samples (VAG/SPU2) y secuencias.
3. Solo después decidir si el runtime emula SPU2 o si se sirve audio pregrabado.

No es bloqueante para el menú; sí para "juego completo".
