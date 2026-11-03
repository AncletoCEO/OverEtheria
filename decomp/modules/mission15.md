# `mission15.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 13 (`0xd`) |
| base | `0x154000` |
| text | 115392 B |
| data | 129408 B |
| bss | 256 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x18fc80` … `0x18fc80` |
| sha256 | `15741bbc84a30cd13180a6c7c866365bf539c342ccd03819dfd52eafc6958137` |

## Cobertura

- Funciones creadas: **245**
- Bytes en funciones: 115008 / 115328 (99.72 %)
- Rango: `0x154040` … `0x1702c0`
- C: `decomp/src/mission15/mission15.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x5abf50` | 178 |
| `0x58bef0` | 107 |
| `0x5319c0` | 68 |
| `0x547590` | 55 |
| `0x58be20` | 53 |
| `0x58c420` | 49 |
| `0x531570` | 38 |
| `0x538850` | 38 |
| `0x530bd0` | 37 |
| `0x58be50` | 30 |
| `0x58b4f0` | 29 |
| `0x58bec0` | 27 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
