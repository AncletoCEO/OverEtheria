# `mission11.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 11 (`0xb`) |
| base | `0x154000` |
| text | 60992 B |
| data | 253440 B |
| bss | 128 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x1a0c80` … `0x1a0c80` |
| sha256 | `829b06c7e8f7ffc373ce8e6573a84124d2090835a2b2647e3c957f2cb3a65ea9` |

## Cobertura

- Funciones creadas: **113**
- Bytes en funciones: 60736 / 60928 (99.68 %)
- Rango: `0x154040` … `0x162e40`
- C: `decomp/src/mission11/mission11.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x4f22a0` | 79 |
| `0x58bef0` | 61 |
| `0x794960` | 60 |
| `0x547590` | 47 |
| `0x5319c0` | 45 |
| `0x4f2250` | 38 |
| `0x58c420` | 37 |
| `0x58be20` | 37 |
| `0x6b8130` | 33 |
| `0x797d10` | 28 |
| `0x531570` | 26 |
| `0x530bd0` | 23 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
