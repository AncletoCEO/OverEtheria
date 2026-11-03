# `mission18.bin`

> Decompilación anotada (pseudocódigo de Ghidra). Byte-match no aplicable sin MWCC.

## Metadatos

| Campo | Valor |
|---|---|
| id | 16 (`0x10`) |
| base | `0x154000` |
| text | 67136 B |
| data | 54912 B |
| bss | 128 B |
| prefijo de ceros | 64 B |
| entry (primer código) | `0x154040` |
| `_static_init` | `0x171cb0` … `0x171cb4` |
| sha256 | `8231d7d1d200541e361b0f259a75ea06f0d6c070703c4f8d52844e56533c38b1` |

## Cobertura

- Funciones creadas: **148**
- Bytes en funciones: 66944 / 67072 (99.81 %)
- Rango: `0x154040` … `0x164640`
- C: `decomp/src/mission18/mission18.c`

## Perfil de llamadas externas

| Target | Llamadas |
|---|---:|
| `0x58bef0` | 67 |
| `0x5319c0` | 49 |
| `0x547590` | 48 |
| `0x58be20` | 41 |
| `0x58c420` | 40 |
| `0x6b80d0` | 29 |
| `0x531570` | 28 |
| `0x530bd0` | 24 |
| `0x545b10` | 23 |
| `0x545930` | 22 |
| `0x4f19f0` | 20 |
| `0x58b4f0` | 20 |

## Verificación

- El sha256 coincide con `decomp/modules.json` (gate `scripts/validate-decomp.mjs`).
- Prefijo de `64` B en cero; el código empieza en `0x154040`.
- Cobertura calculada sobre el text menos el prefijo.
- Byte-match: no aplicable (pseudocódigo, MWCC propietario, LLVM sin `lq`/`sq`).

## Pendiente

- Nombrar las funciones y los targets externos.
- Identificar la semántica del módulo y sus subsistemas.
- Verificar comportamiento contra PCSX2 cuando haya runtime.
