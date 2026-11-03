# Header de overlay `MWo`

Cada overlay de `OL.BIN` empieza con este header de **0x40 bytes**. La estructura
coincide con `mwOverlayHeader` de `mwUtils_PS2.c` de Metrowerks CodeWarrior PS2 2.4
(documentada en [decomp.wiki](https://decomp.wiki/compilers/MWCC)).

## Struct

| Offset | Tipo | Campo | Observado |
|---:|---|---|---|
| `0x00` | char[3] | `identifier` | `"MWo"` |
| `0x03` | u8 | `version` | `51` (`0x33`, carácter `'3'`) |
| `0x04` | u32 | `id` | 1…25 (ver tabla) |
| `0x08` | u32 | `address` | `0x100000` o `0x154000` |
| `0x0C` | u32 | `sz_text` | tamaño del código |
| `0x10` | u32 | `sz_data` | tamaño de datos inicializados |
| `0x14` | u32 | `sz_bss` | tamaño de bss |
| `0x18` | u32 | `_static_init` | inicio de inicializadores estáticos |
| `0x1C` | u32 | `_static_init_end` | fin de inicializadores |
| `0x20` | char[32] | `name` | `"mission16.bin"`, `"menu.bin"`, … |

## Observaciones

- `address` es la **dirección de carga** en la RAM del EE: los overlays de misión y
  `mission98` van a `0x154000`; `menu.bin` y `prg_player_0.bin` a `0x100000`.
- `sz_text` + `sz_data` + `0x40` coincide con el `size` del TOC de `SIMB`.
- El blob está alineado a 2048 B dentro de `OL.BIN`.
- `_static_init` está dentro del rango cargado: el loader debe ejecutar esos
  punteros (constructores de C++) después de copiar text/data.
- El nombre del overlay **no está en el TOC de SIMB**: vive acá, en `+0x20`.

## Tabla de overlays

Ver [`../analysis/02-ejecutable-y-overlays.md`](../analysis/02-ejecutable-y-overlays.md)
para la tabla completa (id, base, text, data, bss, offset).

## Preguntas abiertas

- ¿El `address` es siempre fijo o puede variar por build? (en este disco: dos bases)
- ¿Cómo se resuelven las llamadas desde `main` al overlay: tabla de entrada fija,
  puntero devuelto por el loader, o `jal` directo a la base?
- ¿`menu.bin` y `prg_player_0.bin` comparten base porque nunca coexisten?
- ¿Los `_static_init` se ejecutan de nuevo en cada carga o solo la primera vez?

## Reproducir

```bash
node scripts/inspect-disc.mjs "Sword of Etheria.iso"
```

o, con `OL.BIN` extraído, buscar `MWo` y leer los campos en little-endian.
