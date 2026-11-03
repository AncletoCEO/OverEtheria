# `mission21.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 19 (`0x13`) |
| base | `0x154000` |
| text | 119872 B |
| data | 48000 B |
| bss | 256 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x17cfc0` … `0x17cfc8` |
| sha256 | `b58a2e9da10a2d70b4331db6cbb0ad77bdd3928706b8ef143c8e79367794d5da` |

## Cobertura

- Funciones creadas: **314**
- Bytes en funciones: 115840 / 119808 (96.69 %)
- Rango: `0x154040` … `0x171440`
- C: `decomp/src/mission21/mission21.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x4f19f0` | 95 |
| `0x5abf50` | 83 |
| `0x6b80d0` | 37 |
| `0x5319c0` | 35 |
| `0x4f22a0` | 33 |
| `0x6478a0` | 31 |
| `0x6d6290` | 30 |
| `0x5472c0` | 28 |
| `0x547650` | 27 |
| `0x58bef0` | 25 |
| `0x6d6a40` | 24 |
| `0x6b8190` | 22 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
