# `mission12.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 12 (`0xc`) |
| base | `0x154000` |
| text | 145344 B |
| data | 202624 B |
| bss | 256 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x1a8f80` … `0x1a8f80` |
| sha256 | `9c960455220312fe40e01e2eb4dd9785214e1599fc3c3b59c7c39d8da56282c4` |

## Cobertura

- Funciones creadas: **322**
- Bytes en funciones: 140784 / 145280 (96.91 %)
- Rango: `0x154040` … `0x1777c0`
- C: `decomp/src/mission12/mission12.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x5abf50` | 119 |
| `0x58bef0` | 79 |
| `0x5319c0` | 63 |
| `0x547590` | 54 |
| `0x6d6a40` | 53 |
| `0x58be20` | 48 |
| `0x4f19f0` | 43 |
| `0x58c420` | 40 |
| `0x531570` | 31 |
| `0x6b8130` | 28 |
| `0x530bd0` | 26 |
| `0x545fb0` | 25 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
