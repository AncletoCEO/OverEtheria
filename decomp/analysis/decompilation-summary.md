# Resumen de la decompilación

- Módulos con C: **24/25** (mission98 es un stub vacío)
- Funciones: **4925**
- Bytes de código cubiertos: 2320392 / 2348288 (98.81 %)
- Tipo: **decompilación anotada** (pseudocódigo de Ghidra); no es matching decomp.

| Módulo | Base | Código | Funciones | Bytes | Cobertura | C |
|---|---:|---:|---:|---:|---:|---:|
| `menu` | `0x100000` | 368896 | 1029 | 364440 | 98.8 % | 1549 KB |
| `mission01` | `0x154000` | 11264 | 29 | 11264 | 100.0 % | 69 KB |
| `mission02` | `0x154000` | 28800 | 58 | 28672 | 99.6 % | 175 KB |
| `mission03` | `0x154000` | 68608 | 117 | 68544 | 99.9 % | 297 KB |
| `mission04` | `0x154000` | 80768 | 165 | 80512 | 99.7 % | 389 KB |
| `mission05` | `0x154000` | 70144 | 121 | 69952 | 99.7 % | 318 KB |
| `mission06` | `0x154000` | 67584 | 150 | 67520 | 99.9 % | 306 KB |
| `mission07` | `0x154000` | 47872 | 73 | 47872 | 100.0 % | 178 KB |
| `mission08` | `0x154000` | 97536 | 174 | 97344 | 99.8 % | 404 KB |
| `mission09` | `0x154000` | 142464 | 271 | 141776 | 99.5 % | 589 KB |
| `mission10` | `0x154000` | 51328 | 113 | 51040 | 99.4 % | 220 KB |
| `mission11` | `0x154000` | 60928 | 113 | 60736 | 99.7 % | 268 KB |
| `mission12` | `0x154000` | 145280 | 322 | 140784 | 96.9 % | 571 KB |
| `mission15` | `0x154000` | 115328 | 245 | 115008 | 99.7 % | 542 KB |
| `mission16` | `0x154000` | 65536 | 88 | 65536 | 100.0 % | 271 KB |
| `mission17` | `0x154000` | 130560 | 235 | 130208 | 99.7 % | 483 KB |
| `mission18` | `0x154000` | 67072 | 148 | 66944 | 99.8 % | 299 KB |
| `mission19` | `0x154000` | 57472 | 125 | 56864 | 98.9 % | 254 KB |
| `mission20` | `0x154000` | 195200 | 564 | 188848 | 96.7 % | 918 KB |
| `mission21` | `0x154000` | 119808 | 314 | 115840 | 96.7 % | 501 KB |
| `mission22` | `0x154000` | 3328 | 4 | 3328 | 100.0 % | 13 KB |
| `mission24` | `0x154000` | 35712 | 43 | 35712 | 100.0 % | 124 KB |
| `mission25` | `0x154000` | 87552 | 155 | 85264 | 97.4 % | 248 KB |
| `mission98` | `0x154000` | 0 | — | — | — | — |
| `prg_player_0` | `0x100000` | 229248 | 269 | 226384 | 98.8 % | 781 KB |

## Verificación

- `node scripts/validate-decomp.mjs` en verde.
- Cada módulo tiene su reporte en `decomp/modules/<name>.md`.
- `mission98.bin` son 192 B de ceros: no se decompila.
- Byte-match: deuda declarada; requiere MWCCPS2 2.4.x.
