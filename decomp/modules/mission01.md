# `mission01.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 1 (`0x1`) |
| base | `0x154000` |
| text | 11328 B |
| data | 59648 B |
| bss | 0 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x165580` … `0x165580` |
| sha256 | `65402142edcb8ff6c8ce338c71cd6a711793c304f222822bb78db9174891e289` |

## Cobertura

- Funciones creadas: **29**
- Bytes en funciones: 11264 / 11264 (100.00 %)
- Rango: `0x154040` … `0x156c40`
- C: `decomp/src/mission01/mission01.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x5472c0` | 42 |
| `0x61ea10` | 19 |
| `0x618380` | 17 |
| `0x620640` | 16 |
| `0x533dc0` | 13 |
| `0x63e580` | 11 |
| `0x61b7e0` | 10 |
| `0x81a1b0` | 8 |
| `0x525880` | 8 |
| `0x513260` | 6 |
| `0x5171e0` | 6 |
| `0x5e1a20` | 6 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
