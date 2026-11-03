# `mission04.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 4 (`0x4`) |
| base | `0x154000` |
| text | 80832 B |
| data | 152320 B |
| bss | 128 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x18cf00` … `0x18cf00` |
| sha256 | `56114fcbec72b3846f12ac23fd52fc7675ca3b0bc900c47be81cc7c16dc889af` |

## Cobertura

- Funciones creadas: **165**
- Bytes en funciones: 80512 / 80768 (99.68 %)
- Rango: `0x154040` … `0x167bc0`
- C: `decomp/src/mission04/mission04.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x58bef0` | 83 |
| `0x547590` | 51 |
| `0x5319c0` | 49 |
| `0x58c420` | 42 |
| `0x58be20` | 39 |
| `0x5abf50` | 36 |
| `0x4f19f0` | 35 |
| `0x530bd0` | 31 |
| `0x531570` | 28 |
| `0x546100` | 26 |
| `0x6d6a40` | 24 |
| `0x545b10` | 23 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
