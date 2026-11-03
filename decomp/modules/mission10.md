# `mission10.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 10 (`0xa`) |
| base | `0x154000` |
| text | 51392 B |
| data | 158336 B |
| bss | 128 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x187380` … `0x187380` |
| sha256 | `9f7e73a8bfcef6090731d7bd80d885a2327f22045f5455695b0d8a3ca7a83daf` |

## Cobertura

- Funciones creadas: **113**
- Bytes en funciones: 51040 / 51328 (99.44 %)
- Rango: `0x154040` … `0x1608c0`
- C: `decomp/src/mission10/mission10.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x58bef0` | 63 |
| `0x5319c0` | 61 |
| `0x58be20` | 44 |
| `0x547590` | 43 |
| `0x5abf50` | 34 |
| `0x531570` | 32 |
| `0x58c420` | 28 |
| `0x530bd0` | 23 |
| `0x6d6a40` | 22 |
| `0x545b10` | 21 |
| `0x58b4f0` | 20 |
| `0x545930` | 20 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
