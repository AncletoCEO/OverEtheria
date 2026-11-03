# `menu.bin` — triage y primer subsistema

> Overlay del menú (369 KB de text). Triage completo en
> [`menu-triage.md`](menu-triage.md). Fecha: 2026-11-03.

## Metadatos

| Campo | Valor |
|---|---|
| id | 24 (`0x18`) |
| base | `0x100000` |
| text | 368.960 B |
| data | 293.376 B |
| bss | 96.000 B |
| `_static_init` | `0x1A1B20` … `0x1A1B24` (2 punteros) |
| prefijo de ceros | `0x40` B |
| sha256 | `a8d2b2279ac9b15f793e8d0069b9882e56f833b74bdfbdb14495759d2d54af2d` |

## Cobertura

- **1.063** entradas descubiertas (`discover-functions.mjs`); **1.020** funciones
  creadas en Ghidra (43 rechazadas por solapamiento con funciones auto-detectadas).
- **362.228 B** dentro de funciones (98,2 % de los 368.896 B de código tras el
  prefijo).
- **313 targets externos distintos** (funciones de `main`).

## Triage por target primario

| Cluster | Funciones | Bytes | Ejemplos |
|---|---:|---:|---|
| `sin-llamadas` | 347 | 26.008 | `sub_1001a0`, `sub_100304`, `sub_100440` |
| `0x510810` | 54 | 12.416 | `sub_108310`, `sub_1093d0`, `sub_109d60` |
| `0x4F1A20` | 39 | 4.800 | `sub_108b80`, `sub_1095f0`, `sub_10e400` |
| `0x62DD60` | 35 | 22.256 | `sub_10fd60`, `sub_111530`, `sub_111ad0` |
| `0x510600` | 34 | 35.344 | `sub_107f80`, `sub_109000`, `sub_109a10` |
| `0x805340` | 27 | 12.272 | `sub_1162a0`, `sub_1167a0`, `sub_119770` |
| `0x7F7EA0` | 26 | 24.128 | `sub_107950`, `sub_10bc40`, `sub_10bc80` |
| `0x550EE0` | 24 | 16.368 | `sub_1107e0`, `sub_1123f0`, `sub_112b70` |
| `0x5472C0` | 23 | 10.448 | `sub_110680`, `sub_112510`, `sub_122860` |
| `0x510610` | 22 | 19.328 | `sub_107ad0`, `sub_108d50`, `sub_109b70` |

Los targets se agrupan en familias contiguas (`0x5106xx`, `0x7F62xx`–`0x7F81xx`,
`0x803Fxx`–`0x8053xx`, `0x4F19xx`/`0x4F1Axx`), señal de subsistemas del motor.
La semántica (input/render/audio) todavía no está identificada.

## Primer subsistema: `menu_init`

Criterio: la **función de entrada** `sub_100040` y sus llamadas internas directas.
Es el punto natural de arranque del overlay y no requiere semántica externa.

| Función | Bytes | Firma | Rol |
|---|---:|---|---|
| `sub_100040` | 352 | `undefined4 f(long)` | entrada; registra/llama |
| `sub_1001e0` | 140 | `ulong f(void)` | llamada interna |
| `sub_101e10` | 32 | `undefined4 f(undefined4, int, undefined4)` | llamada interna |
| `sub_105c48` | 24 | `void f(void)` | llamada interna |
| `sub_1068b8` | 120 | `undefined4 f(void)` | llamada interna |

`sub_100040` llama a:

- **SDK en `main`**: `0x4D32A0`, `0x4D30A0`, `0x4D43E0` (familia de threads/sems/RPC
  del SDK, según el mapa del intento previo).
- **Internas del menú**: `0x1001E0`, `0x101E10`, `0x105C48`, `0x1068B8`.

El C está en [`../src/menu/menu_init.c`](../src/menu/menu_init.c) (144 líneas, 5/5
funciones decompiladas sin errores).

## Verificación

| Chequeo | Resultado |
|---|---|
| sha256 | coincide con `decomp/modules.json` |
| prefijo `0x40` | 64 B en cero |
| funciones del subsistema | 5/5 decompiladas |
| llamadas internas del entry | 4, todas dentro del subsistema |
| llamadas externas del entry | 3 al SDK de `main` |
| byte-match | no aplica (pseudocódigo; ver `mission22.md`) |

## Incógnitas

- Nombrar los 313 targets externos: es el trabajo que convierte el triage en
  subsistemas reales.
- Los 347 funciones sin llamadas (hojas) probablemente sean getters/setters y
  callbacks de UI.
- Confirmar si `sub_100040` es el entry real o una función de registro llamada por
  el motor.
- `_static_init` tiene 2 punteros: el loader debe ejecutarlos en cada carga.

## Reproducir

```powershell
node scripts/triage-module.mjs --functions work/ghidra/menu_functions.csv `
  --asm work/ghidra/menu.asm --base 0x100000 --size 368960 `
  --cluster 0x510810 --starts-out work/ghidra/menu_c1.starts.csv
# importar con -processor r5900:LE:32:default
#   -preScript PrepareRawModule.java
#   -postScript DecompileModule.java <starts.csv> decomp/src/menu/menu_init.c
```
