# `mission22.bin` — módulo piloto

> Primer módulo no vacío (3.392 B de text). Decompilación **anotada**, no matching.
> Fecha: 2026-11-03.

## Metadatos

| Campo | Valor |
|---|---|
| id | 20 (`0x14`) |
| base | `0x154000` |
| text | 3.392 B |
| data | 3.456 B |
| bss | 0 |
| `_static_init` | vacío (`0x155B00` = `0x155B00`) |
| prefijo de ceros | `0x40` B |
| código | `0x154040` … `0x154D40` |
| sha256 | `1221c16065b192c2963b1639060fdd3a3f0f83468e6a37c268e13cbbe13f0705` |

## Funciones

| Función | Rango | Bytes | Firma (Ghidra) |
|---|---|---:|---|
| `sub_154040` | `0x154040`–`0x1543A0` | 864 | `undefined4 f(long, long)` |
| `sub_1543A0` | `0x1543A0`–`0x154690` | 752 | `undefined4 f(long, long)` |
| `sub_154690` | `0x154690`–`0x1549F0` | 864 | `undefined4 f(long, long)` |
| `sub_1549F0` | `0x1549F0`–`0x154D40` | 848 | `undefined4 f(long, long)` |

Las cuatro comparten firma de **dos punteros** y retorno de 32 bits. Es consistente
con "callbacks del motor": el overlay no llama a sus propias funciones (0 `jal`
internos), así que cada una es un punto de entrada independiente.

> Nota: Ghidra tipa los parámetros como `long` (64 bits) por el modelo EABI64 del
> R5900; en el guest los punteros son de **32 bits**. Es una limitación del
> pseudocódigo, no del ABI.

## Perfil de llamadas

96 `jal` a **16 destinos distintos, todos en `main`**:

| Destino | Llamadas |
|---|---:|
| `0x005319C0` | 20 |
| `0x0058BEF0` | 8 |
| `0x0058B4F0` | 8 |
| `0x00530BD0` | 8 |
| `0x00531420` | 6 |
| `0x0058BE20` | 6 |
| `0x00531570` | 6 |
| `0x0058BEC0` | 4 |
| `0x0058BE50` | 4 |
| `0x0058BC60` | 4 |
| `0x00579740` | 4 |
| `0x0058C420` | 4 |
| `0x005255F0` | 4 |
| `0x00531700` | 4 |
| `0x005296C0` | 2 |
| `0x0058BF00` | 2 |

Estos 16 destinos son candidatos naturales a símbolos del motor (fase 5).

## ABI

Ver [`overlay-abi.md`](../analysis/overlay-abi.md). Resumen:

- Frame `0xA0`, `sd ra,0x90(sp)`, `sq s0..s7`, epílogo `jr ra` + delay slot.
- Sin referencias a `$gp`.
- El overlay **llama hacia `main`**; no hay llamadas internas.

## Verificación

| Chequeo | Resultado |
|---|---|
| sha256 del módulo | coincide con `decomp/modules.json` |
| prefijo `0x40` | 64 B en cero |
| cobertura del listing | **832/832** slots de 4 B (`0x154040`…`0x154D3C`), sin huecos |
| prólogos | las 4 funciones empiezan con `addiu sp,sp,-0xa0` |
| epílogos | 3 terminan en `jr ra` + `addiu sp,sp,0xa0`; la última en `0x154CD4` + padding |
| decompilación | 4/4 funciones, 425 líneas de C, sin errores de Ghidra |
| llamadas internas | 0 |
| llamadas salientes | 96, todas a `main` |

### Byte-match: no se intentó (diferencia documentada)

El escenario de la spec permite documentar diferencias cuando no hay match exacto.
Acá no hay match por tres motivos:

1. El `.c` es **pseudocódigo de Ghidra** (`undefined4`, `func_0x…`), no C compilable.
2. Un rebuild byte-idéntico requiere **MWCCPS2 2.4.x** y los flags originales
   (decisión `decomp-annotated-not-matching`).
3. El ensamblador disponible (LLVM vía Zig) **no soporta `lq`/`sq`** del R5900, así que
   tampoco se puede hacer un round-trip del listado: falla en esas instrucciones.

Lo que sí queda verificado es el **mapa**: hash, límites, prólogos/epílogos, cobertura
de instrucciones y grafo de llamadas. Un byte-match queda como deuda para cuando
aparezca MWCC.

## Incógnitas

- Qué hacen semánticamente los 4 handlers (requiere nombrar los 16 destinos).
- Por qué la firma es de dos punteros (¿contexto + parámetro?).
- Si el motor los invoca por tabla o por dirección fija.

## Reproducir

```powershell
node scripts/discover-functions.mjs work/overlays/mission22.bin --out work/ghidra/mission22.starts.csv
# importar con -processor r5900:LE:32:default
#   -preScript PrepareRawModule.java
#   -postScript DecompileModule.java <starts.csv> decomp/src/mission22/mission22.c
```
