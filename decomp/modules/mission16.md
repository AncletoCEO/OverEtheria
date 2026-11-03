# `mission16.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 14 (`0xe`) |
| base | `0x154000` |
| text | 65600 B |
| data | 103680 B |
| bss | 128 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x17d510` … `0x17d514` |
| sha256 | `7a5da5ed4ae8bfa3d31ef66206d55de191b144325ff82915d830583d11c740e7` |

## Cobertura

- Funciones creadas: **88**
- Bytes en funciones: 65536 / 65536 (100.00 %)
- Rango: `0x154040` … `0x164040`
- C: `decomp/src/mission16/mission16.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x58bef0` | 96 |
| `0x5319c0` | 77 |
| `0x58be20` | 61 |
| `0x547590` | 61 |
| `0x4f22a0` | 48 |
| `0x531570` | 47 |
| `0x58c420` | 38 |
| `0x530bd0` | 29 |
| `0x794960` | 26 |
| `0x58b4f0` | 24 |
| `0x529570` | 24 |
| `0x4f2250` | 23 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
