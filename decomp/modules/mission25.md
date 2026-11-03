# `mission25.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 22 (`0x16`) |
| base | `0x154000` |
| text | 87616 B |
| data | 261504 B |
| bss | 128 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x1a9400` … `0x1a9400` |
| sha256 | `d6059068c574e2a4dd9a3df35b6a3783d9eaa87ff99fff67b1892838d43463fe` |

## Cobertura

- Funciones creadas: **155**
- Bytes en funciones: 85264 / 87552 (97.39 %)
- Rango: `0x154040` … `0x169640`
- C: `decomp/src/mission25/mission25.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x63e580` | 73 |
| `0x5472c0` | 65 |
| `0x530d00` | 43 |
| `0x63e540` | 42 |
| `0x525880` | 40 |
| `0x58b4f0` | 38 |
| `0x58bef0` | 37 |
| `0x81a1b0` | 36 |
| `0x5319c0` | 35 |
| `0x61c640` | 29 |
| `0x547590` | 25 |
| `0x620640` | 24 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
