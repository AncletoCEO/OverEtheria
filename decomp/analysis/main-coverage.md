# Cobertura de `main` — mediciones y decisión

> 2026-11-03. Tres mediciones, un solo baseline. El recomp de `tools/` es un
> **intento fallido**: su CSV no se adopta.

## Mediciones

| Fuente | Registros | Cobertura de `main` | Huecos ≥ 16 B | Solapamientos | Veredicto |
|---|---:|---:|---:|---:|---|
| **Ghidra 12.1.4 + R5900, solo funciones** | **8.815** | **61,69 %** | 947 (2,13 MB) | 203 | ✅ **baseline** |
| Ghidra 12.1.4 con `MIPS:LE:32:default` | 9.318 | 14,47 % | 6.891 (4,85 MB) | 373 | ❌ lenguaje equivocado |
| `ghidra_functions.csv` del recomp | 20.430 | 96,46 % | 15 (158 KB) | **10.057** | ❌ referencia histórica |

La primera medición (14,47 %) usó MIPS32 genérico, que **no decodifica `sd`/`ld` ni
MMI** del R5900: el prólogo de cada función se leía como basura y Ghidra no seguía
el flujo. Con el módulo `r5900:LE:32:default` (extensión *ghidra-emotionengine-reloaded*)
la cobertura honesta sube a **61,69 %** y los huecos de código bajan a **50,8 KB**.

Reportes regenerables:

```bash
node scripts/audit-coverage.mjs --csv work/ghidra/main.functions.csv --elf work/elf/SLES_537.68
node scripts/audit-coverage.mjs --csv tools/legacy-recomp/.../ghidra_functions.csv --elf work/elf/SLES_537.68
```

## Qué significan los 2,13 MB fuera de función

| Clasificación | Huecos | Bytes |
|---|---:|---:|
| datos/desconocido (strings, tablas, rodata) | 547 | 2.072.108 |
| **código** (prólogos/retornos) | **129** | **50.832** |
| datos/ceros | 271 | 9.376 |

El bloque de 1,56 MB en `0x8752D8-0x9F18E0` es **data/rodata** (7.830 runs ASCII,
1 prólogo en 389.506 palabras). No es código perdido. Los **50,8 KB de código**
repartidos en 129 huecos son el trabajo real de descubrimiento por referencias.

Huecos de código más grandes:

| Rango | Bytes | Evidencia |
|---|---:|---|
| `0x665EC8-0x667670` | 6.056 | 16 prólogos, 8 `jr ra` |
| `0x732AD8-0x7336D8` | 3.072 | 2 prólogos, 9 `jr ra` |
| `0x616360-0x616CA0` | 2.368 | 2 prólogos |
| `0x6C1D5C-0x6C2528` | 1.996 | 2 prólogos, 3 `jr ra` |
| `0x6A75A0-0x6A7BB0` | 1.552 | 2 prólogos |

## Por qué el 96,5 % del recomp no es una buena noticia

Su CSV tiene **10.057 solapamientos** y 66.830 labels `entry_` promovidos a funciones
por el exportador. La cobertura alta es artificial: incluye datos tratados como
código y funciones partidas por el splitter del recomp. Adoptarlo sería heredar el
problema que bloqueó el intento.

## Decisión

1. **Baseline**: Ghidra 12.1.4 con el módulo R5900 + export de **solo funciones**
   (`scripts/ghidra/ExportFunctionsCsv.java`).
2. **Descubrimiento**: agregar entradas por referencias reales (`JAL`/`J`/branch/
   tablas/vtables) — ver `scripts/discover-functions.mjs` — y auditar con
   `scripts/audit-coverage.mjs`.
3. **No** se adopta el CSV del recomp ni se parte por epílogos.
4. `mission98` (192 B) es **todo ceros**: no sirve como piloto. El primero es
   **`mission22` (3.392 B)**, con 4 funciones descubiertas y código real desde
   `0x154040`.
