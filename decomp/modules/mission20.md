# `mission20.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 18 (`0x12`) |
| base | `0x154000` |
| text | 195264 B |
| data | 34432 B |
| bss | 384 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x18c180` … `0x18c180` |
| sha256 | `a55afa228d6dbe17b1f62fbeb110268a554b976997e9fbb3f0f0ce659f915233` |

## Cobertura

- Funciones creadas: **564**
- Bytes en funciones: 188848 / 195200 (96.75 %)
- Rango: `0x154040` … `0x183ac0`
- C: `decomp/src/mission20/mission20.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x5abf50` | 148 |
| `0x4f19f0` | 147 |
| `0x545fb0` | 63 |
| `0x661660` | 61 |
| `0x661ea0` | 59 |
| `0x546080` | 49 |
| `0x6b80d0` | 49 |
| `0x6478a0` | 47 |
| `0x4f1a20` | 47 |
| `0x6d6a40` | 45 |
| `0x548aa0` | 36 |
| `0x6b8190` | 35 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
