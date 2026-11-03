# `mission24.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 21 (`0x15`) |
| base | `0x154000` |
| text | 35776 B |
| data | 74752 B |
| bss | 128 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x16f000` … `0x16f000` |
| sha256 | `5e47a61eb74e6f5ba21761cc1015e94eaf555136fa8068b307c9aac592e10056` |

## Cobertura

- Funciones creadas: **43**
- Bytes en funciones: 35712 / 35712 (100.00 %)
- Rango: `0x154040` … `0x15cbc0`
- C: `decomp/src/mission24/mission24.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x58bef0` | 61 |
| `0x547590` | 47 |
| `0x5319c0` | 45 |
| `0x58c420` | 37 |
| `0x58be20` | 37 |
| `0x531570` | 26 |
| `0x530bd0` | 23 |
| `0x545b10` | 23 |
| `0x545930` | 22 |
| `0x58b4f0` | 18 |
| `0x529570` | 16 |
| `0x58be50` | 15 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
