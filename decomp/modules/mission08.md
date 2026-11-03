# `mission08.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 8 (`0x8`) |
| base | `0x154000` |
| text | 97600 B |
| data | 152576 B |
| bss | 128 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x191180` … `0x191180` |
| sha256 | `2dbd01a1419daf69392647b0ef61ed8564609a3226f7f9e2fac739c3bcd895b1` |

## Cobertura

- Funciones creadas: **174**
- Bytes en funciones: 97344 / 97536 (99.80 %)
- Rango: `0x154040` … `0x16bd40`
- C: `decomp/src/mission08/mission08.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x58bef0` | 89 |
| `0x4f22a0` | 88 |
| `0x5319c0` | 65 |
| `0x547590` | 61 |
| `0x794960` | 56 |
| `0x58be20` | 51 |
| `0x4f2250` | 43 |
| `0x58c420` | 43 |
| `0x531570` | 40 |
| `0x530bd0` | 27 |
| `0x6b8130` | 25 |
| `0x5abf50` | 25 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
