#pragma once
#include <stdint.h>

/* Header de overlay de Metrowerks CodeWarrior PS2 (mwOverlayHeader).
 *
 * Evidencia: los 25 headers "MWo" de OL.BIN, verificados por
 * scripts/extract-overlays.mjs (magic, id, base, tamaños y nombre en +0x20).
 * Referencia de la estructura: mwUtils_PS2.c (CodeWarrior PS2 2.4).
 *
 * El blob del overlay mide 0x40 + sz_text + sz_data; sz_bss no ocupa espacio
 * en el archivo.
 */
typedef struct {
    char     identifier[3];    /* +0x00: "MWo" */
    uint8_t  version;          /* +0x03: 51 (0x33, '3') */
    uint32_t id;               /* +0x04: id del módulo (1..25) */
    uint32_t address;          /* +0x08: dirección de carga (0x100000 o 0x154000) */
    uint32_t sz_text;          /* +0x0C: bytes de código */
    uint32_t sz_data;          /* +0x10: bytes de datos inicializados */
    uint32_t sz_bss;           /* +0x14: bytes de bss (no ocupa archivo) */
    uint32_t static_init;      /* +0x18: inicio de inicializadores estáticos */
    uint32_t static_init_end;  /* +0x1C: fin de inicializadores estáticos */
    char     name[32];         /* +0x20: nombre, NUL-terminado ("menu.bin") */
} s_mw_overlay_header;

_Static_assert(sizeof(s_mw_overlay_header) == 0x40, "mwOverlayHeader debe medir 0x40");
