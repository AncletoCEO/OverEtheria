# `mission17.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 15 (`0xf`) |
| base | `0x154000` |
| text | 130624 B |
| data | 75008 B |
| bss | 384 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x186380` … `0x186380` |
| sha256 | `24f1d3172bbdf9e9009d6af71b787520b18fb51bd668fb8688177b383a065e13` |

## Cobertura

- Funciones creadas: **235**
- Bytes en funciones: 130208 / 130560 (99.73 %)
- Rango: `0x154040` … `0x173e40`
- C: `decomp/src/mission17/mission17.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x58bef0` | 105 |
| `0x5abf50` | 95 |
| `0x5319c0` | 73 |
| `0x547590` | 60 |
| `0x58be20` | 53 |
| `0x531570` | 47 |
| `0x58c420` | 42 |
| `0x4f19f0` | 41 |
| `0x530bd0` | 39 |
| `0x6b8130` | 32 |
| `0x58b4f0` | 29 |
| `0x58bec0` | 25 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
