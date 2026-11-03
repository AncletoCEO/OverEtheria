# `mission05.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 5 (`0x5`) |
| base | `0x154000` |
| text | 70208 B |
| data | 102528 B |
| bss | 128 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x17e2a0` … `0x17e2a4` |
| sha256 | `fe6253ce5140b89f007545eee350aaa735d0dce97b60fd90b796c9d0c4dd3fe4` |

## Cobertura

- Funciones creadas: **121**
- Bytes en funciones: 69952 / 70144 (99.73 %)
- Rango: `0x154040` … `0x165240`
- C: `decomp/src/mission05/mission05.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x5abf50` | 93 |
| `0x58bef0` | 76 |
| `0x5319c0` | 58 |
| `0x547590` | 52 |
| `0x58be20` | 51 |
| `0x58c420` | 41 |
| `0x6b80d0` | 40 |
| `0x794960` | 37 |
| `0x531570` | 37 |
| `0x6b8130` | 35 |
| `0x530bd0` | 24 |
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
