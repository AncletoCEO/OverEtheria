# `prg_player_0.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 25 (`0x19`) |
| base | `0x100000` |
| text | 229312 B |
| data | 102400 B |
| bss | 512 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x100040` |
| `_static_init` | `0x151000` … `0x151000` |
| sha256 | `b815a72a6472c224407a211821ff8d6f430b3b49d8f958a58f7b747494f3ca62` |

## Cobertura

- Funciones creadas: **269**
- Bytes en funciones: 226384 / 229248 (98.75 %)
- Rango: `0x100040` … `0x137fc0`
- C: `decomp/src/prg_player_0/prg_player_0.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x58bef0` | 224 |
| `0x5250d0` | 220 |
| `0x5319c0` | 196 |
| `0x531570` | 188 |
| `0x5472c0` | 176 |
| `0x547590` | 176 |
| `0x4f19f0` | 150 |
| `0x58be20` | 123 |
| `0x52b860` | 117 |
| `0x530bd0` | 103 |
| `0x58b4f0` | 102 |
| `0x5477b0` | 85 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x100040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
