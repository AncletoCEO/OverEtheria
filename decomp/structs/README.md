# Structs

Un archivo por struct, en C con offsets y tamaño verificados. Se documenta solo lo
que está medido; los campos desconocidos quedan como `uint8_t _unknown_XX[...]` con
una nota, nunca inventados.

## Plantilla

```c
#pragma once
#include <stdint.h>

/* <nombre> — <tamaño> bytes.
 * Evidencia: <archivo/dump/línea>.
 */
typedef struct {
    uint32_t field;        /* +0x00: <qué es> */
    uint8_t  _unknown_04[0x0C]; /* +0x04: sin identificar */
} s_<nombre>;

_Static_assert(sizeof(s_<nombre>) == 0x10, "tamaño esperado 0x10");
```

Reglas:

- Offsets en comentarios `+0xNN`.
- Tamaño verificado con `_Static_assert`.
- Si un campo es un puntero del guest, usar `uint32_t` (dirección EE), no un puntero
  del host.
- Un struct entra acá cuando tiene evidencia reproducible (header del formato, dump
  de RAM o decompilación verificada).

## Índice

| Struct | Tamaño | Evidencia |
|---|---:|---|
| [`mw_overlay_header`](mw_overlay_header.h) | 0x40 | headers `MWo` de `OL.BIN` |
