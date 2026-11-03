# `mission19.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 17 (`0x11`) |
| base | `0x154000` |
| text | 57536 B |
| data | 105088 B |
| bss | 128 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x17bb10` … `0x17bb14` |
| sha256 | `7a9edcc961c0000de3bae768b4b2fa847cd417783d0dacfbfa5f2d61a24b9495` |

## Cobertura

- Funciones creadas: **125**
- Bytes en funciones: 56864 / 57472 (98.94 %)
- Rango: `0x154040` … `0x1620c0`
- C: `decomp/src/mission19/mission19.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x5319c0` | 43 |
| `0x58bef0` | 43 |
| `0x531570` | 37 |
| `0x6b80d0` | 34 |
| `0x5abf50` | 29 |
| `0x6b8130` | 27 |
| `0x58be20` | 24 |
| `0x4f19f0` | 24 |
| `0x547590` | 23 |
| `0x6b8190` | 18 |
| `0x6b81c0` | 16 |
| `0x58c420` | 15 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
