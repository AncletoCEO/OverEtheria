# `mission02.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 2 (`0x2`) |
| base | `0x154000` |
| text | 28864 B |
| data | 72960 B |
| bss | 128 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x16ce00` … `0x16ce00` |
| sha256 | `308632cb6235639f0cf2892b0090e79d7449fcd3c32e1324caa5eca8bcd77a1e` |

## Cobertura

- Funciones creadas: **58**
- Bytes en funciones: 28672 / 28800 (99.56 %)
- Rango: `0x154040` … `0x15b0c0`
- C: `decomp/src/mission02/mission02.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x5abf50` | 27 |
| `0x7988a0` | 17 |
| `0x798860` | 16 |
| `0x63e580` | 15 |
| `0x6d00c0` | 10 |
| `0x548980` | 9 |
| `0x547f80` | 9 |
| `0x7987d0` | 9 |
| `0x548010` | 9 |
| `0x64c9b0` | 8 |
| `0x533e00` | 8 |
| `0x525880` | 7 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
