# 02 — Ejecutable, memoria y overlays

> Este es el hallazgo estructural del proyecto: **el juego no está todo en
> `SLES_537.68`**. Una parte importante vive en overlays que se cargan en runtime.

## El ELF

| Campo | Valor |
|---|---|
| `e_ident` | `7f 45 4c 46 01 01 01 00 …` (ELF32, little-endian) |
| `e_type` | 2 (`ET_EXEC`) |
| `e_machine` | 8 (`EM_MIPS`) |
| `e_entry` | `0x004C0008` |
| `e_flags` | `0x20924000` → **R5900** (`EF_MIPS_MACH_5900`), MIPS III |
| `e_shoff` / `e_shnum` | `0x627E20` / 81 secciones |
| `.symtab` | **ausente** (binario retail *stripped*) |
| `.comment` | `MW MIPS C Compiler (2.4.1.01)` + `PlayStation2` |
| `.reginfo` | declara `gp = 0x00A28070` |

El `.comment` lo escribe el linker **MWLD**: identifica la familia
**Metrowerks CodeWarrior PS2 2.4.x**, no un build exacto del compilador.

### Segmentos

| PH | vaddr | filesz | memsz | contenido |
|---|---|---:|---:|---|
| 0 | `0x004C0000` | 6.108.928 | 6.108.928 | `main` (text+data+rodata) |
| 1 | `0x00100000` | 344.064 | 344.064 | **ceros** (área reservada para overlays) |
| 2 | `0x00A93700` | 0 | 0 | `heap` |

### Secciones con nombre de overlay

La tabla de secciones incluye placeholders de tamaño 0 que enumeran los módulos
del juego (son parte del *linker script* de MW):

```
mission01.bin@0x154000 … mission12.bin@0x154000
mission15.bin@0x154000 … mission22.bin@0x154000
mission24.bin@0x154000  mission25.bin@0x154000  mission98.bin@0x154000
menu.bin@0x100000        prg_player_0.bin@0x100000
```

## Mapa de memoria

```
0x00100000 ┌─ área de overlays (reservada, 344 KB en cero en el ELF)
           │    menu.bin  ←→  prg_player_0.bin      (misma base, excluyentes)
0x00154000 ├─ mission01 … mission25 + mission98     (2,35 MB de text en total)
           │    …
0x004C0000 ├─ main                                   (5,4 MB) ← único código recompilado
0x00A28070 │  gp (global pointer, declarado en .reginfo)
0x00A93700 └─ heap
```

## Los overlays (`OL.BIN`)

`OL.BIN` es un `SIMB` con 25 módulos, cada uno comenzando con un header `MWo` de
0x40 bytes (ver [`../formats/mwo.md`](../formats/mwo.md)). Empiezan en `0x800` y
están alineados a 2048 B.

| Módulo | id | base | text | data | bss | offset |
|---|---:|---:|---:|---:|---:|---:|
| `menu.bin` | 0x18 | `0x100000` | 368.960 | 293.376 | 96.000 | `0x41F000` |
| `prg_player_0.bin` | 0x19 | `0x100000` | 229.312 | 102.400 | 512 | `0x8D800` |
| `mission01.bin` | 0x1 | `0x154000` | 11.328 | 59.648 | 0 | `0x2A000` |
| `mission02.bin` | 0x2 | `0x154000` | 28.864 | 72.960 | 128 | `0x3B800` |
| `mission03.bin` | 0x3 | `0x154000` | 68.672 | 173.184 | 128 | `0x3E3800` |
| `mission04.bin` | 0x4 | `0x154000` | 80.832 | 152.320 | 128 | `0x54800` |
| `mission05.bin` | 0x5 | `0x154000` | 70.208 | 102.528 | 128 | `0x3B9000` |
| `mission06.bin` | 0x6 | `0x154000` | 67.648 | 79.872 | 128 | `0x394800` |
| `mission07.bin` | 0x7 | `0x154000` | 47.936 | 102.912 | 128 | `0x36F800` |
| `mission08.bin` | 0x8 | `0x154000` | 97.600 | 152.576 | 128 | `0x332000` |
| `mission09.bin` | 0x9 | `0x154000` | 142.528 | 162.176 | 256 | `0x2E7800` |
| `mission10.bin` | 0xA | `0x154000` | 51.392 | 158.336 | 128 | `0x2B4000` |
| `mission11.bin` | 0xB | `0x154000` | 60.992 | 253.440 | 128 | `0x267000` |
| `mission12.bin` | 0xC | `0x154000` | 145.344 | 202.624 | 256 | `0x212000` |
| `mission15.bin` | 0xD | `0x154000` | 115.392 | 129.408 | 256 | `0x1D6000` |
| `mission16.bin` | 0xE | `0x154000` | 65.600 | 103.680 | 128 | `0x800` |
| `mission17.bin` | 0xF | `0x154000` | 130.624 | 75.008 | 384 | `0x1A3800` |
| `mission18.bin` | 0x10 | `0x154000` | 67.136 | 54.912 | 128 | `0x185800` |
| `mission19.bin` | 0x11 | `0x154000` | 57.536 | 105.088 | 128 | `0x15D800` |
| `mission20.bin` | 0x12 | `0x154000` | 195.264 | 34.432 | 384 | `0x125000` |
| `mission21.bin` | 0x13 | `0x154000` | 119.872 | 48.000 | 256 | `0xFC000` |
| `mission22.bin` | 0x14 | `0x154000` | 3.392 | 3.456 | 0 | `0xFA000` |
| `mission24.bin` | 0x15 | `0x154000` | 35.776 | 74.752 | 128 | `0xDF000` |
| `mission25.bin` | 0x16 | `0x154000` | 87.616 | 261.504 | 128 | `0x4C1000` |
| `mission98.bin` | 0x17 | `0x154000` | 192 | 0 | 0 | `0xDE800` |

Totales: **2.350.016 B de text**, ~2.958.592 B de data, ~100 KB de bss.

Notas:

- Las misiones **13, 14 y 23 no existen** (contenido cortado); el linker las omitió
  y `OL.BIN` también.
- `mission98.bin` tiene 192 B de text: es el mejor primer objetivo de decompilación.
- `menu.bin` y `prg_player_0.bin` comparten base `0x100000`: son excluyentes.

## Por qué el intento anterior no las vio

- El CSV de Ghidra tiene **20.434 funciones** y solo **4** por debajo de `0x4C0000`.
  Es decir: **0 funciones de overlay**.
- El gate del proyecto contaba `missing-target` (referencias estáticas `JAL`/`J`).
  A los overlays se entra por **puntero** (`jalr`) desde el loader, así que el gate
  nunca podía verlos. El "0 missing" no significaba cobertura completa.
- Consecuencia: el recomp actual ejecuta solo `main`. Si el juego salta a
  `0x100000`/`0x154000`, el runtime no tiene función registrada ahí.

## Qué implica

Para el objetivo "juego completo" hace falta:

1. **Recompilar cada overlay** con su base (`0x100000` o `0x154000`) como dirección
   de carga, con su propio CSV de funciones.
2. **Overlay bank** en el runtime: al cargar un módulo, registrar la tabla de
   funciones recompiladas de ese módulo en la dirección base.
3. **Loader del contenedor** (`SIMB` + `MWo`): extraer `sz_text`/`sz_data`, cargar en
   `address` y ejecutar el `_static_init`.
4. **Dispatch**: las llamadas indirectas dentro del overlay deben resolver a la
   tabla del módulo activo (y no a `main`).

Esto es una extensión de PS2Recomp, no un parche menor. Es la fase 3 del roadmap.

## Reproducir

```bash
node scripts/inspect-disc.mjs "Sword of Etheria.iso"
```

El script imprime headers, tabla de overlays, `e_flags`, `.comment` y el mapa.
Los offsets de `OL.BIN` también se pueden verificar con:

```bash
7z e "Sword of Etheria.iso" -o/tmp OL.BIN
```
