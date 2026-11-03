# `mission09.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 9 (`0x9`) |
| base | `0x154000` |
| text | 142528 B |
| data | 162176 B |
| bss | 256 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x19e680` … `0x19e680` |
| sha256 | `bd9f43e4717e74de513f32e9700497a6e6b1a1e3764bdd3edd50fc9fedc124b6` |

## Cobertura

- Funciones creadas: **271**
- Bytes en funciones: 141776 / 142464 (99.52 %)
- Rango: `0x154040` … `0x176cc0`
- C: `decomp/src/mission09/mission09.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x58bef0` | 110 |
| `0x5319c0` | 93 |
| `0x58be20` | 85 |
| `0x5abf50` | 75 |
| `0x545fb0` | 61 |
| `0x531570` | 60 |
| `0x547590` | 55 |
| `0x4f19f0` | 45 |
| `0x58c420` | 37 |
| `0x58be50` | 34 |
| `0x58bec0` | 33 |
| `0x6d6a40` | 31 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
