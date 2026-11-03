# `menu.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 24 (`0x18`) |
| base | `0x100000` |
| text | 368960 B |
| data | 293376 B |
| bss | 96000 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x100040` |
| `_static_init` | `0x1a1b20` … `0x1a1b24` |
| sha256 | `a8d2b2279ac9b15f793e8d0069b9882e56f833b74bdfbdb14495759d2d54af2d` |

## Cobertura

- Funciones creadas: **1029**
- Bytes en funciones: 364440 / 368896 (98.79 %)
- Rango: `0x100040` … `0x15a140`
- C: `decomp/src/menu/menu.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x7f7ea0` | 311 |
| `0x510810` | 292 |
| `0x510600` | 275 |
| `0x62dd60` | 265 |
| `0x550ee0` | 240 |
| `0x510610` | 207 |
| `0x805340` | 160 |
| `0x5472c0` | 142 |
| `0x4f19f0` | 141 |
| `0x7f6200` | 125 |
| `0x550ad0` | 123 |
| `0x7f7a10` | 110 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x100040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
