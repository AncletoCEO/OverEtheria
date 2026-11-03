# `mission03.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 3 (`0x3`) |
| base | `0x154000` |
| text | 68672 B |
| data | 173184 B |
| bss | 128 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x18f100` … `0x18f100` |
| sha256 | `f99f8b98c5c9a6625ac5047ad81f7594da01a5ce2ce8f5757ecb0d43a9a19379` |

## Cobertura

- Funciones creadas: **117**
- Bytes en funciones: 68544 / 68608 (99.91 %)
- Rango: `0x154040` … `0x164c40`
- C: `decomp/src/mission03/mission03.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x5472c0` | 60 |
| `0x533dc0` | 53 |
| `0x513260` | 52 |
| `0x58bef0` | 51 |
| `0x5319c0` | 43 |
| `0x620640` | 42 |
| `0x547590` | 38 |
| `0x5abf50` | 34 |
| `0x525880` | 34 |
| `0x63e580` | 34 |
| `0x58be20` | 34 |
| `0x4f22a0` | 33 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
