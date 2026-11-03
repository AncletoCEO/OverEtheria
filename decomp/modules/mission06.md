# `mission06.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 6 (`0x6`) |
| base | `0x154000` |
| text | 67648 B |
| data | 79872 B |
| bss | 128 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x178030` … `0x178034` |
| sha256 | `6e59df9d80de6081792e1f3524f191f33b8ccffa968cb6b5ef4caf9e5996eaab` |

## Cobertura

- Funciones creadas: **150**
- Bytes en funciones: 67520 / 67584 (99.91 %)
- Rango: `0x154040` … `0x164840`
- C: `decomp/src/mission06/mission06.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x58bef0` | 77 |
| `0x5319c0` | 57 |
| `0x547590` | 50 |
| `0x58be20` | 45 |
| `0x5abf50` | 45 |
| `0x58c420` | 40 |
| `0x531570` | 30 |
| `0x530bd0` | 30 |
| `0x6b8130` | 28 |
| `0x545fb0` | 26 |
| `0x58b4f0` | 26 |
| `0x6b80d0` | 25 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
