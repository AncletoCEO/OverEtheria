# ABI de overlays `MWo`

> Medido sobre los 25 módulos de `OL.BIN` y sobre `mission22.bin` (el piloto no vacío
> más chico). Fecha: 2026-11-03.

## Layout en memoria

```
base + 0x0000  ┌──────────────────────────────┐
               │ 0x40 B de ceros en el archivo │  ← slot reservado para el header MWo
base + 0x0040  ├──────────────────────────────┤
               │ sz_text (código)              │
base + sz_text ├──────────────────────────────┤
               │ sz_data (datos inicializados) │
               │ …                             │
               ├──────────────────────────────┤
               │ sz_bss (sin contenido)        │
               └──────────────────────────────┘
```

- **Todos los 25 overlays** tienen `0x40` bytes de ceros al inicio del text.
- El header `MWo` mide exactamente `0x40` bytes: la hipótesis fuerte es que el loader
  copia el header a `base` y el código a `base + 0x40`.
- Por eso el código real **no** empieza en `base`: en `mission22` la primera función
  está en `0x154040`, no en `0x154000`.
- `sz_data` sigue al text en memoria; `sz_bss` no ocupa archivo.

## `_static_init`

- Es un rango `[_static_init, _static_init_end)` de punteros a constructores de C++
  dentro de `data`.
- En `mission22` viene **vacío** (`0x155B00` = `0x155B00`), así que el loader no tiene
  nada que ejecutar.
- En módulos con rango no vacío, el loader debe recorrerlo y llamar a cada puntero
  después de copiar text+data.

## Convención de llamada (o32)

Prólogo típico de `mission22`:

```asm
00154040  addiu sp,sp,-0xa0
00154044  sd    ra,0x90(sp)
00154048  sq    s7,0x80(sp)
0015404c  sq    s6,0x70(sp)
...
```

- Frame de `0xA0` bytes; `ra` se guarda con `sd` (64 bits) y los `s*` con `sq`
  (128 bits), como corresponde al R5900.
- Epílogo: `lq` de los registros, `jr ra` y delay slot `addiu sp,sp,0xa0`.
- Argumentos y retorno: **o32** estándar (`a0..a3`, `v0/v1`), con enteros de 64 bits
  donde el compilador los use.

## `gp`

- **Ninguna** instrucción de `mission22` referencia `$gp` (0 ocurrencias en 776
  instrucciones).
- El `gp` global del ejecutable es `0xA28070` (declarado en `.reginfo` del ELF).
- Conclusión provisoria: los overlays no traen su propio `gp`; si un módulo lo usa,
  el loader/runtime debe preservar el `gp` de `main`.

## Llamadas: el overlay llama a `main`, no al revés

- `mission22` tiene **96 `jal`/`j`, todos a direcciones de `main`** (p. ej.
  `0x5319C0`, `0x531420`, `0x58BEC0`, `0x58BE50`).
- **Cero** llamadas internas entre las 4 funciones del overlay.
- Interpretación: las 4 funciones son **puntos de entrada independientes** que el
  motor invoca por tabla/dispatch; no forman un grafo de llamadas propio.
- Consecuencia para el recomp: el overlay bank debe poder resolver llamadas
  **salientes** del overlay hacia `main` y la entrada **desde** `main`/loader.

## Funciones de `mission22`

| Función | Inicio | Fin | Bytes |
|---|---:|---:|---:|
| `sub_154040` | `0x154040` | `0x1543A0` | 864 |
| `sub_1543A0` | `0x1543A0` | `0x154690` | 752 |
| `sub_154690` | `0x154690` | `0x1549F0` | 864 |
| `sub_1549F0` | `0x1549F0` | `0x154D40` | 848 |

Mapa generado por `scripts/discover-functions.mjs` (JAL/J + prólogos) y aplicado a
Ghidra con `scripts/ghidra/CreateFunctionsFromCsv.java`.

## Preguntas abiertas

- ¿El loader salta a `base + 0x40` o consulta una tabla de entry points?
- ¿El header `MWo` se copia a `base` o el slot queda en cero?
- ¿Qué módulos usan `$gp`? (revisar los 25, no solo `mission22`).
- ¿`_static_init` corre en cada carga o solo la primera vez?

## Reproducir

```powershell
node scripts/discover-functions.mjs work/overlays/mission22.bin --out work/ghidra/mission22.starts.csv
# importar con -processor r5900:LE:32:default y -preScript PrepareRawModule.java
```
