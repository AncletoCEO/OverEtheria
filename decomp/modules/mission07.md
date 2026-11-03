# `mission07.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 7 (`0x7`) |
| base | `0x154000` |
| text | 47936 B |
| data | 102912 B |
| bss | 128 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x178d00` … `0x178d08` |
| sha256 | `cb5700511b0381216fdd1d6af5d89dbd9e0a550d3e6e1bbb3b9ee30def33b6ed` |

## Cobertura

- Funciones creadas: **73**
- Bytes en funciones: 47872 / 47872 (100.00 %)
- Rango: `0x154040` … `0x15fb40`
- C: `decomp/src/mission07/mission07.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x58bef0` | 70 |
| `0x5319c0` | 48 |
| `0x547590` | 48 |
| `0x58be20` | 40 |
| `0x58c420` | 38 |
| `0x4f22a0` | 34 |
| `0x531570` | 29 |
| `0x530bd0` | 28 |
| `0x6b8130` | 24 |
| `0x545b10` | 23 |
| `0x58b4f0` | 22 |
| `0x545930` | 22 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
